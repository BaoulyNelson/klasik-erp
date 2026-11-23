from django.db import migrations


COLLECTIONS = (
    "partenaires",
    "fils_discussion",
    "badges_attribues",
    "journaux_importations",
    "demandes_conge",
)


def entier_non_negatif(valeur, collection, identifiant, champ):
    try:
        valeur_entier = int(valeur or 0)
    except (TypeError, ValueError) as erreur:
        raise RuntimeError(
            f"{collection}/{identifiant}: valeur invalide pour {champ}."
        ) from erreur
    if valeur_entier < 0:
        raise RuntimeError(
            f"{collection}/{identifiant}: valeur négative pour {champ}."
        )
    return valeur_entier


def migrer(apps, schema_editor):
    alias = schema_editor.connection.alias
    Enregistrement = apps.get_model("donnees", "EnregistrementMetier")
    ReferenceFichier = apps.get_model("donnees", "ReferenceFichier")
    Apprenant = apps.get_model("scolarite", "Apprenant")
    Partenaire = apps.get_model("services_annexes", "PartenaireStage")
    Fil = apps.get_model("communication", "FilDiscussionDirecte")
    Message = apps.get_model("communication", "MessageDirect")
    Badge = apps.get_model("securite", "AttributionBadge")
    Lot = apps.get_model("securite", "LotImportation")
    Conge = apps.get_model("finances", "DemandeConge")
    Affiliation = apps.get_model("comptes", "AffiliationEtablissement")
    lignes = list(
        Enregistrement.objects.using(alias)
        .filter(collection__in=COLLECTIONS)
        .order_by("collection", "etablissement_id", "id_objet")
    )

    if ReferenceFichier.objects.using(alias).filter(
        enregistrement__in=[ligne.pk for ligne in lignes]
    ).exists():
        raise RuntimeError(
            "La migration des collections relationnelles a trouvé des fichiers attachés "
            "à des enregistrements génériques. Détachez-les ou migrez leurs références "
            "avant de relancer."
        )

    for ligne in lignes:
        donnees = ligne.donnees
        if not isinstance(donnees, dict):
            raise RuntimeError(
                f"{ligne.collection}/{ligne.id_objet}: le contenu doit être un objet JSON."
            )
        etablissement_id = ligne.etablissement_id

        if ligne.collection == "partenaires":
            modele = Partenaire
            defaults = {
                "etablissement_id": etablissement_id,
                "nom_entreprise": donnees.get("nom_entreprise", ""),
                "secteur": donnees.get("secteur", ""),
                "ville": donnees.get("ville", ""),
                "nom_tuteur": donnees.get("nom_tuteur", ""),
                "telephone": donnees.get("telephone", ""),
                "places_disponibles": entier_non_negatif(
                    donnees.get("places_disponibles", 0),
                    ligne.collection,
                    ligne.id_objet,
                    "places_disponibles",
                ),
                "stagiaires_actifs": entier_non_negatif(
                    donnees.get("stagiaires_actifs", 0),
                    ligne.collection,
                    ligne.id_objet,
                    "stagiaires_actifs",
                ),
            }
        elif ligne.collection == "fils_discussion":
            modele = Fil
            messages = donnees.get("messages", [])
            if not isinstance(messages, list):
                raise RuntimeError(
                    f"{ligne.collection}/{ligne.id_objet}: messages doit être une liste."
                )
            defaults = {
                "etablissement_id": etablissement_id,
                "sujet": donnees.get("sujet", ""),
                "nom_interlocuteur": donnees.get("nom_interlocuteur", ""),
                "role_interlocuteur": donnees.get("role_interlocuteur", ""),
                "categorie": donnees.get("categorie", "Administration"),
                "messages_non_lus": entier_non_negatif(
                    donnees.get("messages_non_lus", 0),
                    ligne.collection,
                    ligne.id_objet,
                    "messages_non_lus",
                ),
                "mis_a_jour_le": donnees.get("mis_a_jour_le", ""),
            }
        elif ligne.collection == "badges_attribues":
            modele = Badge
            apprenant = Apprenant.objects.using(alias).filter(
                pk=donnees.get("id_apprenant"),
                etablissement_id=etablissement_id,
            ).first()
            if apprenant is None:
                raise RuntimeError(
                    f"{ligne.collection}/{ligne.id_objet}: apprenant introuvable "
                    "dans le même établissement."
                )
            defaults = {
                "etablissement_id": etablissement_id,
                "apprenant_id": apprenant.pk,
                "titre_badge": donnees.get("titre_badge", donnees.get("titre", "")),
                "categorie": donnees.get("categorie", donnees.get("code_badge", "Excellence")),
                "attribue_le": donnees.get("attribue_le", ""),
                "attribue_par": donnees.get("attribue_par", ""),
            }
        elif ligne.collection == "journaux_importations":
            modele = Lot
            defaults = {
                "etablissement_id": etablissement_id,
                "cible": donnees.get("cible", ""),
                "nom_fichier": donnees.get("nom_fichier", ""),
                "nombre_lignes": entier_non_negatif(
                    donnees.get("lignes_importees", donnees.get("nombre_lignes", 0)),
                    ligne.collection,
                    ligne.id_objet,
                    "lignes_importees",
                ),
                "importe_le": donnees.get("importe_le", ""),
                "importe_par": donnees.get("importe_par", ""),
            }
            if donnees.get("statut") is not None:
                defaults["statut"] = donnees["statut"]
        else:
            modele = Conge
            defaults = {
                "etablissement_id": etablissement_id,
                "nom_personnel": donnees.get("nom_personnel", ""),
                "libelle_role": donnees.get("libelle_role", ""),
                "type_conge": donnees.get("type_conge", "Congé annuel"),
                "date_debut": donnees.get("date_debut", ""),
                "date_fin": donnees.get("date_fin", ""),
                "motif": donnees.get("motif", ""),
                "statut": donnees.get("statut", "EN_ATTENTE"),
                "demande_le": donnees.get("demande_le", ""),
                "traite_par": donnees.get("traite_par", ""),
            }

        existant = modele.objects.using(alias).filter(pk=ligne.id_objet).first()
        if existant and existant.etablissement_id != etablissement_id:
            raise RuntimeError(
                f"{ligne.collection}/{ligne.id_objet}: identifiant déjà utilisé "
                "dans un autre établissement."
            )
        modele.objects.using(alias).update_or_create(
            pk=ligne.id_objet,
            defaults=defaults,
        )

        if ligne.collection == "fils_discussion":
            fil = Fil.objects.using(alias).get(pk=ligne.id_objet)
            noms_participants = {fil.nom_interlocuteur}
            for ordre, message in enumerate(messages):
                if not isinstance(message, dict):
                    raise RuntimeError(
                        f"{ligne.collection}/{ligne.id_objet}: un message est invalide."
                    )
                message_id = message.get("id")
                if not isinstance(message_id, str) or not message_id:
                    raise RuntimeError(
                        f"{ligne.collection}/{ligne.id_objet}: identifiant de message manquant."
                    )
                message_existant = Message.objects.using(alias).filter(pk=message_id).first()
                if message_existant and message_existant.fil_id != fil.pk:
                    raise RuntimeError(
                        f"{ligne.collection}/{ligne.id_objet}: identifiant de message "
                        "déjà utilisé par une autre discussion."
                    )
                Message.objects.using(alias).update_or_create(
                    pk=message_id,
                    defaults={
                        "fil_id": fil.pk,
                        "ordre": ordre,
                        "nom_expediteur": message.get("nom_expediteur", ""),
                        "role_expediteur": message.get("role_expediteur", ""),
                        "contenu": message.get("contenu", ""),
                        "envoye_le": message.get("envoye_le", ""),
                    },
                )
                if message.get("nom_expediteur"):
                    noms_participants.add(message["nom_expediteur"])

            for nom in noms_participants:
                affiliations = Affiliation.objects.using(alias).filter(
                    etablissement_id=etablissement_id,
                    utilisateur__is_active=True,
                    utilisateur__nom_complet__iexact=nom,
                ).values_list("utilisateur_id", flat=True)
                identifiants = list(affiliations.distinct()[:2])
                if len(identifiants) == 1:
                    fil.participants.add(identifiants[0])

    Enregistrement.objects.using(alias).filter(collection__in=COLLECTIONS).delete()


