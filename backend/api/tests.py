import json

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core import mail
from django.test import TestCase, override_settings
from io import StringIO
from unittest.mock import patch
from rest_framework.test import APIClient
from comptes.models import (
    AffiliationEtablissement,
    JetonReinitialisation,
    SurchargePermissions,
)
from donnees.models import EnregistrementMetier, EntreeAuditApi, FichierTeleverse
from etablissements.models import Etablissement
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
from finances.models import Depense, Paiement
from communication.models import ArticleActualite, MessageCommunication, Notification
from documents.models import DocumentOfficiel
from services_annexes.models import (
    AncienEtudiant,
    ArticleInventaire,
    EmpruntBibliotheque,
    IncidentDiscipline,
    LivreBibliotheque,
    PretMateriel,
    VisiteInfirmerie,
)
from campus_numerique.models import DevoirLms, RemiseDevoir, RessourceLms
from securite.models import AttributionBadge, ConsentementRgpd, DemandeRgpd, LotImportation

Utilisateur = get_user_model()


class TestsAuthentificationApi(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
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
        self.assertIn("access", reponse_jetons.json())
        self.assertIn("refresh", reponse_jetons.json())

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {reponse_jetons.json()['access']}")
        reponse_profil = self.client.get("/api/auth/me/")

        self.assertEqual(reponse_profil.status_code, 200)
        self.assertEqual(reponse_profil.json()["courriel"], "test@example.org")
        self.assertEqual(reponse_profil.json()["role"], "ENSEIGNANT")

    def test_connexion_superuser_par_identifiant_court(self):
        superutilisateur = Utilisateur.objects.create_superuser(
            "administrateur@example.org",
            "MotDePasseSuperuser-2026",
        )

        reponse_jetons = self.client.post(
            "/api/auth/token/",
            {"courriel": "superuser", "password": "MotDePasseSuperuser-2026"},
            format="json",
        )

        self.assertEqual(reponse_jetons.status_code, 200)
        self.assertIn("access", reponse_jetons.json())
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {reponse_jetons.json()['access']}"
        )
        profil = self.client.get("/api/auth/me/")
        self.assertEqual(profil.status_code, 200)
        self.assertEqual(profil.json()["id"], str(superutilisateur.id))

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
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {reponse_jetons.json()['access']}"
        )

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

    def test_logo_plateforme_est_persistant_et_reserve_au_superadmin(self):
        url_logo = "data:image/png;base64,iVBORw0KGgo="
        self.client.force_authenticate(self.utilisateur)
        refusee = self.client.patch(
            "/api/plateforme/configuration/",
            {"url_logo": url_logo},
            format="json",
        )
        self.assertEqual(refusee.status_code, 403)

        superutilisateur = Utilisateur.objects.create_superuser(
            "logo.plateforme@example.org",
            "MotDePasseLogo-2026",
        )
        self.client.force_authenticate(superutilisateur)
        modification = self.client.patch(
            "/api/plateforme/configuration/",
            {"url_logo": url_logo},
            format="json",
        )
        lecture = self.client.get("/api/plateforme/configuration/")

        self.assertEqual(modification.status_code, 200)
        self.assertEqual(lecture.status_code, 200)
        self.assertEqual(lecture.json()["url_logo"], url_logo)

    def test_connexion_refuse_un_mot_de_passe_invalide_en_francais(self):
        reponse = self.client.post(
            "/api/auth/token/",
            {"courriel": "test@example.org", "password": "incorrect"},
            format="json",
        )

        self.assertIn(reponse.status_code, {401, 403})
        self.assertIn("message", reponse.json())
        self.assertIn("identifiants invalides", reponse.json()["message"])

    def test_profil_courant_refuse_une_requete_anonyme(self):
        reponse = self.client.get("/api/auth/me/")

        self.assertEqual(reponse.status_code, 401)
        self.assertIn("message", reponse.json())

    def test_connexion_demo_exige_opt_in_de_developpement_et_compte_seed(self):
        with override_settings(DEBUG=True, DEMO_LOGIN_ENABLED=False):
            refusee_sans_opt_in = self.client.post(
                "/api/auth/demo/",
                {"id_utilisateur": self.utilisateur.id},
                format="json",
            )
        self.assertEqual(refusee_sans_opt_in.status_code, 404)

        with override_settings(DEBUG=True, DEMO_LOGIN_ENABLED=True):
            refusee_compte_reel = self.client.post(
                "/api/auth/demo/",
                {"id_utilisateur": self.utilisateur.id},
                format="json",
            )
        self.assertEqual(refusee_compte_reel.status_code, 404)

        call_command("seed_demo", stdout=StringIO())
        compte_demo = Utilisateur.objects.get(pk="usr-super")
        with override_settings(DEBUG=True, DEMO_LOGIN_ENABLED=True):
            reponse = self.client.post(
                "/api/auth/demo/",
                {"id_utilisateur": compte_demo.id},
                format="json",
            )
        self.assertEqual(reponse.status_code, 200)
        self.assertIn("access", reponse.json())
        self.assertIn("refresh", reponse.json())

        with override_settings(DEBUG=False, DEMO_LOGIN_ENABLED=True):
            reponse_production = self.client.post(
                "/api/auth/demo/",
                {"id_utilisateur": compte_demo.id},
                format="json",
            )

        self.assertEqual(reponse_production.status_code, 404)

    def test_jeton_de_renouvellement_est_rotatif(self):
        reponse_jetons = self.client.post(
            "/api/auth/token/",
            {"courriel": "test@example.org", "password": "MotDePasseDeTest-2026"},
            format="json",
        )

        reponse_renouvellement = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": reponse_jetons.json()["refresh"]},
            format="json",
        )

        self.assertEqual(reponse_renouvellement.status_code, 200)
        self.assertIn("access", reponse_renouvellement.json())
        self.assertIn("refresh", reponse_renouvellement.json())
        self.assertNotEqual(
            reponse_renouvellement.json()["refresh"],
            reponse_jetons.json()["refresh"],
        )

    def test_schema_openapi_est_accessible(self):
        reponse = self.client.get("/api/schema/?format=json")

        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(json.loads(reponse.content)["openapi"], "3.0.3")


