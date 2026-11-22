from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers import ProfilUtilisateurSerializer


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
