import base64
from importlib import import_module
import json

from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core import mail
from django.db import connection
from django.test import TestCase, override_settings
from io import StringIO
from types import SimpleNamespace
from unittest.mock import patch
from rest_framework.test import APIClient
from comptes.models import (
    AffiliationEtablissement,
    JetonReinitialisation,
    SurchargePermissions,
)
from donnees.models import EnregistrementMetier, EntreeAuditApi, FichierTeleverse
from etablissements.models import (
    ConfigurationMarquePlateforme,
    Etablissement,
    HistoriqueAbonnementSaas,
)
from scolarite.models import (
    Apprenant,
    ElementPedagogique,
    InscriptionApprenant,
    UniteAcademique,
)
from pedagogie.models import (
    EvenementCalendrier,
    NoteEvaluation,
    PersonnelEnseignant,
)
from finances.models import BulletinPaie, DemandeConge, Depense, Paiement
from communication.models import (
    ArticleActualite,
    FilDiscussionDirecte,
    MessageCommunication,
    MessageDirect,
    Notification,
)
from documents.models import DocumentOfficiel
from services_annexes.models import (
    AncienEtudiant,
    ArticleInventaire,
    EmpruntBibliotheque,
    IncidentDiscipline,
    LivreBibliotheque,
    PartenaireStage,
    PretMateriel,
    VisiteInfirmerie,
)
from campus_numerique.models import DevoirLms, RemiseDevoir, RessourceLms
from securite.models import AttributionBadge, ConsentementRgpd, DemandeRgpd, LotImportation

Utilisateur = get_user_model()


def creer_client_api():
    client = APIClient(enforce_csrf_checks=True)
    reponse_csrf = client.get("/api/auth/csrf/")
    client.credentials(HTTP_X_CSRFTOKEN=reponse_csrf.json()["csrf_token"])
    return client


