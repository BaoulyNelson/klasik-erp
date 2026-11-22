from django.utils.translation import override
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    Throttled,
)
from rest_framework.views import exception_handler


def gestionnaire_erreurs(exception, context):
    with override("fr"):
        reponse = exception_handler(exception, context)
    if reponse is None:
        return None

    if isinstance(exception, (AuthenticationFailed, NotAuthenticated)):
        message = "Authentification requise ou identifiants invalides."
        details = None
    elif isinstance(exception, PermissionDenied):
        message = "Vous n’avez pas la permission d’effectuer cette action."
        details = None
    elif isinstance(exception, Throttled):
        message = "Trop de requêtes. Veuillez réessayer plus tard."
        details = None
    elif reponse.status_code == 404:
        message = "La ressource demandée est introuvable."
        details = None
    elif reponse.status_code == 400:
        message = "Les données envoyées sont invalides."
        details = reponse.data
    else:
        message = "La requête n’a pas pu être traitée."
        details = None

    reponse.data = {"message": message, "details": details}
    return reponse
