from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import permissions_utilisateur, role_utilisateur_etablissement
from etablissements.models import Etablissement
from pedagogie.models import PersonnelEnseignant
from scolarite.models import Apprenant

from .models import AbonnementService, BulletinPaie, DemandeConge, Depense, Paiement
from .serializers import (
    AbonnementServiceSerializer,
    BulletinPaieSerializer,
    DemandeCongeSerializer,
    DepenseSerializer,
    PaiementSerializer,
)


class VueTenantMixin:
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        etablissement = Etablissement.objects.filter(pk=self.kwargs["id_etablissement"]).first()
        if etablissement is None:
            raise ValidationError({"id_etablissement": "L’établissement est introuvable."})
        role_utilisateur_etablissement(request.user, etablissement)
        self.etablissement_courant = etablissement

    def verifier_permission(self, permission):
        permissions = permissions_utilisateur(
            self.request.user,
            self.etablissement_courant,
        )
        if permission not in permissions:
            raise PermissionDenied("Vous n’avez pas la permission d’effectuer cette action.")


class PaiementViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = Paiement.objects.none()
    serializer_class = PaiementSerializer
    filterset_fields = ["apprenant", "statut", "mode_paiement"]
    search_fields = ["id", "numero_recu", "libelle", "encaisse_par", "code_reference"]
    ordering_fields = ["id", "paye_le", "montant_htg"]

    def get_queryset(self):
        queryset = Paiement.objects.filter(etablissement=self.etablissement_courant)
        role = role_utilisateur_etablissement(self.request.user, self.etablissement_courant)
        if role in {"PARENT", "APPRENANT"}:
            ids = set(self.request.user.profil.get("ids_apprenants_lies", []))
            return queryset.filter(apprenant_id__in=ids)
        return queryset

    def list(self, request, *args, **kwargs):
        self.verifier_permission("finances:voir")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.verifier_permission("finances:voir")
        return super().retrieve(request, *args, **kwargs)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        self.verifier_permission("finances:encaisser")
        apprenant = Apprenant.objects.filter(
            pk=request.data.get("id_apprenant"),
            etablissement=self.etablissement_courant,
        ).first()
        if apprenant is None:
            raise ValidationError({"id_apprenant": "Cet apprenant n’appartient pas à l’établissement."})
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        paiement = serializer.save(
            etablissement=self.etablissement_courant,
            apprenant=apprenant,
            statut="VALIDE",
        )
        from donnees.models import EntreeAuditApi
        EntreeAuditApi.objects.create(
            etablissement=self.etablissement_courant,
            utilisateur=request.user,
            nom_acteur=request.user.nom_complet,
            role_acteur=role_utilisateur_etablissement(request.user, self.etablissement_courant),
            action="CREATION",
            collection="paiements",
            id_objet=paiement.id,
        )
        return Response(self.get_serializer(paiement).data, status=201)

    @action(detail=True, methods=["post"], url_path="annuler")
    @transaction.atomic
    def annuler(self, request, *args, **kwargs):
        self.verifier_permission("finances:gerer")
        paiement = self.get_object()
        if paiement.statut == "ANNULE":
            raise ValidationError({"statut": "Ce paiement est déjà annulé."})
        paiement.statut = "ANNULE"
        paiement.save(update_fields=("statut",))
        from donnees.models import EntreeAuditApi
        EntreeAuditApi.objects.create(
            etablissement=paiement.etablissement,
            utilisateur=request.user,
            nom_acteur=request.user.nom_complet,
            role_acteur=role_utilisateur_etablissement(request.user, paiement.etablissement),
            action="ANNULATION",
            collection="paiements",
            id_objet=paiement.id,
        )
        return Response(self.get_serializer(paiement).data)

    def update(self, request, *args, **kwargs):
        raise PermissionDenied("Un paiement enregistré ne peut pas être modifié; annulez-le et créez-en un nouveau.")

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        raise PermissionDenied("Un paiement enregistré ne peut pas être supprimé; annulez-le pour conserver l’historique.")


class DepenseViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = Depense.objects.none()
    serializer_class = DepenseSerializer
    filterset_fields = ["categorie", "payee_le"]
    search_fields = ["id", "description", "fournisseur", "categorie"]
    ordering_fields = ["id", "payee_le", "montant_htg"]

    def get_queryset(self):
        return Depense.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("finances:voir")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.verifier_permission("finances:voir")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("finances:gerer")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=self.etablissement_courant)
        return Response(serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        self.verifier_permission("finances:gerer")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.verifier_permission("finances:gerer")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.verifier_permission("finances:gerer")
        return super().destroy(request, *args, **kwargs)


class BulletinPaieViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = BulletinPaie.objects.none()
    serializer_class = BulletinPaieSerializer
    filterset_fields = ["personnel", "statut", "libelle_mois"]
    search_fields = ["id", "nom_personnel", "libelle_role", "libelle_mois"]
    ordering_fields = ["id", "libelle_mois", "montant_net_htg"]

    def get_queryset(self):
        return BulletinPaie.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("rh:voir")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.verifier_permission("rh:voir")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("rh:gerer")
        personnel = PersonnelEnseignant.objects.filter(
            pk=request.data.get("id_personnel"),
            etablissement=self.etablissement_courant,
        ).first()
        if personnel is None:
            raise ValidationError({"id_personnel": "Ce personnel n’appartient pas à l’établissement."})
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=self.etablissement_courant, personnel=personnel)
        return Response(serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        self.verifier_permission("rh:gerer")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.verifier_permission("rh:gerer")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.verifier_permission("rh:gerer")
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="payer")
    def payer(self, request, *args, **kwargs):
        self.verifier_permission("rh:gerer")
        bulletin = self.get_object()
        if bulletin.statut == "PAYE":
            raise ValidationError({"statut": "Ce bulletin est déjà payé."})
        bulletin.statut = "PAYE"
        bulletin.paye_le = request.data.get("paye_le", "")
        bulletin.save(update_fields=("statut", "paye_le"))
        return Response(self.get_serializer(bulletin).data)


class AbonnementServiceViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = AbonnementService.objects.none()
    serializer_class = AbonnementServiceSerializer
    filterset_fields = ["apprenant", "type_service", "actif"]
    search_fields = ["id", "ligne_ou_formule"]
    ordering_fields = ["id", "tarif_mensuel_ou_annuel_htg"]

    def get_queryset(self):
        return AbonnementService.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("services:voir")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.verifier_permission("services:voir")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("services:gerer")
        apprenant = Apprenant.objects.filter(
            pk=request.data.get("id_apprenant"),
            etablissement=self.etablissement_courant,
        ).first()
        if apprenant is None:
            raise ValidationError({"id_apprenant": "Cet apprenant n’appartient pas à l’établissement."})
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=self.etablissement_courant, apprenant=apprenant)
        return Response(serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        self.verifier_permission("services:gerer")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.verifier_permission("services:gerer")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.verifier_permission("services:gerer")
        return super().destroy(request, *args, **kwargs)


class DemandeCongeViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = DemandeConge.objects.none()
    serializer_class = DemandeCongeSerializer
    search_fields = ["id", "nom_personnel", "libelle_role", "type_conge"]
    ordering_fields = ["id", "demande_le", "date_debut"]

    def get_queryset(self):
        return DemandeConge.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("rh:voir")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.verifier_permission("rh:voir")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("rh:gerer")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        demande = serializer.save(etablissement=self.etablissement_courant)
        return Response(self.get_serializer(demande).data, status=201)

    def update(self, request, *args, **kwargs):
        self.verifier_permission("rh:gerer")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.verifier_permission("rh:gerer")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.verifier_permission("rh:gerer")
        return super().destroy(request, *args, **kwargs)
