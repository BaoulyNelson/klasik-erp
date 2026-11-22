from django.urls import path

from .views import AttributionBadgeViewSet, ConsentementRgpdViewSet, DemandeRgpdViewSet, LotImportationViewSet


def ressources(prefix,viewset):
    return [
        path(f"etablissements/<str:id_etablissement>/{prefix}/",viewset.as_view({"get":"list","post":"create"}),name=f"{prefix}-list"),
        path(f"etablissements/<str:id_etablissement>/{prefix}/<str:pk>/",viewset.as_view({"get":"retrieve","patch":"partial_update","put":"update","delete":"destroy"}),name=f"{prefix}-detail"),
    ]

urlpatterns=[]
urlpatterns += ressources("consentements_rgpd",ConsentementRgpdViewSet)
urlpatterns += ressources("demandes_rgpd",DemandeRgpdViewSet)
urlpatterns += ressources("journaux_importations",LotImportationViewSet)
urlpatterns += ressources("badges_attribues",AttributionBadgeViewSet)
urlpatterns += [path("etablissements/<str:id_etablissement>/demandes_rgpd/<str:pk>/traiter/",DemandeRgpdViewSet.as_view({"post":"traiter"}),name="demandes-rgpd-traiter")]
