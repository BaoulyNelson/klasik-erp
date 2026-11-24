import json
import logging
import uuid
from smtplib import SMTPException

from django.contrib.auth.password_validation import validate_password
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from django.core.validators import validate_email
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from api.authentication import verifier_csrf_cookie
from api.cookies import reponse_session_cookie
from api.serializers import ProfilUtilisateurSerializer
from api.validators import valider_url_image
from comptes.models import (
    AffiliationEtablissement,
    RoleUtilisateur,
    SurchargePermissions,
    Utilisateur,
)
from api.permissions import (
    COLLECTIONS_PORTAIL,
    PERMISSIONS_PAR_ROLE,
    PERMISSIONS_COLLECTIONS,
    permissions_utilisateur,
    role_utilisateur_etablissement,
)
from donnees.models import EnregistrementMetier, EntreeAuditApi
from etablissements.models import (
    Etablissement,
    HistoriqueAbonnementSaas,
    TypeEtablissement,
)
from etablissements.validators import (
    valider_code_pays,
    valider_code_devise,
    valider_fuseau_iana,
    valider_telephone_pays,
)
from pedagogie.models import EvenementCalendrier
from pedagogie.serializers import EvenementCalendrierSerializer
from scolarite.models import Apprenant, ElementPedagogique
from scolarite.serializers import ElementPedagogiqueSerializer, UniteAcademiqueSerializer

logger = logging.getLogger(__name__)
COLLECTIONS_GLOBALES = {"etablissements", "configuration_plateforme"}
COLLECTIONS_RELATIONNELLES_DEDIEES = {
    "partenaires",
    "fils_discussion",
    "badges_attribues",
    "journaux_importations",
    "demandes_conge",
}


class EchecCourrielInvitation(APIException):
    status_code = 503
    default_detail = "Le compte n’a pas été créé car le courriel d’invitation n’a pas pu être envoyé."
    default_code = "courriel_invitation_indisponible"


def _valider_collection(collection: str) -> tuple[str | None, str | None]:
    if collection in COLLECTIONS_RELATIONNELLES_DEDIEES:
        raise NotFound("Cette collection utilise désormais son endpoint relationnel dédié.")
    if collection in COLLECTIONS_GLOBALES:
        return "parametres:voir", "parametres:gerer"
    permissions = PERMISSIONS_COLLECTIONS.get(collection)
    if permissions is None:
        raise NotFound("Cette collection n’existe pas dans l’API.")
    return permissions


def _permissions_collection(request, etablissement, collection: str) -> tuple[str | None, str | None]:
    role = role_utilisateur_etablissement(request.user, etablissement)
    lecture, ecriture = _valider_collection(collection)
    if collection in COLLECTIONS_PORTAIL and role == "PARENT":
        lecture = "portail:parent"
    elif collection in COLLECTIONS_PORTAIL and role == "APPRENANT":
        lecture = "portail:apprenant"
    return lecture, ecriture


def _obtenir_etablissement(identifiant: str) -> Etablissement:
    return get_object_or_404(Etablissement, pk=identifiant)


def _verifier_permission(request, etablissement, permission: str | None) -> None:
    permissions = permissions_utilisateur(request.user, etablissement)
    if permission is None or permission not in permissions:
        raise PermissionDenied("Vous n’avez pas la permission d’effectuer cette action.")


def _enregistrer_audit_api(
    request,
    etablissement,
    action,
    collection,
    id_objet,
    utilisateur=None,
) -> None:
    acteur = utilisateur or request.user
    EntreeAuditApi.objects.create(
        etablissement=etablissement,
        utilisateur=acteur,
        nom_acteur=acteur.nom_complet,
        role_acteur=role_utilisateur_etablissement(acteur, etablissement),
        action=action,
        collection=collection,
        id_objet=id_objet,
    )


def _serialiser_etablissement(
    etablissement: Etablissement,
    *,
    metadonnees_plateforme: bool = False,
    nombre_apprenants: int = 0,
) -> dict:
    donnees = {
        **etablissement.configuration,
        "id": etablissement.id,
        "code": etablissement.code,
        "nom": etablissement.nom,
        "nom_court": etablissement.nom_court,
        "type": etablissement.type,
        "statut": "ACTIF" if etablissement.est_actif else "SUSPENDU",
    }
    if not metadonnees_plateforme:
        return donnees

    administrateurs = getattr(etablissement, "administrateurs_affilies_plateforme", None)
    if administrateurs is None:
        administrateurs = list(
            AffiliationEtablissement.objects.filter(
                etablissement=etablissement,
                role__in=(RoleUtilisateur.DIRECTEUR, RoleUtilisateur.ADMIN_ETAB),
            ).select_related("utilisateur")
        )
    administrateurs.sort(
        key=lambda affiliation: (
            affiliation.role != RoleUtilisateur.DIRECTEUR,
            affiliation.utilisateur.nom_complet.casefold(),
        )
    )
    administrateurs_affilies = [
        {
            "nom": affiliation.utilisateur.nom_complet,
            "courriel": affiliation.utilisateur.courriel,
            "role": affiliation.role,
        }
        for affiliation in administrateurs
    ]
    responsable = etablissement.proprietaire or (
        administrateurs[0].utilisateur if administrateurs else None
    )
    donnees.update(
        {
            "proprietaire_nom": (
                (responsable.nom_complet or etablissement.nom_direction)
                if responsable
                else etablissement.nom_direction
            ),
            "proprietaire_courriel": (
                (responsable.courriel or etablissement.courriel)
                if responsable
                else etablissement.courriel
            ),
            "proprietaire_telephone": (
                (responsable.telephone or etablissement.telephone)
                if responsable
                else etablissement.telephone
            ),
            "administrateurs_affilies": administrateurs_affilies,
            "cree_le": etablissement.cree_le.isoformat() if etablissement.cree_le else None,
            "nombre_apprenants": nombre_apprenants,
            "nombre_apprenants_total": nombre_apprenants,
        }
    )
    return donnees


def _perimetre_utilisateur(utilisateur, role, etablissement) -> dict[str, set[str]]:
    if role in {"PARENT", "APPRENANT"}:
        ids_apprenants = set(utilisateur.profil.get("ids_apprenants_lies", []))
        lignes = EnregistrementMetier.objects.filter(
            etablissement=etablissement,
            collection="apprenants",
            id_objet__in=ids_apprenants,
        ).values_list("donnees", flat=True)
        return {
            "ids_apprenants": ids_apprenants,
            "ids_unites": {ligne.get("id_unite") for ligne in lignes},
        }
    if role == "ENSEIGNANT":
        affectations = EnregistrementMetier.objects.filter(
            etablissement=etablissement,
            collection="enseignants",
            donnees__courriel=utilisateur.courriel,
        ).values_list("donnees", flat=True)
        enseignant = next(iter(affectations), {})
        ids_unites = set(enseignant.get("ids_unites_assignees", []))
        ids_elements = set(enseignant.get("ids_elements_assignes", []))
        devoirs = EnregistrementMetier.objects.filter(
            etablissement=etablissement,
            collection="devoirs_lms",
            donnees__id_unite__in=ids_unites,
        ).values_list("id_objet", flat=True)
        apprenants = EnregistrementMetier.objects.filter(
            etablissement=etablissement,
            collection="apprenants",
            donnees__id_unite__in=ids_unites,
        ).values_list("id_objet", flat=True)
        return {
            "id_enseignant": enseignant.get("id"),
            "ids_unites": ids_unites,
            "ids_elements": ids_elements,
            "ids_apprenants": set(apprenants),
            "ids_devoirs": set(devoirs),
        }
    return {}


def _valider_payload(payload, id_etablissement: str, id_objet: str | None = None) -> dict:
    if not isinstance(payload, dict):
        raise ValidationError("Le corps de la requête doit être un objet JSON.")
    donnees = dict(payload)
    identifiant = donnees.get("id")
    if not isinstance(identifiant, str) or not identifiant or len(identifiant) > 128:
        raise ValidationError({"id": "Un identifiant textuel valide est obligatoire."})
    if id_objet is not None and identifiant != id_objet:
        raise ValidationError({"id": "L’identifiant d’un enregistrement existant ne peut pas changer."})
    tenant_recu = donnees.get("id_etablissement")
    if tenant_recu is not None and tenant_recu != id_etablissement:
        raise ValidationError(
            {"id_etablissement": "L’enregistrement doit appartenir à l’établissement demandé."}
        )
    donnees["id_etablissement"] = id_etablissement
    return donnees


