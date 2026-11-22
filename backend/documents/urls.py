from django.urls import path

from .views import DocumentOfficielViewSet

urlpatterns = [
    path(
        "etablissements/<str:id_etablissement>/documents/",
        DocumentOfficielViewSet.as_view({"get": "list", "post": "create"}),
        name="documents-list",
    ),
    path(
        "etablissements/<str:id_etablissement>/documents/<str:pk>/",
        DocumentOfficielViewSet.as_view({"get": "retrieve", "patch": "partial_update", "put": "update", "delete": "destroy"}),
        name="documents-detail",
    ),
    path(
        "etablissements/<str:id_etablissement>/documents/<str:pk>/emettre/",
        DocumentOfficielViewSet.as_view({"post": "emettre"}),
        name="documents-emettre",
    ),
]
