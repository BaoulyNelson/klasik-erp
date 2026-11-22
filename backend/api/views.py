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
from django.core.mail import send_mail
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from api.serializers import ProfilUtilisateurSerializer
from comptes.models import AffiliationEtablissement, JetonReinitialisation, Utilisateur
from etablissements.models import ConfigurationMarquePlateforme
from api.validators import valider_url_image

logger = logging.getLogger(__name__)


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


class PhotoProfilView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=OpenApiTypes.OBJECT, responses=ProfilUtilisateurSerializer)
    def patch(self, request):
        if not isinstance(request.data, dict) or "url_avatar" not in request.data:
            raise ValidationError({"url_avatar": "Le champ url_avatar est obligatoire."})
        url_avatar = request.data["url_avatar"]
        profil = dict(request.user.profil or {})
        if url_avatar is None or url_avatar == "":
            profil.pop("url_avatar", None)
        else:
            profil["url_avatar"] = valider_url_image(url_avatar, "url_avatar")
        request.user.profil = profil
        request.user.save(update_fields=("profil", "modifie_le"))
        return Response(ProfilUtilisateurSerializer(request.user).data)


class ConfigurationPlateformeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=inline_serializer(
            name="LogoPlateforme",
            fields={"url_logo": serializers.CharField(allow_blank=True)},
        )
    )
    def get(self, request):
        configuration = ConfigurationMarquePlateforme.objects.filter(
            pk="principale"
        ).first()
        return Response({"url_logo": configuration.url_logo if configuration else ""})

    @extend_schema(
        request=inline_serializer(
            name="ModifierLogoPlateforme",
            fields={"url_logo": serializers.CharField(allow_blank=True, allow_null=True)},
        ),
        responses=OpenApiTypes.OBJECT,
    )
    def patch(self, request):
        if not request.user.est_super_admin_plateforme:
            raise PermissionDenied(
                "Seul un super-administrateur plateforme peut modifier le logo."
            )
        if not isinstance(request.data, dict) or set(request.data) != {"url_logo"}:
            raise ValidationError({"url_logo": "Le champ url_logo est obligatoire."})
        url_logo = request.data["url_logo"]
        if url_logo is None or url_logo == "":
            url_logo = ""
        else:
            url_logo = valider_url_image(url_logo, "url_logo")
        configuration, _ = ConfigurationMarquePlateforme.objects.get_or_create(
            pk="principale"
        )
        configuration.url_logo = url_logo
        configuration.save(update_fields=("url_logo", "modifie_le"))
        return Response({"url_logo": configuration.url_logo})


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
        if not settings.DEBUG or not settings.DEMO_LOGIN_ENABLED:
            raise NotFound("La connexion de démonstration est désactivée.")
        if not isinstance(request.data, dict):
            raise ValidationError("Le corps de la requête doit être un objet JSON.")
        id_utilisateur = request.data.get("id_utilisateur")
        if not isinstance(id_utilisateur, str) or not id_utilisateur:
            raise ValidationError({"id_utilisateur": "L’identifiant utilisateur est obligatoire."})
        utilisateur = Utilisateur.objects.filter(pk=id_utilisateur, is_active=True).first()
        if utilisateur is None or not (utilisateur.profil or {}).get(
            "acces_demo_autorise", False
        ):
            raise NotFound("Le compte de démonstration est introuvable ou désactivé.")
        id_etablissement = request.data.get("id_etablissement")
        if id_etablissement and not utilisateur.est_super_admin_plateforme:
            affiliation = AffiliationEtablissement.objects.filter(
                utilisateur=utilisateur,
                etablissement_id=id_etablissement,
            ).exists()
            if not affiliation:
                raise PermissionDenied("Vous n’êtes pas affilié à cet établissement.")
        jeton_renouvellement = RefreshToken.for_user(utilisateur)
        return Response(
            {
                "refresh": str(jeton_renouvellement),
                "access": str(jeton_renouvellement.access_token),
            }
        )


class ObtenirJetonsVerrouilleView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_login"

    def post(self, request):
        identifiant = str(
            request.data.get("identifiant", request.data.get("courriel", ""))
        ).strip()
        alias_superutilisateur = identifiant.casefold() in {
            "superuser",
            "superadmin",
            "admin",
        }
        if alias_superutilisateur:
            superutilisateurs = Utilisateur.objects.filter(is_active=True).filter(
                Q(est_super_admin_plateforme=True) | Q(is_superuser=True)
            )
            utilisateur = (
                superutilisateurs.first()
                if superutilisateurs.count() == 1
                else None
            )
        else:
            utilisateur = Utilisateur.objects.filter(
                courriel__iexact=identifiant
            ).first()
        courriel = utilisateur.courriel if utilisateur else identifiant.lower()
        mot_de_passe = str(request.data.get("password", ""))
        if utilisateur:
            verrouille_jusqua = utilisateur.profil.get("verrouille_jusqua")
            if verrouille_jusqua:
                try:
                    from django.utils.dateparse import parse_datetime
                    fin = parse_datetime(verrouille_jusqua)
                    if fin and fin > timezone.now():
                        raise PermissionDenied("Ce compte est temporairement verrouillé.")
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
            raise AuthenticationFailed("Les identifiants sont invalides.")
        profil = dict(utilisateur_authentifie.profil or {})
        profil["tentatives_connexion_echouees"] = 0
        profil["verrouille_jusqua"] = None
        utilisateur_authentifie.profil = profil
        utilisateur_authentifie.save(update_fields=("profil",))
        jeton = RefreshToken.for_user(utilisateur_authentifie)
        return Response({"refresh": str(jeton), "access": str(jeton.access_token)})


class DemanderReinitialisationView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
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

    def post(self, request):
        ancien = str(request.data.get("ancien_mot_de_passe", ""))
        nouveau = str(request.data.get("nouveau_mot_de_passe", ""))
        if not request.user.check_password(ancien):
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
        request.user.save(update_fields=("password",))
        return Response({"message": "Votre mot de passe a été changé."})


class ConnexionGoogleView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_google"

    def post(self, request):
        token_identite = str(request.data.get("id_token", ""))
        if not token_identite:
            raise ValidationError({"id_token": "Le jeton d’identité Google est obligatoire."})
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests

            audience = getattr(settings, "DJANGO_GOOGLE_CLIENT_ID", "")
            revendications = id_token.verify_oauth2_token(
                token_identite,
                requests.Request(),
                audience=audience or None,
            )
        except Exception as erreur:
            raise PermissionDenied("Le jeton d’identité Google est invalide.") from erreur
        if revendications.get("email_verified") is not True:
            raise PermissionDenied("Une adresse courriel Google vérifiée est obligatoire.")
        courriel = str(revendications.get("email", "")).strip().lower()
        utilisateur = Utilisateur.objects.filter(courriel__iexact=courriel, is_active=True).first()
        if utilisateur is None:
            raise NotFound(
                "Aucun compte local n’est lié à cette adresse Google vérifiée."
            )
        jeton = RefreshToken.for_user(utilisateur)
        return Response({"refresh": str(jeton), "access": str(jeton.access_token)})
