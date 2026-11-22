# API REST Klasik ERP

La documentation OpenAPI interactive est publiée en développement sur `/api/docs/`; le schéma JSON est accessible sur `/api/schema/`.

## Endpoints disponibles — phase 1

| Méthode | URL | Authentification | Description |
|---|---|---|---|
| `GET` | `/api/sante/` | Publique | État du service et message français. |
| `POST` | `/api/auth/token/` | Publique | Connexion par `courriel` et `password`; renvoie `access` et `refresh`. |
| `POST` | `/api/auth/token/refresh/` | Jeton de renouvellement | Renouvelle le jeton d’accès; les refresh tokens sont rotatifs et révoqués après rotation. |
| `GET` | `/api/auth/me/` | JWT d’accès | Profil courant sérialisé avec `id`, `courriel`, `nom_complet`, `telephone`, `role`, `est_super_admin_plateforme`, `est_actif`. |
| `GET` | `/api/schema/` | Selon configuration OpenAPI | Schéma OpenAPI. |
| `GET` | `/api/docs/` | Selon configuration OpenAPI | Interface Swagger. |

Les réponses des serializers conservent le `snake_case` du contrat TypeScript existant. Les endpoints métier tenant-scopés, filtres et opérations CRUD seront documentés lors de la phase 2; aucun endpoint de données métier n’est encore déclaré.

## Erreurs

Les réponses d’erreur DRF utilisent `{ "message": "...", "details": ... }` avec un message français. Les détails de validation sont fournis par DRF sans secret d’authentification.
