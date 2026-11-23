from django.conf import settings
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework_simplejwt.authentication import JWTAuthentication


def verifier_csrf_cookie(request) -> None:
    requete_django = getattr(request, "_request", request)
    verification = CSRFCheck(lambda requete: None)
    verification.process_request(requete_django)
    raison = verification.process_view(requete_django, None, (), {})
    if raison:
        raise PermissionDenied(
            "La vérification de sécurité a échoué. Actualisez la page puis réessayez."
        )


class AuthentificationJwtCookie(JWTAuthentication):
    def authenticate(self, request):
        jeton_cookie = request.COOKIES.get(settings.JWT_ACCESS_COOKIE_NAME)
        if jeton_cookie:
            jeton_valide = self.get_validated_token(jeton_cookie)
            utilisateur = self.get_user(jeton_valide)
            verifier_csrf_cookie(request)
            authentification = utilisateur, jeton_valide
        else:
            authentification = super().authenticate(request)
            if authentification is None:
                return None

        utilisateur, jeton = authentification
        if (utilisateur.profil or {}).get("doit_changer_mot_de_passe"):
            chemins_autorises = {
                "/api/auth/me/",
                "/api/auth/password/change/",
            }
            if request.path_info not in chemins_autorises:
                raise PermissionDenied(
                    "Vous devez changer votre mot de passe avant d’accéder à l’application."
                )
        return utilisateur, jeton


class CookieJwtAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "api.authentication.AuthentificationJwtCookie"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": settings.JWT_ACCESS_COOKIE_NAME,
        }
