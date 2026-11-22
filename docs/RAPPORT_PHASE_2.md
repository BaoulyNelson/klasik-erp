# Rapport de phase 2 — Données et API multitenant

## Créé et modifié

- Modèles d’établissements, affiliations, surcharges RBAC, enregistrements JSON par collection et journal d’audit API.
- Endpoints paginés de lecture et opérations CRUD tenant-scopées; les rôles Parent, Apprenant et Enseignant ont des périmètres de lignes dédiés.
- Administration Django des comptes/affiliations et commande `seed_demo` idempotente construite depuis la fixture des données initiales.
- API tenant-scopée de lecture et de mise à jour des surcharges RBAC, réservée aux utilisateurs ayant `roles:gerer`; le rôle `SUPER_ADMIN` reste non modifiable et chaque changement est audité.
- Endpoint de lecture des utilisateurs d’un établissement, réservé à `comptes:gerer` et limité aux affiliations du tenant demandé; le frontend en mode API n’utilise plus le catalogue d’utilisateurs de démonstration dans l’écran RBAC.
- Tests couvrant JWT, refus d’accès, frontières de tenant, restrictions parentales, CRUD et import de démonstration.
- Aucun fichier existant supprimé. Les mots de passe de démonstration ne sont pas importés comme mots de passe Django.

## État et limites

La phase est **partielle** : l’API conserve les formes JSON existantes dans une table métier commune. Elle ne possède pas encore les modèles relationnels typés par domaine proposés dans `ARCHITECTURE.md`. Les API de gestion des comptes, établissements et paramètres de plateforme ne couvrent pas encore toutes les mutations de l’interface.

## Vérifications exécutées

- `manage.py check` : réussi.
- `manage.py makemigrations --check --dry-run` : aucune migration manquante.
- `manage.py test api` : tests d’authentification, CRUD, permissions et isolation multitenant réussis.
- Après ajout de l’API RBAC : 20 tests Django passent, y compris les refus d’un rôle sans autorisation et d’un établissement non affilié.
- Tests complémentaires de visibilité des comptes, confidentialité des mots de passe et absence d’affiliation d’un autre tenant dans la réponse.
- `seed_demo` : 5 établissements, 14 utilisateurs et 494 enregistrements métier; l’idempotence est vérifiée par test.
- `npm run lint` et `npm run build` : réussis; l’avertissement de taille du bundle Vite (>500 Ko) subsiste.

## À terminer

- Remplacer/compléter le stockage JSON par les modèles relationnels par domaine, avec migrations et validations métier.
- Ajouter des API de gestion des comptes, configurations tenant/plateforme, audit consultable, notifications et transitions métier.
- Vérifier la parité complète du seed et de chaque permission par rapport aux services et composants existants.
