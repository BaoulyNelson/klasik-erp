/**
 * Export CSV encodé UTF-8 avec BOM pour compatibilité Excel en français.
 */
export function telecharger_fichier_csv(
  nom_fichier: string,
  entetes: string[],
  lignes: (string | number | boolean | undefined)[][]
): void {
  const echapper_valeur = (valeur: string | number | boolean | undefined) => {
    const chaine = valeur === undefined || valeur === null ? '' : String(valeur);
    if (chaine.includes(';') || chaine.includes('"') || chaine.includes('\n')) {
      return `"${chaine.replace(/"/g, '""')}"`;
    }
    return chaine;
  };

  const lignes_csv = [
    entetes.map(echapper_valeur).join(';'),
    ...lignes.map((ligne) => ligne.map(echapper_valeur).join(';')),
  ];
  const contenu_csv = '\uFEFF' + lignes_csv.join('\r\n');
  const blob = new Blob([contenu_csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.setAttribute('download', nom_fichier.endsWith('.csv') ? nom_fichier : `${nom_fichier}.csv`);
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}
