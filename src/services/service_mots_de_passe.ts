export interface CriteresMotDePasse {
  longueur_minimale: boolean;
  contient_majuscule: boolean;
  contient_minuscule: boolean;
  contient_chiffre: boolean;
  contient_caractere_special: boolean;
}

export interface ResultatForceMotDePasse {
  score: 0 | 1 | 2 | 3 | 4;
  libelle: string;
  couleur_barre: string;
  couleur_texte: string;
  criteres: CriteresMotDePasse;
}

/**
 * Contrat d'endpoints REST recommandé pour le backend Django (DRF + SimpleJWT).
 */
export const POINTS_ACCES_AUTH_DJANGO = {
  connexion: '/api/auth/connexion/',
  rafraichissement_jeton: '/api/auth/jeton/rafraichir/',
  deconnexion: '/api/auth/deconnexion/',
  changement_mot_de_passe: '/api/auth/mot-de-passe/modifier/',
  demande_reinitialisation_mot_de_passe: '/api/auth/mot-de-passe/reinitialiser/',
  confirmation_reinitialisation_mot_de_passe: '/api/auth/mot-de-passe/confirmer/',
  reinitialisation_admin: (id_utilisateur: string) =>
    `/api/utilisateurs/${id_utilisateur}/reinitialiser-mot-de-passe/`,
  deverrouillage_utilisateur: (id_utilisateur: string) =>
    `/api/utilisateurs/${id_utilisateur}/deverrouiller/`,
} as const;

export function evaluer_force_mot_de_passe(mot_de_passe: string): ResultatForceMotDePasse {
  const criteres: CriteresMotDePasse = {
    longueur_minimale: mot_de_passe.length >= 8,
    contient_majuscule: /[A-Z]/.test(mot_de_passe),
    contient_minuscule: /[a-z]/.test(mot_de_passe),
    contient_chiffre: /\d/.test(mot_de_passe),
    contient_caractere_special: /[^A-Za-z0-9]/.test(mot_de_passe),
  };

  if (!mot_de_passe) {
    return {
      score: 0,
      libelle: 'Aucun',
      couleur_barre: 'bg-slate-200 dark:bg-slate-700',
      couleur_texte: 'text-slate-400',
      criteres,
    };
  }

  let points = 0;
  if (criteres.longueur_minimale) points += 1;
  if (criteres.contient_majuscule && criteres.contient_minuscule) points += 1;
  if (criteres.contient_chiffre) points += 1;
  if (criteres.contient_caractere_special) points += 1;
  if (mot_de_passe.length >= 12 && points >= 3) points = 4;

  const score = Math.min(4, Math.max(1, points)) as 1 | 2 | 3 | 4;

  const metadonnees: Record<
    1 | 2 | 3 | 4,
    { libelle: string; couleur_barre: string; couleur_texte: string }
  > = {
    1: { libelle: 'Faible', couleur_barre: 'bg-red-500', couleur_texte: 'text-red-600 dark:text-red-400' },
    2: { libelle: 'Moyen', couleur_barre: 'bg-amber-500', couleur_texte: 'text-amber-600 dark:text-amber-400' },
    3: { libelle: 'Fort', couleur_barre: 'bg-sky-500', couleur_texte: 'text-sky-600 dark:text-sky-400' },
    4: { libelle: 'Excellent', couleur_barre: 'bg-emerald-500', couleur_texte: 'text-emerald-600 dark:text-emerald-400' },
  };

  return {
    score,
    ...metadonnees[score],
    criteres,
  };
}

export function valider_politique_mot_de_passe(
  mot_de_passe: string
): { valide: boolean; message?: string } {
  const nettoye = mot_de_passe.trim();
  if (nettoye.length < 8) {
    return {
      valide: false,
      message: 'Le mot de passe doit contenir au moins 8 caractères.',
    };
  }
  if (!/[A-Za-z]/.test(nettoye) || !/\d/.test(nettoye)) {
    return {
      valide: false,
      message: 'Le mot de passe doit contenir au moins une lettre et un chiffre.',
    };
  }
  return { valide: true };
}

export function generer_mot_de_passe_robuste(longueur = 12): string {
  const majuscules = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const minuscules = 'abcdefghijkmnopqrstuvwxyz';
  const chiffres = '23456789';
  const speciaux = '!@#$%&*?';
  const tous_caracteres = majuscules + minuscules + chiffres + speciaux;

  const choisir_aleatoire = (alphabet: string) => {
    const tableau = new Uint32Array(1);
    crypto.getRandomValues(tableau);
    return alphabet[tableau[0] % alphabet.length];
  };

  const caracteres = [
    choisir_aleatoire(majuscules),
    choisir_aleatoire(minuscules),
    choisir_aleatoire(chiffres),
    choisir_aleatoire(speciaux),
  ];
  while (caracteres.length < longueur) {
    caracteres.push(choisir_aleatoire(tous_caracteres));
  }

  for (let i = caracteres.length - 1; i > 0; i--) {
    const tableau = new Uint32Array(1);
    crypto.getRandomValues(tableau);
    const j = tableau[0] % (i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}

export function generer_code_otp(): string {
  const tableau = new Uint32Array(1);
  crypto.getRandomValues(tableau);
  return String(100000 + (tableau[0] % 900000));
}

export function masquer_courriel_ou_telephone(valeur: string): string {
  if (valeur.includes('@')) {
    const [partie_locale, domaine] = valeur.split('@');
    if (partie_locale.length <= 2) return `${partie_locale[0] ?? '*'}***@${domaine}`;
    return `${partie_locale.slice(0, 2)}${'*'.repeat(Math.min(5, partie_locale.length - 2))}@${domaine}`;
  }
  if (valeur.length <= 4) return '****';
  return `${valeur.slice(0, 4)}****${valeur.slice(-2)}`;
}