class TestsAuthentificationApi(TestCase):
    def setUp(self):
        cache.clear()
        self.client = creer_client_api()
        self.utilisateur = Utilisateur.objects.create_user(
            courriel="test@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Compte de test",
            role="ENSEIGNANT",
        )

    @override_settings(
        DEBUG=True,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_reinitialisation_unique_et_change_mot_de_passe(self):
        demande = self.client.post(
            "/api/auth/password/reset/",
            {"courriel": "test@example.org"},
            format="json",
        )
        self.assertEqual(demande.status_code, 200)
        token = demande.json().get("jeton_demo")
        self.assertTrue(token)

        confirmation = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "courriel": "test@example.org",
                "jeton": token,
                "nouveau_mot_de_passe": "NouveauMotDePasse-2026",
            },
            format="json",
        )
        self.assertEqual(confirmation.status_code, 200)
        self.utilisateur.refresh_from_db()
        self.assertTrue(self.utilisateur.check_password("NouveauMotDePasse-2026"))

        reuse = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "courriel": "test@example.org",
                "jeton": token,
                "nouveau_mot_de_passe": "EncoreAutre-2026",
            },
            format="json",
        )
        self.assertEqual(reuse.status_code, 404)

    @override_settings(
        DEBUG=False,
        SECURE_SSL_REDIRECT=False,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_reinitialisation_envoie_un_code_sans_le_retourner_en_production(self):
        mail.outbox.clear()
        demande = self.client.post(
            "/api/auth/password/reset/",
            {"courriel": "test@example.org"},
            format="json",
        )

        self.assertEqual(demande.status_code, 200)
        self.assertNotIn("jeton_demo", demande.json())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("code de réinitialisation", mail.outbox[0].body)
        self.assertRegex(mail.outbox[0].body, r"\b\d{6}\b")

    @override_settings(
        DEBUG=True,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_reinitialisation_refuse_un_mot_de_passe_trop_faible(self):
        demande = self.client.post(
            "/api/auth/password/reset/",
            {"courriel": "test@example.org"},
            format="json",
        )
        confirmation = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "courriel": "test@example.org",
                "jeton": demande.json()["jeton_demo"],
                "nouveau_mot_de_passe": "password123",
            },
            format="json",
        )

        self.assertEqual(confirmation.status_code, 400)
        self.utilisateur.refresh_from_db()
        self.assertTrue(self.utilisateur.check_password("MotDePasseDeTest-2026"))

    @override_settings(
        DEBUG=True,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_reinitialisation_verrouille_un_code_apres_cinq_essais_incorrects(self):
        demande = self.client.post(
            "/api/auth/password/reset/",
            {"courriel": "test@example.org"},
            format="json",
        )
        jeton = demande.json()["jeton_demo"]

        for _ in range(5):
            tentative = self.client.post(
                "/api/auth/password/reset/confirm/",
                {
                    "courriel": "test@example.org",
                    "jeton": "000000" if jeton != "000000" else "000001",
                    "nouveau_mot_de_passe": "NouveauMotDePasse-2026",
                },
                format="json",
            )
            self.assertEqual(tentative.status_code, 404)

        code = JetonReinitialisation.objects.get(utilisateur=self.utilisateur)
        self.assertEqual(code.tentatives_echouees, 5)
        self.assertIsNotNone(code.utilise_le)

    def test_connexion_est_limitee_en_debit(self):
        charge = {"courriel": "test@example.org", "password": "incorrect"}
        for _ in range(10):
            self.client.post("/api/auth/token/", charge, format="json")
        dernier = self.client.post("/api/auth/token/", charge, format="json")

        self.assertEqual(dernier.status_code, 429)
        self.assertIn("Trop de requêtes", dernier.json()["message"])

    def test_verrouillage_apres_tentatives_et_change_mot_de_passe(self):
        for _ in range(5):
            reponse = self.client.post(
                "/api/auth/token/",
                {"courriel": "test@example.org", "password": "incorrect"},
                format="json",
            )
            self.assertIn(reponse.status_code, {400, 401, 403})
        verrouille = self.client.post(
            "/api/auth/token/",
            {
                "courriel": "test@example.org",
                "password": "MotDePasseDeTest-2026",
            },
            format="json",
        )
        self.assertEqual(verrouille.status_code, 403)

        jetons = self.client.post(
            "/api/auth/token/",
            {
                "courriel": "test@example.org",
                "password": "MotDePasseDeTest-2026",
            },
            format="json",
        )
        self.assertEqual(jetons.status_code, 403)

    def test_sante_est_publique_et_en_francais(self):
        reponse = self.client.get("/api/sante/")

        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.json(), {"statut": "ok", "message": "API opérationnelle"})

    def test_connexion_jwt_et_profil_courant(self):
        reponse_jetons = self.client.post(
            "/api/auth/token/",
            {"courriel": "test@example.org", "password": "MotDePasseDeTest-2026"},
            format="json",
        )

        self.assertEqual(reponse_jetons.status_code, 200)
        self.assertNotIn("access", reponse_jetons.json())
        self.assertNotIn("refresh", reponse_jetons.json())
        self.assertTrue(reponse_jetons.cookies["klasik_access"]["httponly"])
        self.assertTrue(reponse_jetons.cookies["klasik_refresh"]["httponly"])

        reponse_profil = self.client.get("/api/auth/me/")

        self.assertEqual(reponse_profil.status_code, 200)
        self.assertEqual(reponse_profil.json()["courriel"], "test@example.org")
        self.assertEqual(reponse_profil.json()["role"], "ENSEIGNANT")

    def test_changement_obligatoire_est_limite_au_profil_et_au_changement_mdp(self):
        self.utilisateur.profil = {"doit_changer_mot_de_passe": True}
        self.utilisateur.save(update_fields=("profil",))
        connexion = self.client.post(
            "/api/auth/token/",
            {"courriel": "test@example.org", "password": "MotDePasseDeTest-2026"},
            format="json",
        )
        self.assertEqual(connexion.status_code, 200)

        profil = self.client.get("/api/auth/me/")
        acces_interdit = self.client.patch(
            "/api/auth/profile/",
            {"url_avatar": ""},
            format="json",
        )
        lecture_etablissements_interdite = self.client.get("/api/etablissements/")
        changement_identique = self.client.post(
            "/api/auth/password/change/",
            {"nouveau_mot_de_passe": "MotDePasseDeTest-2026"},
            format="json",
        )
        self.assertEqual(profil.status_code, 200)
        self.assertTrue(profil.json()["doit_changer_mot_de_passe"])
        self.assertEqual(acces_interdit.status_code, 403)
        self.assertEqual(lecture_etablissements_interdite.status_code, 403)
        self.assertEqual(changement_identique.status_code, 400)

        changement = self.client.post(
            "/api/auth/password/change/",
            {"nouveau_mot_de_passe": "NouveauMotDePasse-2026"},
            format="json",
        )
        acces_retabli = self.client.patch(
            "/api/auth/profile/",
            {"url_avatar": ""},
            format="json",
        )
        lecture_etablissements_retablie = self.client.get("/api/etablissements/")

        self.assertEqual(changement.status_code, 200, changement.data)
        self.assertEqual(acces_retabli.status_code, 200, acces_retabli.data)
        self.assertEqual(lecture_etablissements_retablie.status_code, 200)
        self.utilisateur.refresh_from_db()
        self.assertTrue(self.utilisateur.check_password("NouveauMotDePasse-2026"))
        self.assertFalse(self.utilisateur.profil["doit_changer_mot_de_passe"])

    def test_connexion_est_refusee_sans_jeton_csrf(self):
        client_sans_csrf = APIClient(enforce_csrf_checks=True)
        reponse = client_sans_csrf.post(
            "/api/auth/token/",
            {"courriel": "test@example.org", "password": "MotDePasseDeTest-2026"},
            format="json",
        )

        self.assertEqual(reponse.status_code, 403)

    def test_connexion_depuis_le_port_vite_est_autorisee_avec_csrf(self):
        origine_vite = "http://127.0.0.1:5173"
        self.assertIn(origine_vite, settings.CSRF_TRUSTED_ORIGINS)

        reponse = self.client.post(
            "/api/auth/token/",
            {"courriel": "test@example.org", "password": "MotDePasseDeTest-2026"},
            format="json",
            HTTP_ORIGIN=origine_vite,
        )

        self.assertEqual(reponse.status_code, 200, reponse.json())

    def test_cookie_de_session_exige_csrf_et_deconnexion_efface_les_cookies(self):
        connexion = self.client.post(
            "/api/auth/token/",
            {"courriel": "test@example.org", "password": "MotDePasseDeTest-2026"},
            format="json",
        )
        self.assertEqual(connexion.status_code, 200)

        self.client.credentials()
        sans_csrf = self.client.patch(
            "/api/auth/profile/",
            {"url_avatar": ""},
            format="json",
        )
        self.assertEqual(sans_csrf.status_code, 403)

        csrf = self.client.get("/api/auth/csrf/").json()["csrf_token"]
        self.client.credentials(HTTP_X_CSRFTOKEN=csrf)
        deconnexion = self.client.post("/api/auth/logout/", format="json")

        self.assertEqual(deconnexion.status_code, 204)
        self.assertEqual(deconnexion.cookies["klasik_access"]["max-age"], 0)
        self.assertEqual(deconnexion.cookies["klasik_refresh"]["max-age"], 0)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_connexion_superuser_par_courriel_sans_alias_rapide(self):
        superutilisateur = Utilisateur.objects.create_superuser(
            "administrateur@example.org",
            "MotDePasseSuperuser-2026",
        )

        reponse_jetons = self.client.post(
            "/api/auth/token/",
            {
                "courriel": "administrateur@example.org",
                "password": "MotDePasseSuperuser-2026",
            },
            format="json",
        )

        self.assertEqual(reponse_jetons.status_code, 200)
        profil = self.client.get("/api/auth/me/")
        self.assertEqual(profil.status_code, 200)
        self.assertEqual(profil.json()["id"], str(superutilisateur.id))

        alias_refuse = self.client.post(
            "/api/auth/token/",
            {"courriel": "superuser", "password": "MotDePasseSuperuser-2026"},
            format="json",
        )
        self.assertIn(alias_refuse.status_code, {401, 403})

    def test_superuser_peut_se_connecter_sans_affiliation(self):
        superutilisateur = Utilisateur.objects.create_superuser(
            "plateforme@example.org",
            "MotDePassePlateforme-2026",
        )
        reponse_jetons = self.client.post(
            "/api/auth/token/",
            {
                "courriel": "plateforme@example.org",
                "password": "MotDePassePlateforme-2026",
            },
            format="json",
        )
        self.assertEqual(reponse_jetons.status_code, 200)

        profil = self.client.get("/api/auth/me/")
        etablissements = self.client.get("/api/etablissements/")

        self.assertEqual(profil.status_code, 200)
        self.assertTrue(profil.json()["est_super_admin_plateforme"])
        self.assertEqual(profil.json()["affiliations"], [])
        self.assertEqual(etablissements.status_code, 200)
        self.assertEqual(etablissements.json(), [])

    def test_profil_courant_renvoie_les_affiliations_relationnelles(self):
        etablissement = Etablissement.objects.create(
            id="tenant-profil-auth",
            code="PROFIL-AUTH",
            nom="Établissement profil",
            nom_court="Profil",
            type="SCOLAIRE",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.utilisateur,
            etablissement=etablissement,
            role="ADMIN_ETAB",
            fonction_locale="Administrateur",
        )
        self.client.force_authenticate(self.utilisateur)

        reponse = self.client.get("/api/auth/me/")

        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(
            reponse.json()["affiliations"],
            [
                {
                    "id_etablissement": "tenant-profil-auth",
                    "id_role": "ADMIN_ETAB",
                    "fonction_locale": "Administrateur",
                }
            ],
        )

    def test_photo_profil_est_persistante_et_supprimable(self):
        self.client.force_authenticate(self.utilisateur)
        url_avatar = "data:image/jpeg;base64,/9j/2Q=="

        mise_a_jour = self.client.patch(
            "/api/auth/profile/",
            {"url_avatar": url_avatar},
            format="json",
        )
        profil = self.client.get("/api/auth/me/")

        self.assertEqual(mise_a_jour.status_code, 200)
        self.assertEqual(mise_a_jour.json()["url_avatar"], url_avatar)
        self.assertEqual(profil.json()["url_avatar"], url_avatar)
        self.utilisateur.refresh_from_db()
        self.assertEqual(self.utilisateur.profil["url_avatar"], url_avatar)

        suppression = self.client.patch(
            "/api/auth/profile/",
            {"url_avatar": None},
            format="json",
        )
        self.assertEqual(suppression.status_code, 200)
        self.assertIsNone(suppression.json()["url_avatar"])

    def test_modification_profil_persiste_le_nom_et_les_coordonnees(self):
        self.client.force_authenticate(self.utilisateur)
        modifications = self.client.patch(
            "/api/auth/profile/",
            {
                "nom_complet": "Nouveau nom",
                "courriel": "nouveau.nom@example.org",
                "telephone": "+509 3700-0000",
                "biographie": "Profil mis à jour",
                "ville": "Cap-Haïtien",
            },
            format="json",
        )
        profil = self.client.get("/api/auth/me/")

        self.assertEqual(modifications.status_code, 200, modifications.data)
        self.assertEqual(profil.status_code, 200)
        self.assertEqual(profil.json()["nom_complet"], "Nouveau nom")
        self.assertEqual(profil.json()["courriel"], "nouveau.nom@example.org")
        self.assertEqual(profil.json()["telephone"], "+509 3700-0000")
        self.assertEqual(profil.json()["biographie"], "Profil mis à jour")
        self.assertEqual(profil.json()["ville"], "Cap-Haïtien")
        self.utilisateur.refresh_from_db()
        self.assertEqual(self.utilisateur.nom_complet, "Nouveau nom")

    def test_lecture_de_la_configuration_publique_plateforme(self):
        url_logo = "data:image/png;base64,iVBORw0KGgo="
        ConfigurationMarquePlateforme.objects.create(
            url_logo=url_logo,
            nom_plateforme="Klasik Public",
            entite_legale="Klasik Public SAS",
        )
        client_anonyme = APIClient()

        reponse = client_anonyme.get("/api/plateforme/configuration/")

        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.json()["url_logo"], url_logo)
        self.assertEqual(reponse.json()["nom_plateforme"], "Klasik Public")
        self.assertEqual(reponse.json()["entite_legale"], "Klasik Public SAS")
        self.assertNotIn("cle", reponse.json())
        self.assertNotIn("modifie_le", reponse.json())

    def test_configuration_plateforme_est_persistante_et_reservee_au_superadmin(self):
        url_logo = "data:image/png;base64,iVBORw0KGgo="
        self.client.force_authenticate(self.utilisateur)
        refusee = self.client.patch(
            "/api/plateforme/configuration/",
            {"entite_legale": "Non autorisé"},
            format="json",
        )
        self.assertEqual(refusee.status_code, 403)

        superutilisateur = Utilisateur.objects.create_superuser(
            "marque.plateforme@example.org",
            "MotDePasseMarque-2026",
        )
        self.client.force_authenticate(superutilisateur)
        valeurs = {
            "nom_plateforme": "Klasik Personnalisé",
            "accroche_courte": "ERP international",
            "slogan": "Un slogan personnalisé",
            "titre_banniere": "Un titre personnalisé",
            "resume_pied_page": "Présentation mise à jour.",
            "horaires_support": "Lun–Ven · 09h–17h",
            "url_logo": url_logo,
            "initiales_logo": "KP",
            "couleur_marque": "indigo",
            "courriel_support": "aide@example.org",
            "telephone_support": "+509 3700-0000",
            "site_web": "https://example.org",
            "adresse_siege": "Port-au-Prince",
            "entite_legale": "Klasik Personnalisé SAS",
            "autoriser_creation_autonome": False,
        }
        modification = self.client.patch(
            "/api/plateforme/configuration/",
            valeurs,
            format="json",
        )
        lecture = self.client.get("/api/plateforme/configuration/")

        self.assertEqual(modification.status_code, 200, modification.json())
        self.assertEqual(lecture.status_code, 200)
        for champ, valeur in valeurs.items():
            self.assertEqual(lecture.json()[champ], valeur)

        configuration = ConfigurationMarquePlateforme.objects.get(pk="principale")
        self.assertEqual(configuration.nom_plateforme, valeurs["nom_plateforme"])
        self.assertEqual(configuration.entite_legale, valeurs["entite_legale"])
        self.assertFalse(configuration.autoriser_creation_autonome)

        effacement_logo = self.client.patch(
            "/api/plateforme/configuration/",
            {"url_logo": None},
            format="json",
        )
        self.assertEqual(effacement_logo.status_code, 200, effacement_logo.json())
        self.assertEqual(effacement_logo.json()["url_logo"], "")
        self.assertEqual(
            effacement_logo.json()["nom_plateforme"],
            valeurs["nom_plateforme"],
        )

        invalide = self.client.patch(
            "/api/plateforme/configuration/",
            {"site_web": "pas une url"},
            format="json",
        )
        self.assertEqual(invalide.status_code, 400)

    def test_creation_etablissement_accepte_un_logo_image_de_plus_de_500_caracteres(self):
        logo = "data:image/png;base64," + base64.b64encode(
            b"\x89PNG\r\n\x1a\n" + b"x" * 512
        ).decode("ascii")
        courriel_fondateur = "fondateur.logo@example.org"
        reponse = self.client.post(
            "/api/etablissements/",
            {
                "etablissement": {
                    "id": "tenant-logo-data-url",
                    "code": "LOGO-DATA",
                    "nom": "École logo data URL",
                    "type": "SCOLAIRE",
                    "code_pays": "HT",
                    "ville": "Port-au-Prince",
                    "telephone": "+509 3712 4567",
                    "url_logo": logo,
                    "devise_defaut": "HTG",
                    "services_actifs": {"bibliotheque": True},
                },
                "unites": [],
                "elements": [],
                "fondateur": {
                    "nom_complet": "Fondateur test",
                    "courriel": courriel_fondateur,
                    "telephone": "+509 3712 4567",
                    "mot_de_passe": "MotDePasseLogo-2026",
                },
            },
            format="json",
        )

        self.assertEqual(reponse.status_code, 201, reponse.json())
        self.assertEqual(reponse.json()["etablissement"]["url_logo"], logo)
        etablissement = Etablissement.objects.get(pk="tenant-logo-data-url")
        self.assertEqual(etablissement.url_logo, logo)

    def test_connexion_refuse_un_mot_de_passe_invalide_en_francais(self):
        reponse = self.client.post(
            "/api/auth/token/",
            {"courriel": "test@example.org", "password": "incorrect"},
            format="json",
        )
        compte_inconnu = self.client.post(
            "/api/auth/token/",
            {"courriel": "inconnu@example.org", "password": "incorrect"},
            format="json",
        )

        self.assertIn(reponse.status_code, {401, 403})
        self.assertIn("message", reponse.json())
        self.assertIn("identifiants incorrects", reponse.json()["message"].lower())
        self.assertEqual(reponse.json()["message"], compte_inconnu.json()["message"])

    def test_creer_compte_test_affiche_un_mot_de_passe_unique_et_force_son_changement(self):
        sortie = StringIO()
        call_command(
            "creer_compte_test",
            "compte.test@example.org",
            "ENSEIGNANT",
            stdout=sortie,
        )
        compte = Utilisateur.objects.get(courriel="compte.test@example.org")
        _, _, mot_de_passe_affiche = sortie.getvalue().partition(
            "Mot de passe temporaire (à noter, affiché une seule fois) : "
        )
        mot_de_passe = mot_de_passe_affiche.strip()

        self.assertTrue(mot_de_passe)
        self.assertEqual(sortie.getvalue().count("Mot de passe temporaire"), 1)
        self.assertTrue(compte.check_password(mot_de_passe))
        self.assertEqual(compte.role, "ENSEIGNANT")
        self.assertTrue(compte.profil["est_compte_demo"])
        self.assertTrue(compte.profil["doit_changer_mot_de_passe"])

    def test_profil_courant_refuse_une_requete_anonyme(self):
        reponse = self.client.get("/api/auth/me/")

        self.assertEqual(reponse.status_code, 401)
        self.assertIn("message", reponse.json())

    def test_connexion_demo_exige_opt_in_de_developpement_et_compte_seed(self):
        with override_settings(DEBUG=True, DEMO_PUBLIQUE_ACTIVE=False):
            refusee_sans_opt_in = self.client.post(
                "/api/auth/demo/",
                {"id_utilisateur": self.utilisateur.id},
                format="json",
            )
        self.assertEqual(refusee_sans_opt_in.status_code, 404)

        with override_settings(DEBUG=True, DEMO_PUBLIQUE_ACTIVE=True):
            refusee_compte_reel = self.client.post(
                "/api/auth/demo/",
                {"id_utilisateur": self.utilisateur.id},
                format="json",
            )
        self.assertEqual(refusee_compte_reel.status_code, 404)

        call_command("seed_demo", stdout=StringIO())
        compte_demo = Utilisateur.objects.get(pk="usr-super")
        with override_settings(DEBUG=True, DEMO_PUBLIQUE_ACTIVE=True):
            reponse = self.client.post(
                "/api/auth/demo/",
                {"id_utilisateur": compte_demo.id},
                format="json",
            )
        self.assertEqual(reponse.status_code, 200)
        self.assertNotIn("access", reponse.json())
        self.assertNotIn("refresh", reponse.json())
        self.assertTrue(reponse.cookies["klasik_access"]["httponly"])
        self.assertTrue(reponse.cookies["klasik_refresh"]["httponly"])

        with override_settings(DEBUG=False, DEMO_PUBLIQUE_ACTIVE=True):
            reponse_production = self.client.post(
                "/api/auth/demo/",
                {"id_utilisateur": compte_demo.id},
                format="json",
            )

        self.assertEqual(reponse_production.status_code, 404)

    def test_connexion_google_verifie_audience_et_cree_un_compte_sans_mot_de_passe(self):
        revendications = {
            "email": "google.nouveau@example.org",
            "email_verified": True,
            "sub": "google-sub-nouveau",
            "name": "Nouvel utilisateur Google",
        }
        with override_settings(DJANGO_GOOGLE_CLIENT_ID="client-id.apps.googleusercontent.com"):
            with patch(
                "google.oauth2.id_token.verify_oauth2_token",
                return_value=revendications,
            ) as verifier:
                reponse = self.client.post(
                    "/api/auth/google/",
                    {"id_token": "jeton-google-valide"},
                    format="json",
                )

        self.assertEqual(reponse.status_code, 200, reponse.data)
        verifier.assert_called_once()
        self.assertEqual(
            verifier.call_args.kwargs["audience"],
            "client-id.apps.googleusercontent.com",
        )
        utilisateur = Utilisateur.objects.get(courriel="google.nouveau@example.org")
        self.assertTrue(utilisateur.courriel_verifie)
        self.assertFalse(utilisateur.has_usable_password())
        self.assertEqual(utilisateur.profil["google_sub"], "google-sub-nouveau")
        self.assertEqual(utilisateur.nom_complet, "Nouvel utilisateur Google")
        self.assertEqual(utilisateur.affiliations.count(), 0)
        self.assertNotIn("access", reponse.json())
        self.assertNotIn("refresh", reponse.json())
        self.assertTrue(reponse.cookies["klasik_access"]["httponly"])
        self.assertTrue(reponse.cookies["klasik_refresh"]["httponly"])

    def test_connexion_google_lie_un_compte_existant_a_une_identite_verifiee(self):
        revendications = {
            "email": self.utilisateur.courriel,
            "email_verified": True,
            "sub": "google-sub-existant",
        }
        with override_settings(DJANGO_GOOGLE_CLIENT_ID="client-id.apps.googleusercontent.com"):
            with patch(
                "google.oauth2.id_token.verify_oauth2_token",
                return_value=revendications,
            ):
                reponse = self.client.post(
                    "/api/auth/google/",
                    {"id_token": "jeton-google-valide"},
                    format="json",
                )

        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.utilisateur.refresh_from_db()
        self.assertTrue(self.utilisateur.courriel_verifie)
        self.assertEqual(self.utilisateur.profil["google_sub"], "google-sub-existant")
        self.assertTrue(self.utilisateur.check_password("MotDePasseDeTest-2026"))

    def test_connexion_google_refuse_un_compte_desactive(self):
        self.utilisateur.is_active = False
        self.utilisateur.save(update_fields=("is_active",))
        with override_settings(DJANGO_GOOGLE_CLIENT_ID="client-id.apps.googleusercontent.com"):
            with patch(
                "google.oauth2.id_token.verify_oauth2_token",
                return_value={
                    "email": self.utilisateur.courriel,
                    "email_verified": True,
                    "sub": "google-sub-desactive",
                },
            ):
                reponse = self.client.post(
                    "/api/auth/google/",
                    {"id_token": "jeton-google-valide"},
                    format="json",
                )

        self.assertEqual(reponse.status_code, 403)
        self.utilisateur.refresh_from_db()
        self.assertNotIn("google_sub", self.utilisateur.profil)
        self.assertNotIn("klasik_access", reponse.cookies)

    def test_connexion_google_refuse_si_tous_les_etablissements_sont_suspendus(self):
        etablissement = Etablissement.objects.create(
            id="tenant-google-suspendu",
            code="GOOGLE-SUSPENDU",
            nom="Établissement suspendu",
            type="SCOLAIRE",
            est_actif=False,
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.utilisateur,
            etablissement=etablissement,
            role="ENSEIGNANT",
        )
        with override_settings(DJANGO_GOOGLE_CLIENT_ID="client-id.apps.googleusercontent.com"):
            with patch(
                "google.oauth2.id_token.verify_oauth2_token",
                return_value={
                    "email": self.utilisateur.courriel,
                    "email_verified": True,
                    "sub": "google-sub-suspendu",
                },
            ):
                reponse = self.client.post(
                    "/api/auth/google/",
                    {"id_token": "jeton-google-valide"},
                    format="json",
                )

        self.assertEqual(reponse.status_code, 403)
        self.utilisateur.refresh_from_db()
        self.assertNotIn("google_sub", self.utilisateur.profil)
        self.assertNotIn("klasik_access", reponse.cookies)

    def test_connexion_google_autorisee_si_au_moins_un_etablissement_est_actif(self):
        etablissement_suspendu = Etablissement.objects.create(
            id="tenant-google-suspendu-multi",
            code="GOOGLE-SUSPENDU-MULTI",
            nom="Établissement suspendu multi",
            type="SCOLAIRE",
            est_actif=False,
        )
        etablissement_actif = Etablissement.objects.create(
            id="tenant-google-actif-multi",
            code="GOOGLE-ACTIF-MULTI",
            nom="Établissement actif multi",
            type="SCOLAIRE",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.utilisateur,
            etablissement=etablissement_suspendu,
            role="ENSEIGNANT",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.utilisateur,
            etablissement=etablissement_actif,
            role="ENSEIGNANT",
        )
        with override_settings(DJANGO_GOOGLE_CLIENT_ID="client-id.apps.googleusercontent.com"):
            with patch(
                "google.oauth2.id_token.verify_oauth2_token",
                return_value={
                    "email": self.utilisateur.courriel,
                    "email_verified": True,
                    "sub": "google-sub-multi",
                },
            ):
                reponse = self.client.post(
                    "/api/auth/google/",
                    {"id_token": "jeton-google-valide"},
                    format="json",
                )

        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertIn("klasik_access", reponse.cookies)

    def test_connexion_google_refuse_compte_non_verifie_audience_absente_et_autre_sujet_lie(self):
        with override_settings(DJANGO_GOOGLE_CLIENT_ID="client-id.apps.googleusercontent.com"):
            with patch(
                "google.oauth2.id_token.verify_oauth2_token",
                return_value={
                    "email": "google.non.verifie@example.org",
                    "email_verified": False,
                    "sub": "google-sub-non-verifie",
                },
            ):
                non_verifie = self.client.post(
                    "/api/auth/google/",
                    {"id_token": "jeton-google-valide"},
                    format="json",
                )
        self.assertEqual(non_verifie.status_code, 403)
        self.assertFalse(
            Utilisateur.objects.filter(courriel="google.non.verifie@example.org").exists()
        )

        with override_settings(DJANGO_GOOGLE_CLIENT_ID=""):
            with patch("google.oauth2.id_token.verify_oauth2_token") as verifier:
                non_configure = self.client.post(
                    "/api/auth/google/",
                    {"id_token": "jeton-google-valide"},
                    format="json",
                )
        self.assertEqual(non_configure.status_code, 503)
        verifier.assert_not_called()

        self.utilisateur.profil = {"google_sub": "google-sub-different"}
        self.utilisateur.save(update_fields=("profil",))
        with override_settings(DJANGO_GOOGLE_CLIENT_ID="client-id.apps.googleusercontent.com"):
            with patch(
                "google.oauth2.id_token.verify_oauth2_token",
                return_value={
                    "email": self.utilisateur.courriel,
                    "email_verified": True,
                    "sub": "google-sub-autre",
                },
            ):
                sujet_different = self.client.post(
                    "/api/auth/google/",
                    {"id_token": "jeton-google-valide"},
                    format="json",
                )
        self.assertEqual(sujet_different.status_code, 403)

    def test_jeton_de_renouvellement_est_rotatif(self):
        reponse_jetons = self.client.post(
            "/api/auth/token/",
            {"courriel": "test@example.org", "password": "MotDePasseDeTest-2026"},
            format="json",
        )
        ancien_refresh = reponse_jetons.cookies["klasik_refresh"].value

        reponse_renouvellement = self.client.post(
            "/api/auth/token/refresh/",
            format="json",
        )

        self.assertEqual(reponse_renouvellement.status_code, 200)
        self.assertNotIn("access", reponse_renouvellement.json())
        self.assertNotIn("refresh", reponse_renouvellement.json())
        self.assertNotEqual(
            reponse_renouvellement.cookies["klasik_refresh"].value,
            ancien_refresh,
        )

    def test_schema_openapi_est_accessible(self):
        reponse = self.client.get("/api/schema/?format=json")

        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(json.loads(reponse.content)["openapi"], "3.0.3")


