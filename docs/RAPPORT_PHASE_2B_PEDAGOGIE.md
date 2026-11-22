# Rapport de sous-phase 2B — Pédagogie relationnelle

## Créé et modifié

- Ajout de l’application Django `pedagogie` avec les modèles relationnels `PersonnelEnseignant`, `NoteEvaluation`, `Presence`, `CreneauEmploiDuTemps`, `EvenementCalendrier`, `EntreeCahierTextes` et `Soutenance`.
- Ajout des clés étrangères vers l’établissement, les apprenants, unités, éléments et personnels.
- Ajout des contraintes d’unicité, des contrôles de note/présence et des index utiles.
- Ajout des migrations `pedagogie.0001_initial` et `pedagogie.0002_importer_pedagogie_json`.
- Ajout des endpoints typés pour enseignants, notes, présences, emploi du temps, calendrier, cahiers de textes et soutenances.
- Ajout de l’action `POST /api/etablissements/{id_etablissement}/notes/{id}/publier/`, qui vérifie `pedagogie:noter` et verrouille une note publiée.
- Mise à jour de `seed_demo` pour alimenter les nouvelles relations directement, vérifier les totaux attendus par tenant et conserver les données JSON anciennes pour compatibilité.
- Branchement du frontend API sur les sept nouvelles collections typées.
- Aucun changement visuel de composant ni suppression d’ancienne table JSON.

## Vérifications réellement exécutées

- `manage.py migrate --noinput` : migrations pédagogie appliquées.
- `manage.py seed_demo` : exécuté deux fois avec succès pour prouver l’idempotence.
- Vérifications relationnelles incluses dans le seed : comparaisons des totaux JSON et modèles par tenant pour enseignants, notes, présences, emplois du temps, calendrier, cahiers et soutenances.
- `manage.py test api` : 30 tests réussis.
- `manage.py check` : réussi.
- `makemigrations --check --dry-run` : aucune migration manquante.
- `npm run lint` : réussi.
- `npm run build` : réussi.
- Le build conserve l’avertissement non bloquant lié au chunk principal supérieur à 500 Ko.

## Tests ajoutés

- Contrat `snake_case` d’une note relationnelle.
- Publication et verrouillage d’une note.
- Refus de modification d’une note publiée.
- Isolation tenant des événements de calendrier.

## Limites

- Les mises à jour détaillées des creneaux, cahiers et soutenances restent sans relation complète à toutes les actions métier explicites; elles sont disponibles via le CRUD typé avec permissions.
- Les domaines finances, documents, communication, services annexes, LMS, RGPD, imports et badges restent à migrer.
- Le parcours navigateur local/API pédagogique n’a pas encore été capturé dans cette sous-phase.
- L’ancienne table JSON reste conservée pour compatibilité jusqu’à validation de tous les domaines.
