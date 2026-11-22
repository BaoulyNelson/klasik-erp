from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenBlacklistView, TokenRefreshView

from api.views import (
    ChangerMotDePasseView,
    ConnexionGoogleView,
    ConfirmerReinitialisationView,
    ConnexionDemoView,
    DemanderReinitialisationView,
    ObtenirJetonsVerrouilleView,
    PhotoProfilView,
    ProfilCourantView,
    SanteView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/sante/", SanteView.as_view(), name="sante"),
    path("api/auth/token/", ObtenirJetonsVerrouilleView.as_view(), name="obtenir-jetons"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="rafraichir-jeton"),
    path("api/auth/token/blacklist/", TokenBlacklistView.as_view(), name="revoquer-jeton"),
    path("api/auth/demo/", ConnexionDemoView.as_view(), name="connexion-demo"),
    path("api/auth/me/", ProfilCourantView.as_view(), name="profil-courant"),
    path("api/auth/profile/", PhotoProfilView.as_view(), name="photo-profil"),
    path("api/auth/password/reset/", DemanderReinitialisationView.as_view(), name="demander-reinitialisation"),
    path("api/auth/password/reset/confirm/", ConfirmerReinitialisationView.as_view(), name="confirmer-reinitialisation"),
    path("api/auth/password/change/", ChangerMotDePasseView.as_view(), name="changer-mot-de-passe"),
    path("api/auth/google/", ConnexionGoogleView.as_view(), name="connexion-google"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema-api"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema-api"), name="documentation-api"),
    path("api/", include("scolarite.urls")),
    path("api/", include("pedagogie.urls")),
    path("api/", include("finances.urls")),
    path("api/", include("documents.urls")),
    path("api/", include("communication.urls")),
    path("api/", include("services_annexes.urls")),
    path("api/", include("campus_numerique.urls")),
    path("api/", include("securite.urls")),
    path("api/", include("api.urls")),
]
