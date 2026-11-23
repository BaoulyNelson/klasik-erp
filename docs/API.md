# API REST Klasik ERP

La documentation OpenAPI interactive est publiée en développement sur `/api/docs/`; le schéma JSON est accessible sur `/api/schema/`.

## Endpoints disponibles

| Méthode | URL | Authentification | Description |
|---|---|---|---|
| `GET` | `/api/sante/` | Publique | État du service et message français. |
| `GET` | `/api/auth/csrf/` | Publique | Initialise le cookie CSRF et fournit le jeton à transmettre dans `X-CSRFToken`. |
| `POST` | `/api/auth/token/` | Identifiants et jeton CSRF | Connexion par `courriel` et `password`; place les JWT dans des cookies `HttpOnly`, sans les renvoyer en JSON. |
| `POST` | `/api/auth/token/refresh/` | Cookie de renouvellement et jeton CSRF | Renouvelle les cookies de session; les refresh tokens sont rotatifs et révoqués après rotation. |
| `POST` | `/api/auth/logout/` | Cookie de renouvellement et jeton CSRF | Révoque le refresh token et efface les cookies de session. |
| `POST` | `/api/auth/password/reset/` | Publique, jeton CSRF, limitée à 3 demandes/heure par IP | Reçoit `courriel`, crée un code aléatoire à 6 chiffres valable 15 minutes et l’envoie par courriel sans révéler si le compte existe. Le code est exposé dans la réponse uniquement en développement. |
| `POST` | `/api/auth/password/reset/confirm/` | Publique, jeton CSRF, limitée à 5 demandes/heure par IP | Reçoit `courriel`, `jeton` et `nouveau_mot_de_passe`; consomme le code à usage unique. Cinq codes erronés invalident le code actif. |
| `POST` | `/api/auth/password/change/` | Cookie de session et jeton CSRF | Change le mot de passe après validation du mot de passe actuel; pour un compte en changement obligatoire, le mot de passe actuel n’est pas requis. Jusqu’à la réussite, l’accès aux données applicatives est bloqué; le profil courant et la déconnexion restent accessibles. |
| `POST` | `/api/auth/google/` | Publique, jeton CSRF, limitée à 10 demandes/minute par IP | Vérifie le jeton Google avec l’identifiant client configuré, lie une identité vérifiée au compte existant ou crée un compte sans mot de passe local. Un compte neuf doit ensuite créer ou rejoindre un établissement. La session est placée dans des cookies `HttpOnly`. |
| `POST` | `/api/auth/demo/` | Publique, jeton CSRF, développement avec opt-in, limitée à 10 demandes/minute par IP | Ouvre une session dans des cookies `HttpOnly` uniquement si `DEBUG=true`, `DJANGO_DEMO_LOGIN_ENABLED=true` et si le compte fait partie des comptes de démonstration seedés; répond 404 sinon. |
| `GET` | `/api/auth/me/` | Cookie de session | Profil courant, affiliations relationnelles, photo de profil et indicateur de changement obligatoire du mot de passe. |
| `PATCH` | `/api/auth/profile/` | Cookie de session et jeton CSRF | Enregistre ou retire la photo de profil (`url_avatar`); image encodée limitée à 512 Ko. |
| `GET` | `/api/plateforme/configuration/` | Cookie de session | Renvoie le logo global persistant de la plateforme. |
| `PATCH` | `/api/plateforme/configuration/` | Cookie de session, jeton CSRF et rôle super-administrateur plateforme | Enregistre ou retire le logo global (`url_logo`); image encodée limitée à 512 Ko. |
| `GET` | `/api/etablissements/` | Cookie de session | Renvoie uniquement les établissements explicitement affiliés à l’utilisateur, y compris pour un super-administrateur plateforme. |
| `GET` | `/api/plateforme/etablissements/` | Cookie de session et rôle super-administrateur plateforme | Liste globale de supervision, séparée des affiliations personnelles; ne donne aucun accès aux données métier des clients. |
| `PATCH` | `/api/plateforme/etablissements/{id_etablissement}/` | Cookie de session, jeton CSRF et rôle super-administrateur plateforme | Modifie uniquement l’abonnement ou le statut SaaS du client; les paramètres et données métier du tenant restent hors de portée sans affiliation. |
| `POST` | `/api/etablissements/` | Public pour un nouveau fondateur ou cookie de session; jeton CSRF obligatoire, limité à 3 créations/heure par IP | Crée atomiquement l’établissement, le compte fondateur si nécessaire, son affiliation de direction, la structure initiale typée et les événements de calendrier. Un administrateur plateforme peut créer un compte fondateur distinct sans devenir affilié à ce tenant. |
| `PATCH` | `/api/etablissements/{id_etablissement}/` | Cookie de session, affiliation au tenant et permission `parametres:gerer` | Met à jour les paramètres de l’établissement affilié; l’identifiant est immuable, le téléphone est validé selon le pays, le fuseau IANA est contrôlé pour `INTL`, la couleur est l’une des six palettes proposées et l’action est auditée. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/unites/` | JWT et permission scolaire/paramètres | Ressource relationnelle typée des unités académiques; les frais sont non négatifs, avec recherche, filtre, tri et pagination DRF standard. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/elements/` | JWT et permission scolaire/paramètres | Ressource relationnelle typée des éléments pédagogiques, liée à une unité du même tenant. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/apprenants/` | JWT avec périmètre apprenant/enseignant | Ressource relationnelle typée des apprenants, tuteurs et échéances; filtrée au périmètre du rôle. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/inscriptions/` | JWT avec permission admissions | Ressource relationnelle typée des inscriptions. |
| `POST` | `/api/etablissements/{id_etablissement}/inscriptions/{id}/annuler/` | JWT avec `admissions:gerer` | Action métier auditée qui annule une inscription et conserve son motif. |
| `POST` | `/api/etablissements/{id_etablissement}/inscriptions/{id}/archiver/` | JWT avec `admissions:gerer` | Archive une inscription validée et conserve son motif; la suppression de l’inscription n’efface ni l’apprenant ni ses paiements. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/enseignants/` | JWT avec `rh:voir` / `rh:gerer` | Ressource relationnelle typée des personnels enseignants. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/notes/` | JWT avec `pedagogie:voir` / `pedagogie:noter` | Ressource relationnelle typée des notes, avec publication verrouillée. |
| `POST` | `/api/etablissements/{id_etablissement}/notes/{id}/publier/` | JWT avec `pedagogie:noter` | Publie une note et verrouille sa modification ou suppression. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/presences/` | JWT avec `pedagogie:voir` / `pedagogie:appel` | Ressource relationnelle typée des présences, filtrée par unité pour les enseignants. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/emplois_du_temps/` | JWT avec `emplois_du_temps:voir` / `gerer` | Créneaux typés reliés aux unités, éléments et enseignants. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/evenements_calendrier/` | JWT avec `emplois_du_temps:voir` / `gerer` | Ressource typée du calendrier académique. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/cahiers_textes/` | JWT avec `pedagogie:voir` / `pedagogie:noter` | Entrées du cahier reliées à une unité et un élément. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/soutenances/` | JWT avec `pedagogie:voir` / `pedagogie:verrouiller` | Ressource typée des soutenances liée à un apprenant. |
| `GET, POST` | `/api/etablissements/{id_etablissement}/paiements/` | JWT avec `finances:voir` / `finances:encaisser` | Ressource typée des paiements, filtrée au périmètre apprenant/parent; le mode est validé selon le pays. Les modifications et suppressions sont refusées pour préserver l’historique; utiliser l’action d’annulation. |
| `POST` | `/api/etablissements/{id_etablissement}/paiements/{id}/annuler/` | JWT avec `finances:gerer` | Annule un paiement validé une fois, avec trace d’audit. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/depenses/` | JWT avec `finances:voir` / `finances:gerer` | Ressource typée des dépenses tenant-scopées. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/paie/` | JWT avec `rh:voir` / `rh:gerer` | Ressource typée des bulletins reliée au personnel enseignant; le brut et le net sont recalculés côté serveur et les retenues ne peuvent dépasser le brut. |
| `POST` | `/api/etablissements/{id_etablissement}/paie/{id}/payer/` | JWT avec `rh:gerer` | Passe un bulletin en payé et conserve sa date de paiement. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/abonnements/` | JWT avec `services:voir` / `services:gerer` | Ressource typée des abonnements cantine, transport ou fournitures. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/documents/` | JWT avec `documents:voir` / `documents:emettre` | Ressource typée des documents officiels liée à un apprenant. |
| `POST` | `/api/etablissements/{id_etablissement}/documents/{id}/emettre/` | JWT avec `documents:emettre` | Action métier d’émission auditée d’un document. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/communications/` | JWT avec `communication:voir` / `communication:envoyer` | Ressource typée des messages externes ou internes. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/notifications/` | JWT avec lecture du tableau de bord | Ressource typée des notifications tenant-scopées. |
| `POST` | `/api/etablissements/{id_etablissement}/notifications/{id}/marquer-lue/` | JWT avec lecture du tableau de bord | Marque une notification comme lue. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/articles_actualites/` | JWT avec `actualites:voir` / `actualites:gerer` | Ressource typée des actualités filtrée pour les audiences Parent/Apprenant. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/livres_bibliotheque/` | JWT avec permission bibliothèque | Ressource relationnelle de la bibliothèque. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/emprunts_bibliotheque/` | JWT avec permission bibliothèque | Emprunts reliés aux livres et apprenants. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/visites_infirmerie/` | JWT avec permission services | Visites d’infirmerie tenant-scopées. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/incidents_discipline/` | JWT avec permission services | Incidents disciplinaires tenant-scopés. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/inventaire/` | JWT avec permission bibliothèque/matériel | Inventaire tenant-scopé. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/prets_materiels/` | JWT avec permission bibliothèque/matériel | Prêts matériels reliés aux articles. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/anciens/` | JWT avec permission services | Fiches des anciens élèves tenant-scopées. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/ressources_lms/` | JWT avec `campus_numerique:voir` | Ressources pédagogiques LMS reliées aux unités et éléments. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/devoirs_lms/` | JWT avec `campus_numerique:voir` / `pedagogie:noter` | Devoirs LMS tenant-scopés. |
| `POST` | `/api/etablissements/{id_etablissement}/devoirs_lms/{id}/cloturer/` | JWT avec `pedagogie:noter` | Action métier clôturant un devoir. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/remises_devoirs_lms/` | JWT avec périmètre apprenant/enseignant | Remises de devoir tenant-scopées. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/consentements_rgpd/` | JWT avec `rgpd:gerer` | Consentements RGPD tenant-scopés. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/demandes_rgpd/` | JWT avec `rgpd:gerer` | Demandes RGPD tenant-scopées. |
| `POST` | `/api/etablissements/{id_etablissement}/demandes_rgpd/{id}/traiter/` | JWT avec `rgpd:gerer` | Action de traitement auditée d’une demande RGPD. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/journaux_importations/` | JWT avec `importations:gerer` | Lots d’importation tenant-scopés. |
| `GET, POST, PATCH, DELETE` | `/api/etablissements/{id_etablissement}/badges_attribues/` | JWT avec `badges:voir` / `badges:gerer` | Attributions de badges tenant-scopées. |
| `GET` | `/api/etablissements/{id_etablissement}/permissions/` | JWT et permission `roles:gerer` | Liste les surcharges RBAC configurées dans l’établissement. |
| `PUT` | `/api/etablissements/{id_etablissement}/permissions/` | JWT et permission `roles:gerer` | Enregistre les permissions d’un rôle du tenant; le rôle `SUPER_ADMIN` ne peut pas être modifié. Chaque changement est inscrit dans le journal d’audit serveur. |
| `GET` | `/api/etablissements/{id_etablissement}/utilisateurs/` | JWT et permission `comptes:gerer` | Liste les comptes affiliés à cet établissement et uniquement leur affiliation dans ce tenant; aucun mot de passe n’est renvoyé. |
| `POST` | `/api/etablissements/{id_etablissement}/utilisateurs/` | JWT et permission `comptes:gerer` | Crée un compte Django, son affiliation tenant et son rôle, puis envoie un courriel d’accès avec l’établissement, le rôle, l’URL de connexion et l’obligation éventuelle de changer le mot de passe. Le mot de passe temporaire n’est pas envoyé; si le courriel échoue, la création est annulée et l’API répond 503. |
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

Pour toutes les lignes protégées par JWT, le navigateur envoie le cookie de session `HttpOnly`; les écritures exigent aussi un jeton CSRF dans `X-CSRFToken`. Les en-têtes Bearer restent acceptés par l’API pour les clients non navigateurs.

Collections métier exposées : unités, éléments, enseignants, apprenants, inscriptions, paiements, notes, présences, emplois du temps, calendrier, documents, stages, dépenses, paie, communications, cahiers de textes, soutenances, bibliothèque, infirmerie, incidents, services, inventaire, prêts matériel, anciens, Campus numérique/LMS, actualités, RGPD, messagerie, badges, imports, audit et notifications. Chaque ressource applique la permission configurée pour son domaine; les rôles Parent/Apprenant sont filtrés aux apprenants liés et l’Enseignant à ses unités/éléments assignés. La liste blanche des noms de collections et les permissions sont définies côté serveur.

Les réponses conservent le `snake_case` du contrat TypeScript existant. Les unités, éléments, apprenants, inscriptions, enseignants, notes, présences, emplois du temps, paiements, dépenses, paie, communications, notifications et domaines annexes sont stockés dans des tables relationnelles tenant-scopées. Les cinq collections auparavant génériques ont aussi des endpoints relationnels dédiés : `/partenaires/`, `/fils_discussion/`, `/badges_attribues/`, `/journaux_importations/` et `/demandes_conge/`. Leurs lignes JSON historiques sont copiées vers les tables typées puis retirées de `EnregistrementMetier`; l’API générique renvoie 404 pour ces noms de collection.

Les fils de discussion et leurs messages sont liés à des utilisateurs participants du même établissement; seules ces personnes peuvent lire ou modifier le fil. Les badges d’un apprenant ou parent sont filtrés à ses identifiants d’apprenants liés. Les modes de paiement sont des enregistrements manuels avec référence, pas des transactions en ligne.

Le client React en mode `VITE_SOURCE_DONNEES=api` utilise les cookies d’accès et de renouvellement `HttpOnly`, transmet le jeton CSRF par `X-CSRFToken`, renouvelle la session au démarrage avant de charger le profil, tente un renouvellement après une réponse 401 et synchronise les changements locaux par POST/PATCH/DELETE. Une simple marque de session non sensible dans `sessionStorage` permet de déclencher la restauration après rechargement; elle ne contient aucun jeton. Les JWT ne sont ni renvoyés dans le JSON, ni conservés dans `sessionStorage` ou `localStorage`, donc ils ne sont pas directement accessibles au JavaScript. Un refus 403 sur une collection signifie que le rôle n’a pas accès à cette collection; les autres erreurs sont présentées à l’utilisateur.

Les fichiers envoyés sont stockés sous `MEDIA_ROOT` dans un chemin isolé par établissement. Le navigateur en mode API récupère les fichiers via l’endpoint protégé, et non depuis son cache local. Le mode local conserve le stockage IndexedDB existant.

## Erreurs

Les réponses d’erreur DRF utilisent `{ "message": "...", "details": ... }` avec un message français. Les détails de validation sont fournis par DRF sans secret d’authentification.
