from django.urls import path

from api.tenant_views import (
    CollectionTenantView,
    DetailEnregistrementTenantView,
    ListeEtablissementsView,
)

urlpatterns = [
    path("etablissements/", ListeEtablissementsView.as_view(), name="liste-etablissements"),
    path(
        "etablissements/<str:id_etablissement>/donnees/<str:collection>/",
        CollectionTenantView.as_view(),
        name="collection-tenant",
    ),
    path(
        "etablissements/<str:id_etablissement>/donnees/<str:collection>/<str:id_objet>/",
        DetailEnregistrementTenantView.as_view(),
        name="detail-enregistrement-tenant",
    ),
]
