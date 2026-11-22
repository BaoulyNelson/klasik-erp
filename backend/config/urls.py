from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenBlacklistView, TokenObtainPairView, TokenRefreshView

from api.views import ConnexionDemoView, ProfilCourantView, SanteView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/sante/", SanteView.as_view(), name="sante"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="obtenir-jetons"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="rafraichir-jeton"),
    path("api/auth/token/blacklist/", TokenBlacklistView.as_view(), name="revoquer-jeton"),
    path("api/auth/demo/", ConnexionDemoView.as_view(), name="connexion-demo"),
    path("api/auth/me/", ProfilCourantView.as_view(), name="profil-courant"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema-api"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema-api"), name="documentation-api"),
    path("api/", include("api.urls")),
]
