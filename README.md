# Klasik ERP

Application de gestion éducative multi-établissements : React, TypeScript, Vite et Tailwind côté interface; Django REST Framework côté API.

## Prérequis

- Node.js et npm.
- Python 3.11 ou supérieur.
- Bun n’est pas requis pour utiliser le projet; le fichier `bun.lock` est conservé.
- SQLite pour le démarrage local; PostgreSQL pour un déploiement.

## Installation et lancement

1. Installer les dépendances React :

   ```powershell
   npm install
   ```

2. Créer les fichiers de configuration locaux :

   ```powershell
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
   ```

   Les fichiers `.env` sont ignorés par Git. `VITE_SOURCE_DONNEES=local` conserve le mode local; `VITE_SOURCE_DONNEES=api` active l’authentification Django, le chargement des collections autorisées et leur synchronisation CRUD.

3. Créer l’environnement Python et appliquer les migrations :

   ```powershell
   py -3 -m venv backend\.venv
   backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
   .\backend\.venv\Scripts\Activate.ps1
   npm run backend:migrate
   npm run backend:seed
   ```

4. Lancer l’API et l’interface dans deux terminaux :

   ```powershell
   npm run dev:api
   ```

   ```powershell
   npm run dev
   ```

L’interface est disponible à `http://localhost:3000/`, l’API à `http://127.0.0.1:8000/api/`, la santé à `/api/sante/` et la documentation OpenAPI à `/api/docs/`. En développement, Vite relaie les appels `/api/` vers Django; pour un autre domaine, régler `VITE_API_URL` et `DJANGO_CORS_ALLOWED_ORIGINS`.

## Variables d’environnement

- Frontend : `VITE_API_URL` (par défaut `/api`) et `VITE_SOURCE_DONNEES` (`local` par défaut ou `api`).
- Backend : `backend/.env.example` documente la clé Django, le mode debug, les hôtes/origines, SQLite et les paramètres PostgreSQL.
- Ne copiez aucune clé privée, valeur `.env` ou configuration Firebase locale dans un commit. `firebase-applet-config.json` est ignoré par Git.

En mode API et en développement (`DJANGO_DEBUG=true`), l’écran garde ses comptes démo et l’API délivre un JWT pour le compte sélectionné. Ce mécanisme de démonstration est désactivé si `DEBUG=false`. Les connexions réelles utilisent courriel et mot de passe Django. Les comptes importés par `seed_demo` n’ont pas de mot de passe utilisable : un administrateur doit leur en définir un. La connexion Google et la récupération de mot de passe ne sont pas encore reliées à Django.

## Vérifications

```powershell
npm run lint
npm run build
npm run backend:check
npm run backend:test
```

Le backend fournit JWT, profil courant, `/api/sante/`, OpenAPI, la liste des utilisateurs, la gestion des comptes, le journal d’audit limités par tenant, la mise à jour des paramètres d’établissement, un magasin de données JSON, la commande `seed_demo`, des endpoints protégés de téléversement/téléchargement (25 Mo maximum) et la gestion API des surcharges RBAC autorisées. Le client en mode API charge les collections autorisées, synchronise leurs créations, modifications et suppressions, et récupère les fichiers avec contrôle des droits côté serveur. Les permissions filtrent les tenants et les périmètres Parent/Apprenant/Enseignant. Les modèles métier relationnels détaillés, la fédération Google et la récupération de mot de passe doivent encore être complétés; voir les rapports de phase dans `docs/`.

## Documentation

- [`docs/AUDIT.md`](docs/AUDIT.md) : entités, données, appels et règles existantes.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : architecture et matrice des permissions.
- [`docs/HYPOTHESES.md`](docs/HYPOTHESES.md) : ambiguïtés et décisions à valider.
- [`docs/API.md`](docs/API.md) : endpoints actuellement disponibles.
- [`docs/RAPPORT_PHASE_2.md`](docs/RAPPORT_PHASE_2.md), [`docs/RAPPORT_PHASE_3.md`](docs/RAPPORT_PHASE_3.md) et [`docs/RAPPORT_PHASE_5.md`](docs/RAPPORT_PHASE_5.md) : changements, vérifications et limites des phases réalisées.
- [`backend/README.md`](backend/README.md) : installation et configuration Django.

## État de migration

## Déploiement Docker local

```powershell
$env:POSTGRES_PASSWORD="mot-de-passe-fort"
docker compose up --build
```

Cette configuration lance PostgreSQL, Django sur `8000` et le frontend/nginx sur `3000`, avec le proxy `/api/` vers Django.

Le frontend conserve sa source locale par défaut et peut être lancé en mode API. Les deux modes d’authentification et les données de démonstration sont disponibles; certaines fonctions restent locales et les modèles métier utilisent actuellement un stockage JSON commun. Les rapports de phases listent les écarts qui empêchent encore d’annoncer la parité complète ou de supprimer Firebase.
