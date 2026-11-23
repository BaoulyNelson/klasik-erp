from django.db import models


class UniteAcademique(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="unites_academiques",
    )
    code = models.CharField(max_length=64)
    nom = models.CharField(max_length=191)
    categorie = models.CharField(max_length=191)
    niveau_ou_duree = models.CharField(max_length=191)
    indication_horaire = models.CharField(max_length=191, blank=True, default="")
    capacite = models.PositiveIntegerField(default=35)
    frais_scolarite_htg = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    frais_inscription_htg = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    repartition_facturation = models.CharField(max_length=191, blank=True, default="")
    responsable_nom = models.CharField(max_length=191, blank=True, default="")

    class Meta:
        ordering = ["code", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=("etablissement", "code"),
                name="unites_unique_code_tenant",
            ),
            models.CheckConstraint(
                condition=models.Q(frais_scolarite_htg__gte=0)
                & models.Q(frais_inscription_htg__gte=0),
                name="unites_frais_non_negatifs",
            ),
        ]
        indexes = [models.Index(fields=("etablissement", "code"), name="unites_tenant_code_idx")]


class ElementPedagogique(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="elements_pedagogiques",
    )
    unite = models.ForeignKey(
        UniteAcademique,
        on_delete=models.PROTECT,
        db_column="id_unite",
        related_name="elements",
    )
    code = models.CharField(max_length=64)
    nom = models.CharField(max_length=191)
    nature = models.CharField(
        max_length=32,
        choices=[
            ("MODULE_PRATIQUE", "Module pratique"),
            ("MODULE_THEORIQUE", "Module théorique"),
            ("MATIERE", "Matière"),
            ("UE", "Unité d’enseignement"),
        ],
    )
    coefficient_ou_credits = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    volume_horaire_total = models.PositiveIntegerField(default=0)
    id_enseignant = models.CharField(max_length=128, blank=True, default="")
    libelle_periode = models.CharField(max_length=191, blank=True, default="")

    class Meta:
        ordering = ["code", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=("etablissement", "code"),
                name="elements_unique_code_tenant",
            )
        ]
        indexes = [
            models.Index(fields=("etablissement", "unite"), name="elements_tenant_unite_idx")
        ]


class Apprenant(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="apprenants_relationnels",
    )
    unite = models.ForeignKey(
        UniteAcademique,
        on_delete=models.PROTECT,
        db_column="id_unite",
        related_name="apprenants",
    )
    matricule = models.CharField(max_length=64)
    prenom = models.CharField(max_length=191)
    nom = models.CharField(max_length=191)
    sexe = models.CharField(max_length=1, choices=[("F", "F"), ("M", "M")])
    date_naissance = models.CharField(max_length=32, blank=True, default="")
    lieu_naissance = models.CharField(max_length=191, blank=True, default="")
    telephone = models.CharField(max_length=64, blank=True, default="")
    courriel = models.EmailField(max_length=191, blank=True, default="")
    adresse = models.CharField(max_length=255, blank=True, default="")
    libelle_niveau = models.CharField(max_length=191, blank=True, default="")
    date_inscription = models.CharField(max_length=32, blank=True, default="")
    indice_etape = models.PositiveSmallIntegerField(default=1)
    statut = models.CharField(
        max_length=32,
        choices=[
            ("ACTIF", "Actif"),
            ("EN_STAGE", "En stage"),
            ("DIPLOME", "Diplômé"),
            ("SUSPENDU", "Suspendu"),
            ("REDOUBLANT", "Redoublant"),
        ],
        default="ACTIF",
    )
    total_du_htg = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_paye_htg = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    statut_paiement = models.CharField(
        max_length=32,
        choices=[("A_JOUR", "À jour"), ("PARTIEL", "Partiel"), ("EN_RETARD", "En retard")],
        default="A_JOUR",
    )
    moyenne_generale = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    taux_assiduite = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    credits_acquis = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    credits_requis = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    pourcentage_bourse = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    nationalite = models.CharField(max_length=100, blank=True, default="")
    mobilite_internationale = models.BooleanField(default=False)
    reference_visa_passeport = models.CharField(max_length=100, blank=True, default="")
    entreprise_stage = models.CharField(max_length=191, blank=True, default="")
    dossier_complet = models.BooleanField(default=True)
    pieces_manquantes = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["nom", "prenom", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=("etablissement", "matricule"),
                name="apprenants_unique_matricule_tenant",
            ),
            models.CheckConstraint(
                condition=models.Q(taux_assiduite__gte=0) & models.Q(taux_assiduite__lte=100),
                name="apprenants_assiduite_0_100",
            ),
            models.CheckConstraint(
                condition=models.Q(indice_etape__gte=1) & models.Q(indice_etape__lte=5),
                name="apprenants_etape_1_5",
            ),
        ]
        indexes = [
            models.Index(fields=("etablissement", "unite"), name="apprenants_tenant_unite_idx"),
            models.Index(fields=("etablissement", "statut"), name="apprenants_tenant_statut_idx"),
        ]