class TestsApiMultitenant(TestCase):
    def setUp(self):
        self.client = creer_client_api()
        self.etablissement = Etablissement.objects.create(
            id="tenant-scolaire-a",
            code="ECOLE-A",
            nom="École A",
            nom_court="A",
            type="SCOLAIRE",
        )
        self.autre_etablissement = Etablissement.objects.create(
            id="tenant-scolaire-b",
            code="ECOLE-B",
            nom="École B",
            nom_court="B",
            type="SCOLAIRE",
        )
        self.utilisateur = Utilisateur.objects.create_user(
            courriel="gestionnaire@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Gestionnaire de test",
            role="DIRECTEUR",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.utilisateur,
            etablissement=self.etablissement,
            role="ADMIN_ETAB",
        )
        self.client.force_authenticate(self.utilisateur)

    def ajouter_apprenant(self, tenant, identifiant):
        return EnregistrementMetier.objects.create(
            etablissement=tenant,
            collection="apprenants",
            id_objet=identifiant,
            donnees={
                "id": identifiant,
                "id_etablissement": tenant.id,
                "prenom": "Élève",
                "nom": identifiant,
                "id_unite": "unite-a",
            },
        )

    def test_liste_et_detail_restent_dans_le_tenant_autorise(self):
        self.ajouter_apprenant(self.etablissement, "a-1")
        self.ajouter_apprenant(self.autre_etablissement, "b-1")

        liste = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/donnees/apprenants/"
        )
        autre_tenant = self.client.get(
            f"/api/etablissements/{self.autre_etablissement.id}/donnees/apprenants/"
        )
        detail_autre_tenant = self.client.get(
            f"/api/etablissements/{self.autre_etablissement.id}/donnees/apprenants/b-1/"
        )

        self.assertEqual(liste.status_code, 200)
        self.assertEqual([ligne["id"] for ligne in liste.json()["results"]], ["a-1"])
        self.assertEqual(autre_tenant.status_code, 403)
        self.assertEqual(detail_autre_tenant.status_code, 403)

    def test_creation_refuse_un_id_etablissement_falsifie(self):
        reponse = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/donnees/apprenants/",
            {
                "id": "apprenant-injecte",
                "id_etablissement": self.autre_etablissement.id,
                "prenom": "Élève",
            },
            format="json",
        )

        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(EnregistrementMetier.objects.count(), 0)

    def test_auditeur_ne_peut_pas_modifier_les_donnees(self):
        AffiliationEtablissement.objects.filter(utilisateur=self.utilisateur).update(role="AUDITEUR")

        reponse = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/donnees/apprenants/",
            {"id": "apprenant-interdit", "prenom": "Élève"},
            format="json",
        )

        self.assertEqual(reponse.status_code, 403)
        self.assertEqual(EnregistrementMetier.objects.count(), 0)

    def test_parent_ne_voit_que_les_apprenants_associes(self):
        self.ajouter_apprenant(self.etablissement, "enfant-lie")
        self.ajouter_apprenant(self.etablissement, "enfant-autre")
        self.utilisateur.profil = {"ids_apprenants_lies": ["enfant-lie"]}
        self.utilisateur.save(update_fields=("profil",))
        AffiliationEtablissement.objects.filter(utilisateur=self.utilisateur).update(role="PARENT")

        reponse = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/donnees/apprenants/"
        )

        self.assertEqual(reponse.status_code, 200)
        self.assertEqual([ligne["id"] for ligne in reponse.json()["results"]], ["enfant-lie"])

    def test_creation_modification_et_suppression_api(self):
        base = f"/api/etablissements/{self.etablissement.id}/donnees/apprenants/"
        donnees = {
            "id": "apprenant-crud",
            "id_etablissement": self.etablissement.id,
            "prenom": "Élève",
            "nom": "Initial",
            "id_unite": "unite-a",
        }
        creation = self.client.post(base, donnees, format="json")
        modification = self.client.patch(
            f"{base}apprenant-crud/",
            {"nom": "Modifié"},
            format="json",
        )
        suppression = self.client.delete(f"{base}apprenant-crud/")

        self.assertEqual(creation.status_code, 201)
        self.assertEqual(modification.status_code, 200)
        self.assertEqual(modification.json()["nom"], "Modifié")
        self.assertEqual(suppression.status_code, 204)
        entree_audit = EntreeAuditApi.objects.get(id_objet="apprenant-crud", action="SUPPRESSION")
        self.assertEqual(entree_audit.nom_acteur, self.utilisateur.nom_complet)
        self.assertEqual(entree_audit.role_acteur, "ADMIN_ETAB")
        self.assertFalse(
            EnregistrementMetier.objects.filter(
                etablissement=self.etablissement,
                collection="apprenants",
                id_objet="apprenant-crud",
            ).exists()
        )

    def test_connexion_demo_refuse_un_etablissement_non_affilie(self):
        self.utilisateur.profil = {"est_compte_demo": True}
        self.utilisateur.save(update_fields=["profil"])
        with override_settings(DEBUG=True, DEMO_PUBLIQUE_ACTIVE=True):
            reponse = self.client.post(
                "/api/auth/demo/",
                {
                    "id_utilisateur": self.utilisateur.id,
                    "id_etablissement": self.autre_etablissement.id,
                },
                format="json",
            )

        self.assertEqual(reponse.status_code, 403)

    def test_surcharge_permissions_est_tenant_scopee_et_auditee(self):
        base = f"/api/etablissements/{self.etablissement.id}/permissions/"
        modification = self.client.put(
            base,
            {
                "role": "ENSEIGNANT",
                "permissions": ["pedagogie:voir", "campus_numerique:voir"],
            },
            format="json",
        )
        lecture = self.client.get(base)

        self.assertEqual(modification.status_code, 200)
        self.assertEqual(
            modification.json()["permissions"],
            ["pedagogie:voir", "campus_numerique:voir"],
        )
        self.assertEqual(
            lecture.json()["permissions"]["ENSEIGNANT"],
            ["pedagogie:voir", "campus_numerique:voir"],
        )
        self.assertTrue(
            SurchargePermissions.objects.filter(
                etablissement=self.etablissement,
                role="ENSEIGNANT",
            ).exists()
        )
        self.assertTrue(
            EntreeAuditApi.objects.filter(
                etablissement=self.etablissement,
                utilisateur=self.utilisateur,
                action="MODIFICATION",
                collection="roles",
                id_objet="ENSEIGNANT",
            ).exists()
        )

    def test_surcharge_permissions_refuse_un_role_sans_droit_et_un_tenant_externe(self):
        AffiliationEtablissement.objects.filter(utilisateur=self.utilisateur).update(role="AUDITEUR")
        sans_droit = self.client.put(
            f"/api/etablissements/{self.etablissement.id}/permissions/",
            {"role": "ENSEIGNANT", "permissions": ["pedagogie:voir"]},
            format="json",
        )
        autre_tenant = self.client.get(
            f"/api/etablissements/{self.autre_etablissement.id}/permissions/"
        )

        self.assertEqual(sans_droit.status_code, 403)
        self.assertEqual(autre_tenant.status_code, 403)
        self.assertFalse(SurchargePermissions.objects.exists())

    def test_liste_utilisateurs_limitee_a_etablissement_et_a_permission(self):
        utilisateur_multi_etablissement = Utilisateur.objects.create_user(
            courriel="multi-etablissement@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Compte multi-établissements",
            role="ADMIN_ETAB",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=utilisateur_multi_etablissement,
            etablissement=self.etablissement,
            role="SCOLARITE",
            fonction_locale="Scolarité",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=utilisateur_multi_etablissement,
            etablissement=self.autre_etablissement,
            role="DIRECTEUR",
            fonction_locale="Direction",
        )

        reponse = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/utilisateurs/"
        )

        self.assertEqual(reponse.status_code, 200, reponse.data)
        comptes_recus = reponse.json()
        self.assertTrue(
            any(
                ligne["id"] == str(utilisateur_multi_etablissement.id)
                for ligne in comptes_recus
            ),
            comptes_recus,
        )
        compte = next(
            ligne
            for ligne in comptes_recus
            if ligne["id"] == str(utilisateur_multi_etablissement.id)
        )
        self.assertEqual(
            compte["affiliations"],
            [
                {
                    "id_etablissement": self.etablissement.id,
                    "id_role": "SCOLARITE",
                    "fonction_locale": "Scolarité",
                }
            ],
        )
        self.assertEqual(compte["mot_de_passe_demo"], "")
        self.assertNotIn("password", compte)

        AffiliationEtablissement.objects.filter(utilisateur=self.utilisateur).update(role="AUDITEUR")
        reponse_interdite = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/utilisateurs/"
        )
        self.assertEqual(reponse_interdite.status_code, 403)

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DJANGO_FRONTEND_URL="https://app.example.org",
        DEFAULT_FROM_EMAIL="noreply@example.org",
    )
    def test_creation_modification_et_retrait_compte_tenant(self):
        mail.outbox.clear()
        base = f"/api/etablissements/{self.etablissement.id}/utilisateurs/"
        creation = self.client.post(
            base,
            {
                "nom_complet": "Nouvel utilisateur",
                "courriel": "nouvel.utilisateur@example.org",
                "telephone": "+509 3700-0000",
                "id_role": "SCOLARITE",
                "fonction_locale": "Agent de scolarité",
                "mot_de_passe": "MotDePasseSolide-2026",
                "double_facteur_actif": True,
                "doit_changer_mot_de_passe": True,
            },
            format="json",
        )

        self.assertEqual(creation.status_code, 201)
        utilisateur = Utilisateur.objects.get(courriel="nouvel.utilisateur@example.org")
        self.assertTrue(utilisateur.check_password("MotDePasseSolide-2026"))
        self.assertNotIn("mot_de_passe", creation.json())
        self.assertEqual(creation.json()["mot_de_passe_demo"], "")
        self.assertEqual(len(mail.outbox), 1)
        invitation = mail.outbox[0]
        self.assertIn(self.etablissement.nom, invitation.subject)
        self.assertIn(self.etablissement.nom, invitation.body)
        self.assertIn("Agent d’inscription / Scolarité", invitation.body)
        self.assertIn("Agent de scolarité", invitation.body)
        self.assertIn("https://app.example.org/", invitation.body)
        self.assertIn("obligatoirement", invitation.body)
        self.assertNotIn("MotDePasseSolide-2026", invitation.body)

        modification = self.client.patch(
            f"{base}{utilisateur.id}/",
            {
                "id_role": "ADMIN_ETAB",
                "fonction_locale": "Administrateur",
                "doit_changer_mot_de_passe": False,
            },
            format="json",
        )
        self.assertEqual(modification.status_code, 200)
        self.assertEqual(modification.json()["affiliations"][0]["id_role"], "ADMIN_ETAB")
        self.assertFalse(modification.json()["doit_changer_mot_de_passe"])

        retrait = self.client.delete(f"{base}{utilisateur.id}/")
        self.assertEqual(retrait.status_code, 204)
        self.assertFalse(
            AffiliationEtablissement.objects.filter(
                utilisateur=utilisateur,
                etablissement=self.etablissement,
            ).exists()
        )

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DJANGO_FRONTEND_URL="https://app.example.org",
    )
    @patch("api.tenant_views.send_mail", side_effect=OSError("SMTP indisponible"))
    def test_echec_courriel_annule_la_creation_du_compte(self, envoyer):
        reponse = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/utilisateurs/",
            {
                "nom_complet": "Invitation sans courriel",
                "courriel": "sans-courriel@example.org",
                "id_role": "SCOLARITE",
                "mot_de_passe": "MotDePasseSolide-2026",
                "doit_changer_mot_de_passe": True,
            },
            format="json",
        )

        self.assertEqual(reponse.status_code, 503)
        self.assertFalse(
            Utilisateur.objects.filter(courriel="sans-courriel@example.org").exists()
        )

    def test_gestion_compte_refuse_la_suspension_globale_multitenant(self):
        compte_multi = Utilisateur.objects.create_user(
            courriel="compte.multi@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Compte multi",
            role="ADMIN_ETAB",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=compte_multi,
            etablissement=self.etablissement,
            role="SCOLARITE",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=compte_multi,
            etablissement=self.autre_etablissement,
            role="SCOLARITE",
        )

        reponse = self.client.patch(
            f"/api/etablissements/{self.etablissement.id}/utilisateurs/{compte_multi.id}/",
            {"est_actif": False},
            format="json",
        )

        self.assertEqual(reponse.status_code, 400)
        compte_multi.refresh_from_db()
        self.assertTrue(compte_multi.is_active)

    def test_gestion_compte_suspend_et_reactive_un_compte_tenant(self):
        compte = Utilisateur.objects.create_user(
            courriel="compte.suspendu@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Compte à suspendre",
            role="SCOLARITE",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=compte,
            etablissement=self.etablissement,
            role="SCOLARITE",
        )
        url = f"/api/etablissements/{self.etablissement.id}/utilisateurs/{compte.id}/"

        suspension = self.client.patch(url, {"est_actif": False}, format="json")
        compte.refresh_from_db()
        reactivation = self.client.patch(url, {"est_actif": True}, format="json")
        compte.refresh_from_db()

        self.assertEqual(suspension.status_code, 200, suspension.data)
        self.assertFalse(suspension.json()["est_actif"])
        self.assertEqual(reactivation.status_code, 200, reactivation.data)
        self.assertTrue(compte.is_active)

    def test_modification_etablissement_est_autorisee_et_tenant_scopee(self):
        modification = self.client.patch(
            f"/api/etablissements/{self.etablissement.id}/",
            {"ville": "Cap-Haïtien", "statut": "SUSPENDU"},
            format="json",
        )
        modification_autre_tenant = self.client.patch(
            f"/api/etablissements/{self.autre_etablissement.id}/",
            {"ville": "Ville non autorisée"},
            format="json",
        )

        self.assertEqual(modification.status_code, 200)
        self.assertEqual(modification.json()["ville"], "Cap-Haïtien")
        self.assertEqual(modification.json()["statut"], "SUSPENDU")
        self.assertEqual(modification_autre_tenant.status_code, 403)
        donnees_suspendues = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/utilisateurs/"
        )
        self.assertEqual(donnees_suspendues.status_code, 403)
        enseignant = Utilisateur.objects.create_user(
            courriel="enseignant-suspendu@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Enseignant suspendu",
            role="ENSEIGNANT",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=enseignant,
            etablissement=self.etablissement,
            role="ENSEIGNANT",
        )
        self.client.force_authenticate(enseignant)
        modification_enseignant = self.client.patch(
            f"/api/etablissements/{self.etablissement.id}/",
            {"statut": "ACTIF"},
            format="json",
        )
        self.assertEqual(modification_enseignant.status_code, 403)
        self.client.force_authenticate(self.utilisateur)
        self.etablissement.refresh_from_db()
        self.assertEqual(self.etablissement.configuration["ville"], "Cap-Haïtien")
        self.assertFalse(self.etablissement.est_actif)
        statut_invalide = self.client.patch(
            f"/api/etablissements/{self.etablissement.id}/",
            {"statut": []},
            format="json",
        )
        self.assertEqual(statut_invalide.status_code, 400)

    def test_journal_audit_est_tenant_scopee_et_refuse_un_role_sans_droit(self):
        EntreeAuditApi.objects.create(
            etablissement=self.etablissement,
            utilisateur=self.utilisateur,
            nom_acteur="Gestionnaire au moment de l’action",
            role_acteur="ADMIN_ETAB",
            action="MODIFICATION",
            collection="roles",
            id_objet="ENSEIGNANT",
        )

        journal = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/audit/"
        )
        autre_tenant = self.client.get(
            f"/api/etablissements/{self.autre_etablissement.id}/audit/"
        )

        self.assertEqual(journal.status_code, 200)
        entree = journal.json()[0]
        self.assertEqual(entree["id_etablissement"], self.etablissement.id)
        self.assertEqual(entree["nom_acteur"], "Gestionnaire au moment de l’action")
        self.assertEqual(entree["role_acteur"], "ADMIN_ETAB")
        self.assertEqual(entree["action"], "MODIFICATION")
        self.assertEqual(entree["cible"], "roles:ENSEIGNANT")
        self.assertEqual(entree["categorie"], "RBAC")
        self.assertTrue(entree["horodatage"])
        self.assertEqual(autre_tenant.status_code, 403)

        AffiliationEtablissement.objects.filter(utilisateur=self.utilisateur).update(role="ENSEIGNANT")
        role_sans_audit = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/audit/"
        )
        self.assertEqual(role_sans_audit.status_code, 403)


