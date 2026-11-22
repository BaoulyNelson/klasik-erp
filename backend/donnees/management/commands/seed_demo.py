import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from comptes.models import AffiliationEtablissement, RoleUtilisateur, Utilisateur
from donnees.models import EnregistrementMetier
from etablissements.models import Etablissement, TypeEtablissement
from etablissements.models import CompteBancaire
from scolarite.models import (
    Apprenant,
    ContactTuteur,
    EcheancePaiement,
    ElementPedagogique,
    InscriptionApprenant,
    UniteAcademique,
)
from pedagogie.models import (
    CreneauEmploiDuTemps,
    EntreeCahierTextes,
    EvenementCalendrier,
    NoteEvaluation,
    PersonnelEnseignant,
    Presence,
    Soutenance,
)
from finances.models import AbonnementService, BulletinPaie, Depense, Paiement

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
                    "code_pays": configuration.get("code_pays", "INTL"),
                    "nom_pays": configuration.get("nom_pays", ""),
                    "fuseau_horaire": configuration.get("fuseau_horaire", ""),
                    "autorite_tutelle": configuration.get("autorite_tutelle", ""),
                    "ville": configuration.get("ville", ""),
                    "adresse": configuration.get("adresse", ""),
                    "telephone": configuration.get("telephone", ""),
                    "courriel": configuration.get("courriel", ""),
                    "site_web": configuration.get("site_web", ""),
                    "annee_academique": configuration.get("annee_academique", ""),
                    "libelle_periode_courante": configuration.get("libelle_periode_courante", ""),
                    "devise_defaut": configuration.get("devise_defaut", "USD"),
                    "taux_change_usd": configuration.get("taux_change_usd", 132),
                    "format_matricule": configuration.get("format_matricule", ""),
                    "echelle_notation": configuration.get("echelle_notation", 100),
                    "note_passage": configuration.get("note_passage", 0),
                    "couleur_accent": configuration.get("couleur_accent", "blue"),
                    "devise_etablissement": configuration.get("devise_etablissement", ""),
                    "url_logo": configuration.get("url_logo", ""),
                    "titre_direction": configuration.get("titre_direction", ""),
                    "nom_direction": configuration.get("nom_direction", ""),
                    "code_sceau": configuration.get("code_sceau", ""),
                    "services_actifs": configuration.get("services_actifs", {}),
                    "offre_saas": configuration.get("offre_saas", "Gratuit"),
                    "statut_abonnement_saas": configuration.get("statut_abonnement_saas", ""),
                    "date_fin_essai_saas": configuration.get("date_fin_essai_saas", ""),
                    "reference_paiement_saas": configuration.get("reference_paiement_saas", ""),
                    "bloquer_documents_si_impaye": bool(
                        configuration.get("bloquer_documents_si_impaye", True)
                    ),
                    "configuration": configuration,
                    "est_actif": configuration.get("statut", "ACTIF") == "ACTIF",
                },
            )
            etablissements[etablissement.id] = etablissement
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
        for ligne in donnees.get("unites", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            if etablissement is None or not contenu.get("id"):
                raise CommandError("Une unité possède un établissement ou identifiant invalide.")
            UniteAcademique.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "code": contenu.get("code", contenu["id"]),
                    "nom": contenu.get("nom", ""),
                    "categorie": contenu.get("categorie", ""),
                    "niveau_ou_duree": contenu.get("niveau_ou_duree", ""),
                    "indication_horaire": contenu.get("indication_horaire", ""),
                    "capacite": int(contenu.get("capacite", 35) or 35),
                    "frais_scolarite_htg": contenu.get("frais_scolarite_htg", 0),
                    "frais_inscription_htg": contenu.get("frais_inscription_htg", 0),
                    "repartition_facturation": contenu.get("repartition_facturation", ""),
                    "responsable_nom": contenu.get("responsable_nom", ""),
                },
            )

        for ligne in donnees.get("elements", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            unite = UniteAcademique.objects.filter(
                id=contenu.get("id_unite"),
                etablissement=etablissement,
            ).first()
            if etablissement is None or unite is None:
                raise CommandError("Un élément possède un établissement ou une unité invalide.")
            ElementPedagogique.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "unite": unite,
                    "code": contenu.get("code", contenu["id"]),
                    "nom": contenu.get("nom", ""),
                    "nature": contenu.get("nature", "MATIERE"),
                    "coefficient_ou_credits": contenu.get("coefficient_ou_credits", 0),
                    "volume_horaire_total": int(contenu.get("volume_horaire_total", 0) or 0),
                    "id_enseignant": contenu.get("id_enseignant", ""),
                    "libelle_periode": contenu.get("libelle_periode", ""),
                },
            )

        for ligne in donnees.get("apprenants", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            unite = UniteAcademique.objects.filter(
                id=contenu.get("id_unite"),
                etablissement=etablissement,
            ).first()
            if etablissement is None or unite is None:
                raise CommandError("Un apprenant possède un établissement ou une unité invalide.")
            apprenant, _ = Apprenant.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "unite": unite,
                    "matricule": contenu.get("matricule", contenu["id"]),
                    "prenom": contenu.get("prenom", ""),
                    "nom": contenu.get("nom", ""),
                    "sexe": contenu.get("sexe", "F"),
                    "date_naissance": contenu.get("date_naissance", ""),
                    "lieu_naissance": contenu.get("lieu_naissance", ""),
                    "telephone": contenu.get("telephone", ""),
                    "courriel": contenu.get("courriel", ""),
                    "adresse": contenu.get("adresse", ""),
                    "libelle_niveau": contenu.get("libelle_niveau", ""),
                    "date_inscription": contenu.get("date_inscription", ""),
                    "indice_etape": int(contenu.get("indice_etape", 1) or 1),
                    "statut": contenu.get("statut", "ACTIF"),
                    "total_du_htg": contenu.get("total_du_htg", 0),
                    "total_paye_htg": contenu.get("total_paye_htg", 0),
                    "statut_paiement": contenu.get("statut_paiement", "A_JOUR"),
                    "moyenne_generale": contenu.get("moyenne_generale", 0),
                    "taux_assiduite": contenu.get("taux_assiduite", 0),
                    "credits_acquis": contenu.get("credits_acquis"),
                    "credits_requis": contenu.get("credits_requis"),
                    "pourcentage_bourse": contenu.get("pourcentage_bourse"),
                    "nationalite": contenu.get("nationalite", ""),
                    "mobilite_internationale": bool(contenu.get("mobilite_internationale", False)),
                    "reference_visa_passeport": contenu.get("reference_visa_passeport", ""),
                    "entreprise_stage": contenu.get("entreprise_stage", ""),
                    "dossier_complet": bool(contenu.get("dossier_complet", True)),
                    "pieces_manquantes": contenu.get("pieces_manquantes", []) or [],
                },
            )
            ContactTuteur.objects.filter(apprenant=apprenant).delete()
            for tuteur in contenu.get("tuteurs", []) or []:
                if not isinstance(tuteur, dict):
                    continue
                ContactTuteur.objects.create(
                    apprenant=apprenant,
                    nom_complet=tuteur.get("nom_complet", ""),
                    lien_parente=tuteur.get("lien_parente", "Proche / Urgence"),
                    telephone=tuteur.get("telephone", ""),
                    est_contact_urgence=bool(tuteur.get("est_contact_urgence", False)),
                    retrait_autorise=bool(tuteur.get("retrait_autorise", False)),
                )
            EcheancePaiement.objects.filter(apprenant=apprenant).delete()
            for echeance in contenu.get("echeancier", []) or []:
                if not isinstance(echeance, dict) or not echeance.get("id"):
                    continue
                EcheancePaiement.objects.create(
                    id=echeance["id"],
                    etablissement=etablissement,
                    apprenant=apprenant,
                    libelle=echeance.get("libelle", ""),
                    date_echeance=echeance.get("date_echeance", ""),
                    montant_du_htg=echeance.get("montant_du_htg", 0),
                    montant_paye_htg=echeance.get("montant_paye_htg", 0),
                    statut=echeance.get("statut", "A_PAYER"),
                )

        for ligne in donnees.get("inscriptions", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            apprenant = Apprenant.objects.filter(
                id=contenu.get("id_apprenant"),
                etablissement=etablissement,
            ).first()
            unite = UniteAcademique.objects.filter(
                id=contenu.get("id_unite"),
                etablissement=etablissement,
            ).first()
            if etablissement is None or apprenant is None or unite is None:
                raise CommandError("Une inscription possède une relation invalide.")
            InscriptionApprenant.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "apprenant": apprenant,
                    "unite": unite,
                    "numero_inscription": contenu.get("numero_inscription", contenu["id"]),
                    "annee_academique": contenu.get("annee_academique", ""),
                    "libelle_periode": contenu.get("libelle_periode", ""),
                    "libelle_niveau": contenu.get("libelle_niveau", ""),
                    "type_inscription": contenu.get("type_inscription", "NOUVELLE"),
                    "date_inscription": contenu.get("date_inscription", ""),
                    "statut_inscription": contenu.get("statut_inscription", "VALIDEE"),
                    "montant_brut_htg": contenu.get("montant_brut_htg", 0),
                    "pourcentage_bourse": contenu.get("pourcentage_bourse", 0),
                    "montant_net_htg": contenu.get("montant_net_htg", 0),
                    "pieces_fournies": contenu.get("pieces_fournies", []) or [],
                    "option_cantine": bool(contenu.get("option_cantine", False)),
                    "option_transport": bool(contenu.get("option_transport", False)),
                    "motif_statut": contenu.get("motif_statut", ""),
                    "observations": contenu.get("observations", ""),
                    "cree_le": contenu.get("cree_le", ""),
                    "modifie_le": contenu.get("modifie_le", ""),
                },
            )

        for ligne in donnees.get("enseignants", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            if etablissement is None:
                raise CommandError("Un enseignant possède un établissement invalide.")
            PersonnelEnseignant.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "code": contenu.get("code", contenu["id"]),
                    "nom_complet": contenu.get("nom_complet", ""),
                    "specialite": contenu.get("specialite", ""),
                    "type_contrat": contenu.get("type_contrat", "Contractuel"),
                    "telephone": contenu.get("telephone", ""),
                    "courriel": contenu.get("courriel", ""),
                    "ids_unites_assignees": contenu.get("ids_unites_assignees", []) or [],
                    "ids_elements_assignes": contenu.get("ids_elements_assignes", []) or [],
                    "heures_mensuelles": int(contenu.get("heures_mensuelles", 0) or 0),
                    "taux_horaire_ou_mensuel_htg": contenu.get(
                        "taux_horaire_ou_mensuel_htg",
                        0,
                    ),
                },
            )

        for ligne in donnees.get("notes", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            apprenant = Apprenant.objects.filter(
                id=contenu.get("id_apprenant"),
                etablissement=etablissement,
            ).first()
            element = ElementPedagogique.objects.filter(
                id=contenu.get("id_element"),
                etablissement=etablissement,
            ).first()
            if etablissement is None or apprenant is None or element is None:
                raise CommandError("Une note possède une relation invalide.")
            NoteEvaluation.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "apprenant": apprenant,
                    "element": element,
                    "libelle_periode": contenu.get("libelle_periode", ""),
                    "type_evaluation": contenu.get("type_evaluation", "Devoir"),
                    "note": contenu.get("note", 0),
                    "note_maximale": contenu.get("note_maximale", 100),
                    "verrouillee": bool(contenu.get("verrouillee", False)),
                    "enregistree_le": contenu.get("enregistree_le", ""),
                },
            )

        for ligne in donnees.get("presences", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            apprenant = Apprenant.objects.filter(
                id=contenu.get("id_apprenant"),
                etablissement=etablissement,
            ).first()
            unite = UniteAcademique.objects.filter(
                id=contenu.get("id_unite"),
                etablissement=etablissement,
            ).first()
            if etablissement is None or apprenant is None or unite is None:
                raise CommandError("Une présence possède une relation invalide.")
            Presence.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "apprenant": apprenant,
                    "unite": unite,
                    "date": contenu.get("date", ""),
                    "statut": contenu.get("statut", "PRESENT"),
                    "observation": contenu.get("observation", ""),
                },
            )

        for ligne in donnees.get("emplois_du_temps", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            unite = UniteAcademique.objects.filter(
                id=contenu.get("id_unite"),
                etablissement=etablissement,
            ).first()
            element = ElementPedagogique.objects.filter(
                id=contenu.get("id_element"),
                etablissement=etablissement,
            ).first()
            enseignant = PersonnelEnseignant.objects.filter(
                id=contenu.get("id_enseignant"),
                etablissement=etablissement,
            ).first()
            if etablissement is None or unite is None or element is None or enseignant is None:
                raise CommandError("Un créneau emploi du temps possède une relation invalide.")
            CreneauEmploiDuTemps.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "unite": unite,
                    "element": element,
                    "enseignant": enseignant,
                    "salle": contenu.get("salle", ""),
                    "jour_semaine": contenu.get("jour_semaine", "Lundi"),
                    "heure_debut": contenu.get("heure_debut", "08:00"),
                    "heure_fin": contenu.get("heure_fin", "09:00"),
                },
            )

        for ligne in donnees.get("evenements_calendrier", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            if etablissement is None:
                raise CommandError("Un événement possède un établissement invalide.")
            EvenementCalendrier.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "type": contenu.get("type", "EVENEMENT"),
                    "titre": contenu.get("titre", ""),
                    "date_debut": contenu.get("date_debut", ""),
                    "date_fin": contenu.get("date_fin", ""),
                    "concerne_unites": contenu.get("concerne_unites", ""),
                    "description": contenu.get("description", ""),
                },
            )

        for ligne in donnees.get("cahiers_textes", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            unite = UniteAcademique.objects.filter(
                id=contenu.get("id_unite"),
                etablissement=etablissement,
            ).first()
            element = ElementPedagogique.objects.filter(
                id=contenu.get("id_element"),
                etablissement=etablissement,
            ).first()
            if etablissement is None or unite is None or element is None:
                raise CommandError("Une entrée du cahier possède une relation invalide.")
            EntreeCahierTextes.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "unite": unite,
                    "element": element,
                    "nom_enseignant": contenu.get("nom_enseignant", ""),
                    "date": contenu.get("date", ""),
                    "sujet": contenu.get("sujet", ""),
                    "devoir_donne": contenu.get("devoir_donne", ""),
                },
            )

        for ligne in donnees.get("soutenances", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            apprenant = Apprenant.objects.filter(
                id=contenu.get("id_apprenant"),
                etablissement=etablissement,
            ).first()
            if etablissement is None or apprenant is None:
                raise CommandError("Une soutenance possède une relation invalide.")
            Soutenance.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "apprenant": apprenant,
                    "titre": contenu.get("titre", ""),
                    "nom_directeur_memoire": contenu.get("nom_directeur_memoire", ""),
                    "membres_jury": contenu.get("membres_jury", ""),
                    "date_soutenance": contenu.get("date_soutenance", ""),
                    "note": contenu.get("note"),
                    "statut": contenu.get("statut", "PLANIFIEE"),
                },
            )

        for ligne in donnees.get("paiements", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            apprenant = Apprenant.objects.filter(
                id=contenu.get("id_apprenant"),
                etablissement=etablissement,
            ).first()
            if etablissement is None or apprenant is None:
                raise CommandError("Un paiement possède une relation invalide.")
            Paiement.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "apprenant": apprenant,
                    "numero_recu": contenu.get("numero_recu", contenu["id"]),
                    "montant_htg": contenu.get("montant_htg", 0),
                    "mode_paiement": contenu.get("mode_paiement", "Espèces"),
                    "code_reference": contenu.get("code_reference", ""),
                    "libelle_compte_bancaire": contenu.get("libelle_compte_bancaire", ""),
                    "libelle": contenu.get("libelle", ""),
                    "paye_le": contenu.get("paye_le", ""),
                    "encaisse_par": contenu.get("encaisse_par", ""),
                    "statut": contenu.get("statut", "VALIDE"),
                },
            )

        for ligne in donnees.get("depenses", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            if etablissement is None:
                raise CommandError("Une dépense possède un établissement invalide.")
            Depense.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "categorie": contenu.get("categorie", "Autre"),
                    "description": contenu.get("description", ""),
                    "fournisseur": contenu.get("fournisseur", ""),
                    "montant_htg": contenu.get("montant_htg", 0),
                    "payee_le": contenu.get("payee_le", ""),
                    "enregistree_par": contenu.get("enregistree_par", ""),
                },
            )

        for ligne in donnees.get("paie", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            personnel = PersonnelEnseignant.objects.filter(
                id=contenu.get("id_personnel"),
                etablissement=etablissement,
            ).first()
            if etablissement is None or personnel is None:
                raise CommandError("Un bulletin de paie possède une relation invalide.")
            BulletinPaie.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "personnel": personnel,
                    "nom_personnel": contenu.get("nom_personnel", personnel.nom_complet),
                    "libelle_role": contenu.get("libelle_role", ""),
                    "libelle_mois": contenu.get("libelle_mois", ""),
                    "heures_travaillees": contenu.get("heures_travaillees", 0),
                    "salaire_base_htg": contenu.get("salaire_base_htg"),
                    "primes_htg": contenu.get("primes_htg"),
                    "motif_primes": contenu.get("motif_primes", ""),
                    "montant_brut_htg": contenu.get("montant_brut_htg", 0),
                    "retenues_htg": contenu.get("retenues_htg", 0),
                    "motif_retenues": contenu.get("motif_retenues", ""),
                    "montant_net_htg": contenu.get("montant_net_htg", 0),
                    "statut": contenu.get("statut", "EN_ATTENTE"),
                    "mode_paiement": contenu.get("mode_paiement", ""),
                    "observations": contenu.get("observations", ""),
                    "paye_le": contenu.get("paye_le", ""),
                    "cree_le": contenu.get("cree_le", ""),
                },
            )

        for ligne in donnees.get("abonnements", []) or []:
            contenu = dict(ligne)
            etablissement = etablissements.get(contenu.get("id_etablissement"))
            apprenant = Apprenant.objects.filter(
                id=contenu.get("id_apprenant"),
                etablissement=etablissement,
            ).first()
            if etablissement is None or apprenant is None:
                raise CommandError("Un abonnement possède une relation invalide.")
            AbonnementService.objects.update_or_create(
                id=contenu["id"],
                defaults={
                    "etablissement": etablissement,
                    "apprenant": apprenant,
                    "type_service": contenu.get("type_service", "Cantine"),
                    "tarif_mensuel_ou_annuel_htg": contenu.get(
                        "tarif_mensuel_ou_annuel_htg",
                        0,
                    ),
                    "actif": bool(contenu.get("actif", True)),
                    "ligne_ou_formule": contenu.get("ligne_ou_formule", ""),
                },
            )

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

        totaux_relationnels = {}
        for id_etablissement, etablissement in etablissements.items():
            totaux_relationnels[id_etablissement] = {
                "unites": UniteAcademique.objects.filter(etablissement=etablissement).count(),
                "elements": ElementPedagogique.objects.filter(etablissement=etablissement).count(),
                "apprenants": Apprenant.objects.filter(etablissement=etablissement).count(),
                "inscriptions": InscriptionApprenant.objects.filter(
                    etablissement=etablissement
                ).count(),
                "enseignants": PersonnelEnseignant.objects.filter(
                    etablissement=etablissement
                ).count(),
                "notes": NoteEvaluation.objects.filter(etablissement=etablissement).count(),
                "presences": Presence.objects.filter(etablissement=etablissement).count(),
                "emplois_du_temps": CreneauEmploiDuTemps.objects.filter(
                    etablissement=etablissement
                ).count(),
                "evenements_calendrier": EvenementCalendrier.objects.filter(
                    etablissement=etablissement
                ).count(),
                "cahiers_textes": EntreeCahierTextes.objects.filter(
                    etablissement=etablissement
                ).count(),
                "soutenances": Soutenance.objects.filter(etablissement=etablissement).count(),
                "paiements": Paiement.objects.filter(etablissement=etablissement).count(),
                "depenses": Depense.objects.filter(etablissement=etablissement).count(),
                "paie": BulletinPaie.objects.filter(etablissement=etablissement).count(),
                "abonnements": AbonnementService.objects.filter(
                    etablissement=etablissement
                ).count(),
            }
        for id_etablissement, totaux in totaux_relationnels.items():
            attendus = {
                "unites": sum(
                    1
                    for ligne in donnees.get("unites", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "elements": sum(
                    1
                    for ligne in donnees.get("elements", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "apprenants": sum(
                    1
                    for ligne in donnees.get("apprenants", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "inscriptions": sum(
                    1
                    for ligne in donnees.get("inscriptions", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "enseignants": sum(
                    1
                    for ligne in donnees.get("enseignants", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "notes": sum(
                    1
                    for ligne in donnees.get("notes", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "presences": sum(
                    1
                    for ligne in donnees.get("presences", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "emplois_du_temps": sum(
                    1
                    for ligne in donnees.get("emplois_du_temps", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "evenements_calendrier": sum(
                    1
                    for ligne in donnees.get("evenements_calendrier", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "cahiers_textes": sum(
                    1
                    for ligne in donnees.get("cahiers_textes", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "soutenances": sum(
                    1
                    for ligne in donnees.get("soutenances", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "paiements": sum(
                    1
                    for ligne in donnees.get("paiements", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "depenses": sum(
                    1
                    for ligne in donnees.get("depenses", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "paie": sum(
                    1
                    for ligne in donnees.get("paie", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
                "abonnements": sum(
                    1
                    for ligne in donnees.get("abonnements", [])
                    if ligne.get("id_etablissement") == id_etablissement
                ),
            }
            if totaux != attendus:
                raise CommandError(
                    "Vérification relationnelle échouée pour "
                    f"{id_etablissement}: attendu {attendus}, obtenu {totaux}."
                )

        self.stdout.write(
            self.style.SUCCESS(
                "Données de démonstration chargées : "
                f"{len(etablissements)} établissements, "
                f"{len(utilisateurs)} utilisateurs et "
                f"{nombre_enregistrements} enregistrements métier."
            )
        )
