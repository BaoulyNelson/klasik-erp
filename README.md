# Klasik ERP

Application de gestion éducative multi-établissements : React, TypeScript, Vite et Tailwind côté interface; Django REST Framework côté API.

## Prérequis

- Node.js 24.12 ou supérieur et npm.
- Python 3.11 ou supérieur.
- Bun n’est pas requis pour utiliser le projet; le fichier `bun.lock` est conservé.
- SQLite pour le démarrage local; PostgreSQL pour un déploiement.

## Installation et lancement

1. Installer les dépendances React :

   ```powershell
   npm ci
   ```

2. Activer le mode développement Django dans le terminal PowerShell :

   ```powershell
   $env:DJANGO_DEBUG = "true"
   $env:DJANGO_ALLOWED_HOSTS = "127.0.0.1,localhost,testserver"
   $env:DJANGO_CORS_ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
   $env:DJANGO_CSRF_TRUSTED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
   ```

   Ces variables sont propres au terminal et peuvent aussi être placées dans le fichier local `.env` à la racine, ignoré par Git. `VITE_SOURCE_DONNEES=local` conserve le mode local; `VITE_SOURCE_DONNEES=api` active l’authentification Django, le chargement des collections autorisées et leur synchronisation CRUD.

3. Utiliser l’environnement Python `backend\venv` (le créer uniquement pour une nouvelle installation), installer les dépendances et appliquer les migrations :

   ```powershell
   if (-not (Test-Path backend\venv\Scripts\python.exe)) { py -3 -m venv backend\venv }
   backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
   backend\venv\Scripts\python.exe backend\manage.py migrate
   backend\venv\Scripts\python.exe backend\manage.py seed_demo
   ```

4. Lancer l’API et l’interface dans deux terminaux :

   ```powershell
   .\backend\venv\Scripts\Activate.ps1
   npm run dev:api
   ```

   ```powershell
   $env:VITE_SOURCE_DONNEES = "api"
   npm run dev
   ```

L’interface est disponible à `http://localhost:3000/`, l’API à `http://127.0.0.1:8000/api/`, la santé à `/api/sante/` et la documentation OpenAPI à `/api/docs/`. En développement, Vite relaie les appels `/api/` vers Django; pour un autre domaine, régler `VITE_API_URL` et `DJANGO_CORS_ALLOWED_ORIGINS`.

## Variables d’environnement

