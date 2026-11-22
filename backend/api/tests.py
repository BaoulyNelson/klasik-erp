import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

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
