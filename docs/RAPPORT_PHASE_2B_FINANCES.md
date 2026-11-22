# Rapport de sous-phase 2B — Finances relationnelles

## Créé et modifié

- Ajout de l’application Django `finances` avec les modèles `Paiement`, `Depense`, `BulletinPaie` et `AbonnementService`.
- Ajout des clés étrangères vers établissement, apprenant et personnel enseignant.
- Ajout des contraintes de montant positif/non négatif, de unicité du numéro de reçu par tenant et des index tenant/apprenant et tenant/statut.
- Ajout des migrations `finances.0001_initial` et `finances.0002_importer_finances_json`.
- Ajout des endpoints typés paiements, dépenses, paie et abonnements avec pagination, recherche, filtres et tri.
- Ajout des actions `POST paiements/{id}/annuler/` et `POST paie/{id}/payer/`, avec vérification des permissions et états.
- Mise à jour de `seed_demo` pour alimenter directement les modèles relationnels et vérifier les totaux attendus par tenant.
- Branchement du frontend API sur les quatre nouvelles collections typées.
- Conservation de la table JSON ancienne pour compatibilité; aucune suppression effectuée.

## Vérifications réellement exécutées

- `manage.py migrate --noinput` : migrations finances appliquées.
- `manage.py seed_demo` : exécuté deux fois avec succès.
- `manage.py test api` : 32 tests réussis.
- `manage.py check` : réussi.
- `makemigrations --check --dry-run` : aucune migration manquante.
- `npm run lint` : réussi.
- `npm run build` : réussi.
- L’avertissement Vite non bloquant sur le bundle supérieur à 500 Ko subsiste.

## Tests ajoutés

- Contrat `snake_case` d’un paiement relationnel.
- Annulation une fois d’un paiement puis refus de double annulation.
- Isolation des paiements entre établissements.
- Lecture des dépenses tenant-scopées.

## Limites

- Les paiements et dépenses restent sans règles comptables plus avancées comme la reconciliation bancaire.
- Les bulletins de paie ne sont pas encore reliés à une entité RH autre que le personnel enseignant.
- Les contrôles navigateur finançoires et la preuve locale/API ne sont pas encore réalisés.
