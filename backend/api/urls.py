from django.urls import path

from api.file_views import LectureFichierView, TeleversementFichierTenantView
from api.tenant_views import (
    CollectionTenantView,
    DetailEtablissementTenantView,
    DetailEnregistrementTenantView,
    DetailUtilisateurTenantView,
    JournalAuditTenantView,
    ListeEtablissementsView,
    ListeUtilisateursTenantView,
    PermissionsRolesTenantView,
)

urlpatterns = [
    path("etablissements/", ListeEtablissementsView.as_view(), name="liste-etablissements"),
    path(
        "etablissements/<str:id_etablissement>/",
        DetailEtablissementTenantView.as_view(),
        name="detail-etablissement",
    ),
    path(
        "etablissements/<str:id_etablissement>/permissions/",
        PermissionsRolesTenantView.as_view(),
        name="permissions-roles-etablissement",
    ),
    path(
        "etablissements/<str:id_etablissement>/utilisateurs/",
        ListeUtilisateursTenantView.as_view(),
        name="utilisateurs-etablissement",
    ),
    path(
        "etablissements/<str:id_etablissement>/utilisateurs/<str:id_utilisateur>/",
        DetailUtilisateurTenantView.as_view(),
        name="detail-utilisateur-etablissement",
    ),
    path(
        "etablissements/<str:id_etablissement>/audit/",
        JournalAuditTenantView.as_view(),
        name="journal-audit-etablissement",
    ),
    path(
        "etablissements/<str:id_etablissement>/fichiers/",
        TeleversementFichierTenantView.as_view(),
        name="televersement-fichier",
    ),
    path("fichiers/<uuid:id_fichier>/", LectureFichierView.as_view(), name="lecture-fichier"),
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
