# Rapport de sous-phase 2B — Communication relationnelle

## Créé

- Application Django `communication` avec `MessageCommunication`, `Notification` et `ArticleActualite`.
- Migrations relationnelles et de données depuis la table JSON.
- Endpoints typés pour communications, notifications et actualités.
- Action `notifications/{id}/marquer-lue/` et filtrage des actualités selon l’audience Parent/Apprenant.
- Seed direct des trois collections et vérification des totaux.
- Branchement du frontend API sur les trois collections.

## Vérifications réellement exécutées

- Migrations appliquées et seed idempotent exécuté.
- `manage.py test api` : 32 tests réussis.
- `manage.py check` : réussi.
- `makemigrations --check --dry-run` : aucune migration manquante.
- `npm run lint` : réussi.
- `npm run build` : réussi.

## Limites

- Les messageries/threads existants restent à modéliser dans les prochaines sous-phases communication.
- Aucun changement visuel ni suppression de code Firebase effectué.
