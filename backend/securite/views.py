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


class ConsentementRgpdViewSet(TenantMixin,viewsets.ModelViewSet):
    queryset=ConsentementRgpd.objects.none(); serializer_class=ConsentementRgpdSerializer
    def get_queryset(self): return ConsentementRgpd.objects.filter(etablissement=self.tenant)
    def list(self,*args,**kwargs): self.check("rgpd:gerer"); return super().list(*args,**kwargs)


class DemandeRgpdViewSet(TenantMixin,viewsets.ModelViewSet):
    queryset=DemandeRgpd.objects.none(); serializer_class=DemandeRgpdSerializer
    def get_queryset(self): return DemandeRgpd.objects.filter(etablissement=self.tenant)
    def list(self,*args,**kwargs): self.check("rgpd:gerer"); return super().list(*args,**kwargs)
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


class AttributionBadgeViewSet(TenantMixin,viewsets.ModelViewSet):
    queryset=AttributionBadge.objects.none(); serializer_class=AttributionBadgeSerializer
    def get_queryset(self): return AttributionBadge.objects.filter(etablissement=self.tenant)
    def list(self,*args,**kwargs): self.check("badges:voir"); return super().list(*args,**kwargs)
