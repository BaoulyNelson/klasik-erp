import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dossier_dist = resolve(process.cwd(), 'dist');
const elements_interdits = [
  'superadmin@klasik-erp.org',
  'superuser',
  'usr-super',
  'usr-dir-multi',
  'usr-dir-sco',
  'usr-rect-uni',
  'usr-scolarite',
  'usr-econome-multi',
  'usr-diretudes',
  'usr-enseignant',
  'usr-parent',
  'usr-apprenant',
  'usr-auditeur',
];

async function lister_fichiers(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true });
  const groupes = await Promise.all(
    entrees.map((entree) => {
      const chemin = resolve(dossier, entree.name);
      return entree.isDirectory() ? lister_fichiers(chemin) : [chemin];
    })
  );
  return groupes.flat();
}

const fichiers = await lister_fichiers(dossier_dist);
const violations = [];

for (const fichier of fichiers) {
  const contenu = (await readFile(fichier)).toString('utf8').toLowerCase();
  for (const element of elements_interdits) {
    if (contenu.includes(element.toLowerCase())) {
      violations.push(`${fichier} contient « ${element} »`);
    }
  }
}

if (violations.length) {
  throw new Error(`Le build public expose des données de démonstration :\n${violations.join('\n')}`);
}

console.log(`Build public vérifié : ${fichiers.length} fichiers analysés.`);
