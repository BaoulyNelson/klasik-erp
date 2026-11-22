import os

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import EnregistrementMetier, FichierTeleverse, ReferenceFichier


def _extraire_id_fichiers(valeur):
    identifiants = set()
    if isinstance(valeur, dict):
        identifiant = valeur.get("id_fichier_local")
        if isinstance(identifiant, str) and identifiant:
            identifiants.add(identifiant)
        for enfant in valeur.values():
            identifiants.update(_extraire_id_fichiers(enfant))
    elif isinstance(valeur, list):
        for enfant in valeur:
            identifiants.update(_extraire_id_fichiers(enfant))
    elif isinstance(valeur, str) and "#fichier-local/" in valeur:
        identifiants.add(valeur.rsplit("#fichier-local/", 1)[-1])
    return identifiants


@receiver(post_save, sender=EnregistrementMetier)
def indexer_references_fichiers(sender, instance, **kwargs):
    ReferenceFichier.objects.filter(enregistrement=instance).delete()
    identifiants = _extraire_id_fichiers(instance.donnees)
    for identifiant in identifiants:
        fichier = FichierTeleverse.objects.filter(
            pk=identifiant,
            etablissement=instance.etablissement,
        ).first()
        if fichier:
            ReferenceFichier.objects.update_or_create(
                fichier=fichier,
                enregistrement=instance,
            )


@receiver(post_delete, sender=EnregistrementMetier)
def nettoyer_fichiers_orphelins(sender, instance, **kwargs):
    for fichier in FichierTeleverse.objects.filter(
        etablissement=instance.etablissement,
        references__isnull=True,
    ).distinct():
        if fichier.fichier:
            try:
                fichier.fichier.delete(save=False)
            except OSError:
                pass
        fichier.delete()
