# Rapport de phase 3B — Authentification complète

## Réalisé

- Jetons de réinitialisation hachés, à usage unique et expirant après 30 minutes.
- Endpoint de demande de réinitialisation avec réponse neutralisée et jeton visible uniquement en développement.
- Endpoint de confirmation et changement de mot de passe.
- Verrouillage temporaire après cinq échecs dans le profil utilisateur.
- Endpoint de connexion Google vérifiant `id_token`, `email_verified` et la liaison à un compte Django existant.
- Paquet `google-auth` ajouté aux dépendances backend.

## Sécurité des jetons

Le frontend conserve l’accès et le renouvellement dans `sessionStorage`, conformément à l’implémentation actuelle. Ce choix réduit la persistance après fermeture de l’onglet, mais reste accessible au JavaScript. Une migration vers cookies HttpOnly avec CSRF sera nécessaire pour les environnements publics sensibles; elle n’a pas été substituée silencieusement.

## Vérifications

- Tests de réutilisation impossible du jeton de réinitialisation.
- Tests de verrouillage après tentatives répétées.
- Suite Django complète: 34 tests réussis.
- `manage.py check` et migrations: réussis.
- Vérification navigateur de ces écrans restée à réaliser.
