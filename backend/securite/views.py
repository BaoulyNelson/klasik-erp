from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import permissions_utilisateur, role_utilisateur_etablissement
from etablissements.models import Etablissement

from .models import AttributionBadge, ConsentementRgpd, DemandeRgpd, LotImportation
from .serializers import AttributionBadgeSerializer, ConsentementRgpdSerializer, DemandeRgpdSerializer, LotImportationSerializer


class TenantMixin:
    permission_classes=[IsAuthenticated]
    def initial(self,request,*args,**kwargs):
        super().initial(request,*args,**kwargs)
        self.tenant=Etablissement.objects.filter(pk=self.kwargs["id_etablissement"]).first()
        if self.tenant is None:
            raise ValidationError({"id_etablissement":"L’établissement est introuvable."})
        role_utilisateur_etablissement(request.user,self.tenant)
    def check(self,permission):
        if permission not in permissions_utilisateur(self.request.user,self.tenant):
            raise PermissionDenied("Vous n’avez pas la permission d’effectuer cette action.")
    def perform_create(self, serializer):
        serializer.save(etablissement=self.tenant)
    def get_permissions_config(self):
        return ("rgpd:gerer", "rgpd:gerer")
    def retrieve(self,request,*args,**kwargs):
        self.check(self.get_permissions_config()[0]); return super().retrieve(request,*args,**kwargs)
    def create(self,request,*args,**kwargs):
        self.check(self.get_permissions_config()[1]); return super().create(request,*args,**kwargs)
    def update(self,request,*args,**kwargs):
        self.check(self.get_permissions_config()[1]); return super().update(request,*args,**kwargs)
    def partial_update(self,request,*args,**kwargs):
        self.check(self.get_permissions_config()[1]); return super().partial_update(request,*args,**kwargs)
    def destroy(self,request,*args,**kwargs):
        self.check(self.get_permissions_config()[1]); return super().destroy(request,*args,**kwargs)


class ConsentementRgpdViewSet(TenantMixin,viewsets.ModelViewSet):
    queryset=ConsentementRgpd.objects.none(); serializer_class=ConsentementRgpdSerializer
    def get_queryset(self): return ConsentementRgpd.objects.filter(etablissement=self.tenant)
    def list(self,*args,**kwargs): self.check("rgpd:gerer"); return super().list(*args,**kwargs)
    def get_permissions_config(self): return ("rgpd:gerer", "rgpd:gerer")


class DemandeRgpdViewSet(TenantMixin,viewsets.ModelViewSet):
    queryset=DemandeRgpd.objects.none(); serializer_class=DemandeRgpdSerializer
    def get_queryset(self): return DemandeRgpd.objects.filter(etablissement=self.tenant)
    def list(self,*args,**kwargs): self.check("rgpd:gerer"); return super().list(*args,**kwargs)
    def get_permissions_config(self): return ("rgpd:gerer", "rgpd:gerer")
    @action(detail=True,methods=["post"],url_path="traiter")
    def traiter(self,request,*args,**kwargs):
        self.check("rgpd:gerer")
        demande=self.get_object()
        demande.statut="TRAITEE"
        demande.traitee_le=request.data.get("traitee_le","")
        demande.observations=request.data.get("observations",demande.observations)
        demande.save(update_fields=("statut","traitee_le","observations"))
        return Response(self.get_serializer(demande).data)


class LotImportationViewSet(TenantMixin,viewsets.ModelViewSet):
    queryset=LotImportation.objects.none(); serializer_class=LotImportationSerializer
    def get_queryset(self): return LotImportation.objects.filter(etablissement=self.tenant)
    def list(self,*args,**kwargs): self.check("importations:gerer"); return super().list(*args,**kwargs)
    def get_permissions_config(self): return ("importations:gerer", "importations:gerer")


class AttributionBadgeViewSet(TenantMixin,viewsets.ModelViewSet):
    queryset=AttributionBadge.objects.none(); serializer_class=AttributionBadgeSerializer
    def get_queryset(self):
        queryset = AttributionBadge.objects.filter(etablissement=self.tenant).order_by(
            "-attribue_le",
            "id",
        )
        role = role_utilisateur_etablissement(self.request.user, self.tenant)
        if role in {"PARENT", "APPRENANT"}:
            ids_apprenants = self.request.user.profil.get("ids_apprenants_lies", [])
            return queryset.filter(apprenant_id__in=ids_apprenants)
        return queryset
    def list(self,*args,**kwargs): self.check("badges:voir"); return super().list(*args,**kwargs)
    def get_permissions_config(self): return ("badges:voir", "badges:gerer")
