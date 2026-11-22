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

   Les fichiers `.env` sont ignorés par Git. `VITE_SOURCE_DONNEES=local` conserve le comportement actuel de l’interface; l’API Django est en cours de branchement par phases.

3. Créer l’environnement Python et appliquer les migrations :

   ```powershell
   py -3 -m venv backend\.venv
   backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
   .\backend\.venv\Scripts\Activate.ps1
   npm run backend:migrate
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

- Frontend : `VITE_API_URL` (par défaut `/api`) et `VITE_SOURCE_DONNEES` (`local` par défaut, `api` prévu pour le branchement ultérieur).
- Backend : `backend/.env.example` documente la clé Django, le mode debug, les hôtes/origines, SQLite et les paramètres PostgreSQL.
- Ne copiez aucune clé privée, valeur `.env` ou configuration Firebase locale dans un commit. `firebase-applet-config.json` est ignoré par Git.

## Vérifications

```powershell
npm run lint
npm run build
npm run backend:check
npm run backend:test
```

Le backend actuel fournit JWT, profil courant, `/api/sante/`, OpenAPI et l’administration des utilisateurs. Les modèles métier, la commande `seed_demo`, les listes CRUD, l’authentification React via Django et l’isolation serveur par établissement ne sont pas encore terminés; voir les rapports de phase dans `docs/`.

## Documentation

- [`docs/AUDIT.md`](docs/AUDIT.md) : entités, données, appels et règles existantes.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : architecture et matrice des permissions.
- [`docs/HYPOTHESES.md`](docs/HYPOTHESES.md) : ambiguïtés et décisions à valider.
- [`docs/API.md`](docs/API.md) : endpoints actuellement disponibles.
- [`backend/README.md`](backend/README.md) : installation et configuration Django.

## État de migration

Le frontend reste visuellement inchangé et conserve sa source de données locale par défaut. Les phases 2 à 6 doivent implémenter les modèles/fixtures, l’isolation multitenant, le client API, le branchement des domaines, les fichiers et le durcissement avant qu’une utilisation métier via Django ou la suppression de Firebase soit annoncée.
