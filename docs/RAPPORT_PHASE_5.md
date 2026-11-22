# Rapport de phase 5 — Fichiers téléversés

## Créé et modifié

- Ajout du modèle `FichierTeleverse` et de la migration `0002_fichierteleverse`, avec établissement, propriétaire, nom, type MIME, taille et stockage sous `MEDIA_ROOT` dans un chemin isolé par établissement.
- Ajout de `POST /api/etablissements/{id_etablissement}/fichiers/` pour les dépôts multipart de 25 Mo maximum. Les rôles autorisés sont Enseignant avec `pedagogie:noter` et Apprenant avec `portail:apprenant`.
- Ajout de `GET /api/fichiers/{id_fichier}/` : accès au propriétaire ou aux utilisateurs autorisés à lire un enregistrement du même établissement qui référence le fichier. Les accès interdits et les fichiers inconnus répondent 404.
- Contrôle du nom de fichier, du type MIME, des fichiers vides, du plafond de taille et des en-têtes de téléchargement (`nosniff`, cache privé).
- Branchement des dépôts, aperçus et téléchargements du Campus numérique en mode API; le mode local conserve son stockage IndexedDB/mémoire. En mode API, une lecture de fichier passe toujours par le serveur pour refaire la vérification d’autorisation.
- Mise à jour de `docs/API.md` et `README.md`; aucun fichier existant supprimé et aucun changement de style n’a été effectué.

## Vérifications exécutées

- `manage.py test api.tests.TestsFichiersTenant` : 3 tests réussis, couvrant dépôt/téléchargement, visibilité inter-rôles d’un fichier référencé, isolation entre établissements, dépassement de taille et refus d’un rôle sans droit de dépôt.
- `manage.py test api` : 18 tests réussis, y compris le cas positif de partage inter-rôles.
- `manage.py check` : réussi.
- `manage.py makemigrations --check --dry-run` : aucune migration manquante.
- `npm run lint` : réussi.
- `npm run build` : réussi. Vite signale toujours le chunk principal supérieur à 500 Ko; avertissement non bloquant.

## État et limites

La phase fichiers est **partielle**. Les documents générés et les autres domaines métier ne sont pas tous migrés; les notifications et le temps réel restent à traiter si l’audit confirme un besoin. Le modèle métier commun reste stocké en JSON. Le nettoyage physique d’un fichier après suppression de sa dernière référence n’est pas encore automatisé. Le contrôle des références parcourt les collections auxquelles l’utilisateur a accès; une optimisation ou un index dédié sera nécessaire si le volume augmente.

## Fichiers créés ou modifiés

- Créés : `backend/api/file_views.py`, `backend/donnees/migrations/0002_fichierteleverse.py`, `docs/RAPPORT_PHASE_5.md`.
- Modifiés : `backend/api/tests.py`, `backend/api/urls.py`, `backend/donnees/models.py`, `src/modules/campus_numerique/VueCampusNumerique.tsx`, `src/services/clientApi.ts`, `src/services/service_fichiers_locaux.ts`, `docs/API.md`, `README.md`.
- Supprimés : aucun.