class TestsApiMultitenant(TestCase):
    def setUp(self):
        self.client = APIClient()
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
            role="ADMIN_ETAB",
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
        self.utilisateur.profil = {"acces_demo_autorise": True}
        self.utilisateur.save(update_fields=["profil"])
        with override_settings(DEBUG=True, DEMO_LOGIN_ENABLED=True):
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

    def test_creation_modification_et_retrait_compte_tenant(self):
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


class TestsPreuvesDomainesRelationnels(TestCase):
    def setUp(self):
        self.client = APIClient()
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
            code_badge="EXCELLENCE",
            titre="Excellence",
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
        self.assertEqual(import_reponse.json()["nombre_lignes"], 10)
        self.assertEqual(badge_reponse.status_code, 200)
        self.assertEqual(badge_reponse.json()["code_badge"], "EXCELLENCE")
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
        self.client = APIClient()
        self.etablissement = Etablissement.objects.create(
            id="tenant-finances-rel",
            code="FIN-REL",
            nom="Établissement finances relationnelles",
            nom_court="Finances",
            type="SCOLAIRE",
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


class TestsContratsPedagogieRelationnelle(TestCase):
    def setUp(self):
        self.client = APIClient()
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
        self.client = APIClient()
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
            role="SCOLARITE",
        )
        AffiliationEtablissement.objects.create(
            utilisateur=self.utilisateur,
            etablissement=self.etablissement,
            role="SCOLARITE",
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


@override_settings(
    STORAGES={"default": {"BACKEND": "django.core.files.storage.InMemoryStorage"}}
)
class TestsFichiersTenant(TestCase):
    def setUp(self):
        self.client = APIClient()
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

    def test_session_demo_seedee_accede_aux_etablissements_et_collections(self):
        call_command("seed_demo", stdout=StringIO())
        client = APIClient()
        super_admin = Utilisateur.objects.get(est_super_admin_plateforme=True)
        etablissement = Etablissement.objects.first()

        with override_settings(DEBUG=True, DEMO_LOGIN_ENABLED=True):
            connexion = client.post(
                "/api/auth/demo/",
                {
                    "id_utilisateur": super_admin.id,
                    "id_etablissement": etablissement.id,
                },
                format="json",
            )

        self.assertEqual(connexion.status_code, 200)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {connexion.json()['access']}")
        profil = client.get("/api/auth/me/")
        etablissements = client.get("/api/etablissements/")
        apprenants = client.get(
            f"/api/etablissements/{etablissement.id}/donnees/apprenants/"
        )

        self.assertEqual(profil.status_code, 200)
        self.assertEqual(profil.json()["id"], super_admin.id)
        self.assertEqual(etablissements.status_code, 200)
        self.assertEqual(len(etablissements.json()), 5)
        self.assertEqual(apprenants.status_code, 200)
        self.assertGreater(apprenants.json()["count"], 0)
