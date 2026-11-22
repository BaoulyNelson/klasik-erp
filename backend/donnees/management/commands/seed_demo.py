import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from comptes.models import AffiliationEtablissement, RoleUtilisateur, Utilisateur
from donnees.models import EnregistrementMetier
from etablissements.models import Etablissement, TypeEtablissement

FICHIER_DONNEES = Path(__file__).resolve().parents[3] / "fixtures" / "donnees_demo.json"


class Command(BaseCommand):
    help = "Recharge les données de démonstration de l’application de façon idempotente."

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            donnees = json.loads(FICHIER_DONNEES.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as erreur:
            raise CommandError("Le fichier de démonstration est absent ou invalide.") from erreur

        etablissements = {}
        for ligne in donnees["etablissements"]:
            configuration = dict(ligne)
            id_etablissement = configuration.pop("id")
            type_etablissement = configuration["type"]
            if type_etablissement not in TypeEtablissement.values:
                raise CommandError("Un type d’établissement de démonstration est invalide.")
            etablissement, _ = Etablissement.objects.update_or_create(
                id=id_etablissement,
                defaults={
                    "code": configuration["code"],
                    "nom": configuration["nom"],
                    "nom_court": configuration.get("nom_court", ""),
                    "type": type_etablissement,
                    "configuration": configuration,
                    "est_actif": configuration.get("statut", "ACTIF") == "ACTIF",
                },
            )
            etablissements[etablissement.id] = etablissement

        utilisateurs = {}
        for ligne in donnees["utilisateurs"]:
            profil = dict(ligne)
            id_utilisateur = profil.pop("id")
            courriel = profil.get("courriel", "").strip().lower()
            if not courriel:
                raise CommandError("Un compte de démonstration ne possède pas de courriel.")
            role = (
                RoleUtilisateur.SUPER_ADMIN
                if profil.get("est_super_admin_plateforme")
                else (profil.get("affiliations") or [{}])[0].get(
                    "id_role", RoleUtilisateur.AUDITEUR
                )
            )
            profil["mot_de_passe_demo"] = ""
            utilisateur, cree = Utilisateur.objects.get_or_create(
                id=id_utilisateur,
                defaults={
                    "courriel": courriel,
                    "nom_complet": profil.get("nom_complet", ""),
                    "telephone": profil.get("telephone", ""),
                    "role": role,
                    "est_super_admin_plateforme": bool(
                        profil.get("est_super_admin_plateforme", False)
                    ),
                    "is_active": profil.get("est_actif", True) is not False,
                    "profil": profil,
                },
            )
            if cree:
                utilisateur.set_unusable_password()
            utilisateur.courriel = courriel
            utilisateur.nom_complet = profil.get("nom_complet", "")
            utilisateur.telephone = profil.get("telephone", "")
            utilisateur.role = role
            utilisateur.est_super_admin_plateforme = bool(
                profil.get("est_super_admin_plateforme", False)
            )
            utilisateur.is_active = profil.get("est_actif", True) is not False
            utilisateur.profil = profil
            utilisateur.save()
            utilisateurs[id_utilisateur] = utilisateur

            for affiliation in profil.get("affiliations", []):
                etablissement = etablissements.get(affiliation.get("id_etablissement"))
                if etablissement is None:
                    raise CommandError("Une affiliation référence un établissement inconnu.")
                if affiliation.get("id_role") not in RoleUtilisateur.values:
                    raise CommandError("Une affiliation contient un rôle inconnu.")
                AffiliationEtablissement.objects.update_or_create(
                    utilisateur=utilisateur,
                    etablissement=etablissement,
                    defaults={
                        "role": affiliation["id_role"],
                        "fonction_locale": affiliation.get("fonction_locale", ""),
                    },
                )

        nombre_enregistrements = 0
        for collection, lignes in donnees.items():
            if collection in {"etablissements", "utilisateurs"}:
                continue
            for ligne in lignes:
                contenu = dict(ligne)
                id_objet = contenu.get("id")
                etablissement = etablissements.get(contenu.get("id_etablissement"))
                if not isinstance(id_objet, str) or etablissement is None:
                    raise CommandError("Une donnée initiale possède un identifiant ou tenant invalide.")
                EnregistrementMetier.objects.update_or_create(
                    etablissement=etablissement,
                    collection=collection,
                    id_objet=id_objet,
                    defaults={"donnees": contenu},
                )
                nombre_enregistrements += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Données de démonstration chargées : "
                f"{len(etablissements)} établissements, "
                f"{len(utilisateurs)} utilisateurs et "
                f"{nombre_enregistrements} enregistrements métier."
            )
        )
