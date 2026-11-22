from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from comptes.models import Utilisateur


@admin.register(Utilisateur)
class AdministrationUtilisateur(UserAdmin):
    ordering = ("courriel",)
    list_display = ("courriel", "nom_complet", "role", "is_active", "est_super_admin_plateforme")
    list_filter = ("role", "is_active", "est_super_admin_plateforme")
    search_fields = ("courriel", "nom_complet")
    fieldsets = (
        (None, {"fields": ("courriel", "password")}),
        ("Profil", {"fields": ("nom_complet", "telephone", "role", "courriel_verifie")}),
        ("Plateforme", {"fields": ("est_super_admin_plateforme",)}),
        ("Autorisations Django", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined", "modifie_le")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("courriel", "nom_complet", "role", "password1", "password2"),
            },
        ),
    )
    readonly_fields = ("last_login", "date_joined", "modifie_le")
    filter_horizontal = ("groups", "user_permissions")