def _donnees_publiques(enregistrement: EnregistrementMetier) -> dict:
    donnees = dict(enregistrement.donnees)
    donnees["id"] = enregistrement.id_objet
    donnees["id_etablissement"] = enregistrement.etablissement_id
    return donnees


class ListeEtablissementsView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "tenant_creation"

    def get_throttles(self):
        if self.request.method != "POST":
            return []
        return super().get_throttles()

    @extend_schema(
        operation_id="listerEtablissementsAccessibles",
        responses=inline_serializer(
            name="EtablissementAccessible",
            many=True,
            fields={
                "id": serializers.CharField(),
                "code": serializers.CharField(),
                "nom": serializers.CharField(),
                "nom_court": serializers.CharField(),
                "type": serializers.CharField(),
                "statut": serializers.CharField(),
            },
        ),
    )
    def get(self, request):
        if not request.user.is_authenticated:
            raise PermissionDenied("Connectez-vous pour consulter vos établissements.")
        etablissements = Etablissement.objects.filter(
            affiliations__utilisateur=request.user
        ).distinct()
        resultats = []
        for etablissement in etablissements:
            resultats.append(_serialiser_etablissement(etablissement))
        return Response(resultats)

    @extend_schema(
        operation_id="creerEtablissement",
        request=OpenApiTypes.OBJECT,
        responses=OpenApiTypes.OBJECT,
    )
    @transaction.atomic
    def post(self, request):
        verifier_csrf_cookie(request)
        if not isinstance(request.data, dict):
            raise ValidationError("Le corps de la requête doit être un objet JSON.")

        configuration = request.data.get("etablissement")
        if not isinstance(configuration, dict):
            raise ValidationError({"etablissement": "La configuration de l’établissement est invalide."})

        identifiant = configuration.get("id")
        code = configuration.get("code")
        nom = configuration.get("nom")
        type_etablissement = configuration.get("type")
        code_pays = configuration.get("code_pays", "INTL")
        ville = configuration.get("ville")
        if not isinstance(identifiant, str) or not identifiant.strip() or len(identifiant) > 128:
            raise ValidationError({"id": "Un identifiant d’établissement valide est obligatoire."})
        if not isinstance(code, str) or not code.strip() or len(code.strip()) > 64:
            raise ValidationError({"code": "Un code d’établissement valide est obligatoire."})
        if not isinstance(nom, str) or len(nom.strip()) < 2 or len(nom.strip()) > 191:
            raise ValidationError({"nom": "Le nom de l’établissement doit contenir entre 2 et 191 caractères."})
        if type_etablissement not in TypeEtablissement.values:
            raise ValidationError({"type": "Le type d’établissement est invalide."})
        try:
            code_pays = valider_code_pays(code_pays)
        except DjangoValidationError as erreur:
            raise ValidationError(erreur.message_dict if hasattr(erreur, "message_dict") else erreur.messages) from erreur
        try:
            configuration["devise_defaut"] = valider_code_devise(configuration.get("devise_defaut", "USD"))
        except DjangoValidationError as erreur:
            raise ValidationError(erreur.message_dict if hasattr(erreur, "message_dict") else erreur.messages) from erreur
        if not isinstance(ville, str) or len(ville.strip()) < 2 or len(ville.strip()) > 191:
            raise ValidationError({"ville": "La ville doit contenir entre 2 et 191 caractères."})
        telephone_etablissement = configuration.get("telephone", "")
        try:
            valider_telephone_pays(code_pays, telephone_etablissement)
        except DjangoValidationError as erreur:
            raise ValidationError(erreur.message_dict if hasattr(erreur, "message_dict") else erreur.messages) from erreur
        fuseau_horaire = configuration.get("fuseau_horaire", "")
        if code_pays == "INTL":
            try:
                valider_fuseau_iana(fuseau_horaire)
            except DjangoValidationError as erreur:
                raise ValidationError(
                    {"fuseau_horaire": erreur.messages}
                ) from erreur

        fondateur = request.data.get("fondateur")
        if not isinstance(fondateur, dict):
            raise ValidationError({"fondateur": "Les informations du responsable sont obligatoires."})
        nom_fondateur = fondateur.get("nom_complet")
        courriel_fondateur = fondateur.get("courriel")
        telephone_fondateur = fondateur.get("telephone", "")
        mot_de_passe = fondateur.get("mot_de_passe", "")
        utiliser_compte_connecte = fondateur.get("utiliser_compte_connecte", False)
        if not isinstance(utiliser_compte_connecte, bool):
            raise ValidationError(
                {"utiliser_compte_connecte": "Ce choix doit être vrai ou faux."}
            )
        est_administrateur_plateforme = request.user.is_authenticated and bool(
            request.user.est_super_admin_plateforme or request.user.is_superuser
        )
        if utiliser_compte_connecte and not est_administrateur_plateforme:
            raise ValidationError(
                {"utiliser_compte_connecte": "Ce choix est réservé aux administrateurs de la plateforme."}
            )
        if not isinstance(nom_fondateur, str) or len(nom_fondateur.strip()) < 2 or len(nom_fondateur.strip()) > 120:
            raise ValidationError({"nom_complet": "Le nom complet du responsable est invalide."})
        if not isinstance(courriel_fondateur, str) or len(courriel_fondateur.strip()) > 191:
            raise ValidationError({"courriel": "L’adresse courriel du responsable est invalide."})
        courriel_fondateur = courriel_fondateur.strip().lower()
        try:
            validate_email(courriel_fondateur)
        except DjangoValidationError as erreur:
            raise ValidationError({"courriel": "L’adresse courriel du responsable est invalide."}) from erreur
        if not isinstance(telephone_fondateur, str) or len(telephone_fondateur) > 64:
            raise ValidationError({"telephone": "Le numéro de téléphone du responsable est invalide."})
        if utiliser_compte_connecte:
            if courriel_fondateur.casefold() != request.user.courriel.casefold():
                raise ValidationError(
                    {"courriel": "Le compte connecté doit être le compte administrateur choisi."}
                )
            nom_fondateur = request.user.nom_complet
            courriel_fondateur = request.user.courriel.casefold()
            telephone_fondateur = request.user.telephone
        elif telephone_fondateur:
            try:
                valider_telephone_pays(code_pays, telephone_fondateur, "telephone_fondateur")
            except DjangoValidationError as erreur:
                raise ValidationError(
                    erreur.message_dict if hasattr(erreur, "message_dict") else erreur.messages
                ) from erreur

        utilisateur_existant = (
            request.user
            if utiliser_compte_connecte
            or (request.user.is_authenticated and not est_administrateur_plateforme)
            else None
        )
        if utilisateur_existant:
            if utilisateur_existant.courriel.casefold() != courriel_fondateur.casefold():
                raise ValidationError(
                    {"courriel": "Le responsable doit utiliser l’adresse du compte connecté."}
                )
            utilisateur = utilisateur_existant
            nouveau_compte = False
        else:
            if not isinstance(mot_de_passe, str) or not mot_de_passe:
                raise ValidationError({"mot_de_passe": "Un mot de passe est obligatoire."})
            if Utilisateur.objects.filter(courriel__iexact=courriel_fondateur).exists():
                raise ValidationError({"courriel": "Cette adresse courriel est déjà utilisée."})
            candidat = Utilisateur(
                courriel=courriel_fondateur,
                nom_complet=nom_fondateur.strip(),
                telephone=telephone_fondateur.strip(),
                role=RoleUtilisateur.DIRECTEUR,
            )
            try:
                validate_password(mot_de_passe, user=candidat)
            except DjangoValidationError as erreur:
                raise ValidationError({"mot_de_passe": erreur.messages}) from erreur
            utilisateur = candidat
            nouveau_compte = True

        donnees_configuration = dict(configuration)
        if donnees_configuration.get("url_logo"):
            donnees_configuration["url_logo"] = valider_url_image(
                donnees_configuration["url_logo"],
                "url_logo",
            )
        donnees_configuration["nom"] = nom.strip()
        donnees_configuration["ville"] = ville.strip()
        donnees_configuration["code"] = code.strip()
        donnees_configuration["type"] = type_etablissement

        champs_etablissement = {
            "nom_court": donnees_configuration.get("nom_court", nom.strip()[:22]),
            "code_pays": donnees_configuration.get("code_pays", "INTL"),
            "nom_pays": donnees_configuration.get("nom_pays", ""),
            "fuseau_horaire": donnees_configuration.get("fuseau_horaire", ""),
            "autorite_tutelle": donnees_configuration.get("autorite_tutelle", ""),
            "ville": ville.strip(),
            "adresse": donnees_configuration.get("adresse", ""),
            "telephone": donnees_configuration.get("telephone", ""),
            "courriel": courriel_fondateur,
            "site_web": donnees_configuration.get("site_web", ""),
            "annee_academique": donnees_configuration.get("annee_academique", ""),
            "libelle_periode_courante": donnees_configuration.get("libelle_periode_courante", ""),
            "devise_defaut": donnees_configuration.get("devise_defaut", "USD"),
            "taux_change_usd": donnees_configuration.get("taux_change_usd", 132),
            "format_matricule": donnees_configuration.get("format_matricule", ""),
            "echelle_notation": donnees_configuration.get("echelle_notation", 100),
            "note_passage": donnees_configuration.get("note_passage", 0),
            "couleur_accent": donnees_configuration.get("couleur_accent", "blue"),
            "devise_etablissement": donnees_configuration.get("devise_etablissement", ""),
            "url_logo": donnees_configuration.get("url_logo", ""),
            "titre_direction": donnees_configuration.get("titre_direction", ""),
            "nom_direction": donnees_configuration.get("nom_direction", nom_fondateur.strip()),
            "code_sceau": donnees_configuration.get("code_sceau", ""),
            "services_actifs": donnees_configuration.get("services_actifs", {}),
            "offre_saas": donnees_configuration.get("offre_saas", "Gratuit"),
            "statut_abonnement_saas": donnees_configuration.get("statut_abonnement_saas", ""),
            "date_fin_essai_saas": donnees_configuration.get("date_fin_essai_saas", ""),
            "reference_paiement_saas": donnees_configuration.get("reference_paiement_saas", ""),
            "bloquer_documents_si_impaye": donnees_configuration.get(
                "bloquer_documents_si_impaye",
                True,
            ),
            "configuration": donnees_configuration,
        }
        champs_texte = (
            "nom_court",
            "code_pays",
            "nom_pays",
            "fuseau_horaire",
            "autorite_tutelle",
            "adresse",
            "telephone",
            "site_web",
            "annee_academique",
            "libelle_periode_courante",
            "devise_defaut",
            "format_matricule",
            "couleur_accent",
            "devise_etablissement",
            "url_logo",
            "titre_direction",
            "nom_direction",
            "code_sceau",
            "offre_saas",
            "statut_abonnement_saas",
            "date_fin_essai_saas",
            "reference_paiement_saas",
        )
        for champ in champs_texte:
            if not isinstance(champs_etablissement[champ], str):
                raise ValidationError({champ: "Cette valeur doit être du texte."})
        if not isinstance(champs_etablissement["services_actifs"], dict):
            raise ValidationError({"services_actifs": "La configuration des services est invalide."})
        if not isinstance(champs_etablissement["bloquer_documents_si_impaye"], bool):
            raise ValidationError(
                {"bloquer_documents_si_impaye": "Cette valeur doit être vraie ou fausse."}
            )
        etablissement = Etablissement(
            id=identifiant.strip(),
            code=code.strip(),
            nom=nom.strip(),
            type=type_etablissement,
            **champs_etablissement,
        )
        try:
            etablissement.full_clean()
            etablissement.save()
        except DjangoValidationError as erreur:
            raise ValidationError({"etablissement": erreur.message_dict}) from erreur
        except IntegrityError as erreur:
            raise ValidationError(
                {"code": "Ce code ou identifiant d’établissement est déjà utilisé."}
            ) from erreur

        if nouveau_compte:
            try:
                with transaction.atomic():
                    utilisateur = Utilisateur.objects.create_user(
                        courriel=courriel_fondateur,
                        password=mot_de_passe,
                        nom_complet=nom_fondateur.strip(),
                        telephone=telephone_fondateur.strip(),
                        role=RoleUtilisateur.DIRECTEUR,
                    )
            except IntegrityError as erreur:
                raise ValidationError(
                    {"courriel": "Cette adresse courriel est déjà utilisée."}
                ) from erreur
        AffiliationEtablissement.objects.create(
            utilisateur=utilisateur,
            etablissement=etablissement,
            role=RoleUtilisateur.DIRECTEUR,
            fonction_locale=etablissement.titre_direction,
        )
        etablissement.proprietaire = utilisateur
        etablissement.save(update_fields=("proprietaire",))
        HistoriqueAbonnementSaas.objects.create(
            etablissement=etablissement,
            offre_saas=etablissement.offre_saas,
            statut_abonnement_saas=etablissement.statut_abonnement_saas,
            date_fin_essai_saas=etablissement.date_fin_essai_saas,
            reference_paiement_saas=etablissement.reference_paiement_saas,
            acteur=request.user if request.user.is_authenticated else None,
            acteur_nom=(
                request.user.nom_complet if request.user.is_authenticated else ""
            ),
        )

        unites = request.data.get("unites", [])
        elements = request.data.get("elements", [])
        if not isinstance(unites, list) or not isinstance(elements, list):
            raise ValidationError("Les unités et éléments doivent être transmis sous forme de listes.")
        if len(unites) > 100 or len(elements) > 500:
            raise ValidationError("La structure initiale dépasse le nombre d’éléments autorisé.")
        unites_creees = {}
        for donnee_unite in unites:
            if not isinstance(donnee_unite, dict):
                raise ValidationError({"unites": "Une unité initiale est invalide."})
            if donnee_unite.get("id_etablissement") not in (None, etablissement.id):
                raise ValidationError({"unites": "Une unité cible un autre établissement."})
            serializer = UniteAcademiqueSerializer(data=donnee_unite)
            serializer.is_valid(raise_exception=True)
            unite = serializer.save(etablissement=etablissement)
            unites_creees[unite.id] = unite

        for donnee_element in elements:
            if not isinstance(donnee_element, dict):
                raise ValidationError({"elements": "Un élément pédagogique initial est invalide."})
            if donnee_element.get("id_etablissement") not in (None, etablissement.id):
                raise ValidationError({"elements": "Un élément cible un autre établissement."})
            unite = unites_creees.get(donnee_element.get("id_unite"))
            if unite is None:
                raise ValidationError(
                    {"id_unite": "Chaque élément initial doit référencer une unité créée."}
                )
            serializer = ElementPedagogiqueSerializer(data=donnee_element)
            serializer.is_valid(raise_exception=True)
            serializer.save(etablissement=etablissement, unite=unite)

        evenements = [
            EvenementCalendrier.objects.create(
                id=f"cal-init-{uuid.uuid4()}",
                etablissement=etablissement,
                type="ANNEE_LIMITE",
                titre=f"Ouverture de l’année académique {etablissement.annee_academique}",
                date_debut="2026-09-07",
                concerne_unites="Tout l’établissement",
            ),
            EvenementCalendrier.objects.create(
                id=f"cal-init-{uuid.uuid4()}",
                etablissement=etablissement,
                type="PERIODE",
                titre=etablissement.libelle_periode_courante,
                date_debut="2026-09-14",
                date_fin="2026-12-18",
                concerne_unites="Toutes les unités",
            ),
            EvenementCalendrier.objects.create(
                id=f"cal-init-{uuid.uuid4()}",
                etablissement=etablissement,
                type="ANNEE_LIMITE",
                titre=f"Clôture de l’année académique {etablissement.annee_academique}",
                date_debut="2027-07-10",
                concerne_unites="Tout l’établissement",
            ),
        ]

        _enregistrer_audit_api(
            request,
            etablissement,
            "CREATION",
            "etablissements",
            etablissement.id,
            utilisateur=utilisateur,
        )
        reponse = {
            "etablissement": _serialiser_etablissement(etablissement),
            "unites": [
                UniteAcademiqueSerializer(unite).data
                for unite in unites_creees.values()
            ],
            "elements": [
                ElementPedagogiqueSerializer(element).data
                for element in ElementPedagogique.objects.filter(
                    etablissement=etablissement
                )
            ],
            "evenements_calendrier": EvenementCalendrierSerializer(evenements, many=True).data,
            "profil": ProfilUtilisateurSerializer(
                request.user if est_administrateur_plateforme else utilisateur
            ).data,
        }
        if nouveau_compte and not est_administrateur_plateforme:
            jeton = RefreshToken.for_user(utilisateur)
            session = reponse_session_cookie(
                str(jeton.access_token),
                str(jeton),
                statut=status.HTTP_201_CREATED,
            )
            session.data.update(reponse)
            return session
        return Response(reponse, status=status.HTTP_201_CREATED)


