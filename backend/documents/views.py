from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import permissions_utilisateur, role_utilisateur_etablissement
from etablissements.models import Etablissement
from scolarite.models import Apprenant

from .models import DocumentOfficiel
from .serializers import DocumentOfficielSerializer


class DocumentOfficielViewSet(viewsets.ModelViewSet):
    queryset = DocumentOfficiel.objects.none()
    serializer_class = DocumentOfficielSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["apprenant", "type_document"]
    search_fields = ["id", "numero_document", "type_document", "emis_par"]
    ordering_fields = ["id", "emis_le", "numero_document"]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.etablissement_courant = Etablissement.objects.filter(
            pk=self.kwargs["id_etablissement"]
        ).first()
        if self.etablissement_courant is None:
            raise ValidationError({"id_etablissement": "L’établissement est introuvable."})
        role_utilisateur_etablissement(request.user, self.etablissement_courant)

    def get_queryset(self):
        queryset = DocumentOfficiel.objects.filter(
            etablissement=self.etablissement_courant
        )
        role = role_utilisateur_etablissement(
            self.request.user,
            self.etablissement_courant,
        )
        if role in {"PARENT", "APPRENANT"}:
            ids = set(self.request.user.profil.get("ids_apprenants_lies", []))
            return queryset.filter(apprenant_id__in=ids)
        return queryset

    def verifier_permission(self, permission):
        permissions = permissions_utilisateur(
            self.request.user,
            self.etablissement_courant,
        )
        if permission not in permissions:
            raise PermissionDenied("Vous n’avez pas la permission d’effectuer cette action.")

    def list(self, request, *args, **kwargs):
        self.verifier_permission("documents:voir")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("documents:emettre")
        apprenant = Apprenant.objects.filter(
            pk=request.data.get("id_apprenant"),
            etablissement=self.etablissement_courant,
        ).first()
        if apprenant is None:
            raise ValidationError({"id_apprenant": "Cet apprenant n’appartient pas à l’établissement."})
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save(
            etablissement=self.etablissement_courant,
            apprenant=apprenant,
        )
        from donnees.models import EntreeAuditApi
        EntreeAuditApi.objects.create(
            etablissement=self.etablissement_courant,
            utilisateur=request.user,
            nom_acteur=request.user.nom_complet,
            role_acteur=role_utilisateur_etablissement(request.user, self.etablissement_courant),
            action="EMISSION",
            collection="documents",
            id_objet=document.id,
        )
        return Response(self.get_serializer(document).data, status=201)

    @action(detail=True, methods=["post"], url_path="emettre")
    def emettre(self, request, *args, **kwargs):
        self.verifier_permission("documents:emettre")
        return Response(self.get_serializer(self.get_object()).data)
