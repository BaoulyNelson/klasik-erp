# Rapport de sous-phase 2B — Établissements et scolarité relationnels

## Créé et modifié

- Ajout de l’application Django `scolarite` avec les modèles `UniteAcademique`, `ElementPedagogique`, `Apprenant`, `ContactTuteur`, `InscriptionApprenant` et `EcheancePaiement`.
- Ajout des contraintes d’unicité tenant/code, tenant/matricule, tenant/numéro d’inscription, des contraintes d’assiduité et d’étape, des index tenant/unité et tenant/statut, et des relations `ForeignKey`.
- Ajout des champs typés des établissements et du modèle `CompteBancaire`.
- Ajout des migrations de données `etablissements.0003_importer_configuration_typed` et `scolarite.0002_importer_scolarite_json`.
- L’ancienne table `EnregistrementMetier` est conservée comme compatibilité; aucune suppression n’a été effectuée.
- Ajout d’endpoints typés pour les unités, éléments, apprenants et inscriptions, avec pagination DRF, filtres, recherche, tri, isolation tenant et action `POST .../inscriptions/{id}/annuler/`.
- Branchement du frontend API sur les quatre ressources typées pour le chargement, les créations, modifications et suppressions.
- Mise à jour de `seed_demo` pour alimenter directement les modèles relationnels et vérifier les totaux attendus par tenant.
- Ajout de tests de contrat `snake_case`, d’isolation tenant et d’annulation d’inscription.

## Fichiers créés ou modifiés

- Créés : application `backend/scolarite/`, migrations `backend/etablissements/0003_*`, `backend/scolarite/0002_*`, `docs/RAPPORT_PHASE_2B.md`, schéma de travail `backend/schema_phase2b.yaml`.
- Modifiés : configuration Django, seed démo, API, tests, contexte React, documentation API et architecture.
- Supprimés : aucun.

## Vérifications réellement exécutées

- `manage.py migrate --noinput` : migrations établissements/scolarité appliquées.
- `manage.py seed_demo` : exécuté deux fois sans erreur; les deux exécutions ont conservé les mêmes données.
- Totaux relationnels vérifiés par tenant : EPM (4 unités, 7 éléments, 28 apprenants, 28 inscriptions), Les Lauriers (4, 7, 28, 28), IUT (4, 6, 28, 28), ISPD (2, 2, 12, 12), Horizon (2, 2, 12, 12).
- `manage.py test api` : 28 tests réussis.
- `manage.py check` : aucun problème système.
- `makemigrations --check --dry-run` : aucune migration manquante.
- `npm run lint` : réussi.
- `npm run build` : réussi.
- Le seed idempotent contient encore les lignes JSON génériques pour la compatibilité des anciens écrans; elles restent nécessaires jusqu’au branchement complet des autres domaines.
- OpenAPI a été générée; deux vues compte génériques existantes produisent encore des avertissements de dérivation DRF Spectacular sur les serializers. Aucun modèle relationnel scolarité n’est concerné par ces avertissements après l’ajout des querysets explicites.

## Limites et suite

- Les domaines pédagogie, finances, documents, communication, services annexes, LMS, RGPD, imports et badges restent sur la table JSON.
- Les établissements sont typés, mais certaines sous-valeurs complexes restent dans `configuration` jusqu’à leur modélisation dédiée.
- La preuve visuelle en navigateur et les tests Playwright local/API ne sont pas encore réalisés dans cette sous-phase.
- La suppression séparée de `EnregistrementMetier` attend la validation complète de tous les domaines.
- Aucun fichier existant ni code Firebase n’a été supprimé.
