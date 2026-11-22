from django.db import models


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
