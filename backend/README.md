# Backend Klasik ERP

API REST Django 5 + Django REST Framework. Le backend ne rend pas les pages de l’application React.

## Prérequis

- Python 3.11 ou supérieur.
- SQLite pour le démarrage local; PostgreSQL 14 ou supérieur pour un environnement PostgreSQL.

## Installation locale sous Windows PowerShell

Depuis la racine du projet :

```powershell
py -3 -m venv backend\.venv
backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
.\backend\.venv\Scripts\Activate.ps1
backend\.venv\Scripts\python backend\manage.py migrate
backend\.venv\Scripts\python backend\manage.py runserver 127.0.0.1:8000
```

Le fichier `backend\.env` est local et ignoré par Git. Remplacez `DJANGO_SECRET_KEY` par une valeur aléatoire privée avant tout déploiement. Ne partagez jamais ce fichier.

## Configuration

`DB_ENGINE=sqlite` utilise `backend/db.sqlite3`. Pour PostgreSQL, définir `DB_ENGINE=postgresql`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` et `DB_PORT`. Les origines CORS, hôtes autorisés, mode debug et paramètres HTTPS se configurent dans `backend/.env`; consultez `backend/.env.example`.

## Commandes

- `python backend/manage.py check`
- `python backend/manage.py migrate`
- `python backend/manage.py test api`
- `python backend/manage.py createsuperuser`

Les scripts `npm run backend:check`, `npm run backend:migrate` et `npm run backend:test` lancent les commandes avec le Python disponible dans le `PATH`. `npm run dev:api` démarre l’API; dans un second terminal `npm run dev` démarre React. Vite relaie `/api/` vers `http://127.0.0.1:8000`.

Les endpoints du socle et leurs contrats sont décrits dans [`../docs/API.md`](../docs/API.md). La commande `seed_demo` et les endpoints métier seront ajoutés aux phases suivantes; ils ne sont pas encore disponibles.

## Déploiement

Utilisez PostgreSQL, une clé `DJANGO_SECRET_KEY` privée, `DJANGO_DEBUG=false`, des `DJANGO_ALLOWED_HOSTS` et origines CORS explicites, HTTPS, `DJANGO_SECURE_SSL_REDIRECT=true` et `DJANGO_SECURE_HSTS_SECONDS=31536000`. Le modèle `.env.example` est réglé pour le développement local : ne le déployez pas sans adapter ces paramètres. Ne publiez pas `MEDIA_ROOT` directement avant d’avoir défini et appliqué les permissions de fichiers par tenant.
