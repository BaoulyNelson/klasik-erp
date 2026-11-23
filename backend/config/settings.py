import os
import sys
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlsplit

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR.parent / ".env")


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
DEBUG = lire_booleen("DJANGO_DEBUG", False)
EN_EXECUTION_TEST = "test" in sys.argv
DEMO_PUBLIQUE_ACTIVE = DEBUG and lire_booleen("DEMO_PUBLIQUE_ACTIVE", False)
DJANGO_GOOGLE_CLIENT_ID = os.getenv("DJANGO_GOOGLE_CLIENT_ID", "").strip()
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
if not DEBUG and not EN_EXECUTION_TEST and "*" in ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS ne peut pas contenir un joker en production.")
origines_cors = lire_liste(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
DJANGO_FRONTEND_URL = os.getenv(
    "DJANGO_FRONTEND_URL",
    origines_cors[0] if origines_cors else "http://localhost:3000",
).strip().rstrip("/")
url_frontend = urlsplit(DJANGO_FRONTEND_URL)
if url_frontend.scheme not in {"http", "https"} or not url_frontend.netloc:
    raise ImproperlyConfigured("DJANGO_FRONTEND_URL doit être une URL HTTP(S) absolue.")
if not DEBUG and not EN_EXECUTION_TEST and url_frontend.scheme != "https":
    raise ImproperlyConfigured("DJANGO_FRONTEND_URL doit utiliser HTTPS en production.")
if not DEBUG and not origines_cors:
    raise ImproperlyConfigured(
        "DJANGO_CORS_ALLOWED_ORIGINS ne peut pas être vide hors du mode développement."
    )
if not DEBUG and "DJANGO_CSRF_TRUSTED_ORIGINS" not in os.environ:
    raise ImproperlyConfigured(
        "DJANGO_CSRF_TRUSTED_ORIGINS doit être configuré hors du mode développement."
    )
CSRF_TRUSTED_ORIGINS = lire_liste(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
if DEBUG or EN_EXECUTION_TEST:
    CSRF_TRUSTED_ORIGINS = list(
        dict.fromkeys(
            [
                *CSRF_TRUSTED_ORIGINS,
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        )
    )
if not DEBUG and not EN_EXECUTION_TEST and not CSRF_TRUSTED_ORIGINS:
    raise ImproperlyConfigured(
        "DJANGO_CSRF_TRUSTED_ORIGINS ne peut pas être vide hors du mode développement."
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
    "campus_numerique",
    "securite",
    "donnees",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
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
if not DEBUG and not EN_EXECUTION_TEST and db_engine not in {"postgres", "postgresql"}:
    raise ImproperlyConfigured("PostgreSQL est obligatoire hors du mode développement.")

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
JWT_ACCESS_COOKIE_NAME = "klasik_access"
JWT_REFRESH_COOKIE_NAME = "klasik_refresh"
JWT_REFRESH_COOKIE_PATH = "/api/auth/"
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
# Fichiers construits par Vite (assets/, sw.js, manifest.webmanifest, registerSW.js), servis à la racine
WHITENOISE_ROOT = BASE_DIR.parent / "dist"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = origines_cors
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.authentication.AuthentificationJwtCookie",
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
    "NUM_PROXIES": int(os.getenv("DJANGO_NUM_PROXIES", "2" if not DEBUG else "0")),
    "DEFAULT_THROTTLE_RATES": {
        "auth_login": "10/minute",
        "auth_demo": "10/minute",
        "auth_google": "10/minute",
        "public_contact": "5/hour",
        "tenant_creation": "3/hour",
        "password_reset": "3/hour",
        "password_reset_confirm": "5/hour",
    },
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
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_SSL_REDIRECT = lire_booleen("DJANGO_SECURE_SSL_REDIRECT", not DEBUG)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_HSTS_SECONDS = int(
    os.getenv("DJANGO_SECURE_HSTS_SECONDS", "31536000" if not DEBUG else "0")
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
if not DEBUG and not EN_EXECUTION_TEST:
    if not SECURE_SSL_REDIRECT:
        raise ImproperlyConfigured(
            "DJANGO_SECURE_SSL_REDIRECT doit rester activé en production."
        )
    if SECURE_HSTS_SECONDS < 31536000:
        raise ImproperlyConfigured(
            "DJANGO_SECURE_HSTS_SECONDS doit être d’au moins un an en production."
        )
    if any(not origine.startswith("https://") for origine in origines_cors):
        raise ImproperlyConfigured(
            "Les origines CORS de production doivent utiliser HTTPS."
        )
    if any(not origine.startswith("https://") for origine in CSRF_TRUSTED_ORIGINS):
        raise ImproperlyConfigured(
            "Les origines CSRF de production doivent utiliser HTTPS."
        )

EMAIL_HOST = os.getenv("DJANGO_EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("DJANGO_EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("DJANGO_EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("DJANGO_EMAIL_HOST_PASSWORD", "")
EMAIL_BACKEND = os.getenv(
    "DJANGO_EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend"
    if EN_EXECUTION_TEST or (DEBUG and not EMAIL_HOST)
    else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_USE_TLS = lire_booleen("DJANGO_EMAIL_USE_TLS", True)
EMAIL_USE_SSL = lire_booleen("DJANGO_EMAIL_USE_SSL", False)
EMAIL_TIMEOUT = int(os.getenv("DJANGO_EMAIL_TIMEOUT", "10"))
DEFAULT_FROM_EMAIL = os.getenv("DJANGO_DEFAULT_FROM_EMAIL", "noreply@localhost")
DJANGO_SUPPORT_EMAIL = os.getenv("DJANGO_SUPPORT_EMAIL", DEFAULT_FROM_EMAIL)
if (
    not DEBUG
    and not EN_EXECUTION_TEST
):
    if EMAIL_BACKEND != "django.core.mail.backends.smtp.EmailBackend":
        raise ImproperlyConfigured(
            "Un relais SMTP doit être configuré pour l’envoi de courriels en production."
        )
    if not EMAIL_HOST or DEFAULT_FROM_EMAIL.endswith("@localhost"):
        raise ImproperlyConfigured(
            "DJANGO_EMAIL_HOST et DJANGO_DEFAULT_FROM_EMAIL doivent être configurés en production."
        )
    if EMAIL_USE_TLS and EMAIL_USE_SSL:
        raise ImproperlyConfigured(
            "DJANGO_EMAIL_USE_TLS et DJANGO_EMAIL_USE_SSL ne peuvent pas être activés simultanément."
        )
    if bool(EMAIL_HOST_USER) != bool(EMAIL_HOST_PASSWORD):
        raise ImproperlyConfigured(
            "DJANGO_EMAIL_HOST_USER et DJANGO_EMAIL_HOST_PASSWORD doivent être définis ensemble."
        )

cache_backend = os.getenv(
    "DJANGO_CACHE_BACKEND",
    "locmem" if DEBUG or EN_EXECUTION_TEST else "database",
).strip().lower()
if cache_backend not in {"locmem", "database"}:
    raise ImproperlyConfigured("DJANGO_CACHE_BACKEND doit valoir locmem ou database.")
if not DEBUG and not EN_EXECUTION_TEST and cache_backend != "database":
    raise ImproperlyConfigured(
        "Le cache partagé en base de données est obligatoire hors du mode développement."
    )
CACHES = {
    "default": (
        {
            "BACKEND": "django.core.cache.backends.db.DatabaseCache",
            "LOCATION": os.getenv("DJANGO_CACHE_TABLE", "django_cache"),
        }
        if cache_backend == "database"
        else {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
    )
}
