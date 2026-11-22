# Rapport de phase 3 — Client API et authentification

## Créé et modifié

- Client HTTP central dans `src/services/clientApi.ts` : URL configurable, JWT Bearer, renouvellement rotatif, révocation, erreurs françaises et propagation des signaux d’annulation.
- En mode `VITE_SOURCE_DONNEES=api`, `ContexteErp` ne lit ni n’écrit son état métier/session dans `localStorage`; les jetons résident dans `sessionStorage`.
- Profil et établissements accessibles chargés depuis Django; collections autorisées chargées avec pagination, et créations/modifications/suppressions synchronisées par l’API.
- Authentification par mot de passe JWT, connexion démo uniquement en développement, restauration de session et déconnexion.
- Ajustement de câblage dans `EcranConnexion.tsx` pour attendre le résultat de la connexion API; aucun style, texte, structure JSX ou écran n’a été modifié.
- Firebase reste utilisé uniquement en mode local. En mode API, la connexion Google affiche une erreur explicite plutôt qu’un succès simulé.

## Vérifications exécutées

- `npm run lint` : réussi.
- `npm run build` : réussi; avertissement Vite non bloquant sur la taille du chunk JavaScript supérieur à 500 Ko.
- `manage.py test api` : tests de connexion, session démo, refus de production, CRUD et isolation réussis.
- Démarrage local de Django et Vite avec `VITE_SOURCE_DONNEES=api`; santé API et page React HTTP 200.
- Parcours navigateur réel : connexion démo Django, affichage du tableau de bord avec les données seedées, puis changement d’établissement avec chargement des données correspondantes.
- Aucun composant visuel ou CSS n’a été modifié. Aucun fichier existant supprimé.

## État et limites

La phase est **partielle**. La réinitialisation de mot de passe, la fédération Google, la création autonome de comptes/établissements et la gestion distante des paramètres RBAC ne sont pas encore reliées à Django. Les collections de notifications, la configuration plateforme et certains journaux restent locaux; les changements de compte/établissement ne sont pas encore synchronisés via des endpoints dédiés. Le stockage métier serveur demeure JSON plutôt que relationnel.

## À terminer

- Implémenter les endpoints et écrans existants de récupération de mot de passe et de fédération Google, sans changement visuel.
- Terminer la migration des mutations liées aux comptes, établissements, RBAC, notifications et paramètres.
- Tester chaque rôle, chaque tenant et les mutations des domaines dans l’interface; vérifier les parcours fichiers et documents.
