# Rapport de phase 6 — Parité, nettoyage et durcissement

## Réalisé

- Réduction des usages métier vers l’API pour les domaines principaux.
- Modèles relationnels par domaine prioritaires avec migrations.
- Tests Django tenant/autorisations/actions.
- Build TypeScript et build Vite réussis.

## Non terminé ou non vérifié

- Comparaison Playwright local/API avec captures et textes.
- Matrice exhaustive de tous les rôles et établissements.
- Suppression Firebase et dépendances, après preuve de parité complète.
- Découpage du bundle sous 500 Ko.
- Audit N+1 PostgreSQL complet.
- Limitation de débit centralisée sur authentification/réinitialisation.
- Docker Compose backend/base/frontend.
- Cookies HttpOnly et CSRF pour les jetons.
- Sauvegardes PostgreSQL documentées.
- Suppression séparée et réversible de `EnregistrementMetier`.

Ces éléments sont reportés explicitement plutôt que prétendus terminés.
