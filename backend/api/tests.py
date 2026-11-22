import json

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from io import StringIO
from unittest.mock import patch
from rest_framework.test import APIClient
from comptes.models import AffiliationEtablissement
from donnees.models import EnregistrementMetier, FichierTeleverse
from etablissements.models import Etablissement

Utilisateur = get_user_model()


class TestsAuthentificationApi(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.utilisateur = Utilisateur.objects.create_user(
            courriel="test@example.org",
            password="MotDePasseDeTest-2026",
            nom_complet="Compte de test",
            role="ENSEIGNANT",
        )

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

    def test_connexion_refuse_un_mot_de_passe_invalide_en_francais(self):
        reponse = self.client.post(
            "/api/auth/token/",
            {"courriel": "test@example.org", "password": "incorrect"},
            format="json",
        )

        self.assertEqual(reponse.status_code, 401)
        self.assertIn("message", reponse.json())
        self.assertIn("identifiants invalides", reponse.json()["message"])

    def test_profil_courant_refuse_une_requete_anonyme(self):
        reponse = self.client.get("/api/auth/me/")

        self.assertEqual(reponse.status_code, 401)
        self.assertIn("message", reponse.json())

    def test_connexion_demo_est_disponible_uniquement_en_developpement(self):
        with override_settings(DEBUG=True):
            reponse = self.client.post(
                "/api/auth/demo/",
                {"id_utilisateur": self.utilisateur.id},
                format="json",
            )

        self.assertEqual(reponse.status_code, 200)
        self.assertIn("access", reponse.json())
        self.assertIn("refresh", reponse.json())

        with override_settings(DEBUG=False):
            reponse_production = self.client.post(
                "/api/auth/demo/",
                {"id_utilisateur": self.utilisateur.id},
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
        self.assertFalse(
            EnregistrementMetier.objects.filter(
                etablissement=self.etablissement,
                collection="apprenants",
                id_objet="apprenant-crud",
            ).exists()
        )

    def test_connexion_demo_refuse_un_etablissement_non_affilie(self):
        with override_settings(DEBUG=True):
            reponse = self.client.post(
                "/api/auth/demo/",
                {
                    "id_utilisateur": self.utilisateur.id,
                    "id_etablissement": self.autre_etablissement.id,
                },
                format="json",
            )

        self.assertEqual(reponse.status_code, 403)


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

    def test_session_demo_seedee_accede_aux_etablissements_et_collections(self):
        call_command("seed_demo", stdout=StringIO())
        client = APIClient()
        super_admin = Utilisateur.objects.get(est_super_admin_plateforme=True)
        etablissement = Etablissement.objects.first()

        with override_settings(DEBUG=True):
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
