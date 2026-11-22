from decimal import Decimal, InvalidOperation

from django.db import migrations


def nombre(valeur):
    try:
        return Decimal(str(valeur if valeur is not None else 0))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")


def importer(apps, schema_editor):
    Enregistrement = apps.get_model("donnees", "EnregistrementMetier")
    Apprenant = apps.get_model("scolarite", "Apprenant")
    Enseignant = apps.get_model("pedagogie", "PersonnelEnseignant")
    Paiement = apps.get_model("finances", "Paiement")
    Depense = apps.get_model("finances", "Depense")
    Paie = apps.get_model("finances", "BulletinPaie")
    Abonnement = apps.get_model("finances", "AbonnementService")

    for ligne in Enregistrement.objects.filter(collection="paiements"):
        donnees = dict(ligne.donnees)
        apprenant = Apprenant.objects.filter(
            pk=donnees.get("id_apprenant"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        if apprenant is None:
            continue
        Paiement.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "apprenant": apprenant,
                "numero_recu": donnees.get("numero_recu", ligne.id_objet),
                "montant_htg": nombre(donnees.get("montant_htg", 0)),
                "mode_paiement": donnees.get("mode_paiement", "Espèces"),
                "code_reference": donnees.get("code_reference", ""),
                "libelle_compte_bancaire": donnees.get("libelle_compte_bancaire", ""),
                "libelle": donnees.get("libelle", ""),
                "paye_le": donnees.get("paye_le", ""),
                "encaisse_par": donnees.get("encaisse_par", ""),
                "statut": donnees.get("statut", "VALIDE"),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="depenses"):
        donnees = dict(ligne.donnees)
        Depense.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "categorie": donnees.get("categorie", "Autre"),
                "description": donnees.get("description", ""),
                "fournisseur": donnees.get("fournisseur", ""),
                "montant_htg": nombre(donnees.get("montant_htg", 0)),
                "payee_le": donnees.get("payee_le", ""),
                "enregistree_par": donnees.get("enregistree_par", ""),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="paie"):
        donnees = dict(ligne.donnees)
        personnel = Enseignant.objects.filter(
            pk=donnees.get("id_personnel"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        if personnel is None:
            continue
        Paie.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "personnel": personnel,
                "nom_personnel": donnees.get("nom_personnel", personnel.nom_complet),
                "libelle_role": donnees.get("libelle_role", ""),
                "libelle_mois": donnees.get("libelle_mois", ""),
                "heures_travaillees": nombre(donnees.get("heures_travaillees", 0)),
                "salaire_base_htg": nombre(donnees["salaire_base_htg"]) if donnees.get("salaire_base_htg") is not None else None,
                "primes_htg": nombre(donnees["primes_htg"]) if donnees.get("primes_htg") is not None else None,
                "motif_primes": donnees.get("motif_primes", ""),
                "montant_brut_htg": nombre(donnees.get("montant_brut_htg", 0)),
                "retenues_htg": nombre(donnees.get("retenues_htg", 0)),
                "motif_retenues": donnees.get("motif_retenues", ""),
                "montant_net_htg": nombre(donnees.get("montant_net_htg", 0)),
                "statut": donnees.get("statut", "EN_ATTENTE"),
                "mode_paiement": donnees.get("mode_paiement", ""),
                "observations": donnees.get("observations", ""),
                "paye_le": donnees.get("paye_le", ""),
                "cree_le": donnees.get("cree_le", ""),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="abonnements"):
        donnees = dict(ligne.donnees)
        apprenant = Apprenant.objects.filter(
            pk=donnees.get("id_apprenant"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        if apprenant is None:
            continue
        Abonnement.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "apprenant": apprenant,
                "type_service": donnees.get("type_service", "Cantine"),
                "tarif_mensuel_ou_annuel_htg": nombre(
                    donnees.get("tarif_mensuel_ou_annuel_htg", 0)
                ),
                "actif": bool(donnees.get("actif", True)),
                "ligne_ou_formule": donnees.get("ligne_ou_formule", ""),
            },
        )


def rollback(apps, schema_editor):
    apps.get_model("finances", "AbonnementService").objects.all().delete()
    apps.get_model("finances", "BulletinPaie").objects.all().delete()
    apps.get_model("finances", "Depense").objects.all().delete()
    apps.get_model("finances", "Paiement").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("finances", "0001_initial"),
        ("pedagogie", "0002_importer_pedagogie_json"),
        ("scolarite", "0002_importer_scolarite_json"),
        ("donnees", "0003_entreeauditapi_nom_acteur_entreeauditapi_role_acteur"),
    ]

    operations = [
        migrations.RunPython(importer, rollback),
    ]