class ListeEtablissementsPlateformeView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _verifier_administrateur_plateforme(request):
        if not (request.user.est_super_admin_plateforme or request.user.is_superuser):
            raise PermissionDenied("Cette action est réservée à l’administration de la plateforme.")

    @extend_schema(
        operation_id="listerEtablissementsPlateforme",
        responses=OpenApiTypes.OBJECT,
    )
    def get(self, request):
        self._verifier_administrateur_plateforme(request)
        etablissements = list(
            Etablissement.objects.select_related("proprietaire").prefetch_related(
                Prefetch(
                    "affiliations",
                    queryset=AffiliationEtablissement.objects.filter(
                        role__in=(RoleUtilisateur.DIRECTEUR, RoleUtilisateur.ADMIN_ETAB),
                    ).select_related("utilisateur"),
                    to_attr="administrateurs_affilies_plateforme",
                )
            )
        )
        nombres_apprenants = dict(
            Apprenant.objects.filter(etablissement__in=etablissements)
            .values("etablissement_id")
            .annotate(nombre=Count("pk"))
            .values_list("etablissement_id", "nombre")
        )
        return Response(
            [
                _serialiser_etablissement(
                    etablissement,
                    metadonnees_plateforme=True,
                    nombre_apprenants=nombres_apprenants.get(etablissement.pk, 0),
                )
                for etablissement in etablissements
            ]
        )


class DetailEtablissementPlateformeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(operation_id="consulterHistoriqueAbonnementEtablissementPlateforme")
    def get(self, request, id_etablissement: str):
        ListeEtablissementsPlateformeView._verifier_administrateur_plateforme(request)
        etablissement = _obtenir_etablissement(id_etablissement)
        historique = (
            HistoriqueAbonnementSaas.objects.filter(etablissement=etablissement)
            .select_related("acteur")
            .order_by("-cree_le", "-id")
        )
        return Response(
            {
                "historique_forfaits_saas": [
                    {
                        "id": entree.id,
                        "offre_saas": entree.offre_saas,
                        "statut_abonnement_saas": entree.statut_abonnement_saas,
                        "date_fin_essai_saas": entree.date_fin_essai_saas,
                        "reference_paiement_saas": entree.reference_paiement_saas,
                        "cree_le": entree.cree_le.isoformat(),
                        "modifie_par": (
                            entree.acteur_nom
                            or (entree.acteur.nom_complet if entree.acteur else "")
                        ),
                    }
                    for entree in historique
                ]
            }
        )

    @extend_schema(
        operation_id="modifierAbonnementEtablissementPlateforme",
        request=OpenApiTypes.OBJECT,
        responses=OpenApiTypes.OBJECT,
    )
    @transaction.atomic
    def patch(self, request, id_etablissement: str):
        ListeEtablissementsPlateformeView._verifier_administrateur_plateforme(request)
        etablissement = _obtenir_etablissement(id_etablissement)
        if not isinstance(request.data, dict):
            raise ValidationError("Le corps de la requête doit être un objet JSON.")

        champs_historique = (
            "offre_saas",
            "statut_abonnement_saas",
            "date_fin_essai_saas",
            "reference_paiement_saas",
        )
        valeur_avant = tuple(getattr(etablissement, champ) for champ in champs_historique)
        modifications = dict(request.data)
        champs_autorises = {
            "offre_saas",
            "statut_abonnement_saas",
            "date_fin_essai_saas",
            "reference_paiement_saas",
            "bloquer_documents_si_impaye",
            "statut",
        }
        champs_interdits = set(modifications) - champs_autorises
        if champs_interdits:
            raise ValidationError(
                {"detail": "La console plateforme ne peut modifier que l’abonnement client."}
            )

        if "offre_saas" in modifications and (
            not isinstance(modifications["offre_saas"], str)
            or modifications["offre_saas"]
            not in {"Gratuit", "Essentiel", "Croissance", "Institutionnel"}
        ):
            raise ValidationError({"offre_saas": "Cette offre SaaS n’est pas reconnue."})
        if "statut_abonnement_saas" in modifications and (
            not isinstance(modifications["statut_abonnement_saas"], str)
            or modifications["statut_abonnement_saas"]
            not in {"", "GRATUIT", "ESSAI_14J", "PAYE", "EN_ATTENTE_PAIEMENT"}
        ):
            raise ValidationError(
                {"statut_abonnement_saas": "Ce statut d’abonnement n’est pas reconnu."}
            )
        for champ in (
            "statut_abonnement_saas",
            "date_fin_essai_saas",
            "reference_paiement_saas",
        ):
            if champ in modifications and not isinstance(modifications[champ], str):
                raise ValidationError({champ: "Cette valeur doit être du texte."})
        if "bloquer_documents_si_impaye" in modifications and not isinstance(
            modifications["bloquer_documents_si_impaye"], bool
        ):
            raise ValidationError(
                {"bloquer_documents_si_impaye": "Cette valeur doit être vraie ou fausse."}
            )
        if "statut" in modifications:
            statut = modifications.pop("statut")
            if not isinstance(statut, str) or statut not in {"ACTIF", "SUSPENDU"}:
                raise ValidationError({"statut": "Le statut doit être ACTIF ou SUSPENDU."})
            etablissement.est_actif = statut == "ACTIF"

        for champ, valeur in modifications.items():
            setattr(etablissement, champ, valeur)
        etablissement.configuration = {
            **etablissement.configuration,
            **{champ: valeur for champ, valeur in modifications.items() if champ != "statut"},
        }
        etablissement.save()
        valeur_apres = tuple(getattr(etablissement, champ) for champ in champs_historique)
        if valeur_apres != valeur_avant:
            HistoriqueAbonnementSaas.objects.create(
                etablissement=etablissement,
                offre_saas=etablissement.offre_saas,
                statut_abonnement_saas=etablissement.statut_abonnement_saas,
                date_fin_essai_saas=etablissement.date_fin_essai_saas,
                reference_paiement_saas=etablissement.reference_paiement_saas,
                acteur=request.user,
                acteur_nom=request.user.nom_complet,
            )
        return Response(
            _serialiser_etablissement(
                etablissement,
                metadonnees_plateforme=True,
                nombre_apprenants=Apprenant.objects.filter(
                    etablissement=etablissement
                ).count(),
            )
        )


