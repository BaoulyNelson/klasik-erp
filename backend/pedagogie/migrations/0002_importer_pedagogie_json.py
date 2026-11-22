from decimal import Decimal, InvalidOperation

from django.db import migrations


def nombre(valeur):
    try:
        return Decimal(str(valeur if valeur is not None else 0))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")


def importer(apps, schema_editor):
    Enregistrement = apps.get_model("donnees", "EnregistrementMetier")
    Enseignant = apps.get_model("pedagogie", "PersonnelEnseignant")
    Note = apps.get_model("pedagogie", "NoteEvaluation")
    Presence = apps.get_model("pedagogie", "Presence")
    Creneau = apps.get_model("pedagogie", "CreneauEmploiDuTemps")
    Evenement = apps.get_model("pedagogie", "EvenementCalendrier")
    Cahier = apps.get_model("pedagogie", "EntreeCahierTextes")
    Soutenance = apps.get_model("pedagogie", "Soutenance")
    Apprenant = apps.get_model("scolarite", "Apprenant")
    Unite = apps.get_model("scolarite", "UniteAcademique")
    Element = apps.get_model("scolarite", "ElementPedagogique")

    for ligne in Enregistrement.objects.filter(collection="enseignants"):
        donnees = dict(ligne.donnees)
        Enseignant.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "code": donnees.get("code", ligne.id_objet),
                "nom_complet": donnees.get("nom_complet", ""),
                "specialite": donnees.get("specialite", ""),
                "type_contrat": donnees.get("type_contrat", "Contractuel"),
                "telephone": donnees.get("telephone", ""),
                "courriel": donnees.get("courriel", ""),
                "ids_unites_assignees": donnees.get("ids_unites_assignees", []) or [],
                "ids_elements_assignes": donnees.get("ids_elements_assignes", []) or [],
                "heures_mensuelles": int(donnees.get("heures_mensuelles", 0) or 0),
                "taux_horaire_ou_mensuel_htg": nombre(
                    donnees.get("taux_horaire_ou_mensuel_htg", 0)
                ),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="notes"):
        donnees = dict(ligne.donnees)
        apprenant = Apprenant.objects.filter(
            pk=donnees.get("id_apprenant"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        element = Element.objects.filter(
            pk=donnees.get("id_element"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        if apprenant is None or element is None:
            continue
        Note.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "apprenant": apprenant,
                "element": element,
                "libelle_periode": donnees.get("libelle_periode", ""),
                "type_evaluation": donnees.get("type_evaluation", "Devoir"),
                "note": nombre(donnees.get("note", 0)),
                "note_maximale": nombre(donnees.get("note_maximale", 100)),
                "verrouillee": bool(donnees.get("verrouillee", False)),
                "enregistree_le": donnees.get("enregistree_le", ""),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="presences"):
        donnees = dict(ligne.donnees)
        apprenant = Apprenant.objects.filter(
            pk=donnees.get("id_apprenant"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        unite = Unite.objects.filter(
            pk=donnees.get("id_unite"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        if apprenant is None or unite is None:
            continue
        Presence.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "apprenant": apprenant,
                "unite": unite,
                "date": donnees.get("date", ""),
                "statut": donnees.get("statut", "PRESENT"),
                "observation": donnees.get("observation", ""),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="emplois_du_temps"):
        donnees = dict(ligne.donnees)
        unite = Unite.objects.filter(
            pk=donnees.get("id_unite"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        element = Element.objects.filter(
            pk=donnees.get("id_element"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        enseignant = Enseignant.objects.filter(
            pk=donnees.get("id_enseignant"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        if unite is None or element is None or enseignant is None:
            continue
        Creneau.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "unite": unite,
                "element": element,
                "enseignant": enseignant,
                "salle": donnees.get("salle", ""),
                "jour_semaine": donnees.get("jour_semaine", "Lundi"),
                "heure_debut": donnees.get("heure_debut", "08:00"),
                "heure_fin": donnees.get("heure_fin", "09:00"),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="evenements_calendrier"):
        donnees = dict(ligne.donnees)
        Evenement.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "type": donnees.get("type", "EVENEMENT"),
                "titre": donnees.get("titre", ""),
                "date_debut": donnees.get("date_debut", ""),
                "date_fin": donnees.get("date_fin", ""),
                "concerne_unites": donnees.get("concerne_unites", ""),
                "description": donnees.get("description", ""),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="cahiers_textes"):
        donnees = dict(ligne.donnees)
        unite = Unite.objects.filter(
            pk=donnees.get("id_unite"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        element = Element.objects.filter(
            pk=donnees.get("id_element"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        if unite is None or element is None:
            continue
        Cahier.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "unite": unite,
                "element": element,
                "nom_enseignant": donnees.get("nom_enseignant", ""),
                "date": donnees.get("date", ""),
                "sujet": donnees.get("sujet", ""),
                "devoir_donne": donnees.get("devoir_donne", ""),
            },
        )

    for ligne in Enregistrement.objects.filter(collection="soutenances"):
        donnees = dict(ligne.donnees)
        apprenant = Apprenant.objects.filter(
            pk=donnees.get("id_apprenant"),
            etablissement_id=ligne.etablissement_id,
        ).first()
        if apprenant is None:
            continue
        Soutenance.objects.update_or_create(
            id=ligne.id_objet,
            defaults={
                "etablissement_id": ligne.etablissement_id,
                "apprenant": apprenant,
                "titre": donnees.get("titre", ""),
                "nom_directeur_memoire": donnees.get("nom_directeur_memoire", ""),
                "membres_jury": donnees.get("membres_jury", ""),
                "date_soutenance": donnees.get("date_soutenance", ""),
                "note": nombre(donnees["note"]) if donnees.get("note") is not None else None,
                "statut": donnees.get("statut", "PLANIFIEE"),
            },
        )


def rollback(apps, schema_editor):
    for modele in (
        "Soutenance",
        "EntreeCahierTextes",
        "EvenementCalendrier",
        "CreneauEmploiDuTemps",
        "Presence",
        "NoteEvaluation",
        "PersonnelEnseignant",
    ):
        apps.get_model("pedagogie", modele).objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("pedagogie", "0001_initial"),
        ("scolarite", "0002_importer_scolarite_json"),
        ("donnees", "0003_entreeauditapi_nom_acteur_entreeauditapi_role_acteur"),
    ]

    operations = [
        migrations.RunPython(importer, rollback),
    ]
