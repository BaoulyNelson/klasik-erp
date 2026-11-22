from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import permissions_utilisateur, role_utilisateur_etablissement
from etablissements.models import Etablissement

from .models import ArticleActualite, MessageCommunication, Notification
from .serializers import (
    ArticleActualiteSerializer,
    MessageCommunicationSerializer,
    NotificationSerializer,
)


class VueTenantMixin:
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.etablissement_courant = Etablissement.objects.filter(
            pk=self.kwargs["id_etablissement"]
        ).first()
        if self.etablissement_courant is None:
            raise ValidationError({"id_etablissement": "L’établissement est introuvable."})
        role_utilisateur_etablissement(request.user, self.etablissement_courant)

    def verifier_permission(self, permission):
        permissions = permissions_utilisateur(
            self.request.user,
            self.etablissement_courant,
        )
        if permission not in permissions:
            raise PermissionDenied("Vous n’avez pas la permission d’effectuer cette action.")


class MessageCommunicationViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = MessageCommunication.objects.none()
    serializer_class = MessageCommunicationSerializer
    filterset_fields = ["canal", "audience"]
    search_fields = ["id", "titre", "contenu", "envoye_par"]
    ordering_fields = ["id", "envoye_le", "nombre_destinataires"]

    def get_queryset(self):
        return MessageCommunication.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("communication:voir")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("communication:envoyer")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=self.etablissement_courant)
        return Response(serializer.data, status=201)


class NotificationViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = Notification.objects.none()
    serializer_class = NotificationSerializer
    filterset_fields = ["severite", "lue"]
    search_fields = ["id", "titre", "description"]
    ordering_fields = ["id", "cree_le"]

    def get_queryset(self):
        return Notification.objects.filter(etablissement=self.etablissement_courant)

    def list(self, request, *args, **kwargs):
        self.verifier_permission("tableau_de_bord:voir")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("communication:envoyer")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notification = serializer.save(etablissement=self.etablissement_courant)
        return Response(self.get_serializer(notification).data, status=201)

    @action(detail=True, methods=["post"], url_path="marquer-lue")
    def marquer_lue(self, request, *args, **kwargs):
        notification = self.get_object()
        notification.lue = True
        notification.save(update_fields=("lue",))
        return Response(self.get_serializer(notification).data)


class ArticleActualiteViewSet(VueTenantMixin, viewsets.ModelViewSet):
    queryset = ArticleActualite.objects.none()
    serializer_class = ArticleActualiteSerializer
    filterset_fields = ["categorie", "audience", "epingle"]
    search_fields = ["id", "titre", "resume", "contenu", "nom_auteur"]
    ordering_fields = ["id", "publie_le"]

    def get_queryset(self):
        queryset = ArticleActualite.objects.filter(etablissement=self.etablissement_courant)
        role = role_utilisateur_etablissement(self.request.user, self.etablissement_courant)
        if role in {"PARENT", "APPRENANT"}:
            audience = "Parents" if role == "PARENT" else "Apprenants"
            return queryset.filter(audience__in=["Tous", audience])
        return queryset

    def list(self, request, *args, **kwargs):
        self.verifier_permission("actualites:voir")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.verifier_permission("actualites:gerer")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etablissement=self.etablissement_courant)
        return Response(serializer.data, status=201)
