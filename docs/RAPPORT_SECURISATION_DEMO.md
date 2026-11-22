# Rapport : sécurisation des accès de démonstration

## Résultat

- Django démarre avec `DEBUG=false` par défaut. La connexion de démonstration exige également `DJANGO_DEMO_LOGIN_ENABLED=true`; le serveur la refuse toujours si `DEBUG=false`.
- `/api/auth/demo/` n’accepte que les comptes marqués par `seed_demo`. Un compte Django normal, même actif, ne peut pas obtenir de jeton par cette route.
- `seed_demo` marque ses comptes de démonstration sans leur attribuer de mot de passe utilisable.
- En production, le frontend force le mode API. Les raccourcis démo sont refusés côté interface et restent protégés côté serveur.
- Les mots de passe statiques ont été retirés des fixtures frontend, des valeurs initiales et des formulaires. La création d’un compte exige maintenant un mot de passe conforme à la politique existante.
- La création autonome d’établissement n’étant pas persistée par l’API, elle est refusée en mode API plutôt que de simuler une réussite locale. Le balisage de la page d’accueil n’a pas été modifié.

## Fichiers créés ou modifiés

- Modifiés : `backend/config/settings.py`, `backend/api/views.py`, `backend/api/tests.py`, `backend/donnees/management/commands/seed_demo.py`.
- Modifiés : `src/contexte/ContexteErp.tsx`, `src/composants/mise_en_page/EcranConnexion.tsx`, `src/donnees/donnees_initiales.ts`, `src/modules/comptes/VueComptes.tsx`, `src/services/service_fichiers_locaux.ts`.
- Documentation : `README.md`, `backend/README.md`, `docs/API.md`.
- Créé : `docs/RAPPORT_SECURISATION_DEMO.md`.
- Aucun fichier supprimé pour cette correction.

## Vérifications réellement exécutées

- `backend\venv\Scripts\python.exe backend\manage.py test api` : 44 tests réussis, y compris les refus sans opt-in, pour un compte normal et lorsque `DEBUG=false`.
- `backend\venv\Scripts\python.exe backend\manage.py check` : réussi.
- `backend\venv\Scripts\python.exe backend\manage.py makemigrations --check --dry-run` : aucune migration nécessaire.
- `npm run lint` : réussi.
- `npm run build` : réussi. L’avertissement préexistant de chunk supérieur à 500 Ko subsiste (bundle principal d’environ 2 Mo).
- Vérification du bundle de production : aucun mot de passe de démonstration statique trouvé.
- Vérification Git : `.env` est ignoré.

## À noter

- Aucun parcours navigateur automatisé ni lancement simultané des deux serveurs n’a été exécuté pour cette correction. Le balisage de `PageAccueil.tsx` n’a pas été touché.
- L’inscription publique et la création d’établissement nécessitent encore un endpoint serveur sécurisé avant de pouvoir être réactivées en mode API.
- Les fichiers `.env.example` et `backend/.env.example` étaient déjà supprimés dans le worktree avant cette correction; ils ont été laissés intacts.
