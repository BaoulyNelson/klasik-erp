from django.apps import AppConfig


class DonneesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "donnees"
    verbose_name = "Données métier"

    def ready(self):
        from . import signals  # noqa: F401
