from django.db import models


class PersonnelEnseignant(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="personnels_enseignants",
    )
    code = models.CharField(max_length=64)
    nom_complet = models.CharField(max_length=191)
    specialite = models.CharField(max_length=191, blank=True, default="")
    type_contrat = models.CharField(
        max_length=32,
        choices=[
            ("CDI / Temps plein", "CDI / Temps plein"),
            ("Vacation horaire", "Vacation horaire"),
            ("Contractuel", "Contractuel"),
        ],
        default="Contractuel",
    )
    telephone = models.CharField(max_length=64, blank=True, default="")
    courriel = models.EmailField(max_length=191, blank=True, default="")
    ids_unites_assignees = models.JSONField(default=list, blank=True)
    ids_elements_assignes = models.JSONField(default=list, blank=True)
    heures_mensuelles = models.PositiveIntegerField(default=0)
    taux_horaire_ou_mensuel_htg = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
    )

    class Meta:
        ordering = ["nom_complet", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=("etablissement", "code"),
                name="enseignants_unique_code_tenant",
            )
        ]
        indexes = [
            models.Index(fields=("etablissement", "code"), name="enseignants_tenant_code_idx")
        ]


class NoteEvaluation(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="notes_evaluations",
    )
    apprenant = models.ForeignKey(
        "scolarite.Apprenant",
        on_delete=models.CASCADE,
        db_column="id_apprenant",
        related_name="notes",
    )
    element = models.ForeignKey(
        "scolarite.ElementPedagogique",
        on_delete=models.PROTECT,
        db_column="id_element",
        related_name="notes",
    )
    libelle_periode = models.CharField(max_length=191)
    type_evaluation = models.CharField(
        max_length=32,
        choices=[
            ("Devoir", "Devoir"),
            ("Contrôle", "Contrôle"),
            ("Examen", "Examen"),
            ("Pratique", "Pratique"),
            ("Rattrapage", "Rattrapage"),
        ],
    )
    note = models.DecimalField(max_digits=8, decimal_places=2)
    note_maximale = models.DecimalField(max_digits=8, decimal_places=2)
    verrouillee = models.BooleanField(default=False)
    enregistree_le = models.CharField(max_length=32)

    class Meta:
        ordering = ["-enregistree_le", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(note__gte=0) & models.Q(note_maximale__gt=0),
                name="notes_note_0_max_positive",
            )
        ]
        indexes = [
            models.Index(fields=("etablissement", "apprenant"), name="notes_tenant_apprenant_idx"),
            models.Index(fields=("etablissement", "element"), name="notes_tenant_element_idx"),
        ]


class Presence(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="presences",
    )
    apprenant = models.ForeignKey(
        "scolarite.Apprenant",
        on_delete=models.CASCADE,
        db_column="id_apprenant",
        related_name="presences",
    )
    unite = models.ForeignKey(
        "scolarite.UniteAcademique",
        on_delete=models.PROTECT,
        db_column="id_unite",
        related_name="presences",
    )
    date = models.CharField(max_length=32)
    statut = models.CharField(
        max_length=16,
        choices=[
            ("PRESENT", "Présent"),
            ("ABSENT", "Absent"),
            ("RETARD", "Retard"),
            ("EXCUSE", "Excusé"),
        ],
    )
    observation = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        ordering = ["-date", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=("etablissement", "apprenant", "unite", "date"),
                name="presences_unique_jour_tenant",
            )
        ]
        indexes = [
            models.Index(fields=("etablissement", "date"), name="presences_tenant_date_idx"),
        ]


class CreneauEmploiDuTemps(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="emplois_du_temps",
    )
    unite = models.ForeignKey(
        "scolarite.UniteAcademique",
        on_delete=models.PROTECT,
        db_column="id_unite",
        related_name="creneaux",
    )
    element = models.ForeignKey(
        "scolarite.ElementPedagogique",
        on_delete=models.PROTECT,
        db_column="id_element",
        related_name="creneaux",
    )
    enseignant = models.ForeignKey(
        PersonnelEnseignant,
        on_delete=models.PROTECT,
        db_column="id_enseignant",
        related_name="creneaux",
    )
    salle = models.CharField(max_length=64)
    jour_semaine = models.CharField(
        max_length=16,
        choices=[
            ("Lundi", "Lundi"),
            ("Mardi", "Mardi"),
            ("Mercredi", "Mercredi"),
            ("Jeudi", "Jeudi"),
            ("Vendredi", "Vendredi"),
            ("Samedi", "Samedi"),
        ],
    )
    heure_debut = models.CharField(max_length=8)
    heure_fin = models.CharField(max_length=8)

    class Meta:
        ordering = ["jour_semaine", "heure_debut", "id"]
        indexes = [
            models.Index(fields=("etablissement", "jour_semaine"), name="edt_tenant_jour_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(heure_debut__lt=models.F("heure_fin")),
                name="edt_heure_debut_avant_fin",
            )
        ]


class EvenementCalendrier(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="evenements_calendrier",
    )
    type = models.CharField(max_length=32)
    titre = models.CharField(max_length=191)
    date_debut = models.CharField(max_length=32)
    date_fin = models.CharField(max_length=32, blank=True, default="")
    concerne_unites = models.CharField(max_length=255, blank=True, default="")
    description = models.CharField(max_length=1000, blank=True, default="")

    class Meta:
        ordering = ["date_debut", "id"]
        indexes = [
            models.Index(fields=("etablissement", "date_debut"), name="cal_tenant_date_idx")
        ]


class EntreeCahierTextes(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="cahiers_textes",
    )
    unite = models.ForeignKey(
        "scolarite.UniteAcademique",
        on_delete=models.PROTECT,
        db_column="id_unite",
        related_name="cahiers_textes",
    )
    element = models.ForeignKey(
        "scolarite.ElementPedagogique",
        on_delete=models.PROTECT,
        db_column="id_element",
        related_name="cahiers_textes",
    )
    nom_enseignant = models.CharField(max_length=191)
    date = models.CharField(max_length=32)
    sujet = models.CharField(max_length=500)
    devoir_donne = models.CharField(max_length=1000, blank=True, default="")

    class Meta:
        ordering = ["-date", "id"]
        indexes = [
            models.Index(fields=("etablissement", "date"), name="cahier_tenant_date_idx")
        ]


class Soutenance(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="soutenances",
    )
    apprenant = models.ForeignKey(
        "scolarite.Apprenant",
        on_delete=models.CASCADE,
        db_column="id_apprenant",
        related_name="soutenances",
    )
    titre = models.CharField(max_length=255)
    nom_directeur_memoire = models.CharField(max_length=191)
    membres_jury = models.CharField(max_length=500)
    date_soutenance = models.CharField(max_length=32)
    note = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    statut = models.CharField(
        max_length=16,
        choices=[
            ("PLANIFIEE", "Planifiée"),
            ("SOUTENUE", "Soutenue"),
            ("AJOURNEE", "Ajournée"),
        ],
        default="PLANIFIEE",
    )

    class Meta:
        ordering = ["date_soutenance", "id"]

# Create your models here.
