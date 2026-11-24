import hashlib
import hmac
import logging
import secrets
from smtplib import SMTPException
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import EmailMessage, send_mail
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenBlacklistSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from api.authentication import verifier_csrf_cookie
from api.cookies import (
    ajouter_cookies_jetons,
    effacer_cookies_jetons,
    reponse_session_cookie,
)
from api.permissions import permissions_utilisateur
from api.serializers import (
    ConfigurationMarquePlateformeSerializer,
    ProfilUtilisateurSerializer,
)
from comptes.models import (
    AffiliationEtablissement,
    JetonReinitialisation,
    RoleUtilisateur,
    Utilisateur,
)
from etablissements.models import ConfigurationMarquePlateforme
from api.validators import valider_url_image

logger = logging.getLogger(__name__)


class ContactPublicSerializer(serializers.Serializer):
    nom = serializers.CharField(max_length=120, trim_whitespace=True)
    courriel = serializers.EmailField(max_length=254)
    sujet = serializers.CharField(max_length=160, trim_whitespace=True)
    message = serializers.CharField(max_length=5000, trim_whitespace=True)

    def validate_sujet(self, value):
        if "\r" in value or "\n" in value:
            raise serializers.ValidationError("Le sujet ne peut pas contenir de saut de ligne.")
        return value


class ContactMailUnavailable(APIException):
    status_code = 503
    default_detail = "Le message n’a pas pu être envoyé. Veuillez réessayer plus tard."
    default_code = "contact_unavailable"


class CookieCsrfView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        responses=inline_serializer(
            name="JetonCsrf",
            fields={"csrf_token": serializers.CharField()},
        )
    )
    def get(self, request):
        from django.middleware.csrf import get_token

        return Response({"csrf_token": get_token(request._request)})


class ContactPublicView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_contact"

    @extend_schema(
        request=inline_serializer(
            name="DemandeContact",
            fields={
                "nom": serializers.CharField(max_length=120),
                "courriel": serializers.EmailField(max_length=254),
                "sujet": serializers.CharField(max_length=160),
                "message": serializers.CharField(max_length=5000),
            },
        ),
        responses=inline_serializer(
            name="ContactEnvoye",
            fields={"message": serializers.CharField()},
        ),
    )
    def post(self, request):
        verifier_csrf_cookie(request)
        formulaire = ContactPublicSerializer(data=request.data)
        formulaire.is_valid(raise_exception=True)
        donnees = formulaire.validated_data
        try:
            courriel = EmailMessage(
                subject=f"Contact Klasik ERP : {donnees['sujet']}",
                body=(
                    f"Nom : {donnees['nom']}\n"
                    f"Courriel : {donnees['courriel']}\n\n"
                    f"{donnees['message']}"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[settings.DJANGO_SUPPORT_EMAIL],
                reply_to=[donnees["courriel"]],
            )
            envoyer = courriel.send(fail_silently=False)
        except (OSError, SMTPException):
            logger.exception("Échec de l’envoi du formulaire de contact public.")
            raise ContactMailUnavailable()
        if envoyer != 1:
            logger.error("Le formulaire de contact public n’a été remis à aucun destinataire.")
            raise ContactMailUnavailable()
        return Response({"message": "Votre message a été envoyé."})


class RafraichirJetonsCookieView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        request=None,
        responses=inline_serializer(
            name="SessionRenouvelee",
            fields={"message": serializers.CharField()},
        ),
    )
    def post(self, request):
        verifier_csrf_cookie(request)
        refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not refresh:
            reponse = Response(
                {"message": "Votre session a expiré. Veuillez vous reconnecter."},
                status=401,
            )
            return effacer_cookies_jetons(reponse)
        serializer = TokenRefreshSerializer(data={"refresh": refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except (AuthenticationFailed, TokenError, ValidationError):
            reponse = Response(
                {"message": "Votre session a expiré. Veuillez vous reconnecter."},
                status=401,
            )
            return effacer_cookies_jetons(reponse)
        jetons = serializer.validated_data
        refresh_renouvele = jetons.get("refresh", refresh)
        reponse = Response({"message": "La session a été renouvelée."})
        return ajouter_cookies_jetons(
            reponse,
            jetons["access"],
            refresh_renouvele,
        )


class RevoquerJetonsCookieView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(request=None, responses={204: OpenApiTypes.NONE})
    def post(self, request):
        verifier_csrf_cookie(request)
        refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if refresh:
            serializer = TokenBlacklistSerializer(data={"refresh": refresh})
            try:
                serializer.is_valid(raise_exception=True)
            except (AuthenticationFailed, TokenError, ValidationError):
                pass
        reponse = Response(status=204)
        return effacer_cookies_jetons(reponse)


class SanteView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        responses=inline_serializer(
            name="ReponseSante",
            fields={
                "statut": serializers.CharField(),
                "message": serializers.CharField(),
            },
        )
    )
    def get(self, request):
        return Response({"statut": "ok", "message": "API opérationnelle"})


class ProfilCourantView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=ProfilUtilisateurSerializer)
    def get(self, request):
        return Response(ProfilUtilisateurSerializer(request.user).data)


