from django.contrib import admin

from donnees.models import EnregistrementMetier, EntreeAuditApi


@admin.register(EnregistrementMetier)
class AdministrationEnregistrementMetier(admin.ModelAdmin):
    list_display = ("collection", "id_objet", "etablissement", "modifie_le")
    list_filter = ("collection", "etablissement")
    search_fields = ("id_objet", "collection")
    readonly_fields = ("cree_le", "modifie_le")


@admin.register(EntreeAuditApi)
class AdministrationEntreeAuditApi(admin.ModelAdmin):
    list_display = ("cree_le", "etablissement", "utilisateur", "action", "collection", "id_objet")
    list_filter = ("action", "collection", "etablissement")
    readonly_fields = ("cree_le", "etablissement", "utilisateur", "action", "collection", "id_objet")
