export interface EquivalenceNoteInternationale {
  pourcentage: number;
  gpa4: number;
  lettre: string;
  mention: string;
}

/**
 * Convertit n'importe quelle note (échelle 10, 20 ou 100) en équivalence internationale :
 * Pourcentage, GPA 4.0, Grade Lettre (A+..F) et Mention francophone/internationale.
 */
export function convertir_note_internationale(
  note: number,
  echelle: 10 | 20 | 100
): EquivalenceNoteInternationale {
  const pourcentage = Math.max(0, Math.min(100, Math.round((note / echelle) * 100)));

  if (pourcentage >= 93) {
    return { pourcentage, gpa4: 4.0, lettre: 'A+', mention: 'Très Bien · Summa Cum Laude' };
  }
  if (pourcentage >= 88) {
    return { pourcentage, gpa4: 3.85, lettre: 'A', mention: 'Très Bien' };
  }
  if (pourcentage >= 82) {
    return { pourcentage, gpa4: 3.6, lettre: 'A-', mention: 'Bien · Magna Cum Laude' };
  }
  if (pourcentage >= 76) {
    return { pourcentage, gpa4: 3.3, lettre: 'B+', mention: 'Bien' };
  }
  if (pourcentage >= 70) {
    return { pourcentage, gpa4: 3.0, lettre: 'B', mention: 'Assez Bien · Cum Laude' };
  }
  if (pourcentage >= 62) {
    return { pourcentage, gpa4: 2.5, lettre: 'C+', mention: 'Assez Bien' };
  }
  if (pourcentage >= 50) {
    return { pourcentage, gpa4: 2.0, lettre: 'C', mention: 'Passable' };
  }
  if (pourcentage >= 40) {
    return { pourcentage, gpa4: 1.0, lettre: 'D', mention: 'Rattrapage conseillé' };
  }
  return { pourcentage, gpa4: 0.0, lettre: 'F', mention: 'Ajourné / Insuffisant' };
}
