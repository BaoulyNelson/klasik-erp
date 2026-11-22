import json

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from comptes.models import AffiliationEtablissement, SurchargePermissions
from api.permissions import (
    COLLECTIONS_PORTAIL,
    PERMISSIONS_PAR_ROLE,
    PERMISSIONS_COLLECTIONS,
    permissions_utilisateur,
    role_utilisateur_etablissement,
)
from donnees.models import EnregistrementMetier, EntreeAuditApi
from etablissements.models import Etablissement

COLLECTIONS_GLOBALES = {"etablissements", "configuration_plateforme"}


def _valider_collection(collection: str) -> tuple[str | None, str | None]:
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
    permission_classes = [IsAuthenticated]

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
        if request.user.est_super_admin_plateforme:
            etablissements = Etablissement.objects.all()
        else:
            etablissements = Etablissement.objects.filter(
                affiliations__utilisateur=request.user
            ).distinct()
        resultats = []
        for etablissement in etablissements:
            resultats.append(
                {
                    **etablissement.configuration,
                    "id": etablissement.id,
                    "code": etablissement.code,
                    "nom": etablissement.nom,
                    "nom_court": etablissement.nom_court,
                    "type": etablissement.type,
                    "statut": "ACTIF" if etablissement.est_actif else "SUSPENDU",
                }
            )
        return Response(resultats)


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
        EntreeAuditApi.objects.create(
            etablissement=etablissement,
            utilisateur=request.user,
            action="MODIFICATION",
            collection="roles",
            id_objet=role,
        )
        return Response({"role": role, "permissions": permissions_uniques})


class ListeUtilisateursTenantView(APIView):
    permission_classes = [IsAuthenticated]

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
        utilisateurs = []
        for affiliation in affiliations:
            utilisateur = affiliation.utilisateur
            initiales = "".join(
                mot[0].upper()
                for mot in utilisateur.nom_complet.split()
                if mot
            )[:2]
            utilisateurs.append(
                {
                    "id": utilisateur.id,
                    "nom_complet": utilisateur.nom_complet,
                    "courriel": utilisateur.courriel,
                    "telephone": utilisateur.telephone,
                    "mot_de_passe_demo": "",
                    "initiales_avatar": initiales,
                    "est_super_admin_plateforme": utilisateur.est_super_admin_plateforme,
                    "est_actif": utilisateur.est_actif,
                    "affiliations": [
                        {
                            "id_etablissement": etablissement.id,
                            "id_role": affiliation.role,
                            "fonction_locale": affiliation.fonction_locale,
                        }
                    ],
                }
            )
        return Response(utilisateurs)


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
        EntreeAuditApi.objects.create(
            etablissement=etablissement,
            utilisateur=request.user,
            action="CREATION",
            collection=collection,
            id_objet=enregistrement.id_objet,
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
        EntreeAuditApi.objects.create(
            etablissement=etablissement,
            utilisateur=request.user,
            action="MODIFICATION",
            collection=collection,
            id_objet=id_objet,
        )
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
        EntreeAuditApi.objects.create(
            etablissement=etablissement,
            utilisateur=request.user,
            action="SUPPRESSION",
            collection=collection,
            id_objet=id_objet,
        )
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
