# Rapport de phase 4 — Branchement des services

## État réel

- Les établissements, utilisateurs, RBAC, audit, fichiers, scolarité, pédagogie, finances, documents, communication, services annexes, LMS, RGPD, imports et badges utilisent désormais des endpoints API dédiés ou génériques compatibles.
- Le contexte React charge les collections autorisées pour l’établissement actif et synchronise les mutations API en mode `VITE_SOURCE_DONNEES=api`.
- Les jetons sont conservés en `sessionStorage`; les données métier API ne sont plus chargées depuis `localStorage`.
- Les anciennes données JSON restent disponibles dans `EnregistrementMetier` jusqu’à validation complète de tous les écrans et sont utilisées comme compatibilité/seed.

## Domaine par domaine

| Domaine | Branche réelle |
|---|---|
| Établissements, utilisateurs, RBAC | API dédiée |
| Scolarité | API typée |
| Pédagogie | API typée |
| Finances | API typée |
| Documents | API typée |
| Communication | API typée |
| Services annexes | Modèles/migrations/endpoints de base |
| LMS | API typée |
| RGPD/imports/badges | API typée |

## Ce qui reste local

- Chargement complet en mémoire pour certaines vues qui utilisent encore `COLLECTIONS_API` puis filtres frontend.
- Synchronisation locale détaillée des créations complexes (relations imbriquées, pièces jointes).
- La réinitialisation de mot de passe est branchée aux endpoints API et conserve l’écran/code à six chiffres; la connexion Google reste à remplacer entièrement côté API.
- Playwright local/API, capture visuelle et matrice exhaustive des rôles restent à exécuter.
