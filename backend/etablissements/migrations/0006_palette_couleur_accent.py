from django.db import migrations, models


def migrer_ancienne_palette(apps, schema_editor):
    Etablissement = apps.get_model("etablissements", "Etablissement")
    for etablissement in Etablissement.objects.filter(couleur_accent="amber").iterator():
        etablissement.couleur_accent = "orange"
        configuration = dict(etablissement.configuration or {})
        if configuration.get("couleur_accent") == "amber":
            configuration["couleur_accent"] = "orange"
            etablissement.configuration = configuration
        etablissement.save(update_fields=("couleur_accent", "configuration"))


class Migration(migrations.Migration):
    dependencies = [
        ("etablissements", "0005_alter_etablissement_url_logo"),
    ]

    operations = [
        migrations.RunPython(migrer_ancienne_palette, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="etablissement",
            name="couleur_accent",
            field=models.CharField(
                choices=[
                    ("blue", "Bleu"),
                    ("teal", "Turquoise"),
                    ("violet", "Violet"),
                    ("orange", "Orange"),
                    ("red", "Rouge"),
                    ("navy", "Bleu nuit"),
                ],
                default="blue",
                max_length=16,
            ),
        ),
    ]