def restaurer_json(apps, schema_editor):
    alias = schema_editor.connection.alias
    Enregistrement = apps.get_model("donnees", "EnregistrementMetier")
    Partenaire = apps.get_model("services_annexes", "PartenaireStage")
    Fil = apps.get_model("communication", "FilDiscussionDirecte")
    Badge = apps.get_model("securite", "AttributionBadge")
    Lot = apps.get_model("securite", "LotImportation")
    Conge = apps.get_model("finances", "DemandeConge")

    collections = (
        ("partenaires", Partenaire),
        ("fils_discussion", Fil),
        ("badges_attribues", Badge),
        ("journaux_importations", Lot),
        ("demandes_conge", Conge),
    )
    for collection, modele in collections:
        for objet in modele.objects.using(alias).all().iterator():
            if collection == "partenaires":
                donnees = {
                    "id": objet.pk,
                    "id_etablissement": objet.etablissement_id,
                    "nom_entreprise": objet.nom_entreprise,
                    "secteur": objet.secteur,
                    "ville": objet.ville,
                    "nom_tuteur": objet.nom_tuteur,
                    "telephone": objet.telephone,
                    "places_disponibles": objet.places_disponibles,
                    "stagiaires_actifs": objet.stagiaires_actifs,
                }
            elif collection == "fils_discussion":
                donnees = {
                    "id": objet.pk,
                    "id_etablissement": objet.etablissement_id,
                    "sujet": objet.sujet,
                    "nom_interlocuteur": objet.nom_interlocuteur,
                    "role_interlocuteur": objet.role_interlocuteur,
                    "categorie": objet.categorie,
                    "messages_non_lus": objet.messages_non_lus,
                    "mis_a_jour_le": objet.mis_a_jour_le,
                    "messages": [
                        {
                            "id": message.pk,
                            "nom_expediteur": message.nom_expediteur,
                            "role_expediteur": message.role_expediteur,
                            "contenu": message.contenu,
                            "envoye_le": message.envoye_le,
                        }
                        for message in objet.messages.all().order_by("ordre", "id")
                    ],
                }
            elif collection == "badges_attribues":
                donnees = {
                    "id": objet.pk,
                    "id_etablissement": objet.etablissement_id,
                    "id_apprenant": objet.apprenant_id,
                    "titre_badge": objet.titre_badge,
                    "categorie": objet.categorie,
                    "attribue_le": objet.attribue_le,
                    "attribue_par": objet.attribue_par,
                }
            elif collection == "journaux_importations":
                donnees = {
                    "id": objet.pk,
                    "id_etablissement": objet.etablissement_id,
                    "cible": objet.cible,
                    "nom_fichier": objet.nom_fichier,
                    "lignes_importees": objet.nombre_lignes,
                    "importe_le": objet.importe_le,
                    "importe_par": objet.importe_par,
                }
            else:
                donnees = {
                    "id": objet.pk,
                    "id_etablissement": objet.etablissement_id,
                    "nom_personnel": objet.nom_personnel,
                    "libelle_role": objet.libelle_role,
                    "type_conge": objet.type_conge,
                    "date_debut": objet.date_debut,
                    "date_fin": objet.date_fin,
                    "motif": objet.motif,
                    "statut": objet.statut,
                    "demande_le": objet.demande_le,
                    "traite_par": objet.traite_par,
                }
            Enregistrement.objects.using(alias).update_or_create(
                etablissement_id=objet.etablissement_id,
                collection=collection,
                id_objet=objet.pk,
                defaults={"donnees": donnees},
            )


class Migration(migrations.Migration):
    dependencies = [
        ("communication", "0003_fildiscussiondirecte_messagedirect_and_more"),
        ("donnees", "0004_referencefichier"),
        ("finances", "0003_demandeconge"),
        ("securite", "0003_remove_attributionbadge_code_badge_and_more"),
        ("services_annexes", "0003_partenairestage"),
    ]

    operations = [
        migrations.RunPython(migrer, restaurer_json),
    ]