class DetailEtablissementTenantView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="modifierConfigurationEtablissement",
        request=OpenApiTypes.OBJECT,
        responses=OpenApiTypes.OBJECT,
    )
    @transaction.atomic
    def patch(self, request, id_etablissement: str):
        etablissement = _obtenir_etablissement(id_etablissement)
        _verifier_permission(request, etablissement, "parametres:gerer")
        if not isinstance(request.data, dict):
            raise ValidationError("Le corps de la requête doit être un objet JSON.")

        modifications = dict(request.data)
        identifiant = modifications.pop("id", id_etablissement)
        if identifiant != id_etablissement:
            raise ValidationError({"id": "L’identifiant de l’établissement ne peut pas changer."})

        if "nom" in modifications:
            nom = modifications.pop("nom")
            if not isinstance(nom, str) or not nom.strip() or len(nom.strip()) > 191:
                raise ValidationError({"nom": "Le nom de l’établissement est invalide."})
            etablissement.nom = nom.strip()
        if "nom_court" in modifications:
            nom_court = modifications.pop("nom_court")
            if not isinstance(nom_court, str) or len(nom_court.strip()) > 100:
                raise ValidationError({"nom_court": "Le nom court de l’établissement est invalide."})
            etablissement.nom_court = nom_court.strip()
        if "code" in modifications:
            code = modifications.pop("code")
            if not isinstance(code, str) or not code.strip() or len(code.strip()) > 64:
                raise ValidationError({"code": "Le code de l’établissement est invalide."})
            etablissement.code = code.strip()
        if "type" in modifications:
            type_etablissement = modifications.pop("type")
            if type_etablissement not in TypeEtablissement.values:
                raise ValidationError({"type": "Le type d’établissement est invalide."})
            etablissement.type = type_etablissement
        if "code_pays" in modifications:
            try:
                modifications["code_pays"] = valider_code_pays(modifications["code_pays"])
            except DjangoValidationError as erreur:
                raise ValidationError(erreur.message_dict if hasattr(erreur, "message_dict") else erreur.messages) from erreur
        if "devise_defaut" in modifications:
            try:
                modifications["devise_defaut"] = valider_code_devise(modifications["devise_defaut"])
            except DjangoValidationError as erreur:
                raise ValidationError(erreur.message_dict if hasattr(erreur, "message_dict") else erreur.messages) from erreur
        champs_configuration_etablissement = (
            "code_pays",
            "nom_pays",
            "fuseau_horaire",
            "autorite_tutelle",
            "ville",
            "adresse",
            "telephone",
            "courriel",
            "site_web",
            "annee_academique",
            "libelle_periode_courante",
            "devise_defaut",
            "taux_change_usd",
            "format_matricule",
            "echelle_notation",
            "note_passage",
            "couleur_accent",
            "devise_etablissement",
            "url_logo",
            "titre_direction",
            "nom_direction",
            "code_sceau",
            "services_actifs",
            "offre_saas",
            "statut_abonnement_saas",
            "date_fin_essai_saas",
            "reference_paiement_saas",
            "bloquer_documents_si_impaye",
        )
        for champ in champs_configuration_etablissement:
            if champ in modifications:
                setattr(etablissement, champ, modifications[champ])
        couleurs_accent_autorisees = {
            "blue",
            "teal",
            "violet",
            "orange",
            "red",
            "navy",
        }
        if (
            not isinstance(etablissement.couleur_accent, str)
            or etablissement.couleur_accent not in couleurs_accent_autorisees
        ):
            raise ValidationError({"couleur_accent": "Cette couleur d’établissement n’est pas reconnue."})
        if "url_logo" in modifications and modifications["url_logo"]:
            etablissement.url_logo = valider_url_image(modifications["url_logo"], "url_logo")
            modifications["url_logo"] = etablissement.url_logo
        if "code_pays" in modifications or "telephone" in modifications:
            try:
                valider_telephone_pays(
                    etablissement.code_pays,
                    etablissement.telephone,
                )
            except DjangoValidationError as erreur:
                raise ValidationError(
                    erreur.message_dict if hasattr(erreur, "message_dict") else erreur.messages
                ) from erreur
        if etablissement.code_pays == "INTL" and (
            "code_pays" in modifications or "fuseau_horaire" in modifications
        ):
            try:
                valider_fuseau_iana(etablissement.fuseau_horaire)
            except DjangoValidationError as erreur:
                raise ValidationError(
                    {"fuseau_horaire": erreur.messages}
                ) from erreur
        if "statut" in modifications:
            statut = modifications.pop("statut")
            if not isinstance(statut, str) or statut not in {"ACTIF", "SUSPENDU"}:
                raise ValidationError({"statut": "Le statut doit être ACTIF ou SUSPENDU."})
            etablissement.est_actif = statut == "ACTIF"

        if modifications:
            etablissement.configuration = {
                **etablissement.configuration,
                **modifications,
            }
        try:
            etablissement.save()
        except IntegrityError as erreur:
            raise ValidationError({"code": "Ce code d’établissement est déjà utilisé."}) from erreur

        _enregistrer_audit_api(
            request,
            etablissement,
            "MODIFICATION",
            "etablissements",
            etablissement.id,
        )
        return Response(_serialiser_etablissement(etablissement))


class PermissionsRolesTenantView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="listerPermissionsRoles",
        responses=OpenApiTypes.OBJECT,
    )
    def get(self, request, id_etablissement: str):
        etablissement = _obtenir_etablissement(id_etablissement)
        _verifier_permission(request, etablissement, "roles:gerer")
        surcharges = SurchargePermissions.objects.filter(etablissement=etablissement).exclude(
            role="SUPER_ADMIN"
        )
        return Response(
            {
                "permissions": {
                    surcharge.role: surcharge.permissions for surcharge in surcharges
                }
            }
        )

    @extend_schema(
        operation_id="modifierPermissionsRole",
        request=inline_serializer(
            name="ModifierPermissionsRole",
            fields={
                "role": serializers.ChoiceField(choices=[role for role in PERMISSIONS_PAR_ROLE if role != "SUPER_ADMIN"]),
                "permissions": serializers.ListField(child=serializers.CharField()),
            },
        ),
        responses=OpenApiTypes.OBJECT,
    )
    def put(self, request, id_etablissement: str):
        etablissement = _obtenir_etablissement(id_etablissement)
        _verifier_permission(request, etablissement, "roles:gerer")
        role = request.data.get("role")
        permissions = request.data.get("permissions")
        if not isinstance(role, str) or role not in PERMISSIONS_PAR_ROLE or role == "SUPER_ADMIN":
            raise ValidationError({"role": "Le rôle demandé ne peut pas être modifié."})
        if not isinstance(permissions, list) or any(
            not isinstance(permission, str) for permission in permissions
        ):
            raise ValidationError({"permissions": "La liste de permissions est invalide."})
        permissions_valides = set().union(*PERMISSIONS_PAR_ROLE.values())
        permissions_uniques = list(dict.fromkeys(permissions))
        inconnues = set(permissions_uniques) - permissions_valides
        if inconnues:
            raise ValidationError({"permissions": "Une ou plusieurs permissions sont inconnues."})

        surcharge, _ = SurchargePermissions.objects.get_or_create(
            etablissement=etablissement,
            role=role,
            defaults={"permissions": []},
        )
        surcharge.permissions = permissions_uniques
        surcharge.save(update_fields=("permissions",))
        _enregistrer_audit_api(request, etablissement, "MODIFICATION", "roles", role)
        return Response({"role": role, "permissions": permissions_uniques})


