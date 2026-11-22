# Architecture cible Django + React

## Principes de migration

- Le serveur Django sert uniquement l’API REST; Vite reste propriétaire des écrans et composants.
- PostgreSQL en production; SQLite lorsque `DB_ENGINE=sqlite` pour développement/tests. Les identifiants des fixtures étant des chaînes (souvent des codes), les clés primaires métier resteront des chaînes plutôt que d’être remplacées sans preuve par des entiers.
- Un utilisateur Django personnalisé identifié par courriel, mot de passe haché par Django, JWT d’accès/renouvellement, rôle plateforme et affiliations comportant chacune un rôle d’établissement. L’API ne fait jamais confiance au rôle, au tenant ou à la permission envoyés seuls par le navigateur.
- Chaque requête métier est authentifiée et chaque queryset est filtré par l’établissement autorisé. L’identifiant d’établissement sélectionné doit être vérifié contre les affiliations serveur; une opération super-admin est limitée aux permissions plateforme, sans actes opérationnels exclus.
- Les valeurs TypeScript du modèle utilisent `snake_case`. Le wire-format devra conserver ces noms et la forme des modèles pour éviter des changements massifs de composants; l’écart avec la consigne camelCase est consigné dans `HYPOTHESES.md`.
- Les fichiers uploadés sont validés (taille/type), associés à un tenant et stockés sous `MEDIA_ROOT`; les accès de lecture passent par permissions API. Les PDF imprimables, aperçus et QR restent dans React.

## Apps Django proposées

| App | Responsabilité | Modèles principaux |
|---|---|---|
| `comptes` | utilisateur personnalisé, affiliations, JWT, profil | `Utilisateur`, `AffiliationEtablissement`, `PreferenceNotification` |
| `etablissements` | configuration tenant, services, devises, comptes bancaires | `Etablissement`, `CompteBancaire`, `ConfigurationPlateforme` |
| `scolarite` | unités, éléments, apprenants, inscriptions, tuteurs | `UniteAcademique`, `ElementPedagogique`, `Apprenant`, `InscriptionApprenant`, `ContactTuteur`, `EcheancePaiement` |
| `pedagogie` | enseignants, notes, présences, horaires, calendrier, cahier des textes, soutenances, LMS | `PersonnelEnseignant`, `NoteEvaluation`, `Presence`, `Creneau`, `EvenementCalendrier`, `EntreeCahierTextes`, `Soutenance`, `RessourceLms`, `DevoirLms`, `RemiseDevoir` |
| `finances` | reçus, dépenses, paie, abonnements et échéances | `Paiement`, `Depense`, `BulletinPaie`, `AbonnementService` |
| `services_etablissement` | bibliothèque, prêts, inventaire, santé, discipline, anciens | `Livre`, `Emprunt`, `ArticleInventaire`, `PretMateriel`, `VisiteInfirmerie`, `IncidentDiscipline`, `AncienEtudiant` |
| `communication` | annonces, notifications, fils et messages | `ArticleActualite`, `MessageCommunication`, `Notification`, `FilDiscussion`, `MessageDirect` |
| `documents` | registre, pièces, fichiers | `DocumentOfficiel`, `FichierTeleverse` |
| `securite` | audit, consentements/demandes RGPD, permissions et importations | `EntreeAudit`, `ConsentementRgpd`, `DemandeRgpd`, `SurchargePermission`, `LotImportation`, `AttributionBadge` |
| `api` | santé, exception handler, permissions/queryset communs, pagination | pas de données métier |

Les modèles seront relationnels, avec `ForeignKey` vers le tenant et les entités référencées. Les listes imbriquées dont le code applique des mises à jour séparées (inscriptions, paiements, prêts, remises, messages) seront des lignes dédiées, pas un JSON opaque. Les sous-objets sans identité indépendante pourront rester des champs JSON uniquement si l’examen des mutations confirme qu’ils ne sont pas filtrés, interrogés ou autorisés indépendamment.

## Matrice de permissions à traduire côté serveur

Les identifiants de permission ci-dessous sont les permissions par défaut exactes des rôles de `src/configuration/roles_permissions.ts`. L’API doit également appliquer les exclusions super-admin, les types d’établissement applicables, les surcharges configurables et les restrictions de lignes apprenant/parent. Cette table est le point de départ; elle ne remplace pas les validations objet/tenant.