- Frontend : `VITE_API_URL` (par défaut `/api`), `VITE_SOURCE_DONNEES` (`local` par défaut ou `api`) et `VITE_DEMO_PUBLIQUE` (désactivée par défaut; n’affiche qu’un lien de demande de démonstration, jamais de compte ni de connexion rapide). En production, le frontend force le mode API et exclut les comptes d’exemple du bundle.
- Backend local : `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CORS_ALLOWED_ORIGINS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `DJANGO_GOOGLE_CLIENT_ID` pour la connexion Google et, si nécessaire, les variables `DB_*`.
- Backend en production : `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false`, hôtes/origines HTTPS explicites, PostgreSQL, cache partagé et SMTP; les détails sont ci-dessous.
- Déploiement Compose : copiez `.env.example` vers `.env`, remplacez les valeurs `remplacer-*`, et configurez les variables `VITE_FIREBASE_*`/`DJANGO_GOOGLE_CLIENT_ID` uniquement si la connexion Google doit être activée. Sans configuration Firebase, le bouton Google reste désactivé avec un message explicite.
- Ne copiez aucune clé privée, valeur `.env` ou configuration Firebase locale dans un commit. `firebase-applet-config.json` est ignoré par Git.

En mode API, les connexions démo sont désactivées par défaut. L’endpoint `/api/auth/demo/` répond 404 sauf si `DJANGO_DEBUG=true` et `DEMO_PUBLIQUE_ACTIVE=true`; il n’accepte que les comptes marqués `est_compte_demo`. Cette option n’est pas à définir en production et aucun écran frontend ne l’expose. Pour créer un compte de test local, utilisez `backend\venv\Scripts\python.exe backend\manage.py creer_compte_test <courriel> <ROLE>`; son mot de passe temporaire est affiché une seule fois et le changement est exigé à la première connexion. La création autonome d’établissement est limitée à trois tentatives par heure et crée son fondateur et ses premières données relationnelles dans une transaction. La connexion Google exige `DJANGO_GOOGLE_CLIENT_ID`; les jetons Google sont vérifiés par Django, et les comptes nouveaux n’ont pas de mot de passe local. Les sessions API du navigateur utilisent des cookies `HttpOnly`, avec protection CSRF; les JWT ne sont plus stockés dans `sessionStorage`. La récupération de mot de passe utilise un code à usage unique envoyé par courriel via Django; en développement, le backend console et l’aperçu du code sont disponibles.

Le mode `local` authentifie uniquement les comptes locaux disposant d’un mot de passe; il ne recherche pas les utilisateurs Django. Pour se connecter avec un compte Django, y compris un super-administrateur, régler `VITE_SOURCE_DONNEES=api`, démarrer l’API et utiliser son adresse courriel et son mot de passe. Aucun alias de connexion ni raccourci de rôle n’est accepté. Un super-administrateur plateforme authentifié est redirigé vers son espace protégé; les autres rôles ne disposent pas de la permission `plateforme:gerer`.

## Vérifications

```powershell
npm run lint
npm run build
npm run test:public-build
npm run backend:check
npm run backend:test
```

Le backend fournit une authentification JWT transportée par cookies `HttpOnly`, profil courant, `/api/sante/`, OpenAPI, la création autonome des établissements, la fédération Google vérifiée côté serveur, la liste et la gestion des comptes, le journal d’audit limité par tenant, un magasin de données JSON de compatibilité, la commande `seed_demo`, des endpoints protégés de téléversement/téléchargement (25 Mo maximum) et la gestion API des surcharges RBAC autorisées. Le client en mode API charge les collections autorisées, synchronise leurs créations, modifications et suppressions, et récupère les fichiers avec contrôle des droits côté serveur. Les permissions filtrent les tenants et les périmètres Parent/Apprenant/Enseignant. La suppression du stockage JSON et de Firebase, la parité E2E complète et les parcours de production de tous les rôles restent à prouver; voir les rapports de phase dans `docs/`.

## Documentation

- [`docs/AUDIT.md`](docs/AUDIT.md) : entités, données, appels et règles existantes.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : architecture et matrice des permissions.
- [`docs/HYPOTHESES.md`](docs/HYPOTHESES.md) : ambiguïtés et décisions à valider.
- [`docs/API.md`](docs/API.md) : endpoints actuellement disponibles.
- [`docs/RAPPORT_PHASE_2.md`](docs/RAPPORT_PHASE_2.md), [`docs/RAPPORT_PHASE_3.md`](docs/RAPPORT_PHASE_3.md) et [`docs/RAPPORT_PHASE_5.md`](docs/RAPPORT_PHASE_5.md) : changements, vérifications et limites des phases réalisées.
- [`backend/README.md`](backend/README.md) : installation et configuration Django.

## Déploiement avec Docker Compose

La pile Compose est configurée pour une **mise en production derrière un proxy TLS de confiance**. Elle exige les variables suivantes dans un fichier `.env` à la racine (ignoré par Git) : `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CORS_ALLOWED_ORIGINS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `DJANGO_EMAIL_HOST` et `DJANGO_DEFAULT_FROM_EMAIL`. Les variables SMTP `DJANGO_EMAIL_HOST_USER` et `DJANGO_EMAIL_HOST_PASSWORD` sont facultatives si le relais n’exige pas d’authentification; le port TLS par défaut est 587.

Générez une clé Django privée et un mot de passe de base de données uniques, puis configurez le domaine réel dans les hôtes et origines. Ne réutilisez pas les valeurs d’un environnement de développement. La pile :

- ne publie PostgreSQL ni Django directement sur l’hôte;
- lie le frontend à `127.0.0.1:3000` par défaut, derrière un proxy TLS externe qui doit transmettre `X-Forwarded-Proto: https` et l’adresse cliente dans `X-Forwarded-For` (par défaut, deux proxies sont comptés);
- applique les migrations, crée le cache partagé, collecte les fichiers statiques et démarre Gunicorn;
- exige SMTP, HTTPS, une clé secrète et les origines/hôtes explicitement configurés; HSTS s’applique aux sous-domaines, qui doivent eux aussi être en HTTPS.

Une fois le fichier `.env` configuré :

```powershell
docker compose up --build -d
```

La sauvegarde PostgreSQL s’effectue avec `backend\venv\Scripts\python.exe scripts\backup_postgresql.py`; par défaut, le fichier est écrit dans `%USERPROFILE%\klasik-erp-backups` (configurable avec `KLASIK_BACKUP_DIR`). Les sauvegardes peuvent contenir des données personnelles : protégez leur accès, chiffrez-les avant tout stockage externe et vérifiez régulièrement une restauration sur une base isolée. Aucun nettoyage automatique des sauvegardes n’est configuré.

Le frontend conserve sa source locale par défaut en développement et peut être lancé en mode API. En production, il utilise toujours l’API. Certaines fonctions restent locales et les modèles métier utilisent actuellement un stockage JSON commun. Les rapports de phases listent les écarts qui empêchent encore d’annoncer la parité complète ou de supprimer Firebase.
