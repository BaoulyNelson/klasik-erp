# Rapport de phase 6 — Parité, nettoyage et durcissement

## Réalisé

- Réduction des usages métier vers l’API pour les domaines principaux.
- Modèles relationnels par domaine prioritaires avec migrations.
- Tests Django tenant/autorisations/actions.
- Build TypeScript et build Vite réussis.
- Configuration Docker Compose backend/PostgreSQL/frontend ajoutée.

## Non terminé ou non vérifié

- Comparaison Playwright local/API avec captures et textes.
- Matrice exhaustive de tous les rôles et établissements.
- Suppression Firebase et dépendances, après preuve de parité complète.
- Découpage du bundle sous 500 Ko.
- Audit N+1 PostgreSQL complet.
- Cookies HttpOnly et CSRF pour les jetons.
- Exécution réelle de Compose et test de restauration d’une sauvegarde sur une base isolée.
- Suppression séparée et réversible de `EnregistrementMetier`.

Ces éléments sont reportés explicitement plutôt que prétendus terminés.

## Reprise du durcissement — 22 novembre 2026

### Réalisé dans cette reprise

- L’image Django démarre maintenant avec Gunicorn, sous un compte non privilégié; son entrée applique les migrations, crée le cache partagé et collecte les fichiers statiques. Les secrets locaux sont exclus des contextes Docker.
- Compose exige PostgreSQL, une clé Django privée, des hôtes/origines explicites et SMTP; il ne publie pas directement la base ni l’API. Nginx sert les fichiers statiques Django et transmet le schéma reçu du proxy TLS de confiance.
- Les journaux d’accès Nginx et Gunicorn sont désactivés pour éviter d’enregistrer les chemins de requête; les erreurs d’envoi de réinitialisation sont journalisées sans adresse ni jeton.
- Les connexions, réinitialisations et connexions Google/démo disposent de limites de débit. Hors développement, le cache partagé en base est obligatoire; les réponses de limitation sont en français.
- La réinitialisation de mot de passe est câblée à l’écran existant en mode API : courriel, code à usage unique de six chiffres, expiration à 15 minutes et invalidation après cinq erreurs. Le code n’est pas renvoyé en production; les mots de passe sont validés par les validateurs Django.
- Ajout du script de sauvegarde PostgreSQL `scripts/backup_postgresql.py` et d’une documentation de protection/restauration isolée.
- Ajout d’un verrou npm déterministe; la version d’esbuild et le transitive gRPC vulnérable ont été corrigés sans retirer Firebase avant preuve de parité.

### Vérifications réellement exécutées

- `backend\venv\Scripts\python.exe backend\manage.py check` : réussi.
- `backend\venv\Scripts\python.exe backend\manage.py makemigrations --check --dry-run` : aucune migration manquante.
- `backend\venv\Scripts\python.exe backend\manage.py test api` : 48 tests réussis, base de test détruite à la fin.
- Tests ciblés de réinitialisation, verrouillage et limitation : 4 tests réussis.
- Frontend dans une copie temporaire propre avec `npm ci`, `npm run lint` et `npm run build` : réussis. L’environnement présent utilise Node 22.19 alors que Firebase requiert Node 24.12; npm a signalé cette incompatibilité moteur pendant la vérification. Le bundle JavaScript reste à environ 2,03 Mo et l’avertissement Vite de 500 Ko persiste.
- `npm audit --omit=dev --audit-level=moderate` : aucune vulnérabilité de dépendance de production détectée. L’installation complète signale encore quatre vulnérabilités modérées dans les dépendances de développement.
- Compose a été analysé comme YAML valide; `py_compile` a réussi pour le script de sauvegarde et les modules Django modifiés.

### Non vérifié et toujours bloquant pour annoncer la production

- Docker n’est pas installé dans cet environnement : aucune image n’a été construite, aucun conteneur lancé, aucun parcours navigateur de déploiement testé.
- Le domaine, le proxy TLS externe et les identifiants du relais SMTP doivent être fournis/configurés par l’exploitant. Les sauvegardes et une restauration réelle sur une base isolée ne sont pas encore testées.
- La parité Playwright local/API et la matrice exhaustive rôles/établissements restent à produire. Plusieurs collections reposent encore sur `EnregistrementMetier`, des vues chargent encore des collections complètes, Firebase reste présent et Google/inscription autonome ne sont pas entièrement câblés.
- Les jetons restent stockés en `sessionStorage`; le passage à des cookies HttpOnly avec protection CSRF n’est pas réalisé.
- Le verrou npm a été vérifié dans une copie propre, car deux serveurs Vite déjà actifs empêchaient le remplacement sûr de leurs exécutables Windows dans `node_modules`. Aucun de ces processus n’a été arrêté.

**Conclusion de phase :** le socle de conteneurisation et de récupération de mot de passe est plus robuste, mais l’application n’est toujours pas certifiée prête pour la production. Les limites ci-dessus exigent encore implémentation ou validation réelle.

## Finalisation du schéma relationnel — 23 novembre 2026

### Réalisé

- `partenaires`, `fils_discussion` (avec messages), `badges_attribues`, `journaux_importations` et `demandes_conge` disposent maintenant de modèles, serializers, routes typées et permissions tenant/RBAC. Les champs JSON exposés restent compatibles avec `src/modeles/erp.ts`; l’ancien accès générique à ces collections est fermé.
- La migration `donnees.0005` transfère les lignes JSON vers les modèles, refuse explicitement les références ou relations incohérentes et restaure le contrat JSON au rollback.
- Les règlements hors espèces exigent une référence côté API et interface; les reçus précisent qu’il s’agit d’un enregistrement manuel sans passerelle en ligne. L’inscription initiale vérifie aussi la référence dans son handler.
- Sans configuration Firebase, le bouton Google est désactivé avec un message explicite. Ce comportement a été observé dans le navigateur.
- Le modèle `.env.example`, les arguments de build Firebase et le câblage Compose ont été vérifiés statiquement : PostgreSQL, `DJANGO_DEBUG=false`, migrations et `collectstatic` au démarrage, fichiers statiques relayés par Nginx.

### Vérifications exécutées

- `makemigrations --check --dry-run` : aucune migration manquante.
- `manage.py test api` : 91 tests réussis, exécutés sur une base SQLite temporaire isolée; les tests couvrent les contrats, les permissions tenant/apprenant et la migration/réversibilité.
- `npm run lint` : réussi.
- `npm run build` : réussi; l’avertissement préexistant de chunk JavaScript supérieur à 500 Ko demeure.
- Une base de démonstration SQLite isolée a été migrée puis supprimée. Aucune migration ni donnée fictive n’a été appliquée à la vraie base.

### Non vérifié — ne pas considérer la mise en production certifiée

- Docker n’est pas installé; Compose et les images n’ont donc pas été exécutés.
- Le parcours Playwright complet n’a pas abouti : avec des comptes fictifs sur la base isolée, la connexion au travers du navigateur a reçu HTTP 403 sur `/api/auth/token/` et généré une erreur console. Les tests Django avec client CSRF passent, mais le refus navigateur reste à diagnostiquer. Aucun parcours métier complet ni contrôle exhaustif du journal réseau n’est certifié.
- La migration de production n’a pas été appliquée; elle doit d’abord être précédée d’une sauvegarde vérifiée et d’une répétition sur une copie de la base réelle.