| Rôle | Permissions par défaut |
|---|---|
| `SUPER_ADMIN` | `plateforme:gerer`, `tableau_de_bord:voir`, `admissions:voir`, `apprenants:voir`, `pedagogie:voir`, `campus_numerique:voir`, `emplois_du_temps:voir`, `stages:voir`, `finances:voir`, `rh:voir`, `documents:voir`, `communication:voir`, `services:voir`, `bibliotheque_materiels:voir`, `actualites:voir`, `badges:voir`, `rapports:voir`, `parametres:voir`, `parametres:gerer`, `roles:gerer`, `audit:voir`, `comptes:gerer`, `rgpd:gerer`, `profil:voir`. Malgré la configuration de plateforme, exclure les opérations métier quotidiennes listées dans le modèle. |
| `DIRECTEUR` | `tableau_de_bord:voir`, `admissions:voir`, `admissions:gerer`, `apprenants:voir`, `apprenants:gerer`, `pedagogie:voir`, `pedagogie:verrouiller`, `campus_numerique:voir`, `emplois_du_temps:voir`, `stages:voir`, `finances:voir`, `finances:gerer`, `rh:voir`, `rh:gerer`, `documents:voir`, `documents:emettre`, `communication:voir`, `communication:envoyer`, `services:voir`, `bibliotheque_materiels:voir`, `bibliotheque_materiels:gerer`, `rapports:voir`, `parametres:voir`, `parametres:gerer`, `roles:gerer`, `audit:voir`, `actualites:voir`, `actualites:gerer`, `messagerie:utiliser`, `badges:voir`, `badges:gerer`, `importations:gerer`, `comptes:gerer`, `rgpd:gerer`, `profil:voir`. |
| `ADMIN_ETAB` | `tableau_de_bord:voir`, `admissions:voir`, `admissions:gerer`, `apprenants:voir`, `apprenants:gerer`, `pedagogie:voir`, `campus_numerique:voir`, `emplois_du_temps:voir`, `emplois_du_temps:gerer`, `stages:voir`, `finances:voir`, `rh:voir`, `documents:voir`, `documents:emettre`, `communication:voir`, `communication:envoyer`, `services:voir`, `services:gerer`, `bibliotheque_materiels:voir`, `bibliotheque_materiels:gerer`, `rapports:voir`, `parametres:voir`, `parametres:gerer`, `roles:gerer`, `audit:voir`, `actualites:voir`, `actualites:gerer`, `messagerie:utiliser`, `badges:voir`, `badges:gerer`, `importations:gerer`, `comptes:gerer`, `rgpd:gerer`, `profil:voir`. |
| `SCOLARITE` | `tableau_de_bord:voir`, `admissions:voir`, `admissions:gerer`, `apprenants:voir`, `apprenants:gerer`, `pedagogie:voir`, `emplois_du_temps:voir`, `documents:voir`, `documents:emettre`, `communication:voir`, `communication:envoyer`, `bibliotheque_materiels:voir`, `rapports:voir`, `actualites:voir`, `actualites:gerer`, `messagerie:utiliser`, `badges:voir`, `badges:gerer`, `importations:gerer`, `profil:voir`. |
| `ECONOME` | `tableau_de_bord:voir`, `apprenants:voir`, `finances:voir`, `finances:encaisser`, `finances:gerer`, `rh:voir`, `rh:gerer`, `documents:voir`, `communication:voir`, `communication:envoyer`, `rapports:voir`, `actualites:voir`, `messagerie:utiliser`, `importations:gerer`, `profil:voir`. |
| `DIR_ETUDES` | `tableau_de_bord:voir`, `apprenants:voir`, `pedagogie:voir`, `pedagogie:noter`, `pedagogie:appel`, `pedagogie:verrouiller`, `campus_numerique:voir`, `emplois_du_temps:voir`, `emplois_du_temps:gerer`, `stages:voir`, `documents:voir`, `documents:emettre`, `communication:voir`, `communication:envoyer`, `services:voir`, `bibliotheque_materiels:voir`, `bibliotheque_materiels:gerer`, `rapports:voir`, `actualites:voir`, `actualites:gerer`, `messagerie:utiliser`, `badges:voir`, `badges:gerer`, `profil:voir`. |
| `ENSEIGNANT` | `tableau_de_bord:voir`, `apprenants:voir`, `pedagogie:voir`, `pedagogie:noter`, `pedagogie:appel`, `campus_numerique:voir`, `emplois_du_temps:voir`, `bibliotheque_materiels:voir`, `communication:voir`, `portail:enseignant`, `actualites:voir`, `messagerie:utiliser`, `badges:voir`, `profil:voir`. |
| `RESP_STAGES` | `tableau_de_bord:voir`, `apprenants:voir`, `stages:voir`, `stages:gerer`, `documents:voir`, `documents:emettre`, `communication:voir`, `communication:envoyer`, `rapports:voir`, `profil:voir`; applicable seulement à `PRO` et `UNIVERSITE`. |
| `SERVICES_ANNEXES` | `tableau_de_bord:voir`, `apprenants:voir`, `services:voir`, `services:gerer`, `bibliotheque_materiels:voir`, `bibliotheque_materiels:gerer`, `communication:voir`, `profil:voir`. |
| `PARENT` | `portail:parent`, `campus_numerique:voir`, `emplois_du_temps:voir`, `communication:voir`, `documents:voir`, `actualites:voir`, `messagerie:utiliser`, `badges:voir`, `profil:voir`; applicable seulement à `SCOLAIRE`. |
| `APPRENANT` | `portail:apprenant`, `campus_numerique:voir`, `emplois_du_temps:voir`, `bibliotheque_materiels:voir`, `communication:voir`, `documents:voir`, `actualites:voir`, `messagerie:utiliser`, `badges:voir`, `profil:voir`. |
| `AUDITEUR` | `tableau_de_bord:voir`, `apprenants:voir`, `pedagogie:voir`, `emplois_du_temps:voir`, `stages:voir`, `finances:voir`, `rh:voir`, `documents:voir`, `bibliotheque_materiels:voir`, `rapports:voir`, `audit:voir`, `profil:voir`; lecture seule. |