class TestsCreationEtablissementApi(TestCase):
    def setUp(self):
        cache.clear()
        self.client = creer_client_api()
        self.payload = {
            "etablissement": {
                "id": "tenant-cree-api",
                "code": "ECOLE1",
                "nom": "École créée par API",
                "nom_court": "École API",
                "type": "SCOLAIRE",
                "code_pays": "FR",
                "nom_pays": "France",
                "fuseau_horaire": "Europe/Paris",
                "autorite_tutelle": "Éducation nationale",
                "ville": "Paris",
                "adresse": "12 rue de test",
                "telephone": "+33102030405",
                "courriel": "fondatrice@example.org",
                "annee_academique": "2026–2027",
                "libelle_periode_courante": "Premier trimestre",
                "devise_defaut": "EUR",
                "taux_change_usd": 132,
                "format_matricule": "ECO-26-{SEQ}",
                "echelle_notation": 20,
                "note_passage": 10,
                "couleur_accent": "blue",
                "devise_etablissement": "Savoir et ouverture",
                "titre_direction": "Directrice",
                "nom_direction": "Fondatrice de test",
                "code_sceau": "SCEAU-ECOLE1",
                "services_actifs": {
                    "bibliotheque": True,
                    "cantine": True,
                    "transport": False,
                    "infirmerie": True,
                    "anciens": True,
                },
                "offre_saas": "Gratuit",
                "statut_abonnement_saas": "GRATUIT",
                "bloquer_documents_si_impaye": True,
            },
            "fondateur": {
                "nom_complet": "Fondatrice de test",
                "courriel": "fondatrice@example.org",
                "telephone": "+33102030405",
                "mot_de_passe": "Soleil-Orange-4826!",
            },
            "unites": [
                {
                    "id": "unite-creee-api",
                    "id_etablissement": "tenant-cree-api",
                    "code": "ECO-01",
                    "nom": "Cycle secondaire",
                    "categorie": "Secondaire",
                    "niveau_ou_duree": "Annuel",
                    "capacite": 35,
                    "frais_scolarite_htg": 25000,
                    "frais_inscription_htg": 1000,
                    "repartition_facturation": "Trois tranches",
                    "responsable_nom": "Fondatrice de test",
                }
            ],
            "elements": [
                {
                    "id": "element-cree-api",
                    "id_etablissement": "tenant-cree-api",
                    "id_unite": "unite-creee-api",
                    "code": "ECO-MAT1",
                    "nom": "Mathématiques",
                    "nature": "MATIERE",
                    "coefficient_ou_credits": 3,
                    "volume_horaire_total": 60,
                    "id_enseignant": "",
                    "libelle_periode": "Premier trimestre",
                }
            ],
        }

    def test_creation_anonyme_cree_tenant_fondateur_et_structure_relationnelle(self):
        reponse = self.client.post("/api/etablissements/", self.payload, format="json")

        self.assertEqual(reponse.status_code, 201, reponse.data)
        etablissement = Etablissement.objects.get(pk="tenant-cree-api")
        fondatrice = Utilisateur.objects.get(courriel="fondatrice@example.org")
        self.assertTrue(fondatrice.check_password("Soleil-Orange-4826!"))
        self.assertTrue(
            AffiliationEtablissement.objects.filter(
                utilisateur=fondatrice,
                etablissement=etablissement,
                role="DIRECTEUR",
            ).exists()
        )
        self.assertEqual(etablissement.proprietaire_id, fondatrice.id)
        self.assertEqual(
            HistoriqueAbonnementSaas.objects.filter(etablissement=etablissement).count(),
            1,
        )
        self.assertEqual(UniteAcademique.objects.filter(etablissement=etablissement).count(), 1)
        self.assertEqual(
            ElementPedagogique.objects.filter(etablissement=etablissement).count(),
            1,
        )
        self.assertEqual(
            EvenementCalendrier.objects.filter(etablissement=etablissement).count(),
            3,
        )
        self.assertEqual(reponse.json()["etablissement"]["ville"], "Paris")
        self.assertNotIn("mot_de_passe", reponse.json()["profil"])
        self.assertNotIn("access", reponse.json())
        self.assertNotIn("refresh", reponse.json())
        self.assertTrue(reponse.cookies["klasik_access"]["httponly"])
        self.assertTrue(reponse.cookies["klasik_refresh"]["httponly"])

        profil = self.client.get("/api/auth/me/")
        self.assertEqual(profil.status_code, 200)
        self.assertEqual(profil.json()["id"], fondatrice.id)

    def test_creation_authentifiee_reutilise_le_compte_et_verifie_le_courriel(self):
        utilisateur = Utilisateur.objects.create_user(
            courriel="fondateur.existant@example.org",
            password="MotDePasseExistant-2026",
            nom_complet="Fondateur existant",
            role="AUDITEUR",
        )
        self.client.force_authenticate(utilisateur)
        payload = {
            **self.payload,
            "fondateur": {
                **self.payload["fondateur"],
                "nom_complet": utilisateur.nom_complet,
                "courriel": utilisateur.courriel,
                "mot_de_passe": "",
            },
        }

        reponse = self.client.post("/api/etablissements/", payload, format="json")

        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertEqual(Utilisateur.objects.filter(courriel__iexact=utilisateur.courriel).count(), 1)
        self.assertTrue(utilisateur.check_password("MotDePasseExistant-2026"))
        self.assertNotIn("access", reponse.json())
        self.assertEqual(
            reponse.json()["profil"]["affiliations"][0]["id_role"],
            "DIRECTEUR",
        )

    def test_creation_refuse_une_relation_inconnue_sans_laisser_de_donnees_partielles(self):
        payload = {
            **self.payload,
            "elements": [
                {
                    **self.payload["elements"][0],
                    "id_unite": "unite-inconnue",
                }
            ],
        }

        reponse = self.client.post("/api/etablissements/", payload, format="json")

        self.assertEqual(reponse.status_code, 400)
        self.assertFalse(Etablissement.objects.filter(pk="tenant-cree-api").exists())
        self.assertFalse(Utilisateur.objects.filter(courriel="fondatrice@example.org").exists())

    def test_creation_authentifiee_refuse_un_courriel_de_fondateur_different(self):
        utilisateur = Utilisateur.objects.create_user(
            courriel="proprietaire@example.org",
            password="MotDePasseExistant-2026",
            nom_complet="Propriétaire du compte",
        )
        self.client.force_authenticate(utilisateur)

        reponse = self.client.post("/api/etablissements/", self.payload, format="json")

        self.assertEqual(reponse.status_code, 400)
        self.assertFalse(Etablissement.objects.filter(pk="tenant-cree-api").exists())

    def test_creation_par_un_admin_plateforme_cree_un_fondateur_sans_affilier_admin(self):
        administrateur = Utilisateur.objects.create_superuser(
            "plateforme-creation@example.org",
            "MotDePassePlateforme-2026",
        )
        self.client.force_authenticate(administrateur)

        reponse = self.client.post("/api/etablissements/", self.payload, format="json")

        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertEqual(reponse.json()["profil"]["id"], str(administrateur.id))
        fondatrice = Utilisateur.objects.get(courriel="fondatrice@example.org")
        etablissement = Etablissement.objects.get(pk="tenant-cree-api")
        self.assertTrue(
            AffiliationEtablissement.objects.filter(
                utilisateur=fondatrice,
                etablissement=etablissement,
                role="DIRECTEUR",
            ).exists()
        )
        self.assertFalse(
            AffiliationEtablissement.objects.filter(
                utilisateur=administrateur,
                etablissement=etablissement,
            ).exists()
        )
        self.assertEqual(reponse.cookies, {})

    def test_creation_par_un_admin_plateforme_peut_reutiliser_son_compte_sur_choix_explicite(self):
        administrateur = Utilisateur.objects.create_superuser(
            "plateforme-proprietaire@example.org",
            "MotDePassePlateforme-2026",
        )
        self.client.force_authenticate(administrateur)
        payload = {
            **self.payload,
            "fondateur": {
                **self.payload["fondateur"],
                "nom_complet": administrateur.nom_complet,
                "courriel": administrateur.courriel,
                "telephone": "",
                "mot_de_passe": "",
                "utiliser_compte_connecte": True,
            },
        }

        reponse = self.client.post("/api/etablissements/", payload, format="json")

        self.assertEqual(reponse.status_code, 201, reponse.data)
        etablissement = Etablissement.objects.get(pk="tenant-cree-api")
        self.assertEqual(
            AffiliationEtablissement.objects.get(
                utilisateur=administrateur,
                etablissement=etablissement,
            ).role,
            "DIRECTEUR",
        )
        self.assertEqual(etablissement.proprietaire_id, str(administrateur.id))
        self.assertEqual(Utilisateur.objects.filter(pk=administrateur.pk).count(), 1)
        self.assertTrue(reponse.json()["profil"]["est_super_admin_plateforme"])
        self.assertEqual(
            self.client.get("/api/etablissements/").json()[0]["id"],
            etablissement.id,
        )

    def test_utiliser_compte_connecte_est_reserve_a_l_administration_plateforme(self):
        utilisateur = Utilisateur.objects.create_user(
            courriel="directeur-choix@example.org",
            password="MotDePasseDirecteur-2026",
            nom_complet="Directeur de test",
            role="DIRECTEUR",
        )
        self.client.force_authenticate(utilisateur)
        payload = {
            **self.payload,
            "fondateur": {
                **self.payload["fondateur"],
                "nom_complet": utilisateur.nom_complet,
                "courriel": utilisateur.courriel,
                "mot_de_passe": "",
                "utiliser_compte_connecte": True,
            },
        }

        reponse = self.client.post("/api/etablissements/", payload, format="json")

        self.assertEqual(reponse.status_code, 400)
        self.assertFalse(Etablissement.objects.filter(pk="tenant-cree-api").exists())

    def test_creation_refuse_telephone_invalide_ou_fuseau_non_iana(self):
        telephone_invalide = json.loads(json.dumps(self.payload))
        telephone_invalide["etablissement"]["telephone"] = "+3310203040"
        reponse_telephone = self.client.post(
            "/api/etablissements/",
            telephone_invalide,
            format="json",
        )

        fuseau_invalide = json.loads(json.dumps(self.payload))
        fuseau_invalide["etablissement"].update(
            {
                "code_pays": "INTL",
                "telephone": "+216 12345678",
                "fuseau_horaire": "Mars/Noctis",
            }
        )
        fuseau_invalide["fondateur"]["telephone"] = "+216 12345678"
        reponse_fuseau = self.client.post(
            "/api/etablissements/",
            fuseau_invalide,
            format="json",
        )

        self.assertEqual(reponse_telephone.status_code, 400)
        self.assertEqual(reponse_fuseau.status_code, 400)
        self.assertFalse(Etablissement.objects.filter(pk="tenant-cree-api").exists())

    def test_creation_refuse_un_code_pays_non_textuel(self):
        payload = json.loads(json.dumps(self.payload))
        payload["etablissement"]["code_pays"] = ["FR"]

        reponse = self.client.post("/api/etablissements/", payload, format="json")

        self.assertEqual(reponse.status_code, 400, reponse.data)
        self.assertFalse(Etablissement.objects.filter(pk="tenant-cree-api").exists())

    def test_creation_refuse_frais_negatifs(self):
        payload = json.loads(json.dumps(self.payload))
        payload["unites"][0]["frais_scolarite_htg"] = -1

        reponse = self.client.post("/api/etablissements/", payload, format="json")

        self.assertEqual(reponse.status_code, 400)
        self.assertFalse(Etablissement.objects.filter(pk="tenant-cree-api").exists())


