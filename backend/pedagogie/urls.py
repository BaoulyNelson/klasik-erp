from django.urls import path

from .views import (
    CahierTextesViewSet,
    CreneauViewSet,
    EvenementCalendrierViewSet,
    NoteEvaluationViewSet,
    PersonnelEnseignantViewSet,
    PresenceViewSet,
    SoutenanceViewSet,
)


def ressources(prefix, viewset, permission_actions):
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
urlpatterns += ressources("enseignants", PersonnelEnseignantViewSet, None)
urlpatterns += ressources("notes", NoteEvaluationViewSet, None)
urlpatterns += ressources("presences", PresenceViewSet, None)
urlpatterns += ressources("emplois_du_temps", CreneauViewSet, None)
urlpatterns += ressources("evenements_calendrier", EvenementCalendrierViewSet, None)
urlpatterns += ressources("cahiers_textes", CahierTextesViewSet, None)
urlpatterns += ressources("soutenances", SoutenanceViewSet, None)
urlpatterns += [
    path(
        "etablissements/<str:id_etablissement>/notes/<str:pk>/publier/",
        NoteEvaluationViewSet.as_view({"post": "publier"}),
        name="notes-publier",
    ),
]
