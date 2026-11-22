from django.urls import path

from .views import ArticleActualiteViewSet, MessageCommunicationViewSet, NotificationViewSet


urlpatterns = [
    path(
        "etablissements/<str:id_etablissement>/communications/",
        MessageCommunicationViewSet.as_view({"get": "list", "post": "create"}),
        name="communications-list",
    ),
    path(
        "etablissements/<str:id_etablissement>/communications/<str:pk>/",
        MessageCommunicationViewSet.as_view({"get": "retrieve", "patch": "partial_update", "put": "update", "delete": "destroy"}),
        name="communications-detail",
    ),
    path(
        "etablissements/<str:id_etablissement>/notifications/",
        NotificationViewSet.as_view({"get": "list", "post": "create"}),
        name="notifications-list",
    ),
    path(
        "etablissements/<str:id_etablissement>/notifications/<str:pk>/",
        NotificationViewSet.as_view({"get": "retrieve", "patch": "partial_update", "put": "update", "delete": "destroy"}),
        name="notifications-detail",
    ),
    path(
        "etablissements/<str:id_etablissement>/notifications/<str:pk>/marquer-lue/",
        NotificationViewSet.as_view({"post": "marquer_lue"}),
        name="notifications-marquer-lue",
    ),
    path(
        "etablissements/<str:id_etablissement>/articles_actualites/",
        ArticleActualiteViewSet.as_view({"get": "list", "post": "create"}),
        name="articles_actualites-list",
    ),
    path(
        "etablissements/<str:id_etablissement>/articles_actualites/<str:pk>/",
        ArticleActualiteViewSet.as_view({"get": "retrieve", "patch": "partial_update", "put": "update", "delete": "destroy"}),
        name="articles_actualites-detail",
    ),
]
