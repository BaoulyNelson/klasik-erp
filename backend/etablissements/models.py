from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from etablissements.validators import (
    PROFILS_TELEPHONE,
    valider_fuseau_iana,
    valider_telephone_pays,
)


class TypeEtablissement(models.TextChoices):
    PRO = "PRO", "Établissement professionnel"
    SCOLAIRE = "SCOLAIRE", "Établissement scolaire"
    UNIVERSITE = "UNIVERSITE", "Université"


class Etablissement(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    code = models.CharField(max_length=64, unique=True)
    nom = models.CharField(max_length=191)
    nom_court = models.CharField(max_length=100, blank=True)
    proprietaire = models.ForeignKey(
        "comptes.Utilisateur",
        on_delete=models.SET_NULL,
        related_name="etablissements_proprietaire",
        null=True,
        blank=True,
    )
    type = models.CharField(max_length=16, choices=TypeEtablissement.choices)
    code_pays = models.CharField(max_length=16, default="INTL")
    nom_pays = models.CharField(max_length=100, blank=True, default="")
    fuseau_horaire = models.CharField(max_length=100, blank=True, default="")
    autorite_tutelle = models.CharField(max_length=191, blank=True, default="")
    ville = models.CharField(max_length=191, blank=True, default="")
    adresse = models.CharField(max_length=255, blank=True, default="")
    telephone = models.CharField(max_length=64, blank=True, default="")
    courriel = models.EmailField(max_length=191, blank=True, default="")
    site_web = models.CharField(max_length=255, blank=True, default="")
    annee_academique = models.CharField(max_length=32, blank=True, default="")
    libelle_periode_courante = models.CharField(max_length=191, blank=True, default="")
    devise_defaut = models.CharField(max_length=8, default="USD")
    taux_change_usd = models.DecimalField(max_digits=12, decimal_places=4, default=132)
    format_matricule = models.CharField(max_length=64, blank=True, default="")
    echelle_notation = models.PositiveSmallIntegerField(default=100)
    note_passage = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    couleur_accent = models.CharField(
        max_length=16,
        choices=[
            ("blue", "Bleu"),
            ("teal", "Turquoise"),
            ("violet", "Violet"),
            ("orange", "Orange"),
            ("red", "Rouge"),
            ("navy", "Bleu nuit"),
        ],
        default="blue",
    )
    devise_etablissement = models.CharField(max_length=191, blank=True, default="")
    url_logo = models.TextField(blank=True, default="")
    titre_direction = models.CharField(max_length=191, blank=True, default="")
    nom_direction = models.CharField(max_length=191, blank=True, default="")
    code_sceau = models.CharField(max_length=100, blank=True, default="")
    services_actifs = models.JSONField(default=dict)
    offre_saas = models.CharField(
        max_length=32,
        choices=[
            ("Gratuit", "Gratuit"),
            ("Essentiel", "Essentiel"),
            ("Croissance", "Croissance"),
            ("Institutionnel", "Institutionnel"),
        ],
        default="Gratuit",
    )
    statut_abonnement_saas = models.CharField(
        max_length=32,
        blank=True,
        default="",
    )
    date_fin_essai_saas = models.CharField(max_length=32, blank=True, default="")
    reference_paiement_saas = models.CharField(max_length=191, blank=True, default="")
    bloquer_documents_si_impaye = models.BooleanField(default=True)
    configuration = models.JSONField(default=dict)
    est_actif = models.BooleanField(default=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    def clean(self):
        erreurs = {}
        pays_valide = isinstance(self.code_pays, str) and (
            self.code_pays == "INTL" or self.code_pays in PROFILS_TELEPHONE
        )
        if not pays_valide:
            erreurs["code_pays"] = "Le code pays n’est pas pris en charge."
        if self.telephone and pays_valide:
            try:
                valider_telephone_pays(self.code_pays, self.telephone)
            except ValidationError as erreur:
                erreurs.update(erreur.message_dict if hasattr(erreur, "message_dict") else {"telephone": erreur.messages})
        if self.code_pays == "INTL" and pays_valide:
            try:
                valider_fuseau_iana(self.fuseau_horaire)
            except ValidationError as erreur:
                erreurs.update(erreur.message_dict if hasattr(erreur, "message_dict") else {"fuseau_horaire": erreur.messages})
        if erreurs:
            raise ValidationError(erreurs)

    class Meta:
        ordering = ["nom", "id"]
        verbose_name = "établissement"
        verbose_name_plural = "établissements"

    def __str__(self) -> str:
        return f"{self.nom} ({self.code})"


class HistoriqueAbonnementSaas(models.Model):
    etablissement = models.ForeignKey(
        Etablissement,
        on_delete=models.CASCADE,
        related_name="historique_abonnements_saas",
    )
    offre_saas = models.CharField(max_length=32)
    statut_abonnement_saas = models.CharField(max_length=32, blank=True)
    date_fin_essai_saas = models.CharField(max_length=32, blank=True)
    reference_paiement_saas = models.CharField(max_length=191, blank=True)
    acteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="modifications_abonnement_saas",
        null=True,
        blank=True,
    )
    acteur_nom = models.CharField(max_length=120, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cree_le", "-id"]
        verbose_name = "historique d’abonnement SaaS"
        verbose_name_plural = "historiques d’abonnement SaaS"


class ConfigurationMarquePlateforme(models.Model):
    cle = models.CharField(max_length=32, primary_key=True, default="principale")
    nom_plateforme = models.CharField(max_length=120, default="Klasik ERP")
    accroche_courte = models.CharField(max_length=255, blank=True, default="")
    slogan = models.CharField(
        max_length=255,
        blank=True,
        default="Plateforme SaaS Multi-Tenant · Déploiement Mondial · 10 Devises",
    )
    titre_banniere = models.CharField(
        max_length=255,
        blank=True,
        default="L’ERP éducatif mondial qui s’adapte automatiquement à votre institution.",
    )
    resume_pied_page = models.TextField(
        blank=True,
        default=(
            "Infrastructure SaaS multi-établissements internationale dédiée aux écoles "
            "professionnelles, établissements scolaires et universités LMD. Multi-pays, "
            "multi-devises, caisse QR et résilience hors-ligne."
        ),
    )
    horaires_support = models.CharField(
        max_length=255,
        blank=True,
        default="Lun–Sam · Support multi-fuseaux (Amériques · Europe · Afrique)",
    )
    url_logo = models.TextField(blank=True, default="")
    initiales_logo = models.CharField(max_length=3, default="K")
    couleur_marque = models.CharField(
        max_length=16,
        choices=[
            ("indigo", "Indigo"),
            ("blue", "Bleu"),
            ("emerald", "Émeraude"),
            ("amber", "Ambre"),
            ("violet", "Violet"),
            ("slate", "Anthracite"),
        ],
        default="slate",
    )
    courriel_support = models.EmailField(
        max_length=254,
        blank=True,
        default="support@klasik-erp.org",
    )
    telephone_support = models.CharField(
        max_length=255,
        blank=True,
        default="+33 1 86 95 20 10 · +1 (514) 555-0190",
    )
    site_web = models.CharField(max_length=255, blank=True, default="https://klasik-erp.org")
    adresse_siege = models.CharField(
        max_length=255,
        blank=True,
        default="Paris · Montréal · Dakar · Londres · Port-au-Prince",
    )
    entite_legale = models.CharField(
        max_length=191,
        blank=True,
        default="Klasik Technologies Éducatives SAS",
    )
    autoriser_creation_autonome = models.BooleanField(default=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "configuration de marque plateforme"
        verbose_name_plural = "configuration de marque plateforme"


class CompteBancaire(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        Etablissement,
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="comptes_bancaires_relationnels",
    )
    nom_banque = models.CharField(max_length=191)
    numero_compte = models.CharField(max_length=100)
    devise = models.CharField(max_length=8)
    titulaire = models.CharField(max_length=191)
    par_defaut = models.BooleanField(default=False)
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ["nom_banque", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=("etablissement", "numero_compte"),
                name="comptes_bancaires_unique_numero_tenant",
            )
        ]
