from django.db import migrations


def importer(apps, schema_editor):
    Enregistrement = apps.get_model("donnees", "EnregistrementMetier")
    Apprenant = apps.get_model("scolarite", "Apprenant")
    Document = apps.get_model("documents", "DocumentOfficiel")
    for ligne in Enregistrement.objects.filter(collection="documents"):
        donnees = dict(ligne.donnees)
        apprenant = Apprenant.objects.filter(
            pk=donnees.get("id_apprenant"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        if apprenant is None:
            continue
        Document.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "apprenant": apprenant,
                "numero_document": donnees.get("numero_document", ligne.id_objet),
                "type_document": donnees.get("type_document", ""),
                "emis_le": donnees.get("emis_le", ""),
                "emis_par": donnees.get("emis_par", ""),
                "empreinte_verification": donnees.get("empreinte_verification", ""),
            },
        )


def rollback(apps, schema_editor):
    apps.get_model("documents", "DocumentOfficiel").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0001_initial"),
        ("scolarite", "0002_importer_scolarite_json"),
        ("donnees", "0003_entreeauditapi_nom_acteur_entreeauditapi_role_acteur"),
    ]

    operations = [
        migrations.RunPython(importer, rollback),
    ]
