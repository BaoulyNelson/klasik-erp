const PREFIXE_CLE_BROUILLON_ADMISSION = 'klasik_brouillon_admission_';

export function creer_cle_brouillon_admission(id_etablissement: string): string {
  return `${PREFIXE_CLE_BROUILLON_ADMISSION}${id_etablissement}`;
}

export function effacer_brouillon_admission(id_etablissement: string): void {
  localStorage.removeItem(creer_cle_brouillon_admission(id_etablissement));
}

export function effacer_brouillons_admission(): void {
  const cles_a_effacer: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const cle = localStorage.key(index);
    if (cle?.startsWith(PREFIXE_CLE_BROUILLON_ADMISSION)) {
      cles_a_effacer.push(cle);
    }
  }
  cles_a_effacer.forEach((cle) => localStorage.removeItem(cle));
}
