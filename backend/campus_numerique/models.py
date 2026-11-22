from django.db import models


class RessourceLms(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="ressources_lms")
    unite = models.ForeignKey("scolarite.UniteAcademique", on_delete=models.PROTECT, db_column="id_unite", related_name="ressources_lms")
    element = models.ForeignKey("scolarite.ElementPedagogique", on_delete=models.PROTECT, db_column="id_element", related_name="ressources_lms")
    titre = models.CharField(max_length=255)
    type_ressource = models.CharField(max_length=64)
    url_ou_code = models.CharField(max_length=1000)
    id_fichier_local = models.CharField(max_length=128, blank=True, default="")
    nom_fichier = models.CharField(max_length=255, blank=True, default="")
    taille_octets = models.PositiveBigIntegerField(null=True, blank=True)
    type_mime = models.CharField(max_length=127, blank=True, default="")
    publie_le = models.CharField(max_length=32)
    nom_auteur = models.CharField(max_length=191)


class DevoirLms(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="devoirs_lms")
    unite = models.ForeignKey("scolarite.UniteAcademique", on_delete=models.PROTECT, db_column="id_unite", related_name="devoirs_lms")
    element = models.ForeignKey("scolarite.ElementPedagogique", on_delete=models.PROTECT, db_column="id_element", related_name="devoirs_lms")
    titre = models.CharField(max_length=255)
    type_devoir = models.CharField(max_length=32, blank=True, default="")
    theme_ou_chapitre = models.CharField(max_length=255, blank=True, default="")
    consignes = models.TextField(blank=True, default="")
    publie_le = models.CharField(max_length=32, blank=True, default="")
    cree_par = models.CharField(max_length=191, blank=True, default="")
    date_limite = models.CharField(max_length=32)
    points_max = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    nombre_rendus = models.PositiveIntegerField(default=0)
    total_attendu = models.PositiveIntegerField(default=0)
    statut = models.CharField(max_length=16, choices=[("OUVERT","Ouvert"),("CLOTURE","Clôturé"),("BROUILLON","Brouillon")], default="BROUILLON")
    pieces_jointes = models.JSONField(default=list, blank=True)
    criteres_grille = models.JSONField(default=list, blank=True)
    commentaires_classe = models.JSONField(default=list, blank=True)


class RemiseDevoir(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="remises_devoirs")
    devoir = models.ForeignKey(DevoirLms, on_delete=models.CASCADE, db_column="id_devoir", related_name="remises")
    apprenant = models.ForeignKey("scolarite.Apprenant", on_delete=models.CASCADE, db_column="id_apprenant", related_name="remises_devoirs")
    statut = models.CharField(max_length=16, default="ASSIGNE")
    remis_le = models.CharField(max_length=32, blank=True, default="")
    lien_ou_fichier = models.CharField(max_length=1000, blank=True, default="")
    nom_fichier = models.CharField(max_length=255, blank=True, default="")
    id_fichier_local = models.CharField(max_length=128, blank=True, default="")
    taille_octets = models.PositiveBigIntegerField(null=True, blank=True)
    type_mime = models.CharField(max_length=127, blank=True, default="")
    pieces_remises = models.JSONField(default=list, blank=True)
    commentaire_apprenant = models.TextField(blank=True, default="")
    note_attribuee = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    points_par_critere = models.JSONField(default=dict, blank=True)
    commentaire_enseignant = models.TextField(blank=True, default="")
    evalue_le = models.CharField(max_length=32, blank=True, default="")
    evalue_par = models.CharField(max_length=191, blank=True, default="")
    synchronise_bulletin = models.BooleanField(default=False)

# Create your models here.