class ListeUtilisateursTenantView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _serialiser_utilisateur(utilisateur, etablissement, affiliation=None) -> dict:
        if affiliation is None:
            affiliation = AffiliationEtablissement.objects.get(
                utilisateur=utilisateur,
                etablissement=etablissement,
            )
        profil = utilisateur.profil or {}
        initiales = "".join(
            mot[0].upper() for mot in utilisateur.nom_complet.split() if mot
        )[:2]
        return {
            "id": utilisateur.id,
            "nom_complet": utilisateur.nom_complet,
            "courriel": utilisateur.courriel,
            "telephone": utilisateur.telephone,
            "mot_de_passe_demo": "",
            "initiales_avatar": initiales,
            "est_super_admin_plateforme": bool(
                utilisateur.est_super_admin_plateforme or utilisateur.is_superuser
            ),
            "a_mot_de_passe": utilisateur.has_usable_password(),
            "est_actif": utilisateur.est_actif,
            "url_avatar": profil.get("url_avatar"),
            "double_facteur_actif": profil.get("double_facteur_actif", False),
            "doit_changer_mot_de_passe": profil.get("doit_changer_mot_de_passe", False),
            "mot_de_passe_mis_a_jour_le": profil.get("mot_de_passe_mis_a_jour_le"),
            "tentatives_connexion_echouees": profil.get("tentatives_connexion_echouees", 0),
            "verrouille_jusqua": profil.get("verrouille_jusqua"),
            "affiliations": [
                {
                    "id_etablissement": etablissement.id,
                    "id_role": affiliation.role,
                    "fonction_locale": affiliation.fonction_locale,
                }
            ],
        }

    @extend_schema(
        operation_id="listerUtilisateursEtablissement",
        responses=OpenApiTypes.OBJECT,
    )
    def get(self, request, id_etablissement: str):
        etablissement = _obtenir_etablissement(id_etablissement)
        _verifier_permission(request, etablissement, "comptes:gerer")
        affiliations = (
            AffiliationEtablissement.objects.filter(etablissement=etablissement)
            .select_related("utilisateur")
            .order_by("utilisateur__nom_complet", "utilisateur__courriel")
        )
        return Response(
            [
                self._serialiser_utilisateur(
                    affiliation.utilisateur,
                    etablissement,
                    affiliation,
                )
                for affiliation in affiliations
            ]
        )

    @extend_schema(
        operation_id="creerUtilisateurEtablissement",
        request=OpenApiTypes.OBJECT,
        responses=OpenApiTypes.OBJECT,
    )
    @transaction.atomic
    def post(self, request, id_etablissement: str):
        etablissement = _obtenir_etablissement(id_etablissement)
        _verifier_permission(request, etablissement, "comptes:gerer")
        donnees = request.data
        nom_complet = donnees.get("nom_complet")
        courriel = donnees.get("courriel")
        telephone = donnees.get("telephone", "")
        role = donnees.get("id_role")
        fonction_locale = donnees.get("fonction_locale", "")
        mot_de_passe = donnees.get("mot_de_passe")
        if not isinstance(nom_complet, str) or len(nom_complet.strip()) < 2:
            raise ValidationError({"nom_complet": "Le nom complet doit contenir au moins 2 caractères."})
        if not isinstance(courriel, str):
            raise ValidationError({"courriel": "Une adresse courriel valide est obligatoire."})
        courriel = courriel.strip()
        try:
            validate_email(courriel)
        except DjangoValidationError as erreur:
            raise ValidationError({"courriel": "L’adresse courriel est invalide."}) from erreur
        if not isinstance(role, str) or role not in RoleUtilisateur.values or role == "SUPER_ADMIN":
            raise ValidationError({"id_role": "Le rôle demandé ne peut pas être attribué."})
        if not isinstance(telephone, str) or not isinstance(fonction_locale, str):
            raise ValidationError("Les coordonnées de l’utilisateur sont invalides.")
        doit_changer_mot_de_passe = donnees.get("doit_changer_mot_de_passe", False)
        if not isinstance(doit_changer_mot_de_passe, bool):
            raise ValidationError(
                {"doit_changer_mot_de_passe": "Cette valeur doit être un booléen."}
            )
        utilisateur = (
            Utilisateur.objects.select_for_update()
            .filter(courriel__iexact=courriel)
            .first()
        )
        nouveau_compte = utilisateur is None
        if utilisateur is not None:
            if not utilisateur.is_active:
                raise ValidationError({"courriel": "Ce compte est désactivé."})
            if AffiliationEtablissement.objects.filter(
                utilisateur=utilisateur,
                etablissement=etablissement,
            ).exists():
                raise ValidationError(
                    {"courriel": "Ce compte est déjà affilié à cet établissement."}
                )
        else:
            if not isinstance(mot_de_passe, str) or len(mot_de_passe) < 8:
                raise ValidationError(
                    {"mot_de_passe": "Le mot de passe doit contenir au moins 8 caractères."}
                )
            profil = {
                "double_facteur_actif": bool(donnees.get("double_facteur_actif", False)),
                "doit_changer_mot_de_passe": doit_changer_mot_de_passe,
                "mot_de_passe_mis_a_jour_le": timezone.now().date().isoformat(),
                "tentatives_connexion_echouees": 0,
            }
            utilisateur = Utilisateur.objects.create_user(
                courriel=courriel,
                password=mot_de_passe,
                nom_complet=nom_complet.strip(),
                telephone=telephone.strip(),
                role=role,
                profil=profil,
            )
        affiliation = AffiliationEtablissement.objects.create(
            utilisateur=utilisateur,
            etablissement=etablissement,
            role=role,
            fonction_locale=fonction_locale.strip(),
        )
        _enregistrer_audit_api(
            request,
            etablissement,
            "CREATION",
            "comptes",
            utilisateur.id,
        )
        etiquette_role = RoleUtilisateur(role).label
        fonction_attribuee = fonction_locale.strip() or etiquette_role
        url_connexion = f"{settings.DJANGO_FRONTEND_URL}/"
        texte_acces = (
            "Votre compte Klasik ERP existant et ses identifiants sont conservés. "
            "Connectez-vous avec votre méthode habituelle (Google ou mot de passe). "
            "Si vous utilisez Google, vous pouvez créer un mot de passe depuis "
            "Profil > Sécurité après connexion."
            if not nouveau_compte
            else (
                "Lors de votre première connexion, vous devrez obligatoirement remplacer "
                "le mot de passe temporaire par un mot de passe personnel avant d’accéder "
                "à l’espace de travail."
                if doit_changer_mot_de_passe
                else "Le changement de mot de passe n’est pas obligatoire à la première "
                "connexion, mais il est recommandé."
            )
        )
        texte_mot_de_passe_temporaire = (
            "Votre mot de passe temporaire ne figure pas dans ce courriel. "
            "Demandez-le à l’administrateur par un canal séparé.\n\n"
            if nouveau_compte
            else ""
        )
        message = (
            f"Bonjour {utilisateur.nom_complet},\n\n"
            f"Vous avez été invité(e) à rejoindre {etablissement.nom} sur Klasik ERP.\n"
            f"Rôle attribué : {etiquette_role}.\n"
            f"Fonction dans l’établissement : {fonction_attribuee}.\n"
            f"Adresse de votre compte : {utilisateur.courriel}.\n\n"
            f"Pour vous connecter : {url_connexion}\n\n"
            f"{texte_acces}\n\n"
            f"{texte_mot_de_passe_temporaire}"
            "Si vous n’attendiez pas cette invitation, contactez l’établissement."
        )
        try:
            nombre_courriels_envoyes = send_mail(
                subject=f"Invitation à rejoindre {etablissement.nom} – Klasik ERP",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[utilisateur.courriel],
                fail_silently=False,
            )
        except (SMTPException, OSError) as erreur:
            logger.exception(
                "Échec de l’envoi du courriel d’invitation à %s",
                utilisateur.courriel,
            )
            raise EchecCourrielInvitation() from erreur
        if nombre_courriels_envoyes != 1:
            logger.error(
                "Le backend courriel n’a pas accepté l’invitation de %s",
                utilisateur.courriel,
            )
            raise EchecCourrielInvitation()
        return Response(
            self._serialiser_utilisateur(utilisateur, etablissement, affiliation),
            status=status.HTTP_201_CREATED,
        )


