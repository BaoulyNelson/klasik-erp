from django.db import models


class Paiement(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="paiements",
    )
    apprenant = models.ForeignKey(
        "scolarite.Apprenant",
        on_delete=models.PROTECT,
        db_column="id_apprenant",
        related_name="paiements",
    )
    numero_recu = models.CharField(max_length=64)
    montant_htg = models.DecimalField(max_digits=14, decimal_places=2)
    mode_paiement = models.CharField(max_length=64)
    code_reference = models.CharField(max_length=191, blank=True, default="")
    libelle_compte_bancaire = models.CharField(max_length=191, blank=True, default="")
    libelle = models.CharField(max_length=255)
    paye_le = models.CharField(max_length=32)
    encaisse_par = models.CharField(max_length=191)
    statut = models.CharField(
        max_length=16,
        choices=[("VALIDE", "Validé"), ("ANNULE", "Annulé")],
        default="VALIDE",
    )

    class Meta:
        ordering = ["-paye_le", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=("etablissement", "numero_recu"),
                name="paiements_unique_recu_tenant",
            ),
            models.CheckConstraint(
                condition=models.Q(montant_htg__gt=0),
                name="paiements_montant_positif",
            ),
        ]
        indexes = [
            models.Index(fields=("etablissement", "apprenant"), name="paiements_tenant_appr_idx"),
            models.Index(fields=("etablissement", "statut"), name="paiements_tenant_statut_idx"),
        ]


class Depense(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="depenses",
    )
    categorie = models.CharField(max_length=64)
    description = models.CharField(max_length=255)
    fournisseur = models.CharField(max_length=191)
    montant_htg = models.DecimalField(max_digits=14, decimal_places=2)
    payee_le = models.CharField(max_length=32)
    enregistree_par = models.CharField(max_length=191)

    class Meta:
        ordering = ["-payee_le", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(montant_htg__gt=0),
                name="depenses_montant_positif",
            )
        ]


class BulletinPaie(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="bulletins_paie",
    )
    personnel = models.ForeignKey(
        "pedagogie.PersonnelEnseignant",
        on_delete=models.PROTECT,
        db_column="id_personnel",
        related_name="bulletins_paie",
    )
    nom_personnel = models.CharField(max_length=191)
    libelle_role = models.CharField(max_length=191)
    libelle_mois = models.CharField(max_length=64)
    heures_travaillees = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    salaire_base_htg = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    primes_htg = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    motif_primes = models.CharField(max_length=255, blank=True, default="")
    montant_brut_htg = models.DecimalField(max_digits=14, decimal_places=2)
    retenues_htg = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    motif_retenues = models.CharField(max_length=255, blank=True, default="")
    montant_net_htg = models.DecimalField(max_digits=14, decimal_places=2)
    statut = models.CharField(
        max_length=16,
        choices=[("PAYE", "Payé"), ("EN_ATTENTE", "En attente")],
        default="EN_ATTENTE",
    )
    mode_paiement = models.CharField(max_length=64, blank=True, default="")
    observations = models.CharField(max_length=1000, blank=True, default="")
    paye_le = models.CharField(max_length=32, blank=True, default="")
    cree_le = models.CharField(max_length=32, blank=True, default="")

    class Meta:
        ordering = ["-libelle_mois", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(montant_brut_htg__gte=0)
                & models.Q(montant_net_htg__gte=0),
                name="paie_montants_non_negatifs",
            )
        ]


class AbonnementService(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="abonnements_services",
    )
    apprenant = models.ForeignKey(
        "scolarite.Apprenant",
        on_delete=models.CASCADE,
        db_column="id_apprenant",
        related_name="abonnements_services",
    )
    type_service = models.CharField(
        max_length=32,
        choices=[
            ("Cantine", "Cantine"),
            ("Transport", "Transport"),
            ("Uniforme & Fournitures", "Uniforme & Fournitures"),
        ],
    )
    tarif_mensuel_ou_annuel_htg = models.DecimalField(max_digits=14, decimal_places=2)
    actif = models.BooleanField(default=True)
    ligne_ou_formule = models.CharField(max_length=191)

    class Meta:
        ordering = ["type_service", "id"]


class DemandeConge(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="demandes_conge",
    )
    nom_personnel = models.CharField(max_length=191)
    libelle_role = models.CharField(max_length=191)
    type_conge = models.CharField(
        max_length=64,
        choices=[
            ("Congé annuel", "Congé annuel"),
            ("Congé maladie", "Congé maladie"),
            ("Permission exceptionnelle", "Permission exceptionnelle"),
            ("Maternité / Paternité", "Maternité / Paternité"),
            ("Formation continue", "Formation continue"),
        ],
    )
    date_debut = models.CharField(max_length=32)
    date_fin = models.CharField(max_length=32)
    motif = models.TextField()
    statut = models.CharField(
        max_length=16,
        choices=[
            ("EN_ATTENTE", "En attente"),
            ("APPROUVE", "Approuvé"),
            ("REFUSE", "Refusé"),
        ],
        default="EN_ATTENTE",
    )
    demande_le = models.CharField(max_length=32)
    traite_par = models.CharField(max_length=191, blank=True, default="")

    class Meta:
        ordering = ["-demande_le", "id"]


# Create your models here.
