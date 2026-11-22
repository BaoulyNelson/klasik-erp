from decimal import Decimal, InvalidOperation

from django.db import migrations


def nombre(valeur):
    try:
        return Decimal(str(valeur if valeur is not None else 0))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")


def importer(apps, schema_editor):
    Enregistrement = apps.get_model("donnees", "EnregistrementMetier")
    Etablissement = apps.get_model("etablissements", "Etablissement")
    Unite = apps.get_model("scolarite", "UniteAcademique")
    Element = apps.get_model("scolarite", "ElementPedagogique")
    Apprenant = apps.get_model("scolarite", "Apprenant")
    Tuteur = apps.get_model("scolarite", "ContactTuteur")
    Inscription = apps.get_model("scolarite", "InscriptionApprenant")
    Echeance = apps.get_model("scolarite", "EcheancePaiement")

    for ligne in Enregistrement.objects.filter(collection="unites"):
        donnees = dict(ligne.donnees)
        Unite.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "code": donnees.get("code", ligne.id_objet),
                "nom": donnees.get("nom", ""),
                "categorie": donnees.get("categorie", ""),
                "niveau_ou_duree": donnees.get("niveau_ou_duree", ""),
                "indication_horaire": donnees.get("indication_horaire", ""),
                "capacite": int(donnees.get("capacite", 35) or 35),
                "frais_scolarite_htg": nombre(donnees.get("frais_scolarite_htg", 0)),
                "frais_inscription_htg": nombre(donnees.get("frais_inscription_htg", 0)),
                "repartition_facturation": donnees.get("repartition_facturation", ""),
                "responsable_nom": donnees.get("responsable_nom", ""),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="elements"):
        donnees = dict(ligne.donnees)
        unite_id = donnees.get("id_unite")
        if not Unite.objects.filter(pk=unite_id, etablissement_id=ligne.etablissement_id).exists():
            continue
        Element.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "unite_id": unite_id,
                "code": donnees.get("code", ligne.id_objet),
                "nom": donnees.get("nom", ""),
                "nature": donnees.get("nature", "MATIERE"),
                "coefficient_ou_credits": nombre(
                    donnees.get("coefficient_ou_credits", 0)
                ),
                "volume_horaire_total": int(donnees.get("volume_horaire_total", 0) or 0),
                "id_enseignant": donnees.get("id_enseignant", ""),
                "libelle_periode": donnees.get("libelle_periode", ""),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="apprenants"):
        donnees = dict(ligne.donnees)
        unite_id = donnees.get("id_unite")
        if not Unite.objects.filter(pk=unite_id, etablissement_id=ligne.etablissement_id).exists():
            continue
        apprenant = Apprenant.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "unite_id": unite_id,
                "matricule": donnees.get("matricule", ligne.id_objet),
                "prenom": donnees.get("prenom", ""),
                "nom": donnees.get("nom", ""),
                "sexe": donnees.get("sexe", "F"),
                "date_naissance": donnees.get("date_naissance", ""),
                "lieu_naissance": donnees.get("lieu_naissance", ""),
                "telephone": donnees.get("telephone", ""),
                "courriel": donnees.get("courriel", ""),
                "adresse": donnees.get("adresse", ""),
                "libelle_niveau": donnees.get("libelle_niveau", ""),
                "date_inscription": donnees.get("date_inscription", ""),
                "indice_etape": int(donnees.get("indice_etape", 1) or 1),
                "statut": donnees.get("statut", "ACTIF"),
                "total_du_htg": nombre(donnees.get("total_du_htg", 0)),
                "total_paye_htg": nombre(donnees.get("total_paye_htg", 0)),
                "statut_paiement": donnees.get("statut_paiement", "A_JOUR"),
                "moyenne_generale": nombre(donnees.get("moyenne_generale", 0)),
                "taux_assiduite": nombre(donnees.get("taux_assiduite", 0)),
                "credits_acquis": nombre(donnees["credits_acquis"]) if donnees.get("credits_acquis") is not None else None,
                "credits_requis": nombre(donnees["credits_requis"]) if donnees.get("credits_requis") is not None else None,
                "pourcentage_bourse": nombre(donnees["pourcentage_bourse"]) if donnees.get("pourcentage_bourse") is not None else None,
                "nationalite": donnees.get("nationalite", ""),
                "mobilite_internationale": bool(donnees.get("mobilite_internationale", False)),
                "reference_visa_passeport": donnees.get("reference_visa_passeport", ""),
                "entreprise_stage": donnees.get("entreprise_stage", ""),
                "dossier_complet": bool(donnees.get("dossier_complet", True)),
                "pieces_manquantes": donnees.get("pieces_manquantes", []) or [],
            },
        )[0]
        Tuteur.objects.filter(apprenant=apprenant).delete()
        for tuteur in donnees.get("tuteurs", []) or []:
            if not isinstance(tuteur, dict):
                continue
            Tuteur.objects.create(
                apprenant=apprenant,
                nom_complet=tuteur.get("nom_complet", ""),
                lien_parente=tuteur.get("lien_parente", "Proche / Urgence"),
                telephone=tuteur.get("telephone", ""),
                est_contact_urgence=bool(tuteur.get("est_contact_urgence", False)),
                retrait_autorise=bool(tuteur.get("retrait_autorise", False)),
            )
        Echeance.objects.filter(apprenant=apprenant).delete()
        for echeance in donnees.get("echeancier", []) or []:
            if not isinstance(echeance, dict) or not echeance.get("id"):
                continue
            Echeance.objects.create(
                id=echeance["id"],
                etablissement_id=ligne.etablissement_id,
                apprenant=apprenant,
                libelle=echeance.get("libelle", ""),
                date_echeance=echeance.get("date_echeance", ""),
                montant_du_htg=nombre(echeance.get("montant_du_htg", 0)),
                montant_paye_htg=nombre(echeance.get("montant_paye_htg", 0)),
                statut=echeance.get("statut", "A_PAYER"),
            )

    for ligne in Enregistrement.objects.filter(collection="inscriptions"):
        donnees = dict(ligne.donnees)
        apprenant_id = donnees.get("id_apprenant")
        unite_id = donnees.get("id_unite")
        if not Apprenant.objects.filter(pk=apprenant_id, etablissement_id=ligne.etablissement_id).exists():
            continue
        if not Unite.objects.filter(pk=unite_id, etablissement_id=ligne.etablissement_id).exists():
            continue
        Inscription.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "apprenant_id": apprenant_id,
                "unite_id": unite_id,
                "numero_inscription": donnees.get("numero_inscription", ligne.id_objet),
                "annee_academique": donnees.get("annee_academique", ""),
                "libelle_periode": donnees.get("libelle_periode", ""),
                "libelle_niveau": donnees.get("libelle_niveau", ""),
                "type_inscription": donnees.get("type_inscription", "NOUVELLE"),
                "date_inscription": donnees.get("date_inscription", ""),
                "statut_inscription": donnees.get("statut_inscription", "VALIDEE"),
                "montant_brut_htg": nombre(donnees.get("montant_brut_htg", 0)),
                "pourcentage_bourse": nombre(donnees.get("pourcentage_bourse", 0)),
                "montant_net_htg": nombre(donnees.get("montant_net_htg", 0)),
                "pieces_fournies": donnees.get("pieces_fournies", []) or [],
                "option_cantine": bool(donnees.get("option_cantine", False)),
                "option_transport": bool(donnees.get("option_transport", False)),
                "motif_statut": donnees.get("motif_statut", ""),
                "observations": donnees.get("observations", ""),
                "cree_le": donnees.get("cree_le", ""),
                "modifie_le": donnees.get("modifie_le", ""),
            },
        )


def rollback(apps, schema_editor):
    apps.get_model("scolarite", "EcheancePaiement").objects.all().delete()
    apps.get_model("scolarite", "ContactTuteur").objects.all().delete()
    apps.get_model("scolarite", "InscriptionApprenant").objects.all().delete()
    apps.get_model("scolarite", "Apprenant").objects.all().delete()
    apps.get_model("scolarite", "ElementPedagogique").objects.all().delete()
    apps.get_model("scolarite", "UniteAcademique").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("scolarite", "0001_initial"),
        ("donnees", "0003_entreeauditapi_nom_acteur_entreeauditapi_role_acteur"),
    ]

    operations = [
        migrations.RunPython(importer, rollback),
    ]
