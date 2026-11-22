# Rapport de phase 3B — Authentification et récupération de compte

## Réalisé

- Codes de réinitialisation aléatoires de six chiffres, stockés sous forme hachée, à usage unique et expirant après 15 minutes.
- Envoi du code par courriel via SMTP en production et console en développement; la réponse publique ne révèle pas l’existence du compte et n’expose pas le code en production.
- Limitation du débit de la connexion (10/minute), des demandes de réinitialisation (3/heure) et des confirmations (5/heure), avec cache partagé en base hors développement.
- Invalidation du code après cinq tentatives erronées; validation des mots de passe via les validateurs Django.
- Écran React existant branché aux endpoints Django en mode API; le mode local conserve son comportement.
- Verrouillage temporaire après cinq échecs dans le profil utilisateur.
- Endpoint de connexion Google vérifiant `id_token`, `email_verified` et la liaison à un compte Django existant.
- Paquet `google-auth` ajouté aux dépendances backend.

## Sécurité des jetons

Le frontend conserve l’accès et le renouvellement dans `sessionStorage`, conformément à l’implémentation actuelle. Ce choix réduit la persistance après fermeture de l’onglet, mais reste accessible au JavaScript. Une migration vers cookies HttpOnly avec CSRF sera nécessaire pour les environnements publics sensibles; elle n’a pas été substituée silencieusement.

## Vérifications

- Tests d’envoi, de non-divulgation en production, d’usage unique, de mot de passe faible, de verrouillage et de limitation de débit.
- `backend\venv\Scripts\python.exe backend\manage.py test api` : 48 tests réussis.
- `manage.py check` et `makemigrations --check --dry-run` : réussis.
- SMTP réel et vérification navigateur de l’écran : à réaliser avec les accès d’exploitation.
- La connexion Google de l’écran n’est pas encore reliée à l’API; la fédération et la création contrôlée de nouveaux comptes restent à terminer.
