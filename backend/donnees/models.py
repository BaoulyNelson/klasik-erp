import os
import uuid

from django.db import models


def chemin_fichier_televerse(instance, nom_fichier: str) -> str:
    nom_normalise = nom_fichier.replace("\\", "/").rsplit("/", 1)[-1]
    extension = os.path.splitext(nom_normalise)[1].lower()[:16]
    return f"etablissements/{instance.etablissement_id}/fichiers/{instance.id}{extension}"


class EnregistrementMetier(models.Model):
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        related_name="enregistrements",
        db_column="id_etablissement",
    )
    collection = models.CharField(max_length=64)
    id_objet = models.CharField(max_length=128)
    donnees = models.JSONField()
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id_objet"]
        constraints = [
            models.UniqueConstraint(
                fields=("etablissement", "collection", "id_objet"),
                name="donnees_unique_objet_par_tenant",
            )
        ]
        indexes = [
            models.Index(fields=("etablissement", "collection"), name="donnees_tenant_coll_idx"),
        ]
        verbose_name = "enregistrement métier"
        verbose_name_plural = "enregistrements métier"

    def __str__(self) -> str:
        return f"{self.collection}:{self.id_objet}"


class FichierTeleverse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        related_name="fichiers_televerses",
        db_column="id_etablissement",
    )
    proprietaire = models.ForeignKey(
        "comptes.Utilisateur",
        on_delete=models.PROTECT,
        related_name="fichiers_televerses",
    )
    fichier = models.FileField(upload_to=chemin_fichier_televerse, max_length=255)
    nom_fichier = models.CharField(max_length=255)
    type_mime = models.CharField(max_length=127, default="application/octet-stream")
    taille_octets = models.PositiveBigIntegerField()
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cree_le"]
        verbose_name = "fichier téléversé"
        verbose_name_plural = "fichiers téléversés"


class EntreeAuditApi(models.Model):
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.PROTECT,
        related_name="entrees_audit_api",
        db_column="id_etablissement",
    )
    utilisateur = models.ForeignKey(
        "comptes.Utilisateur",
        on_delete=models.PROTECT,
        related_name="actions_auditees",
    )
    action = models.CharField(max_length=16)
    collection = models.CharField(max_length=64)
    id_objet = models.CharField(max_length=128)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cree_le"]
        verbose_name = "entrée d’audit API"
        verbose_name_plural = "entrées d’audit API"
