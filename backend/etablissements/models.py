from django.db import models


class TypeEtablissement(models.TextChoices):
    PRO = "PRO", "Établissement professionnel"
    SCOLAIRE = "SCOLAIRE", "Établissement scolaire"
    UNIVERSITE = "UNIVERSITE", "Université"


class Etablissement(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    code = models.CharField(max_length=64, unique=True)
    nom = models.CharField(max_length=191)
    nom_court = models.CharField(max_length=100, blank=True)
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
        choices=[("amber", "Ambre"), ("blue", "Bleu"), ("violet", "Violet")],
        default="blue",
    )
    devise_etablissement = models.CharField(max_length=191, blank=True, default="")
    url_logo = models.CharField(max_length=500, blank=True, default="")
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

    class Meta:
        ordering = ["nom", "id"]
        verbose_name = "établissement"
        verbose_name_plural = "établissements"

    def __str__(self) -> str:
        return f"{self.nom} ({self.code})"


class ConfigurationMarquePlateforme(models.Model):
    cle = models.CharField(max_length=32, primary_key=True, default="principale")
    url_logo = models.TextField(blank=True, default="")
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
