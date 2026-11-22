from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated

from api.permissions import permissions_utilisateur, role_utilisateur_etablissement
from etablissements.models import Etablissement

from .models import (
    AncienEtudiant,
    ArticleInventaire,
    EmpruntBibliotheque,
    IncidentDiscipline,
    LivreBibliotheque,
    PretMateriel,
    VisiteInfirmerie,
)
from .serializers import (
    AncienEtudiantSerializer,
    ArticleInventaireSerializer,
    EmpruntBibliothequeSerializer,
    IncidentDisciplineSerializer,
    LivreBibliothequeSerializer,
    PretMaterielSerializer,
    VisiteInfirmerieSerializer,
)


class VueTenantViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.etablissement_courant = Etablissement.objects.filter(pk=self.kwargs["id_etablissement"]).first()
        if self.etablissement_courant is None:
            raise ValidationError({"id_etablissement": "L’établissement est introuvable."})
        role_utilisateur_etablissement(request.user, self.etablissement_courant)

    def get_permissions_config(self):
        return ("services:voir", "services:gerer")

    def verifier_permission(self, ecriture=False):
        lecture, ecriture_permission = self.get_permissions_config()
        permission = ecriture_permission if ecriture else lecture
        permissions = permissions_utilisateur(self.request.user, self.etablissement_courant)
        if permission not in permissions:
            raise PermissionDenied("Vous n’avez pas la permission d’effectuer cette action.")

    def list(self, request, *args, **kwargs):
        self.verifier_permission(False)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission(True)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(etablissement=self.etablissement_courant)


class LivreViewSet(VueTenantViewSet):
    queryset = LivreBibliotheque.objects.none()
    serializer_class = LivreBibliothequeSerializer
    def get_queryset(self):
        return LivreBibliotheque.objects.filter(etablissement=self.etablissement_courant)
    def get_permissions_config(self):
        return ("bibliotheque_materiels:voir", "bibliotheque_materiels:gerer")


class EmpruntBibliothequeViewSet(LivreViewSet):
    queryset = EmpruntBibliotheque.objects.none()
    serializer_class = EmpruntBibliothequeSerializer
    def get_queryset(self):
        return EmpruntBibliotheque.objects.filter(etablissement=self.etablissement_courant)


class VisiteInfirmerieViewSet(VueTenantViewSet):
    queryset = VisiteInfirmerie.objects.none()
    serializer_class = VisiteInfirmerieSerializer
    def get_queryset(self):
        return VisiteInfirmerie.objects.filter(etablissement=self.etablissement_courant)


class IncidentDisciplineViewSet(VueTenantViewSet):
    queryset = IncidentDiscipline.objects.none()
    serializer_class = IncidentDisciplineSerializer
    def get_queryset(self):
        return IncidentDiscipline.objects.filter(etablissement=self.etablissement_courant)


class ArticleInventaireViewSet(VueTenantViewSet):
    queryset = ArticleInventaire.objects.none()
    serializer_class = ArticleInventaireSerializer
    def get_queryset(self):
        return ArticleInventaire.objects.filter(etablissement=self.etablissement_courant)
    def get_permissions_config(self):
        return ("bibliotheque_materiels:voir", "bibliotheque_materiels:gerer")


class PretMaterielViewSet(VueTenantViewSet):
    queryset = PretMateriel.objects.none()
    serializer_class = PretMaterielSerializer
    def get_queryset(self):
        return PretMateriel.objects.filter(etablissement=self.etablissement_courant)
    def get_permissions_config(self):
        return ("bibliotheque_materiels:voir", "bibliotheque_materiels:gerer")


class AncienEtudiantViewSet(VueTenantViewSet):
    queryset = AncienEtudiant.objects.none()
    serializer_class = AncienEtudiantSerializer
    def get_queryset(self):
        return AncienEtudiant.objects.filter(etablissement=self.etablissement_courant)
