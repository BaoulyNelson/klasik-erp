# Rapport de phase 5B — Fichiers et documents

## Réalisé

- Téléversement tenant-scopé de 25 Mo maximum.
- Lecture protégée selon propriétaire ou référence dans une donnée accessible.
- Contrôles MIME, nom de fichier, tenant et cache privé.
- Index relationnel `ReferenceFichier` ajouté; la lecture vérifie désormais les références indexées au lieu de balayer les collections JSON.
- Migration de données `donnees.0004_referencefichier` indexant les références existantes.
- Signal de suppression des références qui supprime physiquement un fichier sans aucune référence restante.
- Aperçus et téléchargements branchés dans le service Campus numérique.

## Vérifications

- Tests Django d’isolement et taille réussis.
- Vérification navigateur des deux modes restée à exécuter.

## Limites restantes

- Nettoyage physique automatisé à la suppression de la dernière référence.
- Remplacement du balayage JSON des collections par un index de références dédié.
