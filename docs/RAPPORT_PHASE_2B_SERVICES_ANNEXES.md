# Rapport de sous-phase 2B — Services annexes relationnels

## Créé

- Application Django `services_annexes` avec les modèles bibliothèque, emprunts, infirmerie, discipline, inventaire, prêts matériels et anciens.
- Migrations relationnelles `services_annexes.0001_initial` et `0002_importer_services_annexes_json`.
- Endpoints tenant-scopés CRUD pour les sept collections.
- Admin Django enregistré pour les modèles.
- Branchement frontend API des sept collections.

## Vérifications réellement exécutées

- Migration des données JSON vers les modèles relationnels appliquée.
- `manage.py check` : réussi.
- `makemigrations --check --dry-run` : aucune migration manquante.
- `manage.py test api` : 32 tests réussis.
- `npm run lint` : réussi.
- `npm run build` : réussi.

## Limites

- Les actions métier prolonger/solder emprunt et prêt restent à implémenter avec transitions et audit.
- Les sérialiseurs relationnels utilisent des identifiants en lecture seule pour les relations; les créations détaillées exigent encore une passe dédiée.
- `seed_demo` recharge encore les lignes JSON puis la migration initiale importe les relations; les boucles directes idempotentes `update_or_create` restent à ajouter.
