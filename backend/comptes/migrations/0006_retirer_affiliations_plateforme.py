from django.db import migrations
from django.db.models import Q


def supprimer_affiliations_plateforme(apps, schema_editor):
    AffiliationEtablissement = apps.get_model("comptes", "AffiliationEtablissement")
    AffiliationEtablissement.objects.filter(
        role="SUPER_ADMIN",
    ).filter(
        Q(utilisateur__est_super_admin_plateforme=True)
        | Q(utilisateur__is_superuser=True)
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("comptes", "0005_jetonreinitialisation_tentatives_echouees"),
    ]

    operations = [
        migrations.RunPython(supprimer_affiliations_plateforme, migrations.RunPython.noop),
    ]
