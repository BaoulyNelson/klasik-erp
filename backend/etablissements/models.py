from django.db import models


class TypeEtablissement(models.TextChoices):
    PRO = "PRO", "Établissement professionnel"
    SCOLAIRE = "SCOLAIRE", "Établissement scolaire"
    UNIVERSITE = "UNIVERSITE", "Université"


class Etablissement(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    code = models.CharField(max_length=64, unique=True)
    nom = models.CharField(max_length=191)
    nom_court = models.CharField(max_length=100, blank=True)
    type = models.CharField(max_length=16, choices=TypeEtablissement.choices)
    configuration = models.JSONField(default=dict)
    est_actif = models.BooleanField(default=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nom", "id"]
        verbose_name = "établissement"
        verbose_name_plural = "établissements"

    def __str__(self) -> str:
        return f"{self.nom} ({self.code})"
