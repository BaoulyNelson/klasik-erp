# Rapport de sous-phase 2B — Campus numérique/LMS relationnel

## Créé

- Application Django `campus_numerique` avec ressources LMS, devoirs et remises.
- Migrations relationnelles et de données depuis la table JSON.
- Endpoints typés pour les trois collections.
- Action métier `devoirs_lms/{id}/clôturer`.
- Branchement frontend API des trois collections.

## Vérifications réellement exécutées

- Migrations appliquées.
- `manage.py test api` : 32 tests réussis.
- `manage.py check` : réussi.
- `makemigrations --check --dry-run` : aucune migration manquante.
- `npm run lint` : réussi.
- `npm run build` : réussi.

## Limites

- Les pièces jointes restent stockées comme JSON imbriqué dans les devoirs/remises; les références sont liées aux fichiers déjà migrés séparément.
- Le chargement des créations/modifications détail des relations doit être renforcé par des validateurs d’unité/élément/apprenant.
