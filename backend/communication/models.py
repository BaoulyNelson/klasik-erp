from django.db import models


class MessageCommunication(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="messages_communication",
    )
    titre = models.CharField(max_length=255)
    contenu = models.TextField()
    canal = models.CharField(max_length=32)
    audience = models.CharField(max_length=64)
    envoye_le = models.CharField(max_length=32)
    envoye_par = models.CharField(max_length=191)
    nombre_destinataires = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-envoye_le", "id"]
        indexes = [
            models.Index(fields=("etablissement", "envoye_le"), name="comm_tenant_date_idx")
        ]


class Notification(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="notifications_relationnelles",
    )
    titre = models.CharField(max_length=255)
    description = models.TextField()
    severite = models.CharField(
        max_length=16,
        choices=[
            ("info", "Information"),
            ("warning", "Avertissement"),
            ("danger", "Danger"),
            ("success", "Succès"),
        ],
        default="info",
    )
    cree_le = models.CharField(max_length=32)
    lue = models.BooleanField(default=False)
    route_cible = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ["-cree_le", "id"]
        indexes = [
            models.Index(fields=("etablissement", "lue"), name="notif_tenant_lue_idx")
        ]


class ArticleActualite(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        db_column="id_etablissement",
        related_name="articles_actualites_relationnels",
    )
    titre = models.CharField(max_length=255)
    categorie = models.CharField(max_length=32)
    resume = models.CharField(max_length=500)
    contenu = models.TextField()
    publie_le = models.CharField(max_length=32)
    date_evenement = models.CharField(max_length=32, blank=True, default="")
    lieu = models.CharField(max_length=191, blank=True, default="")
    nom_auteur = models.CharField(max_length=191)
    epingle = models.BooleanField(default=False)
    audience = models.CharField(max_length=32)

    class Meta:
        ordering = ["-publie_le", "id"]

# Create your models here.
