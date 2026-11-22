# Rapport de preuves relationnelles

## Vérifications réellement exécutées

Toutes les commandes Python ci-dessous ont utilisé le virtualenv existant `backend/venv`.

- `backend/venv/Scripts/python.exe backend/manage.py test api.tests.TestsPreuvesDomainesRelationnels` : 5 tests réussis.
- `backend/venv/Scripts/python.exe backend/manage.py test api` : 39 tests réussis.
- `backend/venv/Scripts/python.exe backend/manage.py check` : aucun problème système.
- `backend/venv/Scripts/python.exe backend/manage.py makemigrations --check --dry-run` : aucune migration manquante.
- `npm run lint` : réussi.
- `npm run build` : réussi; Vite signale toujours un bundle JavaScript principal de 2 104,40 Ko, supérieur au seuil de 500 Ko.

La commande `manage.py test` sans nom d’application n’a découvert aucun test dans cette configuration. Le résultat de référence est donc celui de `manage.py test api`.

## Couverture ajoutée et exécutée

Les cinq tests de `TestsPreuvesDomainesRelationnels` exercent :

- les contrats de lecture de documents, communications, notifications et actualités, ainsi que l’action « marquer comme lue »;
- la lecture des livres, emprunts et articles d’inventaire, avec refus d’accès à un autre établissement;
- les ressources, devoirs et remises LMS, l’encodage numérique de `points_max` et la clôture d’un devoir;
- les consentements et demandes RGPD, journaux d’importation et badges, ainsi que le traitement d’une demande;
- l’idempotence du seed sur plusieurs collections relationnelles.

La suite `api` inclut également les tests préexistants d’authentification, de scolarité, de pédagogie, de finances, de tenant et de fichiers. La suite passe dans son ensemble, mais ce résultat ne constitue pas à lui seul une preuve exhaustive de parité ou de permissions pour chaque endpoint.

## Limites restant à valider

- La couverture ajoutée ne vérifie pas toutes les mutations CRUD, tous les rôles, toutes les actions métier ni chaque champ du contrat de chaque domaine.
- Les tests de seed ajoutés comparent les nombres d’objets avant et après répétition pour un sous-ensemble des modèles; ils ne démontrent pas l’absence de relations orphelines sur l’ensemble des domaines.
- Aucun parcours navigateur/API, comparaison visuelle local/API, test Playwright ni matrice exhaustive rôle/établissement n’a été exécuté.
- Le build frontend réussit, mais l’avertissement de taille du bundle persiste.
- L’ancienne table métier et Firebase ne sont pas déclarés retirés; leur retrait reste conditionné à la preuve de parité complète.
