from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from api.permissions import permissions_utilisateur, role_utilisateur_etablissement
from etablissements.models import Etablissement

from .models import DevoirLms, RemiseDevoir, RessourceLms
from .serializers import DevoirLmsSerializer, RemiseDevoirSerializer, RessourceLmsSerializer


class VueTenantMixin:
    permission_classes=[IsAuthenticated]
    def initial(self, request,*args,**kwargs):
        super().initial(request,*args,**kwargs)
        self.etablissement_courant=Etablissement.objects.filter(pk=self.kwargs["id_etablissement"]).first()
        if self.etablissement_courant is None:
            raise ValidationError({"id_etablissement":"L’établissement est introuvable."})
        role_utilisateur_etablissement(request.user,self.etablissement_courant)
    def verifier(self,permission):
        permissions=permissions_utilisateur(self.request.user,self.etablissement_courant)
        if permission not in permissions:
            raise PermissionDenied("Vous n’avez pas la permission d’effectuer cette action.")


class RessourceLmsViewSet(VueTenantMixin,viewsets.ModelViewSet):
    queryset=RessourceLms.objects.none()
    serializer_class=RessourceLmsSerializer
    def get_queryset(self): return RessourceLms.objects.filter(etablissement=self.etablissement_courant)
    def list(self,*args,**kwargs):
        self.verifier("campus_numerique:voir"); return super().list(*args,**kwargs)


class DevoirLmsViewSet(VueTenantMixin,viewsets.ModelViewSet):
    queryset=DevoirLms.objects.none()
    serializer_class=DevoirLmsSerializer
    def get_queryset(self): return DevoirLms.objects.filter(etablissement=self.etablissement_courant)
    def list(self,*args,**kwargs):
        self.verifier("campus_numerique:voir"); return super().list(*args,**kwargs)
    @action(detail=True,methods=["post"],url_path="cloturer")
    def cloturer(self,request,*args,**kwargs):
        self.verifier("pedagogie:noter")
        devoir=self.get_object(); devoir.statut="CLOTURE"; devoir.save(update_fields=("statut",))
        return Response(self.get_serializer(devoir).data)


class RemiseDevoirViewSet(VueTenantMixin,viewsets.ModelViewSet):
    queryset=RemiseDevoir.objects.none()
    serializer_class=RemiseDevoirSerializer
    def get_queryset(self): return RemiseDevoir.objects.filter(etablissement=self.etablissement_courant)
    def list(self,*args,**kwargs):
        self.verifier("campus_numerique:voir"); return super().list(*args,**kwargs)
