# Rapport de sous-phase 2B — Documents relationnels

## Créé

- Application Django `documents` avec `DocumentOfficiel`, clés étrangères établissement/apprenant, contraintes d’unicité du numéro par tenant et index utiles.
- Migrations `documents.0001_initial` et `documents.0002_importer_documents_json`.
- Endpoints typés CRUD et action `emettre`.
- Seed direct des documents officiels et vérification des totaux relationnels.
- Branchement du frontend API sur la collection `documents`.

## Vérifications réellement exécutées

- Migrations appliquées et seed idempotent exécuté.
- `manage.py test api` : 32 tests réussis avec les domaines déjà migrés.
- `manage.py check` : réussi.
- `makemigrations --check --dry-run` : aucune migration manquante.
- `npm run lint` : réussi.
- `npm run build` : réussi.

## Limites

- La génération PDF et la QR vérification restent dans le frontend sauf validation ultérieure côté serveur.
- Aucun fichier existant supprimé; la table JSON reste conservée pour compatibilité.