class TestsIsolementSupervisionPlateforme(TestCase):
    def setUp(self):
        self.client = creer_client_api()
        self.etablissement_affilie = Etablissement.objects.create(
            id="tenant-affilie-plateforme",
            code="TENANT-A",
            nom="Établissement affilié",
            nom_court="Affilié",
            type="SCOLAIRE",
        )
        self.etablissement_client = Etablissement.objects.create(
            id="tenant-client-plateforme",
            code="TENANT-B",
            nom="Établissement client",
            nom_court="Client",
            type="SCOLAIRE",
        )
        self.utilisateur = Utilisateur.objects.create_user(
            courriel="responsable-tenant@example.org",
            password="MotDePasseTenant-2026",
            nom_complet="Responsable tenant",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.utilisateur,
            etablissement=self.etablissement_affilie,
            role="ADMIN_ETAB",
        )
        self.super_admin = Utilisateur.objects.create_superuser(
            "supervision@example.org",
            "MotDePasseSupervision-2026",
        )

    def test_liste_personnelle_et_liste_plateforme_sont_distinctes(self):
        self.client.force_authenticate(self.utilisateur)
        mes_etablissements = self.client.get("/api/etablissements/")
        supervision_interdite = self.client.get("/api/plateforme/etablissements/")
        details_supervision_interdits = self.client.get(
            f"/api/plateforme/etablissements/{self.etablissement_client.id}/"
        )
        modification_supervision_interdite = self.client.patch(
            f"/api/plateforme/etablissements/{self.etablissement_client.id}/",
            {"offre_saas": "Essentiel"},
            format="json",
        )
        self.assertEqual(mes_etablissements.status_code, 200)
        self.assertEqual(
            [item["id"] for item in mes_etablissements.json()],
            [self.etablissement_affilie.id],
        )
        self.assertNotIn("proprietaire_nom", mes_etablissements.json()[0])
        self.assertEqual(supervision_interdite.status_code, 403)
        self.assertEqual(details_supervision_interdits.status_code, 403)
        self.assertEqual(modification_supervision_interdite.status_code, 403)

        self.client.force_authenticate(self.super_admin)
        mes_etablissements_admin = self.client.get("/api/etablissements/")
        supervision = self.client.get("/api/plateforme/etablissements/")
        self.assertEqual(mes_etablissements_admin.status_code, 200)
        self.assertEqual(mes_etablissements_admin.json(), [])
        self.assertEqual(supervision.status_code, 200)
        self.assertEqual(
            {item["id"] for item in supervision.json()},
            {self.etablissement_affilie.id, self.etablissement_client.id},
        )

    def test_api_liste_etablissements_affilies_repond_200_avec_cookie_session(self):
        connexion = self.client.post(
            "/api/auth/token/",
            {
                "courriel": "responsable-tenant@example.org",
                "password": "MotDePasseTenant-2026",
            },
            format="json",
        )
        self.assertEqual(connexion.status_code, 200, connexion.data)

        reponse = self.client.get("/api/etablissements/")

        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual([item["id"] for item in reponse.json()], [self.etablissement_affilie.id])

    def test_api_liste_etablissements_plateforme_repond_200_avec_cookie_session(self):
        connexion = self.client.post(
            "/api/auth/token/",
            {
                "courriel": "supervision@example.org",
                "password": "MotDePasseSupervision-2026",
            },
            format="json",
        )
        self.assertEqual(connexion.status_code, 200, connexion.data)

        mes_etablissements = self.client.get("/api/etablissements/")
        supervision = self.client.get("/api/plateforme/etablissements/")

        self.assertEqual(mes_etablissements.status_code, 200, mes_etablissements.data)
        self.assertEqual(mes_etablissements.json(), [])
        self.assertEqual(supervision.status_code, 200, supervision.data)
        self.assertEqual(
            {item["id"] for item in supervision.json()},
            {self.etablissement_affilie.id, self.etablissement_client.id},
        )

    def test_metadata_plateforme_agrege_compte_apprenants_et_responsables(self):
        directeur = Utilisateur.objects.create_user(
            courriel="directeur.client@example.org",
            password="MotDePasseDirecteur-2026",
            nom_complet="Directeur client",
            telephone="+509 3700-0001",
            role="DIRECTEUR",
        )
        administrateur = Utilisateur.objects.create_user(
            courriel="admin.client@example.org",
            password="MotDePasseAdmin-2026",
            nom_complet="Administrateur client",
            role="ADMIN_ETAB",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=directeur,
            etablissement=self.etablissement_client,
            role="DIRECTEUR",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=administrateur,
            etablissement=self.etablissement_client,
            role="ADMIN_ETAB",
        )
        self.etablissement_affilie.proprietaire = self.utilisateur
        self.etablissement_affilie.save(update_fields=("proprietaire",))
        unite = UniteAcademique.objects.create(
            id="unite-compteur-plateforme",
            etablissement=self.etablissement_client,
            code="UN-COUNT",
            nom="Unité comptage",
            categorie="Secondaire",
            niveau_ou_duree="Année",
        )
        Apprenant.objects.create(
            id="apprenant-compteur-plateforme",
            etablissement=self.etablissement_client,
            unite=unite,
            matricule="COUNT-001",
            prenom="Donnée",
            nom="Privée",
            sexe="F",
        )
        self.client.force_authenticate(self.super_admin)

        reponse = self.client.get("/api/plateforme/etablissements/")

        self.assertEqual(reponse.status_code, 200, reponse.data)
        par_id = {ligne["id"]: ligne for ligne in reponse.json()}
        client = par_id[self.etablissement_client.id]
        affilie = par_id[self.etablissement_affilie.id]
        self.assertEqual(client["proprietaire_nom"], "Directeur client")
        self.assertEqual(client["proprietaire_courriel"], "directeur.client@example.org")
        self.assertEqual(client["proprietaire_telephone"], "+509 3700-0001")
        self.assertEqual(client["nombre_apprenants"], 1)
        self.assertEqual(client["nombre_apprenants_total"], 1)
        self.assertEqual(
            {admin["role"] for admin in client["administrateurs_affilies"]},
            {"DIRECTEUR", "ADMIN_ETAB"},
        )
        self.assertNotIn("prenom", client)
        self.assertNotIn("apprenants", client)
        self.assertEqual(affilie["proprietaire_nom"], "Responsable tenant")
        self.assertTrue(affilie["cree_le"])

    def test_super_admin_sans_affiliation_ne_peut_pas_lire_les_donnees_metier(self):
        self.client.force_authenticate(self.super_admin)

        reponse = self.client.get(
            f"/api/etablissements/{self.etablissement_client.id}/donnees/apprenants/"
        )

        self.assertEqual(reponse.status_code, 403)

    def test_is_superuser_sans_drapeau_plateforme_est_reconnu_uniquement_pour_la_console(self):
        compte = Utilisateur.objects.create_user(
            courriel="django-root@example.org",
            password="MotDePasseRoot-2026",
            nom_complet="Administrateur Django",
        )
        compte.is_superuser = True
        compte.save(update_fields=("is_superuser",))
        self.client.force_authenticate(compte)

        profil = self.client.get("/api/auth/me/")
        mes_etablissements = self.client.get("/api/etablissements/")
        supervision = self.client.get("/api/plateforme/etablissements/")
        acces_tenant = self.client.get(
            f"/api/etablissements/{self.etablissement_client.id}/donnees/apprenants/"
        )

        self.assertTrue(profil.json()["est_super_admin_plateforme"])
        self.assertEqual(mes_etablissements.json(), [])
        self.assertEqual(supervision.status_code, 200)
        self.assertEqual(acces_tenant.status_code, 403)

    def test_super_admin_affilie_utilise_le_role_de_son_affiliation(self):
        AffiliationEtablissement.objects.create(
            utilisateur=self.super_admin,
            etablissement=self.etablissement_client,
            role="ENSEIGNANT",
        )
        self.client.force_authenticate(self.super_admin)

        liste_personnelle = self.client.get("/api/etablissements/")
        acces_donnees = self.client.get(
            f"/api/etablissements/{self.etablissement_client.id}/donnees/apprenants/"
        )
        gestion_roles_interdite = self.client.get(
            f"/api/etablissements/{self.etablissement_client.id}/permissions/"
        )

        self.assertEqual(liste_personnelle.status_code, 200)
        self.assertEqual(
            [item["id"] for item in liste_personnelle.json()],
            [self.etablissement_client.id],
        )
        self.assertEqual(acces_donnees.status_code, 200)
        self.assertEqual(gestion_roles_interdite.status_code, 403)

    def test_api_plateforme_ne_modifie_que_les_champs_d_abonnement(self):
        self.client.force_authenticate(self.super_admin)

        mise_a_jour = self.client.patch(
            f"/api/plateforme/etablissements/{self.etablissement_client.id}/",
            {"offre_saas": "Essentiel", "statut_abonnement_saas": "PAYE"},
            format="json",
        )
        historique = self.client.get(
            f"/api/plateforme/etablissements/{self.etablissement_client.id}/"
        )
        tentative_donnees_tenant = self.client.patch(
            f"/api/plateforme/etablissements/{self.etablissement_client.id}/",
            {"nom": "Nom altéré"},
            format="json",
        )

        self.assertEqual(mise_a_jour.status_code, 200, mise_a_jour.data)
        self.assertEqual(mise_a_jour.json()["offre_saas"], "Essentiel")
        self.assertEqual(historique.status_code, 200, historique.data)
        self.assertEqual(len(historique.json()["historique_forfaits_saas"]), 1)
        self.assertEqual(
            historique.json()["historique_forfaits_saas"][0]["offre_saas"],
            "Essentiel",
        )
        self.assertEqual(tentative_donnees_tenant.status_code, 400)
        self.etablissement_client.refresh_from_db()
        self.assertEqual(self.etablissement_client.nom, "Établissement client")

    def test_palette_personnalisee_est_validee_et_persistante(self):
        self.client.force_authenticate(self.utilisateur)
        url = f"/api/etablissements/{self.etablissement_affilie.id}/"

        couleur_valide = self.client.patch(
            url,
            {"couleur_accent": "teal"},
            format="json",
        )
        couleur_invalide = self.client.patch(
            url,
            {"couleur_accent": "amber"},
            format="json",
        )
        couleur_malformee = self.client.patch(
            url,
            {"couleur_accent": []},
            format="json",
        )

        self.assertEqual(couleur_valide.status_code, 200, couleur_valide.data)
        self.assertEqual(couleur_invalide.status_code, 400)
        self.assertEqual(couleur_malformee.status_code, 400)
        self.etablissement_affilie.refresh_from_db()
        self.assertEqual(self.etablissement_affilie.couleur_accent, "teal")


class TestsPreuvesDomainesRelationnels(TestCase):
    def setUp(self):
        self.client = creer_client_api()
        self.tenant = Etablissement.objects.create(
            id="tenant-preuves-a",
            code="PREUVES-A",
            nom="Établissement preuves A",
            nom_court="Preuves A",
            type="SCOLAIRE",
        )
        self.autre_tenant = Etablissement.objects.create(
            id="tenant-preuves-b",
            code="PREUVES-B",
            nom="Établissement preuves B",
            nom_court="Preuves B",
            type="SCOLAIRE",
        )
        self.utilisateur = Utilisateur.objects.create_user(
            courriel="preuve.admin@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Administrateur preuve",
            role="ADMIN_ETAB",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.utilisateur,
            etablissement=self.tenant,
            role="ADMIN_ETAB",
        )
        self.client.force_authenticate(self.utilisateur)
        self.unite = UniteAcademique.objects.create(
            id="unite-preuves",
            etablissement=self.tenant,
            code="UN-PREUVES",
            nom="Unité preuves",
            categorie="Secondaire",
            niveau_ou_duree="Année",
        )
        self.element = ElementPedagogique.objects.create(
            id="element-preuves",
            etablissement=self.tenant,
            unite=self.unite,
            code="EL-PREUVES",
            nom="Épreuve",
            nature="MATIERE",
            coefficient_ou_credits=5,
            volume_horaire_total=100,
        )
        self.apprenant = Apprenant.objects.create(
            id="apprenant-preuves",
            etablissement=self.tenant,
            unite=self.unite,
            matricule="PREUVES-001",
            prenom="Ada",
            nom="Preuve",
            sexe="F",
            indice_etape=3,
        )

    def test_documents_communication_notifications_contrats_tenant(self):
        document = DocumentOfficiel.objects.create(
            id="document-preuve",
            etablissement=self.tenant,
            apprenant=self.apprenant,
            numero_document="DOC-PREUVE-001",
            type_document="Bulletin",
            emis_le="2026-11-22",
            emis_par="Administration",
            empreinte_verification="empreinte-preuve",
        )
        message = MessageCommunication.objects.create(
            id="communication-preuve",
            etablissement=self.tenant,
            titre="Information",
            contenu="Contenu preuve",
            canal="Interne",
            audience="Tous",
            envoye_le="2026-11-22",
            envoye_par="Administration",
        )
        notification = Notification.objects.create(
            id="notification-preuve",
            etablissement=self.tenant,
            titre="Notification preuve",
            description="Description preuve",
            cree_le="2026-11-22",
        )
        article = ArticleActualite.objects.create(
            id="article-preuve",
            etablissement=self.tenant,
            titre="Article preuve",
            categorie="Académique",
            resume="Résumé",
            contenu="Contenu",
            publie_le="2026-11-22",
            nom_auteur="Administration",
            audience="Tous",
        )

        document_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/documents/{document.id}/"
        )
        communication_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/communications/{message.id}/"
        )
        notification_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/notifications/{notification.id}/"
        )
        article_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/articles_actualites/{article.id}/"
        )
        notification_lue = self.client.post(
            f"/api/etablissements/{self.tenant.id}/notifications/{notification.id}/marquer-lue/"
        )

        self.assertEqual(document_reponse.status_code, 200)
        self.assertEqual(document_reponse.json()["id_apprenant"], "apprenant-preuves")
        self.assertEqual(document_reponse.json()["empreinte_verification"], "empreinte-preuve")
        self.assertEqual(communication_reponse.status_code, 200)
        self.assertEqual(communication_reponse.json()["nombre_destinataires"], 0)
        self.assertEqual(notification_reponse.status_code, 200)
        self.assertEqual(article_reponse.status_code, 200)
        self.assertEqual(notification_lue.status_code, 200)
        self.assertTrue(notification_lue.json()["lue"])

    def test_services_annexes_contrats_tenant(self):
        livre = LivreBibliotheque.objects.create(
            id="livre-preuve",
            etablissement=self.tenant,
            isbn="978-PREUVE",
            titre="Livre preuve",
            auteur="Auteur preuve",
            categorie="Manuel",
            exemplaires_totaux=3,
            exemplaires_disponibles=2,
        )
        inventaire = ArticleInventaire.objects.create(
            id="inventaire-preuve",
            etablissement=self.tenant,
            code="INV-PREUVE",
            nom="Article preuve",
            categorie="Atelier",
            quantite=5,
            quantite_disponible=4,
            etat="Bon état",
            emplacement="Atelier",
        )
        emprunt = EmpruntBibliotheque.objects.create(
            id="emprunt-preuve",
            etablissement=self.tenant,
            livre=livre,
            apprenant=self.apprenant,
            emprunte_le="2026-11-22",
            retour_prevu_le="2026-12-22",
        )

        livre_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/livres_bibliotheque/{livre.id}/"
        )
        emprunt_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/emprunts_bibliotheque/{emprunt.id}/"
        )
        inventaire_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/inventaire/{inventaire.id}/"
        )
        autre_tenant = self.client.get(
            f"/api/etablissements/{self.autre_tenant.id}/livres_bibliotheque/"
        )

        self.assertEqual(livre_reponse.status_code, 200)
        self.assertEqual(livre_reponse.json()["isbn"], "978-PREUVE")
        self.assertEqual(emprunt_reponse.status_code, 200)
        self.assertEqual(emprunt_reponse.json()["id_apprenant"], "apprenant-preuves")
        self.assertEqual(inventaire_reponse.status_code, 200)
        self.assertEqual(inventaire_reponse.json()["quantite_disponible"], 4)
        self.assertEqual(autre_tenant.status_code, 403)

    def test_lms_contrats_et_cloture_action(self):
        ressource = RessourceLms.objects.create(
            id="ressource-preuve",
            etablissement=self.tenant,
            unite=self.unite,
            element=self.element,
            titre="Ressource preuve",
            type_ressource="Cours PDF",
            url_ou_code="#fichier-local/preuve",
            publie_le="2026-11-22",
            nom_auteur="Professeur preuve",
        )
        devoir = DevoirLms.objects.create(
            id="devoir-preuve",
            etablissement=self.tenant,
            unite=self.unite,
            element=self.element,
            titre="Devoir preuve",
            date_limite="2026-12-01",
            points_max=20,
            statut="OUVERT",
        )
        remise = RemiseDevoir.objects.create(
            id="remise-preuve",
            etablissement=self.tenant,
            devoir=devoir,
            apprenant=self.apprenant,
            statut="ASSIGNE",
        )
        directeur_etudes = Utilisateur.objects.create_user(
            courriel="preuves.dir.etudes@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Directeur études preuve",
            role="DIR_ETUDES",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=directeur_etudes,
            etablissement=self.tenant,
            role="DIR_ETUDES",
        )
        self.client.force_authenticate(directeur_etudes)

        ressource_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/ressources_lms/{ressource.id}/"
        )
        devoir_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/devoirs_lms/{devoir.id}/"
        )
        remise_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/remises_devoirs_lms/{remise.id}/"
        )
        cloture = self.client.post(
            f"/api/etablissements/{self.tenant.id}/devoirs_lms/{devoir.id}/cloturer/"
        )

        self.assertEqual(ressource_reponse.status_code, 200)
        self.assertEqual(ressource_reponse.json()["id_element"], "element-preuves")
        self.assertEqual(devoir_reponse.status_code, 200)
        self.assertEqual(devoir_reponse.json()["points_max"], 20)
        self.assertEqual(remise_reponse.status_code, 200)
        self.assertEqual(remise_reponse.json()["id_apprenant"], "apprenant-preuves")
        self.assertEqual(cloture.status_code, 200)
        self.assertEqual(cloture.json()["statut"], "CLOTURE")

    def test_securite_rgpd_imports_badges_contrats_et_action(self):
        consentement = ConsentementRgpd.objects.create(
            id="consentement-preuve",
            etablissement=self.tenant,
            apprenant=self.apprenant,
            droit_image=True,
            traitement_donnees=True,
            accord_parental=True,
            consentement_sms_whatsapp=True,
            mis_a_jour_le="2026-11-22",
            mis_a_jour_par="Administration",
        )
        demande = DemandeRgpd.objects.create(
            id="demande-preuve",
            etablissement=self.tenant,
            apprenant=self.apprenant,
            type_demande="EXPORT_DONNEES",
            demandee_le="2026-11-22",
        )
        importation = LotImportation.objects.create(
            id="import-preuve",
            etablissement=self.tenant,
            cible="apprenants",
            nom_fichier="apprenants.csv",
            statut="TERMINE",
            nombre_lignes=10,
            nombre_erreurs=0,
            importe_le="2026-11-22",
            importe_par="Administration",
        )
        badge = AttributionBadge.objects.create(
            id="badge-preuve",
            etablissement=self.tenant,
            apprenant=self.apprenant,
            titre_badge="Excellence",
            categorie="Excellence",
            attribue_le="2026-11-22",
            attribue_par="Administration",
        )

        consentement_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/consentements_rgpd/{consentement.id}/"
        )
        demande_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/demandes_rgpd/{demande.id}/"
        )
        import_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/journaux_importations/{importation.id}/"
        )
        badge_reponse = self.client.get(
            f"/api/etablissements/{self.tenant.id}/badges_attribues/{badge.id}/"
        )
        traitement = self.client.post(
            f"/api/etablissements/{self.tenant.id}/demandes_rgpd/{demande.id}/traiter/",
            {"traitee_le": "2026-11-22", "observations": "Demande traitée"},
            format="json",
        )

        self.assertEqual(consentement_reponse.status_code, 200)
        self.assertTrue(consentement_reponse.json()["droit_image"])
        self.assertEqual(demande_reponse.status_code, 200)
        self.assertEqual(import_reponse.status_code, 200)
        self.assertEqual(import_reponse.json()["lignes_importees"], 10)
        self.assertNotIn("nombre_lignes", import_reponse.json())
        self.assertEqual(badge_reponse.status_code, 200)
        self.assertEqual(badge_reponse.json()["titre_badge"], "Excellence")
        self.assertEqual(badge_reponse.json()["categorie"], "Excellence")
        self.assertEqual(traitement.status_code, 200)
        self.assertEqual(traitement.json()["statut"], "TRAITEE")

    def test_seed_relationnel_domains_rejoue_idempotemment(self):
        call_command("seed_demo")
        nombre_premier = {
            "unites": UniteAcademique.objects.count(),
            "elements": ElementPedagogique.objects.count(),
            "apprenants": Apprenant.objects.count(),
            "documents": DocumentOfficiel.objects.count(),
            "communications": MessageCommunication.objects.count(),
        }
        call_command("seed_demo")
        nombre_second = {
            "unites": UniteAcademique.objects.count(),
            "elements": ElementPedagogique.objects.count(),
            "apprenants": Apprenant.objects.count(),
            "documents": DocumentOfficiel.objects.count(),
            "communications": MessageCommunication.objects.count(),
        }
        self.assertEqual(nombre_second, nombre_premier)
        self.assertGreater(nombre_second["unites"], 0)
        self.assertGreater(nombre_second["apprenants"], 0)