class DetailUtilisateurTenantView(APIView):
    permission_classes = [IsAuthenticated]

    def _obtenir_affiliation(self, request, id_etablissement, id_utilisateur):
        etablissement = _obtenir_etablissement(id_etablissement)
        _verifier_permission(request, etablissement, "comptes:gerer")
        affiliation = get_object_or_404(
            AffiliationEtablissement.objects.select_related("utilisateur"),
            etablissement=etablissement,
            utilisateur_id=id_utilisateur,
        )
        return etablissement, affiliation

    @extend_schema(operation_id="modifierUtilisateurEtablissement", request=OpenApiTypes.OBJECT)
    @transaction.atomic
    def patch(self, request, id_etablissement: str, id_utilisateur: str):
        etablissement, affiliation = self._obtenir_affiliation(
            request,
            id_etablissement,
            id_utilisateur,
        )
        utilisateur = affiliation.utilisateur
        if utilisateur.est_super_admin_plateforme or utilisateur.is_superuser:
            raise PermissionDenied("Le compte Super-administrateur Plateforme est protégé.")
        donnees = request.data
        champs_autorises = {
            "nom_complet",
            "courriel",
            "telephone",
            "fonction_locale",
            "id_role",
            "mot_de_passe",
            "est_actif",
            "double_facteur_actif",
            "doit_changer_mot_de_passe",
            "tentatives_connexion_echouees",
            "verrouille_jusqua",
        }
        inconnus = set(donnees) - champs_autorises
        if inconnus:
            raise ValidationError({"champs": "Un ou plusieurs champs ne peuvent pas être modifiés."})

        if "nom_complet" in donnees:
            nom_complet = donnees["nom_complet"]
            if not isinstance(nom_complet, str) or len(nom_complet.strip()) < 2:
                raise ValidationError({"nom_complet": "Le nom complet est invalide."})
            utilisateur.nom_complet = nom_complet.strip()
        if "courriel" in donnees:
            courriel = donnees["courriel"]
            if not isinstance(courriel, str):
                raise ValidationError({"courriel": "L’adresse courriel est invalide."})
            try:
                validate_email(courriel)
            except DjangoValidationError as erreur:
                raise ValidationError({"courriel": "L’adresse courriel est invalide."}) from erreur
            if Utilisateur.objects.filter(courriel__iexact=courriel.strip()).exclude(pk=utilisateur.pk).exists():
                raise ValidationError({"courriel": "Cette adresse courriel est déjà utilisée."})
            utilisateur.courriel = courriel.strip()
        if "telephone" in donnees:
            telephone = donnees["telephone"]
            if not isinstance(telephone, str):
                raise ValidationError({"telephone": "Le téléphone est invalide."})
            utilisateur.telephone = telephone.strip()
        if "fonction_locale" in donnees:
            fonction = donnees["fonction_locale"]
            if not isinstance(fonction, str):
                raise ValidationError({"fonction_locale": "La fonction est invalide."})
            affiliation.fonction_locale = fonction.strip()
        if "id_role" in donnees:
            role = donnees["id_role"]
            if not isinstance(role, str) or role not in RoleUtilisateur.values or role == "SUPER_ADMIN":
                raise ValidationError({"id_role": "Le rôle demandé ne peut pas être attribué."})
            affiliation.role = role
            utilisateur.role = role

        profil = dict(utilisateur.profil or {})
        for champ in (
            "double_facteur_actif",
            "doit_changer_mot_de_passe",
            "tentatives_connexion_echouees",
            "verrouille_jusqua",
        ):
            if champ in donnees:
                valeur = donnees[champ]
                if champ in {"double_facteur_actif", "doit_changer_mot_de_passe"} and not isinstance(
                    valeur, bool
                ):
                    raise ValidationError({champ: "Cette valeur doit être booléenne."})
                if champ == "tentatives_connexion_echouees" and (
                    not isinstance(valeur, int) or valeur < 0
                ):
                    raise ValidationError({champ: "Le nombre de tentatives est invalide."})
                if champ == "verrouille_jusqua" and valeur is not None and not isinstance(valeur, str):
                    raise ValidationError({champ: "La date de verrouillage est invalide."})
                profil[champ] = donnees[champ]
        if "est_actif" in donnees:
            if not isinstance(donnees["est_actif"], bool):
                raise ValidationError({"est_actif": "Le statut du compte est invalide."})
            autres_affiliations = AffiliationEtablissement.objects.filter(
                utilisateur=utilisateur
            ).exclude(etablissement=etablissement)
            if autres_affiliations.exists():
                raise ValidationError(
                    {"est_actif": "Ce compte est multi-établissements; sa suspension globale est refusée."}
                )
            utilisateur.is_active = donnees["est_actif"]
        if "mot_de_passe" in donnees:
            mot_de_passe = donnees["mot_de_passe"]
            if not isinstance(mot_de_passe, str) or len(mot_de_passe) < 8:
                raise ValidationError({"mot_de_passe": "Le mot de passe doit contenir au moins 8 caractères."})
            utilisateur.set_password(mot_de_passe)
            profil["mot_de_passe_mis_a_jour_le"] = timezone.now().date().isoformat()
            profil["tentatives_connexion_echouees"] = 0
            profil["verrouille_jusqua"] = None

        utilisateur.profil = profil
        utilisateur.save()
        affiliation.save()
        _enregistrer_audit_api(
            request,
            etablissement,
            "MODIFICATION",
            "comptes",
            utilisateur.id,
        )
        return Response(
            ListeUtilisateursTenantView._serialiser_utilisateur(
                utilisateur,
                etablissement,
                affiliation,
            )
        )

    @extend_schema(operation_id="retirerUtilisateurEtablissement", responses={204: None})
    @transaction.atomic
    def delete(self, request, id_etablissement: str, id_utilisateur: str):
        etablissement, affiliation = self._obtenir_affiliation(
            request,
            id_etablissement,
            id_utilisateur,
        )
        utilisateur = affiliation.utilisateur
        if utilisateur.id == request.user.id:
            raise PermissionDenied("Vous ne pouvez pas retirer votre propre compte de l’établissement.")
        if utilisateur.est_super_admin_plateforme or utilisateur.is_superuser:
            raise PermissionDenied("Le compte Super-administrateur Plateforme est protégé.")
        affiliation.delete()
        if not utilisateur.affiliations.exists():
            utilisateur.is_active = False
            utilisateur.save(update_fields=("is_active",))
        _enregistrer_audit_api(
            request,
            etablissement,
            "SUPPRESSION",
            "comptes",
            utilisateur.id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class JournalAuditTenantView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="listerJournalAuditEtablissement",
        responses=OpenApiTypes.OBJECT,
    )
    def get(self, request, id_etablissement: str):
        etablissement = _obtenir_etablissement(id_etablissement)
        _verifier_permission(request, etablissement, "audit:voir")
        categories = {
            "roles": "RBAC",
            "documents": "DOCUMENT",
            "apprenants": "ADMISSION",
            "inscriptions": "ADMISSION",
            "paiements": "FINANCE",
            "notes": "PEDAGOGIE",
            "presences": "PEDAGOGIE",
            "emplois_du_temps": "PEDAGOGIE",
        }
        entrees = (
            EntreeAuditApi.objects.filter(etablissement=etablissement)
            .select_related("utilisateur")
            .order_by("-cree_le", "-id")[:200]
        )
        return Response(
            [
                {
                    "id": str(entree.id),
                    "id_etablissement": etablissement.id,
                    "nom_acteur": entree.nom_acteur or entree.utilisateur.nom_complet,
                    "role_acteur": entree.role_acteur or entree.utilisateur.role,
                    "action": entree.action,
                    "cible": f"{entree.collection}:{entree.id_objet}",
                    "categorie": categories.get(entree.collection, "CONFIG"),
                    "horodatage": entree.cree_le.isoformat(),
                }
                for entree in entrees
            ]
        )


