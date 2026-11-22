from django.contrib import admin

from .models import (
    Apprenant,
    ContactTuteur,
    EcheancePaiement,
    ElementPedagogique,
    InscriptionApprenant,
    UniteAcademique,
)


@admin.register(UniteAcademique)
class UniteAcademiqueAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "nom", "etablissement", "capacite")
    list_filter = ("etablissement",)
    search_fields = ("id", "code", "nom")


@admin.register(ElementPedagogique)
class ElementPedagogiqueAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "nom", "etablissement", "unite")
    list_filter = ("etablissement", "nature")
    search_fields = ("id", "code", "nom")


@admin.register(Apprenant)
class ApprenantAdmin(admin.ModelAdmin):
    list_display = ("id", "matricule", "prenom", "nom", "etablissement", "statut")
    list_filter = ("etablissement", "statut", "statut_paiement")
    search_fields = ("id", "matricule", "prenom", "nom", "courriel")


admin.site.register(ContactTuteur)
admin.site.register(EcheancePaiement)


@admin.register(InscriptionApprenant)
class InscriptionApprenantAdmin(admin.ModelAdmin):
    list_display = ("id", "numero_inscription", "apprenant", "etablissement", "statut_inscription")
    list_filter = ("etablissement", "statut_inscription", "type_inscription")
    search_fields = ("id", "numero_inscription", "annee_academique")

# Register your models here.
