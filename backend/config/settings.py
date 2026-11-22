import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def lire_booleen(nom: str, defaut: bool) -> bool:
    valeur = os.getenv(nom)
    if valeur is None:
        return defaut
    return valeur.strip().lower() in {"1", "true", "yes", "oui"}


def lire_liste(nom: str, defaut: str = "") -> list[str]:
    return [valeur.strip() for valeur in os.getenv(nom, defaut).split(",") if valeur.strip()]


SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "cle-de-developpement-insecure-a-remplacer-obligatoirement",
)
DEBUG = lire_booleen("DJANGO_DEBUG", True)
if not DEBUG and (
    "DJANGO_SECRET_KEY" not in os.environ
    or not SECRET_KEY
    or SECRET_KEY == "cle-de-developpement-insecure-a-remplacer-obligatoirement"
    or SECRET_KEY.startswith("remplacer-")
):
    raise ImproperlyConfigured("DJANGO_SECRET_KEY doit être définie hors du mode développement.")
if not DEBUG and "DJANGO_ALLOWED_HOSTS" not in os.environ:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS doit être configuré hors du mode développement.")
if not DEBUG and "DJANGO_CORS_ALLOWED_ORIGINS" not in os.environ:
    raise ImproperlyConfigured(
        "DJANGO_CORS_ALLOWED_ORIGINS doit être configuré hors du mode développement."
    )
ALLOWED_HOSTS = lire_liste("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost,testserver")
if not DEBUG and not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS ne peut pas être vide hors du mode développement.")
origines_cors = lire_liste(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
if not DEBUG and not origines_cors:
    raise ImproperlyConfigured(
        "DJANGO_CORS_ALLOWED_ORIGINS ne peut pas être vide hors du mode développement."
    )
CSRF_TRUSTED_ORIGINS = lire_liste(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "django_filters",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "comptes",
    "etablissements",
    "scolarite",
    "pedagogie",
    "finances",
    "documents",
    "communication",
    "services_annexes",
    "donnees",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

db_engine = os.getenv("DB_ENGINE", "sqlite").strip().lower()
if db_engine not in {"sqlite", "postgres", "postgresql"}:
    raise ImproperlyConfigured("DB_ENGINE doit valoir sqlite ou postgresql.")

if db_engine in {"postgres", "postgresql"}:
    configuration_postgres = {
        "DB_NAME": os.getenv("DB_NAME", ""),
        "DB_USER": os.getenv("DB_USER", ""),
        "DB_PASSWORD": os.getenv("DB_PASSWORD", ""),
        "DB_HOST": os.getenv("DB_HOST", ""),
    }
    champs_postgres_manquants = [
        nom for nom, valeur in configuration_postgres.items() if not valeur
    ]
    if champs_postgres_manquants:
        raise ImproperlyConfigured(
            "La configuration PostgreSQL est incomplète : "
            + ", ".join(champs_postgres_manquants)
            + "."
        )
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", ""),
            "USER": os.getenv("DB_USER", ""),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "127.0.0.1"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "CONN_MAX_AGE": 60,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / os.getenv("DB_NAME", "db.sqlite3"),
        }
    }

AUTH_USER_MODEL = "comptes.Utilisateur"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = origines_cors

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "api.exceptions.gestionnaire_erreurs",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=10),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "API Klasik ERP",
    "DESCRIPTION": "API REST de gestion éducative multi-établissements.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_SSL_REDIRECT = lire_booleen("DJANGO_SECURE_SSL_REDIRECT", not DEBUG)
SECURE_HSTS_SECONDS = int(
    os.getenv("DJANGO_SECURE_HSTS_SECONDS", "31536000" if not DEBUG else "0")
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