class CollectionTenantView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="listerDonneesEtablissement",
        responses=OpenApiTypes.OBJECT,
        description="Liste paginée des enregistrements visibles dans l’établissement autorisé.",
    )
    def get(self, request, id_etablissement: str, collection: str):
        etablissement = _obtenir_etablissement(id_etablissement)
        permission_lecture, _ = _permissions_collection(request, etablissement, collection)
        _verifier_permission(request, etablissement, permission_lecture)
        role = role_utilisateur_etablissement(request.user, etablissement)
        perimetre = _perimetre_utilisateur(request.user, role, etablissement)

        enregistrements = EnregistrementMetier.objects.filter(
            etablissement=etablissement,
            collection=collection,
        )
        filtres_reserves = {"page", "page_size", "search", "ordering"}
        filtres = {
            cle: valeur
            for cle, valeur in request.query_params.items()
            if cle not in filtres_reserves
        }
        resultat = []
        for enregistrement in enregistrements:
            donnees = _donnees_publiques(enregistrement)
            if not _objet_dans_perimetre(role, collection, donnees, perimetre):
                continue
            if any(str(donnees.get(cle, "")) != valeur for cle, valeur in filtres.items()):
                continue
            recherche = request.query_params.get("search", "").strip().casefold()
            if recherche and recherche not in json.dumps(donnees, ensure_ascii=False).casefold():
                continue
            resultat.append(donnees)

        ordre = request.query_params.get("ordering", "id")
        if ordre not in {"id", "-id"}:
            raise ValidationError({"ordering": "Le tri autorisé est « id » ou « -id »."})
        resultat.sort(key=lambda objet: objet["id"], reverse=ordre.startswith("-"))

        try:
            taille = int(request.query_params.get("page_size", "50"))
        except ValueError as erreur:
            raise ValidationError({"page_size": "La taille de page doit être un nombre entier."}) from erreur
        if not 1 <= taille <= 100:
            raise ValidationError({"page_size": "La taille de page doit être comprise entre 1 et 100."})
        try:
            page = Paginator(resultat, taille).page(request.query_params.get("page", 1))
        except (PageNotAnInteger, EmptyPage) as erreur:
            raise ValidationError({"page": "Le numéro de page demandé est invalide."}) from erreur

        return Response(
            {
                "count": page.paginator.count,
                "next": page.next_page_number() if page.has_next() else None,
                "previous": page.previous_page_number() if page.has_previous() else None,
                "results": list(page.object_list),
            }
        )

    @extend_schema(
        operation_id="creerDonneeEtablissement",
        request=OpenApiTypes.OBJECT,
        responses=OpenApiTypes.OBJECT,
    )
    @transaction.atomic
    def post(self, request, id_etablissement: str, collection: str):
        etablissement = _obtenir_etablissement(id_etablissement)
        _, permission_ecriture = _valider_collection(collection)
        _verifier_permission(request, etablissement, permission_ecriture)
        donnees = _valider_payload(request.data, etablissement.id)
        role = role_utilisateur_etablissement(request.user, etablissement)
        perimetre = _perimetre_utilisateur(request.user, role, etablissement)
        if not _objet_dans_perimetre(role, collection, donnees, perimetre):
            raise PermissionDenied("Cet enregistrement est hors de votre périmètre autorisé.")
        try:
            enregistrement = EnregistrementMetier.objects.create(
                etablissement=etablissement,
                collection=collection,
                id_objet=donnees["id"],
                donnees=donnees,
            )
        except IntegrityError as erreur:
            raise ValidationError({"id": "Cet identifiant existe déjà dans cette collection."}) from erreur
        _enregistrer_audit_api(
            request,
            etablissement,
            "CREATION",
            collection,
            enregistrement.id_objet,
        )
        return Response(_donnees_publiques(enregistrement), status=status.HTTP_201_CREATED)


class DetailEnregistrementTenantView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="lireDonneeEtablissement",
        responses=OpenApiTypes.OBJECT,
    )
    def get(self, request, id_etablissement: str, collection: str, id_objet: str):
        etablissement = _obtenir_etablissement(id_etablissement)
        permission_lecture, _ = _permissions_collection(request, etablissement, collection)
        _verifier_permission(request, etablissement, permission_lecture)
        role = role_utilisateur_etablissement(request.user, etablissement)
        perimetre = _perimetre_utilisateur(request.user, role, etablissement)
        enregistrement = get_object_or_404(
            EnregistrementMetier,
            etablissement=etablissement,
            collection=collection,
            id_objet=id_objet,
        )
        donnees = _donnees_publiques(enregistrement)
        if not _objet_dans_perimetre(role, collection, donnees, perimetre):
            raise NotFound("L’enregistrement demandé est introuvable.")
        return Response(donnees)

    @extend_schema(
        operation_id="modifierDonneeEtablissement",
        request=OpenApiTypes.OBJECT,
        responses=OpenApiTypes.OBJECT,
    )
    @transaction.atomic
    def patch(self, request, id_etablissement: str, collection: str, id_objet: str):
        etablissement = _obtenir_etablissement(id_etablissement)
        _, permission_ecriture = _valider_collection(collection)
        _verifier_permission(request, etablissement, permission_ecriture)
        role = role_utilisateur_etablissement(request.user, etablissement)
        perimetre = _perimetre_utilisateur(request.user, role, etablissement)
        enregistrement = get_object_or_404(
            EnregistrementMetier.objects.select_for_update(),
            etablissement=etablissement,
            collection=collection,
            id_objet=id_objet,
        )
        modifications = request.data
        if not isinstance(modifications, dict):
            raise ValidationError("Le corps de la requête doit être un objet JSON.")
        donnees = {**enregistrement.donnees, **modifications}
        donnees = _valider_payload(donnees, etablissement.id, id_objet)
        if not _objet_dans_perimetre(role, collection, donnees, perimetre):
            raise PermissionDenied("Cet enregistrement est hors de votre périmètre autorisé.")
        enregistrement.donnees = donnees
        enregistrement.save(update_fields=("donnees", "modifie_le"))
        _enregistrer_audit_api(request, etablissement, "MODIFICATION", collection, id_objet)
        return Response(_donnees_publiques(enregistrement))

    @extend_schema(operation_id="supprimerDonneeEtablissement", responses={204: None})
    @transaction.atomic
    def delete(self, request, id_etablissement: str, collection: str, id_objet: str):
        etablissement = _obtenir_etablissement(id_etablissement)
        _, permission_ecriture = _valider_collection(collection)
        _verifier_permission(request, etablissement, permission_ecriture)
        role = role_utilisateur_etablissement(request.user, etablissement)
        perimetre = _perimetre_utilisateur(request.user, role, etablissement)
        enregistrement = get_object_or_404(
            EnregistrementMetier.objects.select_for_update(),
            etablissement=etablissement,
            collection=collection,
            id_objet=id_objet,
        )
        if not _objet_dans_perimetre(
            role,
            collection,
            _donnees_publiques(enregistrement),
            perimetre,
        ):
            raise NotFound("L’enregistrement demandé est introuvable.")
        _enregistrer_audit_api(request, etablissement, "SUPPRESSION", collection, id_objet)
        enregistrement.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


COLLECTIONS_AVEC_ID_APPRENANT = {
    "inscriptions",
    "paiements",
    "notes",
    "presences",
    "documents",
    "emprunts_bibliotheque",
    "visites_infirmerie",
    "incidents_discipline",
    "abonnements",
    "remises_devoirs_lms",
    "consentements_rgpd",
    "demandes_rgpd",
    "badges_attribues",
    "soutenances",
}


def _objet_dans_perimetre(role, collection, donnees, perimetre) -> bool:
    if role in {"PARENT", "APPRENANT"}:
        ids_apprenants = perimetre["ids_apprenants"]
        ids_unites = perimetre["ids_unites"]
        if collection == "apprenants":
            return donnees.get("id") in ids_apprenants
        if collection in COLLECTIONS_AVEC_ID_APPRENANT:
            return donnees.get("id_apprenant") in ids_apprenants
        if collection in {"articles_actualites", "communications"}:
            audience = donnees.get("audience", "Tous")
            return audience in {"Tous", "Parents" if role == "PARENT" else "Apprenants"}
        if collection == "unites":
            return donnees.get("id") in ids_unites
        if collection in {"elements", "ressources_lms", "devoirs_lms"}:
            return donnees.get("id_unite") in ids_unites
        if collection == "emplois_du_temps":
            return donnees.get("id_unite") in ids_unites
        return collection in {
            "livres_bibliotheque",
            "inventaire",
            "evenements_calendrier",
            "notifications",
        }

    if role == "ENSEIGNANT":
        ids_unites = perimetre["ids_unites"]
        ids_elements = perimetre["ids_elements"]
        ids_apprenants = perimetre["ids_apprenants"]
        if collection == "enseignants":
            return donnees.get("id") == perimetre.get("id_enseignant")
        if collection in {"unites", "elements", "apprenants", "emplois_du_temps", "presences", "notes", "cahiers_textes", "ressources_lms", "devoirs_lms", "remises_devoirs_lms"}:
            if collection == "unites":
                return donnees.get("id") in ids_unites
            if collection in {"elements", "ressources_lms", "devoirs_lms", "remises_devoirs_lms"}:
                if collection == "remises_devoirs_lms":
                    return donnees.get("id_devoir") in perimetre["ids_devoirs"]
                return donnees.get("id_unite") in ids_unites and (
                    not ids_elements or donnees.get("id_element") in ids_elements
                )
            if collection == "apprenants":
                return donnees.get("id_unite") in ids_unites
            return donnees.get("id_unite") in ids_unites or donnees.get("id_apprenant") in ids_apprenants
    return True
