from django.urls import path

from .views import DevoirLmsViewSet, RemiseDevoirViewSet, RessourceLmsViewSet


def ressources(prefix,viewset):
    return [
        path(f"etablissements/<str:id_etablissement>/{prefix}/",viewset.as_view({"get":"list","post":"create"}),name=f"{prefix}-list"),
        path(f"etablissements/<str:id_etablissement>/{prefix}/<str:pk>/",viewset.as_view({"get":"retrieve","patch":"partial_update","put":"update","delete":"destroy"}),name=f"{prefix}-detail"),
    ]

urlpatterns=[]
urlpatterns += ressources("ressources_lms",RessourceLmsViewSet)
urlpatterns += ressources("devoirs_lms",DevoirLmsViewSet)
urlpatterns += ressources("remises_devoirs_lms",RemiseDevoirViewSet)
urlpatterns += [path("etablissements/<str:id_etablissement>/devoirs_lms/<str:pk>/cloturer/",DevoirLmsViewSet.as_view({"post":"cloturer"}),name="devoirs-cloturer")]
