from django.db import migrations, models


def effacer_coordonnees_fictives(apps, schema_editor):
    configuration = apps.get_model(
        "etablissements",
        "ConfigurationMarquePlateforme",
    )
    valeurs_fictives = {
        "entite_legale": "Klasik Technologies Éducatives SAS",
        "courriel_support": "support@klasik-erp.org",
        "telephone_support": "+33 1 86 95 20 10 · +1 (514) 555-0190",
        "site_web": "https://klasik-erp.org",
        "adresse_siege": "Paris · Montréal · Dakar · Londres · Port-au-Prince",
        "horaires_support": "Lun–Sam · Support multi-fuseaux (Amériques · Europe · Afrique)",
    }
    for champ, valeur_fictive in valeurs_fictives.items():
        configuration.objects.filter(**{champ: valeur_fictive}).update(**{champ: ""})


class Migration(migrations.Migration):
    dependencies = [
        ("etablissements", "0008_configurationmarqueplateforme_accroche_courte_and_more"),
    ]

    operations = [
        migrations.RunPython(
            effacer_coordonnees_fictives,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="configurationmarqueplateforme",
            name="entite_legale",
            field=models.CharField(blank=True, default="", max_length=191),
        ),
        migrations.AlterField(
            model_name="configurationmarqueplateforme",
            name="courriel_support",
            field=models.EmailField(blank=True, default="", max_length=254),
        ),
        migrations.AlterField(
            model_name="configurationmarqueplateforme",
            name="telephone_support",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AlterField(
            model_name="configurationmarqueplateforme",
            name="site_web",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AlterField(
            model_name="configurationmarqueplateforme",
            name="adresse_siege",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AlterField(
            model_name="configurationmarqueplateforme",
            name="horaires_support",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