class ProfilUtilisateurView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=OpenApiTypes.OBJECT, responses=ProfilUtilisateurSerializer)
    def patch(self, request):
        if not isinstance(request.data, dict) or not request.data:
            raise ValidationError("Les modifications du profil sont invalides.")
        champs_autorises = {
            "nom_complet",
            "courriel",
            "telephone",
            "url_avatar",
            "biographie",
            "poste",
            "departement",
            "ville",
            "pays",
            "url_linkedin",
            "langue_preferee",
            "preferences_notifications",
            "double_facteur_actif",
        }
        inconnus = set(request.data) - champs_autorises
        if inconnus:
            raise ValidationError({"champs": "Un ou plusieurs champs du profil sont invalides."})

        utilisateur = request.user
        profil = dict(utilisateur.profil or {})
        champs_a_enregistrer = {"profil", "modifie_le"}

        if "nom_complet" in request.data:
            nom_complet = request.data["nom_complet"]
            if not isinstance(nom_complet, str) or not nom_complet.strip() or len(nom_complet.strip()) > 120:
                raise ValidationError({"nom_complet": "Le nom complet est invalide."})
            utilisateur.nom_complet = nom_complet.strip()
            champs_a_enregistrer.add("nom_complet")
        if "courriel" in request.data:
            courriel = request.data["courriel"]
            if not isinstance(courriel, str):
                raise ValidationError({"courriel": "L’adresse courriel est invalide."})
            courriel = courriel.strip().lower()
            try:
                validate_email(courriel)
            except DjangoValidationError as erreur:
                raise ValidationError({"courriel": "L’adresse courriel est invalide."}) from erreur
            if Utilisateur.objects.filter(courriel__iexact=courriel).exclude(pk=utilisateur.pk).exists():
                raise ValidationError({"courriel": "Cette adresse courriel est déjà utilisée."})
            utilisateur.courriel = courriel
            champs_a_enregistrer.add("courriel")
        if "telephone" in request.data:
            telephone = request.data["telephone"]
            if not isinstance(telephone, str) or len(telephone.strip()) > 64:
                raise ValidationError({"telephone": "Le téléphone est invalide."})
            utilisateur.telephone = telephone.strip()
            champs_a_enregistrer.add("telephone")

        limites_texte = {
            "biographie": 5000,
            "poste": 120,
            "departement": 120,
            "ville": 120,
            "pays": 120,
            "url_linkedin": 500,
        }
        for champ, longueur_maximale in limites_texte.items():
            if champ not in request.data:
                continue
            valeur = request.data[champ]
            if not isinstance(valeur, str) or len(valeur.strip()) > longueur_maximale:
                raise ValidationError({champ: "Cette valeur de profil est invalide."})
            profil[champ] = valeur.strip()

        if "langue_preferee" in request.data:
            langue = request.data["langue_preferee"]
            langues_autorisees = {"Français", "Créole haïtien", "English", "Español"}
            if not isinstance(langue, str) or langue not in langues_autorisees:
                raise ValidationError({"langue_preferee": "La langue sélectionnée est invalide."})
            profil["langue_preferee"] = langue
        if "preferences_notifications" in request.data:
            preferences = request.data["preferences_notifications"]
            if not isinstance(preferences, dict) or any(
                not isinstance(valeur, bool) for valeur in preferences.values()
            ):
                raise ValidationError({"preferences_notifications": "Les préférences sont invalides."})
            profil["preferences_notifications"] = preferences
        if "double_facteur_actif" in request.data:
            double_facteur_actif = request.data["double_facteur_actif"]
            if not isinstance(double_facteur_actif, bool):
                raise ValidationError({"double_facteur_actif": "Cette valeur doit être booléenne."})
            profil["double_facteur_actif"] = double_facteur_actif

        if "url_avatar" in request.data:
            url_avatar = request.data["url_avatar"]
            if url_avatar is None or url_avatar == "":
                profil.pop("url_avatar", None)
            else:
                profil["url_avatar"] = valider_url_image(url_avatar, "url_avatar")

        utilisateur.profil = profil
        utilisateur.save(update_fields=tuple(champs_a_enregistrer))
        return Response(ProfilUtilisateurSerializer(request.user).data)


