# Rapport de phase 1 — Socle backend

## Créé

- Projet Django/DRF dans `backend/`, réglages par variables d’environnement et dépendances Python figées.
- Utilisateur personnalisé authentifié par courriel, choix de rôles alignés sur le modèle existant, administration Django.
- JWT d’accès/renouvellement avec rotation et liste de révocation, profil courant, handler d’erreurs français.
- CORS configurable, pagination/filtres DRF préparés, OpenAPI, santé API.
- Proxy Vite `/api`, exemples d’environnement sans secret, scripts npm, README et documentation des endpoints.
- Tests unitaires de santé, création et rafraîchissement de jetons, profil, refus d’authentification et OpenAPI.
- Configuration Firebase déplacée de l’import JSON local vers des variables d’environnement optionnelles. Firebase reste disponible si ces paramètres sont fournis; sans eux le mode local démarre et une tentative de connexion Google renvoie un message explicite. Aucun secret Firebase n’a été lu ou commité.

## Compatibilité et limites

- Aucun composant React, JSX, texte ou style n’a été modifié.
- Seul changement dans `src/` : `src/services/service_firebase.ts` permet de démarrer le mode local sans fichier Firebase de configuration versionné.
- Le front reste en mode local par défaut; le client API et le remplacement de l’authentification Firebase sont réservés aux phases 3 et 4.
- Les modèles métier, l’isolation par établissement et `seed_demo` ne sont pas inclus dans le socle de phase 1.
- Aucun fichier existant supprimé. La configuration Firebase locale est ignorée par Git et n’a pas été lue ni commitée.

## Vérifications exécutées

- `npm run lint` : réussi.
- `npm run build` : réussi; l’avertissement antérieur sur `__dirname` n’apparaît plus. Avertissement non bloquant sur la taille du chunk JavaScript (>500 Ko).
- `npm run backend:check` : réussi.
- `npm run backend:test` : 6 tests réussis, incluant la santé, JWT, refresh rotatif, profil et OpenAPI.
- `python backend/manage.py makemigrations --check --dry-run` : aucune migration manquante.
- Démarrage réel vérifié : Django `/api/sante/`, page Vite `/` et proxy Vite `/api/sante/` ont répondu HTTP 200. Les deux serveurs ont été arrêtés après le test.
- Mode production sans allowlists : configuration refusée comme prévu.

## Commandes de lancement

Depuis la racine, dans PowerShell après création de `.venv` :

```powershell
.\backend\.venv\Scripts\Activate.ps1
npm run backend:migrate
npm run dev:api
```

Dans un second terminal, `npm run dev`. Les deux commandes serveur ont été démarrées et vérifiées pendant la phase, puis arrêtées.
