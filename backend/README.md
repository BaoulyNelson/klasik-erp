# Backend Klasik ERP

API REST Django 5 + Django REST Framework. Le backend ne rend pas les pages de l’application React.

## Prérequis

- Python 3.11 ou supérieur.
- SQLite pour le démarrage local; PostgreSQL 14 ou supérieur pour un environnement PostgreSQL.

## Installation locale sous Windows PowerShell

Depuis la racine du projet :

```powershell
if (-not (Test-Path backend\venv\Scripts\python.exe)) { py -3 -m venv backend\venv }
backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
$env:DJANGO_DEBUG = "true"
$env:DJANGO_ALLOWED_HOSTS = "127.0.0.1,localhost,testserver"
$env:DJANGO_CORS_ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
$env:DJANGO_CSRF_TRUSTED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
.\backend\venv\Scripts\Activate.ps1
backend\venv\Scripts\python.exe backend\manage.py migrate
backend\venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
```

Ces variables de développement ne sont valables que dans le terminal courant; elles peuvent être enregistrées dans le fichier `.env` à la racine du dépôt, ignoré par Git. `DJANGO_FRONTEND_URL` est utilisée dans les invitations (par défaut, la première origine CORS, soit `http://localhost:3000`). Le courriel d’accès indique l’établissement, le rôle et si le changement du mot de passe est exigé; le mot de passe temporaire est communiqué séparément. Configurez `DJANGO_EMAIL_HOST`, `DJANGO_EMAIL_PORT`, `DJANGO_EMAIL_HOST_USER`, `DJANGO_EMAIL_HOST_PASSWORD` et `DJANGO_DEFAULT_FROM_EMAIL` pour une vraie livraison SMTP en développement; sans hôte SMTP, les courriels restent visibles dans la console. Le mode test conserve un backend courriel local.

## Configuration

`DB_ENGINE=sqlite` utilise `backend/db.sqlite3`. Pour PostgreSQL, définir `DB_ENGINE=postgresql`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` et `DB_PORT`. La connexion Google est activée en configurant `DJANGO_GOOGLE_CLIENT_ID` avec l’identifiant OAuth client utilisé par le fournisseur Google du frontend; sans cette valeur, l’endpoint échoue en mode fermé. En production, la clé secrète, les hôtes, origines CORS/CSRF, HTTPS, le cache partagé en base et le relais SMTP sont obligatoires. `DJANGO_DEBUG` vaut `false` par défaut; en développement, activez-le explicitement. La connexion sans mot de passe à un compte de démonstration renvoie 404 par défaut; elle ne peut être activée qu’en développement avec `DEMO_PUBLIQUE_ACTIVE=true` et n’accepte que les comptes marqués `est_compte_demo`.

Pour créer un compte de test local avec un mot de passe temporaire affiché une seule fois, exécutez `python manage.py creer_compte_test <courriel> <ROLE>` (par exemple `python manage.py creer_compte_test test@example.org ENSEIGNANT`). Le compte devra changer ce mot de passe à sa première connexion.

## Commandes

- `python backend/manage.py check`
- `python backend/manage.py migrate`
- `python backend/manage.py seed_demo`
- `python backend/manage.py creer_compte_test test@example.org ENSEIGNANT`
- `python backend/manage.py test api`
- `python backend/manage.py createsuperuser`

Les commandes de vérification doivent utiliser `backend\venv\Scripts\python.exe`. Activez d’abord l’environnement `backend\venv`; `npm run dev:api` démarre l’API et, dans un second terminal, `npm run dev` démarre React. Vite relaie `/api/` vers `http://127.0.0.1:8000`.

Les endpoints du socle, les permissions et les collections tenant-scopées sont décrits dans [`../docs/API.md`](../docs/API.md). `seed_demo` charge les fixtures des modules de données; les mots de passe de démonstration sont supprimés et les comptes importés n’ont pas de mot de passe utilisable. Créez un compte d’administration avec `createsuperuser` pour gérer les comptes serveur. La création d’établissement est disponible via `POST /api/etablissements/` : le serveur valide les coordonnées, crée le compte fondateur sans doublon et rattache l’établissement dans une transaction atomique.

Le formulaire public de contact transmet ses demandes à `POST /api/contact/`. Le point d’accès valide les champs, applique une limite de cinq envois par heure et utilise `DJANGO_SUPPORT_EMAIL` comme destinataire (par défaut `DJANGO_DEFAULT_FROM_EMAIL`); un relais SMTP doit être configuré pour la livraison réelle.

## Déploiement

Utilisez Docker Compose derrière un proxy TLS de confiance. Compose exige une clé `DJANGO_SECRET_KEY` privée, `DJANGO_DEBUG=false`, des `DJANGO_ALLOWED_HOSTS` et origines CORS/CSRF explicites, HTTPS, `DJANGO_SECURE_SSL_REDIRECT=true`, un cache PostgreSQL partagé et un relais SMTP. Le proxy TLS doit transmettre `X-Forwarded-Proto: https`; PostgreSQL et Gunicorn ne sont pas publiés sur l’hôte. Gunicorn applique les migrations et collecte les fichiers statiques au démarrage. Les sauvegardes se créent depuis la racine avec `backend\venv\Scripts\python.exe scripts\backup_postgresql.py`; elles vont par défaut dans `klasik-erp-backups` sous le profil utilisateur, ou dans `KLASIK_BACKUP_DIR`. Stockez-les de façon chiffrée et vérifiez la restauration sur une base isolée. Ne publiez pas `MEDIA_ROOT` directement avant d’avoir défini et appliqué les permissions de fichiers par tenant.
