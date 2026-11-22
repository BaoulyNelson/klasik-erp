from django.db import models


class ConsentementRgpd(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="consentements_rgpd")
    apprenant = models.ForeignKey("scolarite.Apprenant", on_delete=models.CASCADE, db_column="id_apprenant", related_name="consentements_rgpd")
    droit_image = models.BooleanField(default=False)
    traitement_donnees = models.BooleanField(default=False)
    accord_parental = models.BooleanField(default=False)
    consentement_sms_whatsapp = models.BooleanField(default=False)
    mis_a_jour_le = models.CharField(max_length=32)
    mis_a_jour_par = models.CharField(max_length=191)


class DemandeRgpd(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="demandes_rgpd")
    apprenant = models.ForeignKey("scolarite.Apprenant", on_delete=models.CASCADE, db_column="id_apprenant", related_name="demandes_rgpd")
    type_demande = models.CharField(max_length=32)
    statut = models.CharField(max_length=16, choices=[("EN_ATTENTE","En attente"),("TRAITEE","Traitée")], default="EN_ATTENTE")
    demandee_le = models.CharField(max_length=32)
    traitee_le = models.CharField(max_length=32, blank=True, default="")
    observations = models.TextField(blank=True, default="")


class LotImportation(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="lots_importation")
    cible = models.CharField(max_length=64)
    nom_fichier = models.CharField(max_length=255)
    statut = models.CharField(max_length=32)
    nombre_lignes = models.PositiveIntegerField(default=0)
    nombre_erreurs = models.PositiveIntegerField(default=0)
    importe_le = models.CharField(max_length=32)
    importe_par = models.CharField(max_length=191)
    resume = models.JSONField(default=dict, blank=True)


class AttributionBadge(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey("etablissements.Etablissement", on_delete=models.CASCADE, db_column="id_etablissement", related_name="badges_attribues")
    apprenant = models.ForeignKey("scolarite.Apprenant", on_delete=models.CASCADE, db_column="id_apprenant", related_name="badges_attribues")
    code_badge = models.CharField(max_length=64)
    titre = models.CharField(max_length=191)
    attribue_le = models.CharField(max_length=32)
    attribue_par = models.CharField(max_length=191)

# Create your models here.
