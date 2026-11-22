from decimal import Decimal, InvalidOperation

from django.db import migrations


def decimal_ou_zero(valeur):
    try:
        return Decimal(str(valeur if valeur is not None else 0))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")


def importer(apps, schema_editor):
    Etablissement = apps.get_model("etablissements", "Etablissement")
    CompteBancaire = apps.get_model("etablissements", "CompteBancaire")
    for etablissement in Etablissement.objects.all():
        configuration = dict(etablissement.configuration or {})
        champs = (
            "code_pays",
            "nom_pays",
            "fuseau_horaire",
            "autorite_tutelle",
            "ville",
            "adresse",
            "telephone",
            "courriel",
            "site_web",
            "annee_academique",
            "libelle_periode_courante",
            "devise_defaut",
            "format_matricule",
            "echelle_notation",
            "couleur_accent",
            "devise_etablissement",
            "url_logo",
            "titre_direction",
            "nom_direction",
            "code_sceau",
            "services_actifs",
            "offre_saas",
            "statut_abonnement_saas",
            "date_fin_essai_saas",
            "reference_paiement_saas",
        )
        valeurs = {}
        for champ in champs:
            if champ in configuration:
                valeurs[champ] = configuration[champ]
        valeurs["taux_change_usd"] = decimal_ou_zero(
            configuration.get("taux_change_usd", 132)
        )
        valeurs["echelle_notation"] = int(configuration.get("echelle_notation", 100))
        valeurs["note_passage"] = decimal_ou_zero(configuration.get("note_passage", 0))
        valeurs["services_actifs"] = configuration.get("services_actifs", {})
        valeurs["bloquer_documents_si_impaye"] = bool(
            configuration.get("bloquer_documents_si_impaye", True)
        )
        for champ, valeur in valeurs.items():
            setattr(etablissement, champ, valeur)
        etablissement.save()

        for banque in configuration.get("comptes_bancaires", []) or []:
            if not isinstance(banque, dict) or not banque.get("id"):
                continue
            CompteBancaire.objects.update_or_create(
                id=banque["id"],
                defaults={
                    "etablissement": etablissement,
                    "nom_banque": banque.get("nom_banque", ""),
                    "numero_compte": banque.get("numero_compte", ""),
                    "devise": banque.get("devise", "USD"),
                    "titulaire": banque.get("titulaire", ""),
                    "par_defaut": bool(banque.get("par_defaut", False)),
                    "actif": bool(banque.get("actif", True)),
                },
            )


def rollback(apps, schema_editor):
    for etablissement in apps.get_model("etablissements", "Etablissement").objects.all():
        configuration = dict(etablissement.configuration or {})
        if configuration:
            configuration["statut"] = "ACTIF" if etablissement.est_actif else "SUSPENDU"
            etablissement.configuration = configuration
            etablissement.save(update_fields=("configuration",))


class Migration(migrations.Migration):
    dependencies = [
        ("etablissements", "0002_etablissement_adresse_etablissement_annee_academique_and_more"),
    ]

    operations = [
        migrations.RunPython(importer, rollback),
    ]
