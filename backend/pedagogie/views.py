from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import permissions_utilisateur, role_utilisateur_etablissement
from etablissements.models import Etablissement
from scolarite.models import Apprenant, ElementPedagogique, UniteAcademique

from .models import (
    CreneauEmploiDuTemps,
    EntreeCahierTextes,
    EvenementCalendrier,
    NoteEvaluation,
    PersonnelEnseignant,
    Presence,
    Soutenance,
)
from .serializers import (
    CreneauEmploiDuTempsSerializer,
    EntreeCahierTextesSerializer,
    EvenementCalendrierSerializer,
    NoteEvaluationSerializer,
    PersonnelEnseignantSerializer,
    PresenceSerializer,
    SoutenanceSerializer,
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


class PersonnelEnseignantViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = PersonnelEnseignant.objects.none()
    serializer_class = PersonnelEnseignantSerializer
    search_fields = ["id", "code", "nom_complet", "specialite", "courriel"]
    ordering_fields = ["id", "code", "nom_complet", "heures_mensuelles"]

    def get_queryset(self):
        return PersonnelEnseignant.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("rh:voir")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("rh:gerer")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=self.etablissement_courant)
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


class NoteEvaluationViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = NoteEvaluation.objects.none()
    serializer_class = NoteEvaluationSerializer
    filterset_fields = ["apprenant", "element", "type_evaluation", "verrouillee"]
    search_fields = ["id", "libelle_periode", "type_evaluation"]
    ordering_fields = ["id", "note", "note_maximale", "enregistree_le"]

    def get_queryset(self):
        queryset = NoteEvaluation.objects.filter(etablissement=self.etablissement_courant)
        role = role_utilisateur_etablissement(self.request.user, self.etablissement_courant)
        if role in {"PARENT", "APPRENANT"}:
            ids = set(self.request.user.profil.get("ids_apprenants_lies", []))
            return queryset.filter(apprenant_id__in=ids)
        if role == "ENSEIGNANT":
            personnel = PersonnelEnseignant.objects.filter(
                etablissement=self.etablissement_courant,
                courriel=self.request.user.courriel,
            ).first()
            ids_elements = set(personnel.ids_elements_assignes if personnel else [])
            return queryset.filter(element_id__in=ids_elements)
        return queryset

    def list(self, request, *args, **kwargs):
        self.verifier_permission("pedagogie:voir")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("pedagogie:noter")
        apprenant = Apprenant.objects.filter(pk=request.data.get("id_apprenant"), etablissement=self.etablissement_courant).first()
        element = ElementPedagogique.objects.filter(pk=request.data.get("id_element"), etablissement=self.etablissement_courant).first()
        if apprenant is None or element is None:
            raise ValidationError("L’apprenant ou l’élément pédagogique est invalide.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=self.etablissement_courant, apprenant=apprenant, element=element)
        return Response(serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        note = self.get_object()
        if note.verrouillee:
            raise ValidationError({"verrouillee": "Une note publiée ne peut plus être modifiée."})
        self.verifier_permission("pedagogie:noter")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        note = self.get_object()
        if note.verrouillee:
            raise ValidationError({"verrouillee": "Une note publiée ne peut plus être modifiée."})
        self.verifier_permission("pedagogie:noter")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        note = self.get_object()
        if note.verrouillee:
            raise ValidationError({"verrouillee": "Une note publiée ne peut pas être supprimée."})
        self.verifier_permission("pedagogie:noter")
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="publier")
    def publier(self, request, *args, **kwargs):
        self.verifier_permission("pedagogie:noter")
        note = self.get_object()
        note.verrouillee = True
        note.save(update_fields=("verrouillee",))
        return Response(self.get_serializer(note).data)


class PresenceViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = Presence.objects.none()
    serializer_class = PresenceSerializer
    filterset_fields = ["apprenant", "unite", "date", "statut"]
    search_fields = ["id", "date", "observation"]
    ordering_fields = ["id", "date"]

    def get_queryset(self):
        queryset = Presence.objects.filter(etablissement=self.etablissement_courant)
        role = role_utilisateur_etablissement(self.request.user, self.etablissement_courant)
        if role in {"PARENT", "APPRENANT"}:
            ids = set(self.request.user.profil.get("ids_apprenants_lies", []))
            return queryset.filter(apprenant_id__in=ids)
        if role == "ENSEIGNANT":
            personnel = PersonnelEnseignant.objects.filter(
                etablissement=self.etablissement_courant,
                courriel=self.request.user.courriel,
            ).first()
            ids_unites = set(personnel.ids_unites_assignees if personnel else [])
            return queryset.filter(unite_id__in=ids_unites)
        return queryset

    def list(self, request, *args, **kwargs):
        self.verifier_permission("pedagogie:voir")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("pedagogie:appel")
        apprenant = Apprenant.objects.filter(pk=request.data.get("id_apprenant"), etablissement=self.etablissement_courant).first()
        unite = UniteAcademique.objects.filter(pk=request.data.get("id_unite"), etablissement=self.etablissement_courant).first()
        if apprenant is None or unite is None:
            raise ValidationError("L’apprenant ou l’unité est invalide.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=self.etablissement_courant, apprenant=apprenant, unite=unite)
        return Response(serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        self.verifier_permission("pedagogie:appel")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.verifier_permission("pedagogie:appel")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.verifier_permission("pedagogie:appel")
        return super().destroy(request, *args, **kwargs)


class CreneauViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = CreneauEmploiDuTemps.objects.none()
    serializer_class = CreneauEmploiDuTempsSerializer
    filterset_fields = ["unite", "element", "enseignant", "jour_semaine"]
    search_fields = ["id", "salle", "jour_semaine"]
    ordering_fields = ["id", "jour_semaine", "heure_debut"]

    def get_queryset(self):
        return CreneauEmploiDuTemps.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("emplois_du_temps:voir")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("emplois_du_temps:gerer")
        unite = UniteAcademique.objects.filter(pk=request.data.get("id_unite"), etablissement=self.etablissement_courant).first()
        element = ElementPedagogique.objects.filter(pk=request.data.get("id_element"), etablissement=self.etablissement_courant).first()
        enseignant = PersonnelEnseignant.objects.filter(pk=request.data.get("id_enseignant"), etablissement=self.etablissement_courant).first()
        if unite is None or element is None or enseignant is None:
            raise ValidationError("Une relation unité, élément ou enseignant est invalide.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=self.etablissement_courant, unite=unite, element=element, enseignant=enseignant)
        return Response(serializer.data, status=201)


class EvenementCalendrierViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = EvenementCalendrier.objects.none()
    serializer_class = EvenementCalendrierSerializer
    filterset_fields = ["type", "date_debut"]
    search_fields = ["id", "titre", "description"]
    ordering_fields = ["id", "date_debut"]

    def get_queryset(self):
        return EvenementCalendrier.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("emplois_du_temps:voir")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("emplois_du_temps:gerer")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=self.etablissement_courant)
        return Response(serializer.data, status=201)


class CahierTextesViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = EntreeCahierTextes.objects.none()
    serializer_class = EntreeCahierTextesSerializer
    filterset_fields = ["unite", "element", "date"]
    search_fields = ["id", "nom_enseignant", "sujet"]
    ordering_fields = ["id", "date"]

    def get_queryset(self):
        return EntreeCahierTextes.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("pedagogie:voir")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("pedagogie:noter")
        unite = UniteAcademique.objects.filter(pk=request.data.get("id_unite"), etablissement=self.etablissement_courant).first()
        element = ElementPedagogique.objects.filter(pk=request.data.get("id_element"), etablissement=self.etablissement_courant).first()
        if unite is None or element is None:
            raise ValidationError("Une unité ou un élément pédagogique est invalide.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=self.etablissement_courant, unite=unite, element=element)
        return Response(serializer.data, status=201)


class SoutenanceViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = Soutenance.objects.none()
    serializer_class = SoutenanceSerializer
    filterset_fields = ["apprenant", "statut"]
    search_fields = ["id", "titre", "nom_directeur_memoire"]
    ordering_fields = ["id", "date_soutenance", "note"]

    def get_queryset(self):
        return Soutenance.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("pedagogie:voir")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("pedagogie:verrouiller")
        apprenant = Apprenant.objects.filter(pk=request.data.get("id_apprenant"), etablissement=self.etablissement_courant).first()
        if apprenant is None:
            raise ValidationError({"id_apprenant": "Cet apprenant n’appartient pas à l’établissement."})
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=self.etablissement_courant, apprenant=apprenant)
        return Response(serializer.data, status=201)