class ConfigurationPlateformeView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return super().get_permissions()

    @extend_schema(responses=ConfigurationMarquePlateformeSerializer)
    def get(self, request):
        configuration = ConfigurationMarquePlateforme.objects.filter(
            pk="principale"
        ).first()
        serializer = ConfigurationMarquePlateformeSerializer(
            configuration or ConfigurationMarquePlateforme()
        )
        return Response(serializer.data)

    @extend_schema(
        request=ConfigurationMarquePlateformeSerializer,
        responses=ConfigurationMarquePlateformeSerializer,
    )
    def patch(self, request):
        if "plateforme:gerer" not in permissions_utilisateur(request.user, None):
            raise PermissionDenied("L’autorisation plateforme:gerer est requise.")
        if not isinstance(request.data, dict) or not request.data:
            raise ValidationError("Au moins un champ de configuration est requis.")
        configuration, _ = ConfigurationMarquePlateforme.objects.get_or_create(
            pk="principale"
        )
        serializer = ConfigurationMarquePlateformeSerializer(
            configuration,
            data=request.data,
            partial=True,
        )
        champs_inconnus = set(request.data) - set(serializer.fields)
        if champs_inconnus:
            raise ValidationError(
                {"champs": f"Champs inconnus : {', '.join(sorted(champs_inconnus))}."}
            )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ConnexionDemoView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_demo"

    @extend_schema(
        operation_id="obtenirSessionDemonstration",
        request=OpenApiTypes.OBJECT,
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        verifier_csrf_cookie(request)
        if not settings.DEBUG or not settings.DEMO_PUBLIQUE_ACTIVE:
            raise NotFound("La connexion de démonstration est désactivée.")
        if not isinstance(request.data, dict):
            raise ValidationError("Le corps de la requête doit être un objet JSON.")
        id_utilisateur = request.data.get("id_utilisateur")
        if not isinstance(id_utilisateur, str) or not id_utilisateur:
            raise ValidationError({"id_utilisateur": "L’identifiant utilisateur est obligatoire."})
        utilisateur = Utilisateur.objects.filter(pk=id_utilisateur, is_active=True).first()
        if utilisateur is None or not (utilisateur.profil or {}).get("est_compte_demo", False):
            raise NotFound("Le compte de démonstration est introuvable ou désactivé.")
        id_etablissement = request.data.get("id_etablissement")
        if id_etablissement and not (
            utilisateur.est_super_admin_plateforme or utilisateur.is_superuser
        ):
            affiliation = AffiliationEtablissement.objects.filter(
                utilisateur=utilisateur,
                etablissement_id=id_etablissement,
            ).exists()
            if not affiliation:
                raise PermissionDenied("Vous n’êtes pas affilié à cet établissement.")
        jeton_renouvellement = RefreshToken.for_user(utilisateur)
        return reponse_session_cookie(
            str(jeton_renouvellement.access_token),
            str(jeton_renouvellement),
        )


class ObtenirJetonsVerrouilleView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_login"

    def post(self, request):
        verifier_csrf_cookie(request)
        identifiant = str(
            request.data.get("identifiant", request.data.get("courriel", ""))
        ).strip()
        utilisateur = Utilisateur.objects.filter(courriel__iexact=identifiant).first()
        courriel = utilisateur.courriel if utilisateur else identifiant.lower()
        mot_de_passe = str(request.data.get("password", ""))
        if utilisateur:
            verrouille_jusqua = utilisateur.profil.get("verrouille_jusqua")
            if verrouille_jusqua:
                try:
                    from django.utils.dateparse import parse_datetime
                    fin = parse_datetime(verrouille_jusqua)
                    if fin and fin > timezone.now():
                        raise AuthenticationFailed("Identifiants incorrects.")
                except TypeError:
                    pass
        utilisateur_authentifie = authenticate(
            request,
            courriel=courriel,
            password=mot_de_passe,
        )
        if utilisateur_authentifie is None:
            if utilisateur:
                profil = dict(utilisateur.profil or {})
                tentatives = int(profil.get("tentatives_connexion_echouees", 0)) + 1
                profil["tentatives_connexion_echouees"] = tentatives
                if tentatives >= 5:
                    profil["verrouille_jusqua"] = (
                        timezone.now() + timedelta(minutes=15)
                    ).isoformat()
                    tentatives = 0
                    profil["tentatives_connexion_echouees"] = tentatives
                utilisateur.profil = profil
                utilisateur.save(update_fields=("profil",))
            raise AuthenticationFailed("Identifiants incorrects.")
        profil = dict(utilisateur_authentifie.profil or {})
        profil["tentatives_connexion_echouees"] = 0
        profil["verrouille_jusqua"] = None
        utilisateur_authentifie.profil = profil
        utilisateur_authentifie.save(update_fields=("profil",))
        jeton = RefreshToken.for_user(utilisateur_authentifie)
        return reponse_session_cookie(str(jeton.access_token), str(jeton))


class DemanderReinitialisationView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        verifier_csrf_cookie(request)
        courriel = str(request.data.get("courriel", "")).strip().lower()
        utilisateur = Utilisateur.objects.filter(
            courriel__iexact=courriel,
            is_active=True,
        ).first()
        token_plaintext = None
        if utilisateur:
            JetonReinitialisation.objects.filter(
                utilisateur=utilisateur,
                utilise_le__isnull=True,
            ).update(utilise_le=timezone.now())
            token_plaintext = f"{secrets.randbelow(1_000_000):06d}"
            empreinte = hashlib.sha256(token_plaintext.encode("utf-8")).hexdigest()
            JetonReinitialisation.objects.create(
                utilisateur=utilisateur,
                empreinte=empreinte,
                expire_le=timezone.now() + timedelta(minutes=15),
            )
        reponse = {
            "message":
            "Si cette adresse est associée à un compte, la demande a été traitée.",
        }
        if utilisateur and token_plaintext:
            try:
                courriels_envoyes = send_mail(
                    subject="Réinitialisation de votre mot de passe Klasik ERP",
                    message=(
                        f"Bonjour {utilisateur.nom_complet},\n\n"
                        "Voici votre code de réinitialisation :\n"
                        f"{token_plaintext}\n\n"
                        "Ce code expire dans 15 minutes et ne peut être utilisé qu’une seule fois. "
                        "Si vous n’êtes pas à l’origine de cette demande, ignorez ce message."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[utilisateur.courriel],
                    fail_silently=False,
                )
            except (OSError, SMTPException):
                courriels_envoyes = 0
            if courriels_envoyes != 1:
                logger.error("Le courriel de réinitialisation n’a pas été remis.")
                JetonReinitialisation.objects.filter(
                    utilisateur=utilisateur,
                    empreinte=hashlib.sha256(token_plaintext.encode("utf-8")).hexdigest(),
                    utilise_le__isnull=True,
                ).update(utilise_le=timezone.now())
            elif settings.DEBUG:
                reponse["jeton_demo"] = token_plaintext
        return Response(reponse)


class ConfirmerReinitialisationView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset_confirm"

    def post(self, request):
        verifier_csrf_cookie(request)
        jeton = str(request.data.get("jeton", ""))
        mot_de_passe = str(request.data.get("nouveau_mot_de_passe", ""))
        if len(mot_de_passe) < 8:
            raise ValidationError(
                {"nouveau_mot_de_passe": "Le mot de passe doit contenir au moins 8 caractères."}
            )
        empreinte = hashlib.sha256(jeton.encode("utf-8")).hexdigest()
        courriel = str(request.data.get("courriel", "")).strip()
        utilisateur = Utilisateur.objects.filter(
            courriel__iexact=courriel,
            is_active=True,
        ).first()
        token = JetonReinitialisation.objects.filter(
            utilisateur=utilisateur,
            utilise_le__isnull=True,
            expire_le__gt=timezone.now(),
        ).order_by("-cree_le").first()
        if token is None:
            raise NotFound("Le jeton de réinitialisation est invalide ou expiré.")
        if not hmac.compare_digest(token.empreinte, empreinte):
            token.tentatives_echouees += 1
            if token.tentatives_echouees >= 5:
                token.utilise_le = timezone.now()
            token.save(update_fields=("tentatives_echouees", "utilise_le"))
            raise NotFound("Le jeton de réinitialisation est invalide ou expiré.")
        try:
            validate_password(mot_de_passe, user=token.utilisateur)
        except DjangoValidationError as erreur:
            raise ValidationError(
                {"nouveau_mot_de_passe": list(erreur.messages)}
            ) from erreur
        token.utilisateur.set_password(mot_de_passe)
        token.utilisateur.save(update_fields=("password",))
        token.utilise_le = timezone.now()
        token.save(update_fields=("utilise_le",))
        profil = dict(token.utilisateur.profil or {})
        profil["tentatives_connexion_echouees"] = 0
        profil["verrouille_jusqua"] = None
        token.utilisateur.profil = profil
        token.utilisateur.save(update_fields=("profil",))
        return Response({"message": "Votre mot de passe a été réinitialisé."})


class ChangerMotDePasseView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=inline_serializer(
            name="ChangementMotDePasseRequete",
            fields={
                "ancien_mot_de_passe": serializers.CharField(required=False, allow_blank=True),
                "nouveau_mot_de_passe": serializers.CharField(),
            },
        ),
        responses=inline_serializer(
            name="ChangementMotDePasseReponse",
            fields={"message": serializers.CharField()},
        ),
    )
    def post(self, request):
        profil = dict(request.user.profil or {})
        changement_obligatoire = bool(profil.get("doit_changer_mot_de_passe"))
        a_mot_de_passe = request.user.has_usable_password()
        ancien = str(request.data.get("ancien_mot_de_passe", ""))
        nouveau = str(request.data.get("nouveau_mot_de_passe", ""))
        if changement_obligatoire and request.user.check_password(nouveau):
            raise ValidationError(
                {"nouveau_mot_de_passe": "Choisissez un mot de passe différent du mot de passe temporaire."}
            )
        if (
            not changement_obligatoire
            and a_mot_de_passe
            and not request.user.check_password(ancien)
        ):
            raise ValidationError({"ancien_mot_de_passe": "Le mot de passe actuel est incorrect."})
        if len(nouveau) < 8:
            raise ValidationError(
                {"nouveau_mot_de_passe": "Le mot de passe doit contenir au moins 8 caractères."}
            )
        try:
            validate_password(nouveau, user=request.user)
        except DjangoValidationError as erreur:
            raise ValidationError(
                {"nouveau_mot_de_passe": list(erreur.messages)}
            ) from erreur
        request.user.set_password(nouveau)
        champs_modifies = ["password"]
        if changement_obligatoire:
            profil["doit_changer_mot_de_passe"] = False
        profil["mot_de_passe_mis_a_jour_le"] = timezone.now().date().isoformat()
        request.user.profil = profil
        champs_modifies.extend(("profil", "modifie_le"))
        request.user.save(update_fields=champs_modifies)
        return Response({"message": "Votre mot de passe a été changé."})


class ConnexionGoogleView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_google"

    @extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
    @transaction.atomic
    def post(self, request):
        verifier_csrf_cookie(request)
        token_identite = str(request.data.get("id_token", ""))
        if not token_identite:
            raise ValidationError({"id_token": "Le jeton d’identité Google est obligatoire."})
        audience = settings.DJANGO_GOOGLE_CLIENT_ID
        if not audience:
            return Response(
                {"message": "La connexion Google n’est pas configurée sur le serveur."},
                status=503,
            )
        try:
            from google.auth.exceptions import GoogleAuthError
            from google.oauth2 import id_token
            from google.auth.transport import requests

            revendications = id_token.verify_oauth2_token(
                token_identite,
                requests.Request(),
                audience=audience,
            )
        except (GoogleAuthError, ValueError) as erreur:
            raise PermissionDenied("Le jeton d’identité Google est invalide.") from erreur
        if revendications.get("email_verified") is not True:
            raise PermissionDenied("Une adresse courriel Google vérifiée est obligatoire.")
        courriel = str(revendications.get("email", "")).strip().lower()
        sujet_google = revendications.get("sub")
        if not courriel or not isinstance(sujet_google, str) or not sujet_google:
            raise PermissionDenied("L’identité Google ne contient pas les informations requises.")
        try:
            validate_email(courriel)
        except DjangoValidationError as erreur:
            raise PermissionDenied("L’identité Google contient une adresse courriel invalide.") from erreur

        utilisateur = (
            Utilisateur.objects.select_for_update()
            .filter(courriel__iexact=courriel)
            .first()
        )
        if utilisateur is None:
            utilisateur = (
                Utilisateur.objects.select_for_update()
                .filter(profil__google_sub=sujet_google)
                .first()
            )
        if utilisateur is None:
            nom_google = revendications.get("name")
            nom_complet = (
                nom_google.strip()
                if isinstance(nom_google, str) and nom_google.strip()
                else courriel.split("@", 1)[0]
            )[:120]
            try:
                with transaction.atomic():
                    utilisateur = Utilisateur.objects.create_user(
                        courriel=courriel,
                        password=None,
                        nom_complet=nom_complet,
                        role=RoleUtilisateur.DIRECTEUR,
                        courriel_verifie=True,
                        profil={"google_sub": sujet_google},
                    )
            except IntegrityError:
                utilisateur = (
                    Utilisateur.objects.select_for_update()
                    .filter(courriel__iexact=courriel)
                    .first()
                )
                if utilisateur is None:
                    raise
        if not utilisateur.is_active:
            raise PermissionDenied("Ce compte est désactivé. Contactez un administrateur.")
        if (
            not (utilisateur.est_super_admin_plateforme or utilisateur.is_superuser)
            and utilisateur.affiliations.exists()
            and not utilisateur.affiliations.filter(etablissement__est_actif=True).exists()
        ):
            raise PermissionDenied(
                "Tous les établissements associés à ce compte sont suspendus."
            )
        profil = dict(utilisateur.profil or {})
        sujet_lie = profil.get("google_sub")
        if sujet_lie and sujet_lie != sujet_google:
            raise PermissionDenied(
                "Cette adresse est déjà liée à une autre identité Google."
            )
        profil["google_sub"] = sujet_google
        utilisateur.profil = profil
        utilisateur.courriel_verifie = True
        utilisateur.save(update_fields=("profil", "courriel_verifie", "modifie_le"))
        jeton = RefreshToken.for_user(utilisateur)
        return reponse_session_cookie(str(jeton.access_token), str(jeton))
