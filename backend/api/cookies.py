from django.conf import settings
from rest_framework.response import Response


def ajouter_cookies_jetons(reponse, access: str, refresh: str):
    securise = not settings.DEBUG
    max_age_access = int(
        settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()
    )
    max_age_refresh = int(
        settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()
    )
    reponse.set_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        access,
        max_age=max_age_access,
        path="/",
        secure=securise,
        httponly=True,
        samesite="Lax",
    )
    reponse.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        refresh,
        max_age=max_age_refresh,
        path=settings.JWT_REFRESH_COOKIE_PATH,
        secure=securise,
        httponly=True,
        samesite="Lax",
    )
    return reponse


def effacer_cookies_jetons(reponse):
    reponse.delete_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        path="/",
        samesite="Lax",
    )
    reponse.delete_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_REFRESH_COOKIE_PATH,
        samesite="Lax",
    )
    return reponse


def reponse_session_cookie(access: str, refresh: str, statut=200):
    reponse = Response({"message": "Session authentifiée."}, status=statut)
    return ajouter_cookies_jetons(reponse, access, refresh)
