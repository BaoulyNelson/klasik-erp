# Rapport de phase 3B — Authentification et récupération de compte

## Implémenté

- Codes de réinitialisation aléatoires de six chiffres, stockés hachés, à usage unique et valables 15 minutes. Envoi par SMTP en production et console en développement; les réponses publiques ne révèlent pas l’existence du compte.
- Limitation du débit de la connexion (10/minute), des demandes de réinitialisation (3/heure) et des confirmations (5/heure). Cinq codes erronés invalident le code actif; les mots de passe sont validés par les validateurs Django.
- Verrouillage temporaire du compte après cinq échecs de connexion.
- Connexion Google vérifiée côté serveur : audience, adresse courriel vérifiée, liaison au compte existant ou création d’un compte sans mot de passe local.
- Création API d’un établissement avec validation, limitation de débit et transaction atomique; le nouveau fondateur reçoit une session et son affiliation de direction.
- Sessions navigateur transportées par cookies `HttpOnly` d’accès et de renouvellement. Le renouvellement est rotatif; la déconnexion révoque le jeton et supprime les cookies.
- Protection CSRF : `GET /api/auth/csrf/` fournit le jeton à transmettre par `X-CSRFToken`; les connexions, mutations utilisant les cookies, réinitialisations et déconnexions le vérifient. Les cookies sont `Secure` hors mode debug et utilisent `SameSite=Lax`.
- Le frontend ne stocke plus de JWT dans `sessionStorage` ou `localStorage`. Il ne conserve qu’un marqueur de présence de session sans jeton, afin de déclencher la restauration après rechargement. Les JWT en cookie ne sont jamais exposés au JavaScript; les clients non navigateurs peuvent toujours utiliser l’en-tête Bearer.
- L’écran de connexion existant est conservé; les flux API et locaux restent séparés.

## Limites restantes

- Le navigateur intégré n’a pas été utilisé pour vérifier un parcours complet de connexion, renouvellement et déconnexion; les protections ont été vérifiées par tests Django.
- L’intégration réelle avec Google (identifiant client, consentement et fournisseur) reste à configurer et à valider dans l’environnement d’exploitation; les tests Django utilisent un vérificateur simulé.
- L’interface expose un réglage de double facteur, mais une authentification 2FA avec preuve à usage unique n’a pas été démontrée.
- La parité E2E local/API et la matrice complète de rôles/établissements restent à réaliser.
- L’API accepte encore les jetons Bearer pour les clients non navigateur. Les origines CORS/CSRF de production doivent être configurées explicitement.

## Vérifications réellement exécutées

- `backend\venv\Scripts\python.exe backend\manage.py test api` : 66 tests réussis; base de test détruite à la fin.
- `backend\venv\Scripts\python.exe backend\manage.py check` : aucun problème.
- `backend\venv\Scripts\python.exe backend\manage.py makemigrations --check --dry-run` : aucune migration manquante.
- `npm run lint` et `npm run build` à la racine : réussis après restauration des dépendances locales. L’installation signale que certains paquets Firebase demandent Node 24.12 ou plus, alors que l’environnement de validation utilise Node 22.19.
- Le bundle Vite dépasse toujours la limite d’avertissement de 500 Ko (environ 2,06 Mo minifié).
- `npm run build` signale encore un chunk JavaScript de 2,06 Mo minifié; le découpage du bundle reste à faire.