class ContactTuteur(models.Model):
    apprenant = models.ForeignKey(Apprenant, on_delete=models.CASCADE, related_name="tuteurs")
    nom_complet = models.CharField(max_length=191)
    lien_parente = models.CharField(
        max_length=32,
        choices=[
            ("Père", "Père"),
            ("Mère", "Mère"),
            ("Tuteur", "Tuteur"),
            ("Tutrice", "Tutrice"),
            ("Conjoint(e)", "Conjoint(e)"),
            ("Proche / Urgence", "Proche / Urgence"),
        ],
    )
    telephone = models.CharField(max_length=64)
    est_contact_urgence = models.BooleanField(default=False)
    retrait_autorise = models.BooleanField(default=False)


class InscriptionApprenant(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="inscriptions_apprenants",
    )
    apprenant = models.ForeignKey(
        Apprenant,
        on_delete=models.CASCADE,
        db_column="id_apprenant",
        related_name="inscriptions",
    )
    unite = models.ForeignKey(
        UniteAcademique,
        on_delete=models.PROTECT,
        db_column="id_unite",
        related_name="inscriptions",
    )
    numero_inscription = models.CharField(max_length=64)
    annee_academique = models.CharField(max_length=32)
    libelle_periode = models.CharField(max_length=191)
    libelle_niveau = models.CharField(max_length=191)
    type_inscription = models.CharField(
        max_length=32,
        choices=[("NOUVELLE", "Nouvelle"), ("REINSCRIPTION", "Réinscription")],
    )
    date_inscription = models.CharField(max_length=32)
    statut_inscription = models.CharField(
        max_length=32,
        choices=[("VALIDEE", "Validée"), ("ANNULEE", "Annulée"), ("ARCHIVEE", "Archivée")],
        default="VALIDEE",
    )
    montant_brut_htg = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    pourcentage_bourse = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    montant_net_htg = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    pieces_fournies = models.JSONField(default=list, blank=True)
    option_cantine = models.BooleanField(default=False)
    option_transport = models.BooleanField(default=False)
    motif_statut = models.CharField(max_length=255, blank=True, default="")
    observations = models.CharField(max_length=1000, blank=True, default="")
    cree_le = models.CharField(max_length=32, blank=True, default="")
    modifie_le = models.CharField(max_length=32, blank=True, default="")

    class Meta:
        ordering = ["-cree_le", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=("etablissement", "numero_inscription"),
                name="inscriptions_unique_numero_tenant",
            )
        ]


class EcheancePaiement(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="echeances_scolarite",
    )
    apprenant = models.ForeignKey(
        Apprenant,
        on_delete=models.CASCADE,
        related_name="echeancier",
    )
    libelle = models.CharField(max_length=191)
    date_echeance = models.CharField(max_length=32)
    montant_du_htg = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    montant_paye_htg = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    statut = models.CharField(
        max_length=32,
        choices=[
            ("PAYEE", "Payée"),
            ("PARTIELLE", "Partielle"),
            ("A_PAYER", "À payer"),
            ("EN_RETARD", "En retard"),
        ],
        default="A_PAYER",
    )

# Create your models here.