## API proposée

Le socle de phase 1 fournit `/api/sante/`, `/api/auth/token/`, `/api/auth/token/refresh/`, `/api/auth/me/` et `/api/schema/` avec `/api/docs/`. La phase 2 ajoutera des ressources REST sous `/api/etablissements/{id_etablissement}/...` pour les collections métier; elle devra ajouter recherche, filtres, tri et pagination standardisés. Le registre complet sera maintenu dans [`API.md`](API.md).

Les actions métier doivent être explicites pour éviter qu’un CRUD générique contourne une transition : annuler une inscription ou un paiement, prolonger un emprunt, solder un prêt, verrouiller une période, traiter une demande RGPD, etc. La vérification de permission est faite avant chaque mutation et dans le queryset objet.

## Authentification, tenancy et erreurs

- JWT court avec jeton de rafraîchissement rotatif; les tokens restent dans la mémoire/session définie au branchement frontend, jamais dans `localStorage` sans justification.
- Login par courriel/mot de passe Django haché. La connexion Google actuelle n’est pas remplacée à l’identique par une API JWT sans décision sur la fédération; la parité est un prérequis à la phase d’auth.
- L’affiliation et le rôle sont vérifiés en base pour chaque requête; l’identifiant tenant des objets reçus est ignoré ou rejeté, puis renseigné depuis le contexte serveur.
- Messages et erreurs API en français, erreurs de validation structurées, pas de détails internes, jetons ou données personnelles dans les journaux.
- Origines CORS fournies par variable d’environnement; le proxy Vite `/api` est destiné au développement, pas une politique de sécurité de production.

## Migration des données de démonstration

`seed_demo` doit importer exactement les exports des trois fichiers `src/donnees/`, avec identifiants et relations conservés, établir les affiliations et transformer `construire_inscriptions_initiales` de la même façon que le frontend. La commande doit utiliser `update_or_create`/transactions ou une stratégie équivalente idempotente et ne pas supprimer des données métier existantes. Les secrets de démonstration en clair ne deviennent jamais les mots de passe des comptes Django; l’authentification de test doit utiliser des mots de passe hachés définis explicitement en environnement de développement.

La conversion de fixtures doit vérifier le nombre d’objets, l’absence de relations orphelines et le total des indicateurs par tenant. Un import initial contrôlé des données personnalisées persistées dans `localStorage` n’est pas défini par les sources; il faudra une décision et un outil séparés, sans migration automatique dans un seed idempotent.

## Étapes et état

Phase 0 documente le système existant et les hypothèses. La phase 1 crée le socle technique et des tests de santé/authentification. Les phases 2 à 6 sont nécessaires avant de prétendre à la parité métier, à la suppression de Firebase ou à la réussite complète des parcours d’interface; elles sont suivies dans le rapport de tâche.