class TestsContratsFinancesRelationnelles(TestCase):
    def setUp(self):
        self.client = creer_client_api()
        self.etablissement = Etablissement.objects.create(
            id="tenant-finances-rel",
            code="FIN-REL",
            nom="Établissement finances relationnelles",
            nom_court="Finances",
            type="SCOLAIRE",
            code_pays="HT",
        )
        self.autre_etablissement = Etablissement.objects.create(
            id="tenant-finances-autre",
            code="FIN-AUTRE",
            nom="Autre établissement finances",
            nom_court="Autre",
            type="SCOLAIRE",
        )
        self.utilisateur = Utilisateur.objects.create_user(
            courriel="econome.relationnel@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Économe relationnel",
            role="ECONOME",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.utilisateur,
            etablissement=self.etablissement,
            role="ECONOME",
        )
        self.client.force_authenticate(self.utilisateur)

        self.unite = UniteAcademique.objects.create(
            id="unite-finances",
            etablissement=self.etablissement,
            code="FIN-1",
            nom="Unité finances",
            categorie="Secondaire",
            niveau_ou_duree="Année",
        )
        self.apprenant = Apprenant.objects.create(
            id="apprenant-finances",
            etablissement=self.etablissement,
            unite=self.unite,
            matricule="FIN-001",
            prenom="Ada",
            nom="Finance",
            sexe="F",
            indice_etape=1,
        )
        self.paiement = Paiement.objects.create(
            id="paiement-rel",
            etablissement=self.etablissement,
            apprenant=self.apprenant,
            numero_recu="REC-FIN-001",
            montant_htg=25000,
            mode_paiement="MonCash",
            libelle="Frais scolaires",
            paye_le="2026-10-01",
            encaisse_par="Économe relationnel",
            statut="VALIDE",
        )

    def test_contrat_paiement_et_action_annuler(self):
        detail = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/paiements/{self.paiement.id}/"
        )
        annulation = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/paiements/{self.paiement.id}/annuler/"
        )
        double_annulation = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/paiements/{self.paiement.id}/annuler/"
        )

        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["id_apprenant"], "apprenant-finances")
        self.assertEqual(detail.json()["montant_htg"], 25000)
        self.assertEqual(detail.json()["statut"], "VALIDE")
        self.assertEqual(annulation.status_code, 200)
        self.assertEqual(annulation.json()["statut"], "ANNULE")
        self.assertEqual(double_annulation.status_code, 400)

    def test_isolation_et_permission_finances(self):
        autre_apprenant = Apprenant.objects.create(
            id="apprenant-finances-autre",
            etablissement=self.autre_etablissement,
            unite=UniteAcademique.objects.create(
                id="unite-finances-autre",
                etablissement=self.autre_etablissement,
                code="FIN-AUTRE",
                nom="Unité autre",
                categorie="Secondaire",
                niveau_ou_duree="Année",
            ),
            matricule="FIN-AUTRE-001",
            prenom="Hors",
            nom="Tenant",
            sexe="M",
            indice_etape=1,
        )
        paiement_autre = Paiement.objects.create(
            id="paiement-finances-autre",
            etablissement=self.autre_etablissement,
            apprenant=autre_apprenant,
            numero_recu="REC-FIN-AUTRE",
            montant_htg=1000,
            mode_paiement="Espèces",
            libelle="Paiement autre tenant",
            paye_le="2026-10-01",
            encaisse_par="Autre",
        )

        liste_interdite = self.client.get(
            f"/api/etablissements/{self.autre_etablissement.id}/paiements/"
        )
        depense = Depense.objects.create(
            id="depense-finances-rel",
            etablissement=self.etablissement,
            categorie="Fournitures",
            description="Rame de papier",
            fournisseur="Fournisseur test",
            montant_htg=500,
            payee_le="2026-10-02",
            enregistree_par="Économe relationnel",
        )
        liste_depenses = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/depenses/"
        )

        self.assertEqual(liste_interdite.status_code, 403)
        self.assertEqual(liste_depenses.status_code, 200)
        self.assertEqual([ligne["id"] for ligne in liste_depenses.json()["results"]], [depense.id])
        paiement_autre.refresh_from_db()
        self.assertEqual(paiement_autre.statut, "VALIDE")

    def test_paiement_valide_le_mode_selon_le_pays_et_garde_l_historique(self):
        payload = {
            "id": "paiement-moncash-api",
            "numero_recu": "REC-HT-001",
            "id_apprenant": self.apprenant.id,
            "montant_htg": 500,
            "mode_paiement": "MonCash",
            "libelle": "Frais",
            "paye_le": "2026-10-03",
            "encaisse_par": self.utilisateur.nom_complet,
        }
        reference_manquante = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/paiements/",
            payload,
            format="json",
        )
        self.assertEqual(reference_manquante.status_code, 400)
        payload["code_reference"] = "E2E-MONCASH-REF-001"
        valide = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/paiements/",
            payload,
            format="json",
        )
        payload["id"] = "paiement-mode-invalide"
        payload["numero_recu"] = "REC-HT-002"
        payload["mode_paiement"] = "PayPal"
        invalide = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/paiements/",
            payload,
            format="json",
        )
        suppression = self.client.delete(
            f"/api/etablissements/{self.etablissement.id}/paiements/{self.paiement.id}/"
        )

        self.assertEqual(valide.status_code, 201, valide.data)
        self.assertEqual(invalide.status_code, 400)
        self.assertEqual(suppression.status_code, 403)
        self.assertTrue(Paiement.objects.filter(pk=self.paiement.id).exists())

    def test_net_bulletin_paie_est_recalcule_cote_serveur(self):
        directeur = Utilisateur.objects.create_user(
            courriel="directeur.paie@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Directeur paie",
            role="DIRECTEUR",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=directeur,
            etablissement=self.etablissement,
            role="DIRECTEUR",
        )
        self.client.force_authenticate(directeur)
        personnel = PersonnelEnseignant.objects.create(
            id="personnel-paie",
            etablissement=self.etablissement,
            code="PAIE-01",
            nom_complet="Personnel paie",
        )
        payload = {
            "id": "bulletin-paie-api",
            "id_personnel": personnel.id,
            "nom_personnel": personnel.nom_complet,
            "libelle_role": "Enseignant",
            "libelle_mois": "Octobre 2026",
            "heures_travaillees": 160,
            "salaire_base_htg": 1000,
            "primes_htg": 100,
            "montant_brut_htg": 1,
            "retenues_htg": 50,
            "montant_net_htg": 999999,
            "statut": "EN_ATTENTE",
            "mode_paiement": "Virement bancaire",
        }

        reponse = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/paie/",
            payload,
            format="json",
        )

        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertEqual(reponse.json()["montant_brut_htg"], 1100)
        self.assertEqual(reponse.json()["montant_net_htg"], 1050)
        bulletin = BulletinPaie.objects.get(pk="bulletin-paie-api")
        self.assertEqual(bulletin.montant_net_htg, 1050)


