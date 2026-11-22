# API REST Klasik ERP

La documentation OpenAPI interactive est publiée en développement sur `/api/docs/`; le schéma JSON est accessible sur `/api/schema/`.

## Endpoints disponibles

| Méthode | URL | Authentification | Description |
|---|---|---|---|
| `GET` | `/api/sante/` | Publique | État du service et message français. |
| `POST` | `/api/auth/token/` | Publique | Connexion par `courriel` et `password`; renvoie `access` et `refresh`. |
| `POST` | `/api/auth/token/refresh/` | Jeton de renouvellement | Renouvelle le jeton d’accès; les refresh tokens sont rotatifs et révoqués après rotation. |
| `POST` | `/api/auth/token/blacklist/` | JWT d’accès | Révoque un jeton de renouvellement. |
| `POST` | `/api/auth/demo/` | Publique, développement seulement | Délivre un JWT de démonstration pour un utilisateur actif; répond 404 lorsque `DEBUG=false`. |
| `GET` | `/api/auth/me/` | JWT d’accès | Profil courant sérialisé avec `id`, `courriel`, `nom_complet`, `telephone`, `role`, `est_super_admin_plateforme`, `est_actif`. |
| `GET` | `/api/etablissements/` | JWT d’accès | Établissements affiliés à l’utilisateur; le super-administrateur plateforme peut les lister tous. |
| `PATCH` | `/api/etablissements/{id_etablissement}/` | JWT et permission `parametres:gerer` | Met à jour les paramètres ou le statut de l’établissement autorisé; l’identifiant est immuable et l’action est auditée. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/unites/` | JWT et permission scolaire/paramètres | Ressource relationnelle typée des unités académiques, avec recherche, filtre, tri et pagination; pagination DRF standard. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/elements/` | JWT et permission scolaire/paramètres | Ressource relationnelle typée des éléments pédagogiques, liée à une unité du même tenant. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/apprenants/` | JWT avec périmètre apprenant/enseignant | Ressource relationnelle typée des apprenants, tuteurs et échéances; filtrée au périmètre du rôle. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/inscriptions/` | JWT avec permission admissions | Ressource relationnelle typée des inscriptions. |
| `POST` | `/api/etablissements/{id_etablissement}/inscriptions/{id}/annuler/` | JWT avec `admissions:gerer` | Action métier auditée qui annule une inscription et conserve son motif. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/enseignants/` | JWT avec `rh:voir` / `rh:gerer` | Ressource relationnelle typée des personnels enseignants. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/notes/` | JWT avec `pedagogie:voir` / `pedagogie:noter` | Ressource relationnelle typée des notes, avec publication verrouillée. |
| `POST` | `/api/etablissements/{id_etablissement}/notes/{id}/publier/` | JWT avec `pedagogie:noter` | Publie une note et verrouille sa modification ou suppression. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/presences/` | JWT avec `pedagogie:voir` / `pedagogie:appel` | Ressource relationnelle typée des présences, filtrée par unité pour les enseignants. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/emplois_du_temps/` | JWT avec `emplois_du_temps:voir` / `gerer` | Créneaux typés reliés aux unités, éléments et enseignants. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/evenements_calendrier/` | JWT avec `emplois_du_temps:voir` / `gerer` | Ressource typée du calendrier académique. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/cahiers_textes/` | JWT avec `pedagogie:voir` / `pedagogie:noter` | Entrées du cahier reliées à une unité et un élément. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/soutenances/` | JWT avec `pedagogie:voir` / `pedagogie:verrouiller` | Ressource typée des soutenances liée à un apprenant. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/paiements/` | JWT avec `finances:voir` / `finances:encaisser` | Ressource typée des paiements, filtrée au périmètre apprenant/parent. |
| `POST` | `/api/etablissements/{id_etablissement}/paiements/{id}/annuler/` | JWT avec `finances:gerer` | Annule un paiement validé une fois, avec trace d’audit. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/depenses/` | JWT avec `finances:voir` / `finances:gerer` | Ressource typée des dépenses tenant-scopées. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/paie/` | JWT avec `rh:voir` / `rh:gerer` | Ressource typée des bulletins reliée au personnel enseignant. |
| `POST` | `/api/etablissements/{id_etablissement}/paie/{id}/payer/` | JWT avec `rh:gerer` | Passe un bulletin en payé et conserve sa date de paiement. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/abonnements/` | JWT avec `services:voir` / `services:gerer` | Ressource typée des abonnements cantine, transport ou fournitures. |
| `GET` | `/api/etablissements/{id_etablissement}/permissions/` | JWT et permission `roles:gerer` | Liste les surcharges RBAC configurées dans l’établissement. |
| `PUT` | `/api/etablissements/{id_etablissement}/permissions/` | JWT et permission `roles:gerer` | Enregistre les permissions d’un rôle du tenant; le rôle `SUPER_ADMIN` ne peut pas être modifié. Chaque changement est inscrit dans le journal d’audit serveur. |
| `GET` | `/api/etablissements/{id_etablissement}/utilisateurs/` | JWT et permission `comptes:gerer` | Liste les comptes affiliés à cet établissement et uniquement leur affiliation dans ce tenant; aucun mot de passe n’est renvoyé. |
| `POST` | `/api/etablissements/{id_etablissement}/utilisateurs/` | JWT et permission `comptes:gerer` | Crée un compte Django, son affiliation tenant et son rôle. |
| `PATCH` | `/api/etablissements/{id_etablissement}/utilisateurs/{id_utilisateur}/` | JWT et permission `comptes:gerer` | Modifie les informations, le rôle, l’état, la 2FA ou le mot de passe du compte dans cet établissement. Refuse la suspension globale d’un compte multi-établissements. |
| `DELETE` | `/api/etablissements/{id_etablissement}/utilisateurs/{id_utilisateur}/` | JWT et permission `comptes:gerer` | Retire le compte de l’établissement. Le compte actif de l’appelant et les super-administrateurs plateforme sont protégés. |
| `GET` | `/api/etablissements/{id_etablissement}/audit/` | JWT et permission `audit:voir` | Renvoie les 200 actions les plus récentes du journal serveur pour cet établissement, avec le nom et le rôle de l’acteur enregistrés au moment de l’action. |
| `GET` | `/api/etablissements/{id_etablissement}/donnees/{collection}/` | JWT d’accès et permission de lecture | Liste paginée (50 par défaut, `page_size` de 1 à 100), filtre exact par champ, `search` dans les données et tri `id` / `-id`. |
| `POST` | `/api/etablissements/{id_etablissement}/donnees/{collection}/` | JWT d’accès et permission d’écriture | Crée une donnée de la collection, avec identifiant `id`; le serveur renseigne `id_etablissement`. |
| `GET` | `/api/etablissements/{id_etablissement}/donnees/{collection}/{id}/` | JWT d’accès et permission de lecture | Lit un enregistrement tenant-scopé. |
| `PATCH` | `/api/etablissements/{id_etablissement}/donnees/{collection}/{id}/` | JWT d’accès et permission d’écriture | Met à jour un enregistrement sans permettre de modifier son identifiant ou son tenant. |
| `DELETE` | `/api/etablissements/{id_etablissement}/donnees/{collection}/{id}/` | JWT d’accès et permission d’écriture | Supprime un enregistrement autorisé et conserve une trace d’audit. |
| `POST` | `/api/etablissements/{id_etablissement}/fichiers/` | JWT d’accès et droit de dépôt du rôle | Reçoit un fichier multipart (`fichier`), maximum 25 Mo; retourne son identifiant, son nom, son type MIME et sa taille. Le dépôt est actuellement autorisé aux enseignants disposant de `pedagogie:noter` et aux apprenants ayant accès au portail. |
| `GET` | `/api/fichiers/{id_fichier}/` | JWT d’accès et fichier visible | Télécharge le fichier si l’utilisateur en est propriétaire ou si le fichier est référencé par un enregistrement accessible dans le périmètre de son rôle et de son établissement. Les fichiers inconnus ou non autorisés répondent 404. |
| `GET` | `/api/schema/` | Selon configuration OpenAPI | Schéma OpenAPI. |
| `GET` | `/api/docs/` | Selon configuration OpenAPI | Interface Swagger. |

Collections métier exposées : unités, éléments, enseignants, apprenants, inscriptions, paiements, notes, présences, emplois du temps, calendrier, documents, stages, dépenses, paie, communications, cahiers de textes, soutenances, bibliothèque, infirmerie, incidents, services, inventaire, prêts matériel, anciens, Campus numérique/LMS, actualités, RGPD, messagerie, badges, imports, audit et notifications. Chaque ressource applique la permission configurée pour son domaine; les rôles Parent/Apprenant sont filtrés aux apprenants liés et l’Enseignant à ses unités/éléments assignés. La liste blanche des noms de collections et les permissions sont définies côté serveur.

Les réponses conservent le `snake_case` du contrat TypeScript existant. Chaque objet métier conserve sa forme JSON actuelle. Le stockage actuel utilise une table commune de données JSON reliée à l’établissement; les contraintes relationnelles propres à chaque domaine restent à renforcer avant de déclarer la parité complète.

Le client React en mode `VITE_SOURCE_DONNEES=api` récupère les pages autorisées pour l’établissement actif, tente un rafraîchissement JWT après une réponse 401 et synchronise les changements locaux par POST/PATCH/DELETE. Un refus 403 sur une collection signifie que le rôle n’a pas accès à cette collection; les autres erreurs sont présentées à l’utilisateur.

Les fichiers envoyés sont stockés sous `MEDIA_ROOT` dans un chemin isolé par établissement. Le navigateur en mode API récupère les fichiers via l’endpoint protégé, et non depuis son cache local. Le mode local conserve le stockage IndexedDB existant.

## Erreurs

Les réponses d’erreur DRF utilisent `{ "message": "...", "details": ... }` avec un message français. Les détails de validation sont fournis par DRF sans secret d’authentification.
