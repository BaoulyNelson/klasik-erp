from django.urls import path

from .views import (
    AbonnementServiceViewSet,
    BulletinPaieViewSet,
    DepenseViewSet,
    PaiementViewSet,
)


def ressources(prefix, viewset):
    return [
        path(
            f"etablissements/<str:id_etablissement>/{prefix}/",
            viewset.as_view({"get": "list", "post": "create"}),
            name=f"{prefix}-list",
        ),
        path(
            f"etablissements/<str:id_etablissement>/{prefix}/<str:pk>/",
            viewset.as_view({"get": "retrieve", "patch": "partial_update", "put": "update", "delete": "destroy"}),
            name=f"{prefix}-detail",
        ),
    ]


urlpatterns = []
urlpatterns += ressources("paiements", PaiementViewSet)
urlpatterns += ressources("depenses", DepenseViewSet)
urlpatterns += ressources("paie", BulletinPaieViewSet)
urlpatterns += ressources("abonnements", AbonnementServiceViewSet)
urlpatterns += [
    path(
        "etablissements/<str:id_etablissement>/paiements/<str:pk>/annuler/",
        PaiementViewSet.as_view({"post": "annuler"}),
        name="paiements-annuler",
    ),
    path(
        "etablissements/<str:id_etablissement>/paie/<str:pk>/payer/",
        BulletinPaieViewSet.as_view({"post": "payer"}),
        name="paie-payer",
    ),
]
