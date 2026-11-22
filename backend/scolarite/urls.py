from django.urls import path

from .views import ApprenantViewSet, ElementViewSet, InscriptionViewSet, UniteViewSet

urlpatterns = [
    path(
        "etablissements/<str:id_etablissement>/unites/",
        UniteViewSet.as_view({"get": "list", "post": "create"}),
        name="unites-list",
    ),
    path(
        "etablissements/<str:id_etablissement>/unites/<str:pk>/",
        UniteViewSet.as_view({"get": "retrieve", "patch": "partial_update", "put": "update", "delete": "destroy"}),
        name="unites-detail",
    ),
    path(
        "etablissements/<str:id_etablissement>/elements/",
        ElementViewSet.as_view({"get": "list", "post": "create"}),
        name="elements-list",
    ),
    path(
        "etablissements/<str:id_etablissement>/elements/<str:pk>/",
        ElementViewSet.as_view({"get": "retrieve", "patch": "partial_update", "put": "update", "delete": "destroy"}),
        name="elements-detail",
    ),
    path(
        "etablissements/<str:id_etablissement>/apprenants/",
        ApprenantViewSet.as_view({"get": "list", "post": "create"}),
        name="apprenants-list",
    ),
    path(
        "etablissements/<str:id_etablissement>/apprenants/<str:pk>/",
        ApprenantViewSet.as_view({"get": "retrieve", "patch": "partial_update", "put": "update", "delete": "destroy"}),
        name="apprenants-detail",
    ),
    path(
        "etablissements/<str:id_etablissement>/inscriptions/",
        InscriptionViewSet.as_view({"get": "list", "post": "create"}),
        name="inscriptions-list",
    ),
    path(
        "etablissements/<str:id_etablissement>/inscriptions/<str:pk>/",
        InscriptionViewSet.as_view({"get": "retrieve", "patch": "partial_update", "put": "update", "delete": "destroy"}),
        name="inscriptions-detail",
    ),
    path(
        "etablissements/<str:id_etablissement>/inscriptions/<str:pk>/annuler/",
        InscriptionViewSet.as_view({"post": "annuler"}),
        name="inscriptions-annuler",
    ),
]
