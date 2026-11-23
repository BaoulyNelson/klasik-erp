from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import permissions_utilisateur, role_utilisateur_etablissement
from etablissements.models import Etablissement

from .models import (
    Apprenant,
    ContactTuteur,
    EcheancePaiement,
    ElementPedagogique,
    InscriptionApprenant,
    UniteAcademique,
)
from .serializers import (
    ApprenantSerializer,
    ElementPedagogiqueSerializer,
    InscriptionApprenantSerializer,
    UniteAcademiqueSerializer,
)


class VueTenantMixin:
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def obtenir_etablissement(self):
        identifiant = self.kwargs["id_etablissement"]
        etablissement = Etablissement.objects.filter(pk=identifiant).first()
        if etablissement is None:
            raise ValidationError({"id_etablissement": "L’établissement est introuvable."})
        role_utilisateur_etablissement(self.request.user, etablissement)
        return etablissement

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.etablissement_courant = self.obtenir_etablissement()

    def verifier_permission(self, permission):
        etablissement = self.obtenir_etablissement()
        permissions = permissions_utilisateur(self.request.user, etablissement)
        if permission not in permissions:
            raise PermissionDenied("Vous n’avez pas la permission d’effectuer cette action.")
        return etablissement


class UniteViewSet(VueTenantMixin, viewsets.ModelViewSet):
    serializer_class = UniteAcademiqueSerializer
    queryset = UniteAcademique.objects.none()
    search_fields = ["code", "nom", "categorie", "responsable_nom"]
    ordering_fields = ["id", "code", "nom", "capacite"]

    def get_queryset(self):
        return UniteAcademique.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("parametres:voir")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.verifier_permission("parametres:voir")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        etablissement = self.verifier_permission("parametres:gerer")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=etablissement)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        self.verifier_permission("parametres:gerer")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.verifier_permission("parametres:gerer")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.verifier_permission("parametres:gerer")
        return super().destroy(request, *args, **kwargs)


class ElementViewSet(VueTenantMixin, viewsets.ModelViewSet):
    serializer_class = ElementPedagogiqueSerializer
    queryset = ElementPedagogique.objects.none()
    filterset_fields = ["unite", "nature", "id_enseignant"]
    search_fields = ["code", "nom", "libelle_periode"]
    ordering_fields = ["id", "code", "nom"]

    def get_queryset(self):
        return ElementPedagogique.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("parametres:voir")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.verifier_permission("parametres:voir")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        etablissement = self.verifier_permission("parametres:gerer")
        unite = UniteAcademique.objects.filter(
            etablissement=etablissement,
            pk=request.data.get("id_unite"),
        ).first()
        if unite is None:
            raise ValidationError({"id_unite": "Cette unité n’appartient pas à l’établissement."})
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=etablissement, unite=unite)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        self.verifier_permission("parametres:gerer")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.verifier_permission("parametres:gerer")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.verifier_permission("parametres:gerer")
        return super().destroy(request, *args, **kwargs)