class TestsCollectionsRelationnellesFinales(TestCase):
    def setUp(self):
        self.client = creer_client_api()
        self.tenant = Etablissement.objects.create(
            id="tenant-final-rel",
            code="FINAL-REL",
            nom="Établissement relationnel final",
            nom_court="Final",
            type="SCOLAIRE",
        )
        self.autre_tenant = Etablissement.objects.create(
            id="tenant-final-autre",
            code="FINAL-AUTRE",
            nom="Autre établissement relationnel",
            nom_court="Autre",
            type="SCOLAIRE",
        )
        self.directeur = Utilisateur.objects.create_user(
            courriel="directeur.final@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Directeur Final",
            role="DIRECTEUR",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.directeur,
            etablissement=self.tenant,
            role="DIRECTEUR",
        )
        self.client.force_authenticate(self.directeur)
        SurchargePermissions.objects.create(
            etablissement=self.tenant,
            role="DIRECTEUR",
            permissions=[
                "stages:voir",
                "stages:gerer",
                "rh:voir",
                "rh:gerer",
                "badges:voir",
                "badges:gerer",
                "importations:gerer",
                "messagerie:utiliser",
            ],
        )
        self.unite = UniteAcademique.objects.create(
            id="unite-final-rel",
            etablissement=self.tenant,
            code="FINAL-1",
            nom="Unité finale",
            categorie="Secondaire",
            niveau_ou_duree="Année",
        )
        self.apprenant = Apprenant.objects.create(
            id="apprenant-final-rel",
            etablissement=self.tenant,
            unite=self.unite,
            matricule="FINAL-001",
            prenom="Ada",
            nom="Relationnelle",
            sexe="F",
            indice_etape=1,
        )

    def test_contrats_tenant_et_alias_frontend_des_cinq_collections(self):
        prefixe = f"/api/etablissements/{self.tenant.id}"
        partenaire = self.client.post(
            f"{prefixe}/partenaires/",
            {
                "id": "partenaire-final",
                "nom_entreprise": "Entreprise E2E",
                "secteur": "Formation",
                "ville": "Port-au-Prince",
                "nom_tuteur": "Tuteur E2E",
                "telephone": "+509 3700-0000",
                "places_disponibles": 3,
                "stagiaires_actifs": 1,
            },
            format="json",
        )
        conge = self.client.post(
            f"{prefixe}/demandes_conge/",
            {
                "id": "conge-final",
                "nom_personnel": "Personnel E2E",
                "libelle_role": "Enseignant",
                "type_conge": "Congé annuel",
                "date_debut": "2026-12-01",
                "date_fin": "2026-12-05",
                "motif": "Test d’intégration",
                "statut": "EN_ATTENTE",
                "demande_le": "2026-11-23",
            },
            format="json",
        )
        importation = self.client.post(
            f"{prefixe}/journaux_importations/",
            {
                "id": "import-final",
                "cible": "APPRENANTS",
                "nom_fichier": "e2e.csv",
                "lignes_importees": 7,
                "importe_le": "2026-11-23",
                "importe_par": self.directeur.nom_complet,
            },
            format="json",
        )
        badge = self.client.post(
            f"{prefixe}/badges_attribues/",
            {
                "id": "badge-final",
                "id_apprenant": self.apprenant.id,
                "titre_badge": "Badge E2E",
                "categorie": "Excellence",
                "attribue_le": "2026-11-23",
                "attribue_par": self.directeur.nom_complet,
            },
            format="json",
        )

        self.assertEqual(partenaire.status_code, 201, partenaire.data)
        self.assertEqual(partenaire.json()["id_etablissement"], self.tenant.id)
        self.assertEqual(conge.status_code, 201, conge.data)
        self.assertEqual(conge.json()["statut"], "EN_ATTENTE")
        self.assertEqual(importation.status_code, 201, importation.data)
        self.assertEqual(importation.json()["lignes_importees"], 7)
        self.assertNotIn("nombre_lignes", importation.json())
        self.assertEqual(badge.status_code, 201, badge.data)
        self.assertEqual(badge.json()["id_apprenant"], self.apprenant.id)
        self.assertEqual(badge.json()["titre_badge"], "Badge E2E")
        self.assertNotIn("code_badge", badge.json())
        self.assertEqual(
            PartenaireStage.objects.get(pk="partenaire-final").etablissement_id,
            self.tenant.id,
        )
        self.assertEqual(
            DemandeConge.objects.get(pk="conge-final").etablissement_id,
            self.tenant.id,
        )

        autre_tenant = self.client.get(
            f"/api/etablissements/{self.autre_tenant.id}/partenaires/"
        )
        generic = self.client.get(
            f"{prefixe}/donnees/badges_attribues/"
        )
        self.assertEqual(autre_tenant.status_code, 403)
        self.assertEqual(generic.status_code, 404)

    def test_fils_et_messages_sont_scopes_aux_participants(self):
        destinataire = Utilisateur.objects.create_user(
            courriel="destinataire.final@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Destinataire Final",
            role="ENSEIGNANT",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=destinataire,
            etablissement=self.tenant,
            role="ENSEIGNANT",
        )
        prefixe = f"/api/etablissements/{self.tenant.id}/fils_discussion/"
        cree = self.client.post(
            prefixe,
            {
                "id": "fil-final",
                "sujet": "Discussion E2E",
                "nom_interlocuteur": destinataire.nom_complet,
                "role_interlocuteur": "Enseignant",
                "categorie": "Enseignant",
                "messages_non_lus": 0,
                "mis_a_jour_le": "2026-11-23 09:00",
                "messages": [
                    {
                        "id": "message-final-1",
                        "nom_expediteur": "Nom falsifié",
                        "role_expediteur": "Rôle falsifié",
                        "contenu": "Premier message",
                        "envoye_le": "2026-11-23 09:00",
                        "est_de_moi": False,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(cree.status_code, 201, cree.data)
        self.assertEqual(cree.json()["id_etablissement"], self.tenant.id)
        self.assertEqual(cree.json()["messages"][0]["nom_expediteur"], self.directeur.nom_complet)
        self.assertTrue(cree.json()["messages"][0]["est_de_moi"])

        client_destinataire = creer_client_api()
        client_destinataire.force_authenticate(destinataire)
        discussion_destinataire = client_destinataire.get(prefixe)
        self.assertEqual(discussion_destinataire.status_code, 200)
        self.assertEqual(
            discussion_destinataire.json()["results"][0]["messages"][0]["est_de_moi"],
            False,
        )

        non_participant = Utilisateur.objects.create_user(
            courriel="nonparticipant.final@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Non Participant",
            role="DIRECTEUR",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=non_participant,
            etablissement=self.tenant,
            role="DIRECTEUR",
        )
        client_non_participant = creer_client_api()
        client_non_participant.force_authenticate(non_participant)
        inaccessible = client_non_participant.get(f"{prefixe}fil-final/")
        self.assertEqual(inaccessible.status_code, 404)

    def test_apprenant_ne_voit_que_ses_badges_et_n_accede_pas_aux_domaines_admin(self):
        autre_apprenant = Apprenant.objects.create(
            id="apprenant-final-autre",
            etablissement=self.tenant,
            unite=self.unite,
            matricule="FINAL-002",
            prenom="Autre",
            nom="Apprenant",
            sexe="M",
            indice_etape=1,
        )
        for id_badge, apprenant in (
            ("badge-final-propre", self.apprenant),
            ("badge-final-autre-apprenant", autre_apprenant),
        ):
            AttributionBadge.objects.create(
                id=id_badge,
                etablissement=self.tenant,
                apprenant=apprenant,
                titre_badge=id_badge,
                categorie="Excellence",
                attribue_le="2026-11-23",
                attribue_par=self.directeur.nom_complet,
            )
        apprenant_user = Utilisateur.objects.create_user(
            courriel="apprenant.final@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Ada Relationnelle",
            role="APPRENANT",
            profil={"ids_apprenants_lies": [self.apprenant.id]},
        )
        AffiliationEtablissement.objects.create(
            utilisateur=apprenant_user,
            etablissement=self.tenant,
            role="APPRENANT",
        )
        client_apprenant = creer_client_api()
        client_apprenant.force_authenticate(apprenant_user)
        prefixe = f"/api/etablissements/{self.tenant.id}"

        badges = client_apprenant.get(f"{prefixe}/badges_attribues/")
        finance = client_apprenant.get(f"{prefixe}/paiements/")
        imports = client_apprenant.get(f"{prefixe}/journaux_importations/")
        conges = client_apprenant.get(f"{prefixe}/demandes_conge/")

        self.assertEqual(badges.status_code, 200)
        self.assertEqual(
            [ligne["id"] for ligne in badges.json()["results"]],
            ["badge-final-propre"],
        )
        self.assertEqual(finance.status_code, 403)
        self.assertEqual(imports.status_code, 403)
        self.assertEqual(conges.status_code, 403)


class TestsMigrationCollectionsRelationnelles(TestCase):
    def test_migration_et_retour_conservent_le_contrat_json(self):
        migration = import_module(
            "donnees.migrations.0005_migrer_collections_relationnelles"
        )
        tenant = Etablissement.objects.create(
            id="tenant-migration-final",
            code="MIG-FINAL",
            nom="Tenant migration",
            nom_court="Migration",
            type="SCOLAIRE",
        )
        unite = UniteAcademique.objects.create(
            id="unite-migration-final",
            etablissement=tenant,
            code="MIG-1",
            nom="Unité migration",
            categorie="Secondaire",
            niveau_ou_duree="Année",
        )
        apprenant = Apprenant.objects.create(
            id="apprenant-migration-final",
            etablissement=tenant,
            unite=unite,
            matricule="MIG-001",
            prenom="Test",
            nom="Migration",
            sexe="F",
            indice_etape=1,
        )
        auteur = Utilisateur.objects.create_user(
            courriel="auteur.migration@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Auteur Migration",
            role="DIRECTEUR",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=auteur,
            etablissement=tenant,
            role="DIRECTEUR",
        )
        objets = {
            "partenaires": {
                "id": "partenaire-migration",
                "id_etablissement": tenant.id,
                "nom_entreprise": "Partenaire migration",
                "secteur": "Formation",
                "ville": "Port-au-Prince",
                "nom_tuteur": "Tuteur",
                "telephone": "+509 3700-0000",
                "places_disponibles": 2,
                "stagiaires_actifs": 1,
            },
            "fils_discussion": {
                "id": "fil-migration",
                "id_etablissement": tenant.id,
                "sujet": "Fil migration",
                "nom_interlocuteur": auteur.nom_complet,
                "role_interlocuteur": "Directeur",
                "categorie": "Administration",
                "messages_non_lus": 0,
                "mis_a_jour_le": "2026-11-23",
                "messages": [
                    {
                        "id": "message-migration",
                        "nom_expediteur": auteur.nom_complet,
                        "role_expediteur": "Directeur",
                        "contenu": "Message conservé",
                        "envoye_le": "2026-11-23",
                    }
                ],
            },
            "badges_attribues": {
                "id": "badge-migration",
                "id_etablissement": tenant.id,
                "id_apprenant": apprenant.id,
                "titre_badge": "Badge migration",
                "categorie": "Excellence",
                "attribue_le": "2026-11-23",
                "attribue_par": auteur.nom_complet,
            },
            "journaux_importations": {
                "id": "import-migration",
                "id_etablissement": tenant.id,
                "cible": "APPRENANTS",
                "nom_fichier": "migration.csv",
                "lignes_importees": 8,
                "importe_le": "2026-11-23",
                "importe_par": auteur.nom_complet,
            },
            "demandes_conge": {
                "id": "conge-migration",
                "id_etablissement": tenant.id,
                "nom_personnel": "Personnel migration",
                "libelle_role": "Enseignant",
                "type_conge": "Congé annuel",
                "date_debut": "2026-12-01",
                "date_fin": "2026-12-02",
                "motif": "Migration",
                "statut": "EN_ATTENTE",
                "demande_le": "2026-11-23",
                "traite_par": "",
            },
        }
        for collection, donnees in objets.items():
            EnregistrementMetier.objects.create(
                etablissement=tenant,
                collection=collection,
                id_objet=donnees["id"],
                donnees=donnees,
            )

        contexte_migration = SimpleNamespace(connection=connection)
        migration.migrer(apps, contexte_migration)

        self.assertFalse(
            EnregistrementMetier.objects.filter(
                etablissement=tenant,
                collection__in=objets.keys(),
            ).exists()
        )
        self.assertEqual(
            LotImportation.objects.get(pk="import-migration").nombre_lignes,
            8,
        )
        self.assertEqual(
            FilDiscussionDirecte.objects.get(pk="fil-migration")
            .messages.get(pk="message-migration")
            .contenu,
            "Message conservé",
        )
        self.assertTrue(
            FilDiscussionDirecte.objects.get(pk="fil-migration")
            .participants.filter(pk=auteur.pk)
            .exists()
        )

        migration.restaurer_json(apps, contexte_migration)

        badge_json = EnregistrementMetier.objects.get(
            etablissement=tenant,
            collection="badges_attribues",
            id_objet="badge-migration",
        ).donnees
        self.assertEqual(badge_json["titre_badge"], "Badge migration")
        self.assertEqual(badge_json["id_apprenant"], apprenant.id)


class TestsContratsPedagogieRelationnelle(TestCase):
    def setUp(self):
        self.client = creer_client_api()
        self.etablissement = Etablissement.objects.create(
            id="tenant-pedagogie-rel",
            code="PED-REL",
            nom="Établissement pédagogie relationnelle",
            nom_court="Pédagogie",
            type="SCOLAIRE",
        )
        self.autre_etablissement = Etablissement.objects.create(
            id="tenant-pedagogie-autre",
            code="PED-AUTRE",
            nom="Autre établissement pédagogie",
            nom_court="Autre",
            type="SCOLAIRE",
        )
        self.utilisateur = Utilisateur.objects.create_user(
            courriel="pedagogie.relationnelle@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Directeur des études relationnel",
            role="DIR_ETUDES",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.utilisateur,
            etablissement=self.etablissement,
            role="DIR_ETUDES",
        )
        self.client.force_authenticate(self.utilisateur)

        self.unite = UniteAcademique.objects.create(
            id="unite-pedagogie",
            etablissement=self.etablissement,
            code="PED-1",
            nom="Unité pédagogique",
            categorie="Secondaire",
            niveau_ou_duree="Année",
        )
        self.apprenant = Apprenant.objects.create(
            id="apprenant-pedagogie",
            etablissement=self.etablissement,
            unite=self.unite,
            matricule="PED-001",
            prenom="Jean",
            nom="Élève",
            sexe="M",
            indice_etape=3,
        )
        self.element = ElementPedagogique.objects.create(
            id="element-pedagogie",
            etablissement=self.etablissement,
            unite=self.unite,
            code="PED-MAT",
            nom="Mathématiques",
            nature="MATIERE",
            coefficient_ou_credits=5,
            volume_horaire_total=180,
        )
        self.enseignant = PersonnelEnseignant.objects.create(
            id="enseignant-pedagogie",
            etablissement=self.etablissement,
            code="ENS-PED",
            nom_complet="Professeur Test",
            specialite="Mathématiques",
            type_contrat="Contractuel",
            ids_unites_assignees=["unite-pedagogie"],
            ids_elements_assignes=["element-pedagogie"],
        )
        self.note = NoteEvaluation.objects.create(
            id="note-pedagogie",
            etablissement=self.etablissement,
            apprenant=self.apprenant,
            element=self.element,
            libelle_periode="1er Trimestre",
            type_evaluation="Contrôle",
            note=16,
            note_maximale=20,
            enregistree_le="2026-10-10",
        )

    def test_affectations_enseignant_et_elements_restent_dans_le_tenant(self):
        administrateur = Utilisateur.objects.create_user(
            courriel="admin.affectations@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Administrateur affectations",
            role="ADMIN_ETAB",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=administrateur,
            etablissement=self.etablissement,
            role="DIRECTEUR",
        )
        autre_unite = UniteAcademique.objects.create(
            id="unite-affectation-autre",
            etablissement=self.autre_etablissement,
            code="AUTRE",
            nom="Unité externe",
            categorie="Secondaire",
            niveau_ou_duree="Année",
        )
        autre_enseignant = PersonnelEnseignant.objects.create(
            id="enseignant-affectation-autre",
            etablissement=self.autre_etablissement,
            code="ENS-AUTRE",
            nom_complet="Enseignant externe",
        )
        self.client.force_authenticate(administrateur)

        affectation_externe = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/enseignants/",
            {
                "id": "enseignant-affectation-invalide",
                "code": "ENS-INVALIDE",
                "nom_complet": "Enseignant invalide",
                "ids_unites_assignees": [autre_unite.id],
                "ids_elements_assignes": [],
            },
            format="json",
        )
        element_enseignant_externe = self.client.patch(
            f"/api/etablissements/{self.etablissement.id}/elements/{self.element.id}/",
            {"id_enseignant": autre_enseignant.id},
            format="json",
        )

        self.assertEqual(affectation_externe.status_code, 400, affectation_externe.data)
        self.assertEqual(
            element_enseignant_externe.status_code,
            400,
            element_enseignant_externe.data,
        )
        self.assertFalse(
            PersonnelEnseignant.objects.filter(pk="enseignant-affectation-invalide").exists()
        )
        self.element.refresh_from_db()
        self.assertEqual(self.element.id_enseignant, "")

    def test_contrat_note_publiée_verrouillee_en_snake_case(self):
        detail = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/notes/{self.note.id}/"
        )
        publication = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/notes/{self.note.id}/publier/"
        )
        modification = self.client.patch(
            f"/api/etablissements/{self.etablissement.id}/notes/{self.note.id}/",
            {"note": 18},
            format="json",
        )

        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["id_apprenant"], "apprenant-pedagogie")
        self.assertEqual(detail.json()["id_element"], "element-pedagogie")
        self.assertEqual(detail.json()["note_maximale"], 20)
        self.assertEqual(publication.status_code, 200)
        self.assertTrue(publication.json()["verrouillee"])
        self.assertEqual(modification.status_code, 400)

    def test_detail_personnel_respecte_la_permission_rh(self):
        detail = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/enseignants/{self.enseignant.id}/"
        )

        self.assertEqual(detail.status_code, 403)

    def test_endpoint_pedagogie_isole_le_tenant(self):
        evenement = EvenementCalendrier.objects.create(
            id="evenement-autre",
            etablissement=self.autre_etablissement,
            type="PERIODE",
            titre="Période autre tenant",
            date_debut="2026-10-01",
        )

        liste_interdite = self.client.get(
            f"/api/etablissements/{self.autre_etablissement.id}/evenements_calendrier/"
        )
        liste_autorisee = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/evenements_calendrier/"
        )

        self.assertEqual(liste_interdite.status_code, 403)
        self.assertEqual(liste_autorisee.status_code, 200)
        evenement.refresh_from_db()
        self.assertEqual(evenement.titre, "Période autre tenant")


