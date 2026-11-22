from django.db import models


class LivreBibliotheque(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="livres")
    isbn = models.CharField(max_length=64)
    titre = models.CharField(max_length=255)
    auteur = models.CharField(max_length=191)
    categorie = models.CharField(max_length=64)
    exemplaires_totaux = models.PositiveIntegerField(default=0)
    exemplaires_disponibles = models.PositiveIntegerField(default=0)
    cote_rayonnage = models.CharField(max_length=64, blank=True, default="")
    emplacement = models.CharField(max_length=191, blank=True, default="")
    editeur = models.CharField(max_length=191, blank=True, default="")
    annee_edition = models.CharField(max_length=32, blank=True, default="")
    type_support = models.CharField(max_length=64, blank=True, default="")
    resume = models.TextField(blank=True, default="")


class EmpruntBibliotheque(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="emprunts_bibliotheque")
    livre = models.ForeignKey(LivreBibliotheque, on_delete=models.PROTECT, db_column="id_livre", related_name="emprunts")
    apprenant = models.ForeignKey("scolarite.Apprenant", on_delete=models.PROTECT, db_column="id_apprenant", related_name="emprunts_bibliotheque")
    emprunte_le = models.CharField(max_length=32)
    retour_prevu_le = models.CharField(max_length=32)
    retourne_le = models.CharField(max_length=32, blank=True, default="")
    etat_retour = models.CharField(max_length=32, blank=True, default="")
    prolongation_compteur = models.PositiveIntegerField(default=0)
    remarque = models.CharField(max_length=500, blank=True, default="")


class VisiteInfirmerie(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="visites_infirmerie")
    apprenant = models.ForeignKey("scolarite.Apprenant", on_delete=models.CASCADE, db_column="id_apprenant", related_name="visites_infirmerie")
    date = models.CharField(max_length=32)
    motif = models.CharField(max_length=255)
    soin_apporte = models.CharField(max_length=500)
    note_allergies = models.CharField(max_length=500, blank=True, default="")
    nom_infirmier = models.CharField(max_length=191)


class IncidentDiscipline(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="incidents_discipline")
    apprenant = models.ForeignKey("scolarite.Apprenant", on_delete=models.CASCADE, db_column="id_apprenant", related_name="incidents_discipline")
    date = models.CharField(max_length=32)
    type_incident = models.CharField(max_length=64)
    description = models.CharField(max_length=1000)
    sanction = models.CharField(max_length=255)
    traite_par = models.CharField(max_length=191)


class ArticleInventaire(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="inventaire")
    code = models.CharField(max_length=64)
    nom = models.CharField(max_length=191)
    categorie = models.CharField(max_length=64)
    quantite = models.PositiveIntegerField(default=0)
    quantite_disponible = models.PositiveIntegerField(default=0)
    seuil_alerte = models.PositiveIntegerField(default=0)
    etat = models.CharField(max_length=32)
    emplacement = models.CharField(max_length=191)
    numero_serie = models.CharField(max_length=64, blank=True, default="")
    date_verification = models.CharField(max_length=32, blank=True, default="")
    notes_maintenance = models.CharField(max_length=500, blank=True, default="")


class PretMateriel(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="prets_materiels")
    article = models.ForeignKey(ArticleInventaire, on_delete=models.PROTECT, db_column="id_article", related_name="prets")
    quantite = models.PositiveIntegerField(default=1)
    type_emprunteur = models.CharField(max_length=32)
    apprenant = models.ForeignKey("scolarite.Apprenant", on_delete=models.PROTECT, null=True, blank=True, db_column="id_apprenant", related_name="prets_materiels")
    id_enseignant = models.CharField(max_length=128, blank=True, default="")
    emprunteur_nom = models.CharField(max_length=191)
    remis_le = models.CharField(max_length=32)
    retour_prevu_le = models.CharField(max_length=32)
    retourne_le = models.CharField(max_length=32, blank=True, default="")
    etat_retour = models.CharField(max_length=32, blank=True, default="")
    remarque = models.CharField(max_length=500, blank=True, default="")


class AncienEtudiant(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="anciens_etudiants")
    nom_complet = models.CharField(max_length=191)
    promotion = models.CharField(max_length=64)
    nom_unite = models.CharField(max_length=191)
    poste_actuel = models.CharField(max_length=191)
    employeur = models.CharField(max_length=191)
    ville = models.CharField(max_length=191)
    telephone = models.CharField(max_length=64)

# Create your models here.