class ApprenantViewSet(VueTenantMixin, viewsets.ModelViewSet):
    serializer_class = ApprenantSerializer
    queryset = Apprenant.objects.none()
    filterset_fields = ["unite", "statut", "statut_paiement"]
    search_fields = ["id", "matricule", "prenom", "nom", "courriel", "telephone"]
    ordering_fields = ["id", "nom", "prenom", "matricule", "moyenne_generale"]

    def get_queryset(self):
        queryset = Apprenant.objects.filter(
            etablissement=self.etablissement_courant
        ).prefetch_related("tuteurs", "echeancier")
        role = role_utilisateur_etablissement(
            self.request.user,
            self.etablissement_courant,
        )
        if role in {"PARENT", "APPRENANT"}:
            ids = set(self.request.user.profil.get("ids_apprenants_lies", []))
            return queryset.filter(pk__in=ids)
        if role == "ENSEIGNANT":
            from donnees.models import EnregistrementMetier
            affectation = EnregistrementMetier.objects.filter(
                etablissement=self.etablissement_courant,
                collection="enseignants",
                donnees__courriel=self.request.user.courriel,
            ).values_list("donnees", flat=True).first()
            ids_unites = set((affectation or {}).get("ids_unites_assignees", []))
            return queryset.filter(unite_id__in=ids_unites)
        return queryset

    def list(self, request, *args, **kwargs):
        self.verifier_permission("apprenants:voir")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.verifier_permission("apprenants:voir")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        etablissement = self.verifier_permission("apprenants:gerer")
        unite = UniteAcademique.objects.filter(
            etablissement=etablissement,
            pk=request.data.get("id_unite"),
        ).first()
        if unite is None:
            raise ValidationError({"id_unite": "Cette unité n’appartient pas à l’établissement."})
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        apprenant = serializer.save(etablissement=etablissement, unite=unite)
        for tuteur in request.data.get("tuteurs", []) or []:
            ContactTuteur.objects.create(apprenant=apprenant, **tuteur)
        for echeance in request.data.get("echeancier", []) or []:
            EcheancePaiement.objects.create(
                id=echeance["id"],
                etablissement=etablissement,
                apprenant=apprenant,
                libelle=echeance.get("libelle", ""),
                date_echeance=echeance.get("date_echeance", ""),
                montant_du_htg=echeance.get("montant_du_htg", 0),
                montant_paye_htg=echeance.get("montant_paye_htg", 0),
                statut=echeance.get("statut", "A_PAYER"),
            )
        return Response(self.get_serializer(apprenant).data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        apprenant = serializer.save()
        if "tuteurs" in self.request.data:
            apprenant.tuteurs.all().delete()
            for tuteur in self.request.data.get("tuteurs", []) or []:
                ContactTuteur.objects.create(apprenant=apprenant, **tuteur)
        if "echeancier" in self.request.data:
            apprenant.echeancier.all().delete()
            for echeance in self.request.data.get("echeancier", []) or []:
                EcheancePaiement.objects.create(
                    id=echeance["id"],
                    etablissement=apprenant.etablissement,
                    apprenant=apprenant,
                    libelle=echeance.get("libelle", ""),
                    date_echeance=echeance.get("date_echeance", ""),
                    montant_du_htg=echeance.get("montant_du_htg", 0),
                    montant_paye_htg=echeance.get("montant_paye_htg", 0),
                    statut=echeance.get("statut", "A_PAYER"),
                )

    def update(self, request, *args, **kwargs):
        self.verifier_permission("apprenants:gerer")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.verifier_permission("apprenants:gerer")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.verifier_permission("apprenants:gerer")
        return super().destroy(request, *args, **kwargs)


class InscriptionViewSet(VueTenantMixin, viewsets.ModelViewSet):
    serializer_class = InscriptionApprenantSerializer
    queryset = InscriptionApprenant.objects.none()
    filterset_fields = ["apprenant", "unite", "statut_inscription", "type_inscription"]
    search_fields = ["id", "numero_inscription", "annee_academique", "libelle_niveau"]
    ordering_fields = ["id", "date_inscription", "numero_inscription"]

    def get_queryset(self):
        return InscriptionApprenant.objects.filter(
            etablissement=self.etablissement_courant
        ).select_related("apprenant", "unite")

    def list(self, request, *args, **kwargs):
        self.verifier_permission("admissions:voir")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.verifier_permission("admissions:voir")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        etablissement = self.verifier_permission("admissions:gerer")
        apprenant = Apprenant.objects.filter(
            etablissement=etablissement,
            pk=request.data.get("id_apprenant"),
        ).first()
        unite = UniteAcademique.objects.filter(
            etablissement=etablissement,
            pk=request.data.get("id_unite"),
        ).first()
        if apprenant is None or unite is None:
            raise ValidationError("La relation apprenant ou unité est invalide.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(
            etablissement=etablissement,
            apprenant=apprenant,
            unite=unite,
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        self.verifier_permission("admissions:gerer")
        return super().partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self.verifier_permission("admissions:gerer")
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        with transaction.atomic():
            inscription = serializer.save()
            from donnees.models import EntreeAuditApi

            EntreeAuditApi.objects.create(
                etablissement=inscription.etablissement,
                utilisateur=self.request.user,
                nom_acteur=self.request.user.nom_complet,
                role_acteur=role_utilisateur_etablissement(
                    self.request.user,
                    inscription.etablissement,
                ),
                action="MODIFICATION",
                collection="inscriptions",
                id_objet=inscription.id,
            )

    def destroy(self, request, *args, **kwargs):
        self.verifier_permission("admissions:gerer")
        with transaction.atomic():
            return super().destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        from donnees.models import EntreeAuditApi

        EntreeAuditApi.objects.create(
            etablissement=instance.etablissement,
            utilisateur=self.request.user,
            nom_acteur=self.request.user.nom_complet,
            role_acteur=role_utilisateur_etablissement(
                self.request.user,
                instance.etablissement,
            ),
            action="SUPPRESSION",
            collection="inscriptions",
            id_objet=instance.id,
        )
        instance.delete()

    @action(detail=True, methods=["post"], url_path="annuler")
    def annuler(self, request, *args, **kwargs):
        self.verifier_permission("admissions:gerer")
        inscription = self.get_object()
        if inscription.statut_inscription != "VALIDEE":
            raise ValidationError(
                {"statut_inscription": "Seule une inscription validée peut être annulée."}
            )
        motif = request.data.get("motif_statut", "")
        if not isinstance(motif, str) or not motif.strip():
            raise ValidationError({"motif_statut": "Un motif est obligatoire pour annuler."})
        inscription.statut_inscription = "ANNULEE"
        motif = motif.strip()
        inscription.motif_statut = motif or "Annulation enregistrée"
        inscription.save(update_fields=("statut_inscription", "motif_statut"))
        from donnees.models import EntreeAuditApi
        EntreeAuditApi.objects.create(
            etablissement=inscription.etablissement,
            utilisateur=request.user,
            nom_acteur=request.user.nom_complet,
            role_acteur=role_utilisateur_etablissement(request.user, inscription.etablissement),
            action="ANNULATION",
            collection="inscriptions",
            id_objet=inscription.id,
        )
        return Response(self.get_serializer(inscription).data)

    @action(detail=True, methods=["post"], url_path="archiver")
    def archiver(self, request, *args, **kwargs):
        self.verifier_permission("admissions:gerer")
        inscription = self.get_object()
        if inscription.statut_inscription != "VALIDEE":
            raise ValidationError(
                {"statut_inscription": "Seule une inscription validée peut être archivée."}
            )
        motif = request.data.get("motif_statut", "")
        if not isinstance(motif, str) or not motif.strip():
            raise ValidationError({"motif_statut": "Un motif est obligatoire pour archiver."})
        inscription.statut_inscription = "ARCHIVEE"
        inscription.motif_statut = motif.strip() or "Archivage enregistré"
        inscription.save(update_fields=("statut_inscription", "motif_statut"))
        from donnees.models import EntreeAuditApi

        EntreeAuditApi.objects.create(
            etablissement=inscription.etablissement,
            utilisateur=request.user,
            nom_acteur=request.user.nom_complet,
            role_acteur=role_utilisateur_etablissement(
                request.user,
                inscription.etablissement,
            ),
            action="ARCHIVAGE",
            collection="inscriptions",
            id_objet=inscription.id,
        )
        return Response(self.get_serializer(inscription).data)