class TestsContratsScolariteRelationnelle(TestCase):
    def setUp(self):
        self.client = creer_client_api()
        self.etablissement = Etablissement.objects.create(
            id="tenant-scolarite-rel",
            code="SCOL-REL",
            nom="Établissement scolaire relationnel",
            nom_court="Scolaire",
            type="SCOLAIRE",
            code_pays="HT",
            nom_pays="Haïti",
            devise_defaut="HTG",
        )
        self.autre_etablissement = Etablissement.objects.create(
            id="tenant-scolarite-autre",
            code="SCOL-AUTRE",
            nom="Autre établissement",
            nom_court="Autre",
            type="SCOLAIRE",
        )
        self.utilisateur = Utilisateur.objects.create_user(
            courriel="scolarite.relationnelle@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Gestionnaire scolarité",
            role="DIRECTEUR",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.utilisateur,
            etablissement=self.etablissement,
            role="DIRECTEUR",
        )
        self.client.force_authenticate(self.utilisateur)

        self.unite = UniteAcademique.objects.create(
            id="unite-rel",
            etablissement=self.etablissement,
            code="REL-1",
            nom="Classe relationnelle",
            categorie="Secondaire",
            niveau_ou_duree="9ème",
            capacite=35,
            frais_scolarite_htg=12000,
            frais_inscription_htg=1500,
            repartition_facturation="Mensuelle",
            responsable_nom="Responsable test",
        )
        self.apprenant = Apprenant.objects.create(
            id="apprenant-rel",
            etablissement=self.etablissement,
            unite=self.unite,
            matricule="REL-2026-001",
            prenom="Ada",
            nom="Test",
            sexe="F",
            date_naissance="2012-04-10",
            lieu_naissance="Port-au-Prince",
            telephone="+509 3700-0001",
            adresse="Delmas",
            libelle_niveau="9ème",
            date_inscription="2026-09-01",
            indice_etape=3,
            statut="ACTIF",
            total_du_htg=12000,
            total_paye_htg=3000,
            statut_paiement="PARTIEL",
            moyenne_generale=8,
            taux_assiduite=95,
            dossier_complet=True,
        )
        self.inscription = InscriptionApprenant.objects.create(
            id="inscription-rel",
            etablissement=self.etablissement,
            apprenant=self.apprenant,
            unite=self.unite,
            numero_inscription="INS-REL-001",
            annee_academique="2026–2027",
            libelle_periode="1er Trimestre",
            libelle_niveau="9ème",
            type_inscription="NOUVELLE",
            date_inscription="2026-09-01",
            statut_inscription="VALIDEE",
            montant_brut_htg=13500,
            pourcentage_bourse=10,
            montant_net_htg=12150,
        )

    def test_contrat_unite_represente_le_wire_format_snake_case(self):
        reponse = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/unites/{self.unite.id}/"
        )
        self.assertEqual(reponse.status_code, 200)
        donnees = reponse.json()
        self.assertEqual(donnees["id"], "unite-rel")
        self.assertEqual(donnees["id_etablissement"], self.etablissement.id)
        self.assertIn("frais_scolarite_htg", donnees)
        self.assertIn("niveau_ou_duree", donnees)
        self.assertEqual(donnees["frais_scolarite_htg"], 12000)

    def test_contrat_apprenant_represente_relations_et_echeancier(self):
        reponse = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/apprenants/{self.apprenant.id}/"
        )
        self.assertEqual(reponse.status_code, 200)
        donnees = reponse.json()
        self.assertEqual(donnees["id_unite"], "unite-rel")
        self.assertEqual(donnees["id_etablissement"], self.etablissement.id)
        self.assertEqual(donnees["statut_paiement"], "PARTIEL")
        self.assertEqual(donnees["tuteurs"], [])
        self.assertEqual(donnees["echeancier"], [])

    def test_frais_unite_negatifs_sont_refuses_par_l_api(self):
        reponse = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/unites/",
            {
                "id": "unite-frais-negatifs",
                "code": "FRAIS-NEG",
                "nom": "Frais négatifs",
                "categorie": "Secondaire",
                "niveau_ou_duree": "Année",
                "frais_scolarite_htg": -100,
                "frais_inscription_htg": 0,
            },
            format="json",
        )

        self.assertEqual(reponse.status_code, 400, reponse.data)
        self.assertFalse(UniteAcademique.objects.filter(pk="unite-frais-negatifs").exists())

    def test_creation_api_inscription_relie_apprenant_et_unite(self):
        reponse = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/inscriptions/",
            {
                "id": "inscription-e2e-regression",
                "numero_inscription": "INS-E2E-REG",
                "annee_academique": "2026–2027",
                "libelle_periode": "1er Trimestre",
                "id_apprenant": self.apprenant.id,
                "id_unite": self.unite.id,
                "libelle_niveau": "9ème",
                "type_inscription": "NOUVELLE",
                "date_inscription": "2026-11-23",
                "statut_inscription": "VALIDEE",
                "montant_brut_htg": 13500,
                "pourcentage_bourse": 10,
                "montant_net_htg": 12150,
                "pieces_fournies": [],
                "option_cantine": False,
                "option_transport": False,
                "motif_statut": "",
                "observations": "",
            },
            format="json",
        )

        self.assertEqual(reponse.status_code, 201, reponse.data)
        inscription = InscriptionApprenant.objects.get(pk="inscription-e2e-regression")
        self.assertEqual(inscription.etablissement_id, self.etablissement.id)
        self.assertEqual(inscription.apprenant_id, self.apprenant.id)
        self.assertEqual(inscription.unite_id, self.unite.id)
        self.assertEqual(reponse.json()["id_apprenant"], self.apprenant.id)
        self.assertEqual(reponse.json()["id_unite"], self.unite.id)

    def test_isolation_typed_et_action_annulation_inscription(self):
        autre_unite = UniteAcademique.objects.create(
            id="unite-autre",
            etablissement=self.autre_etablissement,
            code="AUTRE-1",
            nom="Autre unité",
            categorie="Secondaire",
            niveau_ou_duree="Année",
        )
        autre_apprenant = Apprenant.objects.create(
            id="apprenant-autre",
            etablissement=self.autre_etablissement,
            unite=autre_unite,
            matricule="AUTRE-001",
            prenom="Hors",
            nom="Tenant",
            sexe="M",
            indice_etape=1,
        )
        autre_inscription = InscriptionApprenant.objects.create(
            id="inscription-autre",
            etablissement=self.autre_etablissement,
            apprenant=autre_apprenant,
            unite=autre_unite,
            numero_inscription="INS-AUTRE",
            annee_academique="2026–2027",
            libelle_periode="Année",
            libelle_niveau="Année",
            type_inscription="NOUVELLE",
            date_inscription="2026-09-01",
        )

        liste = self.client.get(
            f"/api/etablissements/{self.etablissement.id}/inscriptions/"
        )
        interdite = self.client.get(
            f"/api/etablissements/{self.autre_etablissement.id}/inscriptions/"
        )
        annulation = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/inscriptions/{self.inscription.id}/annuler/",
            {"motif_statut": "Dossier incomplet"},
            format="json",
        )

        self.assertEqual(liste.status_code, 200)
        self.assertEqual([ligne["id"] for ligne in liste.json()["results"]], ["inscription-rel"])
        self.assertEqual(interdite.status_code, 403)
        self.assertEqual(annulation.status_code, 200)
        self.assertEqual(annulation.json()["statut_inscription"], "ANNULEE")
        autre_inscription.refresh_from_db()
        self.assertEqual(autre_inscription.statut_inscription, "VALIDEE")

    def test_archivage_et_suppression_inscription_preservent_apprenant_et_finances(self):
        paiement = Paiement.objects.create(
            id="paiement-inscription-preserve",
            etablissement=self.etablissement,
            apprenant=self.apprenant,
            numero_recu="REC-INS-PRESERVE",
            montant_htg=500,
            mode_paiement="MonCash",
            libelle="Paiement conservé",
            paye_le="2026-09-10",
            encaisse_par="Gestionnaire scolarité",
        )
        archive = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/inscriptions/{self.inscription.id}/archiver/",
            {"motif_statut": "Dossier terminé"},
            format="json",
        )
        self.assertEqual(archive.status_code, 200, archive.data)
        self.assertEqual(archive.json()["statut_inscription"], "ARCHIVEE")
        self.assertTrue(Apprenant.objects.filter(pk=self.apprenant.id).exists())
        self.assertTrue(Paiement.objects.filter(pk=paiement.id).exists())

        suppression = self.client.delete(
            f"/api/etablissements/{self.etablissement.id}/inscriptions/{self.inscription.id}/"
        )

        self.assertEqual(suppression.status_code, 204)
        self.assertFalse(InscriptionApprenant.objects.filter(pk=self.inscription.id).exists())
        self.assertTrue(Apprenant.objects.filter(pk=self.apprenant.id).exists())
        self.assertTrue(Paiement.objects.filter(pk=paiement.id).exists())
        self.assertTrue(
            EntreeAuditApi.objects.filter(
                collection="inscriptions",
                id_objet=self.inscription.id,
                action="SUPPRESSION",
            ).exists()
        )


@override_settings(
    STORAGES={"default": {"BACKEND": "django.core.files.storage.InMemoryStorage"}}
)
class TestsFichiersTenant(TestCase):
    def setUp(self):
        self.client = creer_client_api()
        self.etablissement = Etablissement.objects.create(
            id="tenant-fichier-a",
            code="FICHIER-A",
            nom="Établissement A",
            nom_court="A",
            type="SCOLAIRE",
        )
        self.autre_etablissement = Etablissement.objects.create(
            id="tenant-fichier-b",
            code="FICHIER-B",
            nom="Établissement B",
            nom_court="B",
            type="SCOLAIRE",
        )
        self.enseignant = Utilisateur.objects.create_user(
            courriel="enseignant-fichier@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Enseignant fichier",
            role="ENSEIGNANT",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.enseignant,
            etablissement=self.etablissement,
            role="ENSEIGNANT",
        )
        self.client.force_authenticate(self.enseignant)

    def test_depot_telechargement_et_isolation_du_fichier(self):
        fichier_envoye = SimpleUploadedFile(
            "devoir.pdf",
            b"contenu de test",
            content_type="application/pdf",
        )
        depot = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/fichiers/",
            {"fichier": fichier_envoye},
            format="multipart",
        )

        self.assertEqual(depot.status_code, 201)
        fichier_id = depot.json()["id"]
        fichier_stocke = FichierTeleverse.objects.get(pk=fichier_id)
        self.assertTrue(fichier_stocke.fichier.storage.exists(fichier_stocke.fichier.name))
        self.assertEqual(str(fichier_stocke.proprietaire_id), str(self.enseignant.id))
        telechargement_proprietaire = self.client.get(f"/api/fichiers/{fichier_id}/")
        self.assertEqual(
            telechargement_proprietaire.status_code,
            200,
            getattr(telechargement_proprietaire, "data", None),
        )
        self.assertEqual(
            b"".join(telechargement_proprietaire.streaming_content),
            b"contenu de test",
        )
        self.assertIn("attachment", telechargement_proprietaire["Content-Disposition"])

        directeur = Utilisateur.objects.create_user(
            courriel="directeur-fichier@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Directeur fichier",
            role="DIRECTEUR",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=directeur,
            etablissement=self.etablissement,
            role="DIRECTEUR",
        )
        EnregistrementMetier.objects.create(
            etablissement=self.etablissement,
            collection="documents",
            id_objet="document-avec-fichier",
            donnees={
                "titre": "Document partagé",
                "pieces_jointes": [{"id_fichier_local": fichier_id}],
            },
        )
        self.client.force_authenticate(directeur)
        telechargement_partage = self.client.get(f"/api/fichiers/{fichier_id}/")
        self.assertEqual(telechargement_partage.status_code, 200)
        self.assertEqual(
            b"".join(telechargement_partage.streaming_content),
            b"contenu de test",
        )

        autre_utilisateur = Utilisateur.objects.create_user(
            courriel="enseignant-autre@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Autre enseignant",
            role="ENSEIGNANT",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=autre_utilisateur,
            etablissement=self.autre_etablissement,
            role="ENSEIGNANT",
        )
        self.client.force_authenticate(autre_utilisateur)
        telechargement_interdit = self.client.get(f"/api/fichiers/{fichier_id}/")

        self.assertEqual(telechargement_interdit.status_code, 404)

    def test_depot_refuse_un_fichier_superieur_a_la_limite(self):
        with patch("api.file_views.TAILLE_MAX_FICHIER", 3):
            depot = self.client.post(
                f"/api/etablissements/{self.etablissement.id}/fichiers/",
                {
                    "fichier": SimpleUploadedFile(
                        "trop-grand.zip",
                        b"1234",
                        content_type="application/zip",
                    )
                },
                format="multipart",
            )

        self.assertEqual(depot.status_code, 400)
        self.assertEqual(FichierTeleverse.objects.count(), 0)

    def test_role_sans_droit_de_depot_est_refuse(self):
        AffiliationEtablissement.objects.filter(utilisateur=self.enseignant).update(
            role="AUDITEUR"
        )
        depot = self.client.post(
            f"/api/etablissements/{self.etablissement.id}/fichiers/",
            {
                "fichier": SimpleUploadedFile(
                    "document.txt",
                    b"contenu",
                    content_type="text/plain",
                )
            },
            format="multipart",
        )

        self.assertEqual(depot.status_code, 403)


class TestsCommandeSeedDemo(TestCase):
    def test_seed_est_idempotent_et_ne_cree_pas_de_mot_de_passe_demo(self):
        call_command("seed_demo", stdout=StringIO())
        nombre_initial = EnregistrementMetier.objects.count()

        call_command("seed_demo", stdout=StringIO())

        self.assertEqual(Etablissement.objects.count(), 5)
        self.assertEqual(Utilisateur.objects.count(), 14)
        self.assertEqual(EnregistrementMetier.objects.count(), nombre_initial)
        self.assertGreater(nombre_initial, 0)
        self.assertTrue(
            all(
                not utilisateur.profil.get("mot_de_passe_demo")
                for utilisateur in Utilisateur.objects.all()
            )
        )
        self.assertTrue(
            all(
                utilisateur.profil.get("acces_demo_autorise")
                for utilisateur in Utilisateur.objects.all()
            )
        )
        self.assertTrue(
            all(
                utilisateur.profil.get("est_compte_demo")
                for utilisateur in Utilisateur.objects.all()
            )
        )

    def test_session_demo_superadmin_reste_sans_affiliation_et_sans_acces_metier(self):
        call_command("seed_demo", stdout=StringIO())
        client = creer_client_api()
        super_admin = Utilisateur.objects.get(est_super_admin_plateforme=True)
        etablissement = Etablissement.objects.first()

        with override_settings(DEBUG=True, DEMO_PUBLIQUE_ACTIVE=True):
            connexion = client.post(
                "/api/auth/demo/",
                {
                    "id_utilisateur": super_admin.id,
                    "id_etablissement": etablissement.id,
                },
                format="json",
            )

        self.assertEqual(connexion.status_code, 200)
        profil = client.get("/api/auth/me/")
        etablissements = client.get("/api/etablissements/")
        supervision = client.get("/api/plateforme/etablissements/")
        apprenants = client.get(
            f"/api/etablissements/{etablissement.id}/donnees/apprenants/"
        )

        self.assertEqual(profil.status_code, 200)
        self.assertEqual(profil.json()["id"], super_admin.id)
        self.assertEqual(etablissements.status_code, 200)
        self.assertEqual(etablissements.json(), [])
        self.assertEqual(supervision.status_code, 200)
        self.assertEqual(len(supervision.json()), 5)
        self.assertEqual(apprenants.status_code, 403)


class TestsContactPublic(TestCase):
    def setUp(self):
        cache.clear()
        self.client = creer_client_api()

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="support@example.org",
        DJANGO_SUPPORT_EMAIL="support@example.org",
    )
    def test_contact_public_envoie_le_message_au_support(self):
        reponse = self.client.post(
            "/api/contact/",
            {
                "nom": "Camille Test",
                "courriel": "camille@example.org",
                "sujet": "Demande d’information",
                "message": "Je souhaite en savoir plus.",
            },
            format="json",
        )

        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["support@example.org"])
        self.assertEqual(mail.outbox[0].reply_to, ["camille@example.org"])
        self.assertIn("Je souhaite en savoir plus.", mail.outbox[0].body)

    def test_contact_public_rejette_une_adresse_invalide(self):
        reponse = self.client.post(
            "/api/contact/",
            {
                "nom": "Camille Test",
                "courriel": "adresse-invalide",
                "sujet": "Question",
                "message": "Bonjour.",
            },
            format="json",
        )

        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(len(mail.outbox), 0)

    def test_contact_public_refuse_un_sujet_avec_saut_de_ligne(self):
        reponse = self.client.post(
            "/api/contact/",
            {
                "nom": "Camille Test",
                "courriel": "camille@example.org",
                "sujet": "Question\nBcc: externe@example.org",
                "message": "Bonjour.",
            },
            format="json",
        )

        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(
        DEFAULT_FROM_EMAIL="noreply@example.org",
        DJANGO_SUPPORT_EMAIL="support@example.org",
    )
    @patch("api.views.EmailMessage.send", side_effect=OSError("SMTP indisponible"))
    def test_contact_public_signale_un_echec_d_envoi(self, envoyer):
        reponse = self.client.post(
            "/api/contact/",
            {
                "nom": "Camille Test",
                "courriel": "camille@example.org",
                "sujet": "Question",
                "message": "Bonjour.",
            },
            format="json",
        )

        self.assertEqual(reponse.status_code, 503)
