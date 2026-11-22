from django.db import models


class DocumentOfficiel(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="documents_officiels",
    )
    apprenant = models.ForeignKey(
        "scolarite.Apprenant",
        on_delete=models.PROTECT,
        db_column="id_apprenant",
        related_name="documents_officiels",
    )
    numero_document = models.CharField(max_length=64)
    type_document = models.CharField(max_length=64)
    emis_le = models.CharField(max_length=32)
    emis_par = models.CharField(max_length=191)
    empreinte_verification = models.CharField(max_length=255)

    class Meta:
        ordering = ["-emis_le", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=("etablissement", "numero_document"),
                name="documents_unique_numero_tenant",
            )
        ]
        indexes = [
            models.Index(fields=("etablissement", "apprenant"), name="documents_tenant_appr_idx")
        ]

# Create your models here.
