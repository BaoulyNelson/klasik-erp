from django.db import migrations


def importer(apps, schema_editor):
    Enregistrement = apps.get_model("donnees", "EnregistrementMetier")
    Message = apps.get_model("communication", "MessageCommunication")
    Notification = apps.get_model("communication", "Notification")
    Article = apps.get_model("communication", "ArticleActualite")

    for ligne in Enregistrement.objects.filter(collection="communications"):
        donnees = dict(ligne.donnees)
        Message.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "titre": donnees.get("titre", ""),
                "contenu": donnees.get("contenu", ""),
                "canal": donnees.get("canal", "Interne"),
                "audience": donnees.get("audience", "Tous"),
                "envoye_le": donnees.get("envoye_le", ""),
                "envoye_par": donnees.get("envoye_par", ""),
                "nombre_destinataires": int(donnees.get("nombre_destinataires", 0) or 0),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="notifications"):
        donnees = dict(ligne.donnees)
        Notification.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "titre": donnees.get("titre", ""),
                "description": donnees.get("description", ""),
                "severite": donnees.get("severite", "info"),
                "cree_le": donnees.get("cree_le", ""),
                "lue": bool(donnees.get("lue", False)),
                "route_cible": donnees.get("route_cible", ""),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="articles_actualites"):
        donnees = dict(ligne.donnees)
        Article.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "titre": donnees.get("titre", ""),
                "categorie": donnees.get("categorie", "Académique"),
                "resume": donnees.get("resume", ""),
                "contenu": donnees.get("contenu", ""),
                "publie_le": donnees.get("publie_le", ""),
                "date_evenement": donnees.get("date_evenement", ""),
                "lieu": donnees.get("lieu", ""),
                "nom_auteur": donnees.get("nom_auteur", ""),
                "epingle": bool(donnees.get("epingle", False)),
                "audience": donnees.get("audience", "Tous"),
            },
        )


def rollback(apps, schema_editor):
    apps.get_model("communication", "ArticleActualite").objects.all().delete()
    apps.get_model("communication", "Notification").objects.all().delete()
    apps.get_model("communication", "MessageCommunication").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("communication", "0001_initial"),
        ("donnees", "0003_entreeauditapi_nom_acteur_entreeauditapi_role_acteur"),
    ]

    operations = [
        migrations.RunPython(importer, rollback),
    ]
