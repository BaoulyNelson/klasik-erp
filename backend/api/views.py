from django.conf import settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from api.serializers import ProfilUtilisateurSerializer
from comptes.models import AffiliationEtablissement, Utilisateur


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


class ConnexionDemoView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="obtenirSessionDemonstration",
        request=OpenApiTypes.OBJECT,
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        if not settings.DEBUG:
            raise NotFound("La connexion de démonstration est désactivée.")
        if not isinstance(request.data, dict):
            raise ValidationError("Le corps de la requête doit être un objet JSON.")
        id_utilisateur = request.data.get("id_utilisateur")
        if not isinstance(id_utilisateur, str) or not id_utilisateur:
            raise ValidationError({"id_utilisateur": "L’identifiant utilisateur est obligatoire."})
        utilisateur = Utilisateur.objects.filter(pk=id_utilisateur, is_active=True).first()
        if utilisateur is None:
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
