# Rapport de phase 0 — Audit

## Résultat

- Branche de travail : `feature/backend-django`.
- Dépôt initialisé localement parce que le dossier n’était pas un dépôt Git.
- Rapports créés : `AUDIT.md`, `ARCHITECTURE.md`, `HYPOTHESES.md`.
- `.gitignore` protège `.env*`, `firebase-applet-config.json`, les environnements Python locaux et les sorties générées. Le fichier `.env` existant est ignoré; son contenu n’a pas été lu ou affiché.
- Aucun fichier existant supprimé ou déplacé.

## Constats importants

- Les données métier et mutations actuelles sont locales dans `ContexteErp`/fixtures; Firestore ne contient actuellement que le profil utilisateur et ses règles refusent toutes les autres collections.
- Les données persistées dans `localStorage` comprennent tout l’état métier et la session; les pièces jointes sont en IndexedDB/mémoire.
- L’autorisation varie par rôle et établissement; les règles métier du frontend ne sont pas une barrière d’accès serveur.
- Le modèle TypeScript est en `snake_case`, contrairement à la demande de wire-format camelCase; la décision provisoire et les autres ambiguïtés sont dans `HYPOTHESES.md`.

## Vérification de phase

- `git check-ignore .env` a confirmé que `.env` est ignoré.
- Audit documentaire et examen des sources terminés; aucune commande de test n’est requise pour cette phase documentaire.
- La phase 1 doit fournir le socle technique. La parité CRUD, la seed, l’authentification fédérée, les tests négatifs de tenant et les comparaisons d’écran restent à valider dans les phases ultérieures.
