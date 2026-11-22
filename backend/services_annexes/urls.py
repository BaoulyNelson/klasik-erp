from django.urls import path

from .views import (
    AncienEtudiantViewSet,
    ArticleInventaireViewSet,
    EmpruntBibliothequeViewSet,
    IncidentDisciplineViewSet,
    LivreViewSet,
    PretMaterielViewSet,
    VisiteInfirmerieViewSet,
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
urlpatterns += ressources("livres_bibliotheque", LivreViewSet)
urlpatterns += ressources("emprunts_bibliotheque", EmpruntBibliothequeViewSet)
urlpatterns += ressources("visites_infirmerie", VisiteInfirmerieViewSet)
urlpatterns += ressources("incidents_discipline", IncidentDisciplineViewSet)
urlpatterns += ressources("inventaire", ArticleInventaireViewSet)
urlpatterns += ressources("prets_materiels", PretMaterielViewSet)
urlpatterns += ressources("anciens", AncienEtudiantViewSet)
