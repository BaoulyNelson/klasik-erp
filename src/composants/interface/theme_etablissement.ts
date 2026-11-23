import { CouleurAccentEtablissement, TypeEtablissement } from '../../modeles/erp';

export interface JetonsThemeEtablissement {
  bouton_principal: string;
  nav_active: string;
  texte_accent: string;
  fond_accent_doux: string;
  classe_etiquette: string;
  anneau_focus: string;
  remplissage_progression: string;
}

const THEMES: Record<CouleurAccentEtablissement, JetonsThemeEtablissement> = {
  blue: {
    bouton_principal:
      'bg-blue-700 hover:bg-blue-800 text-white focus-visible:ring-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500',
    nav_active:
      'bg-blue-50 text-blue-900 border border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800/60',
    texte_accent: 'text-blue-700 dark:text-blue-400',
    fond_accent_doux: 'bg-blue-50 dark:bg-blue-950/40',
    classe_etiquette:
      'bg-blue-100 text-blue-900 border border-blue-300/80 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700/70',
    anneau_focus: 'focus-visible:ring-blue-600',
    remplissage_progression: 'bg-blue-600',
  },
  teal: {
    bouton_principal:
      'bg-teal-700 hover:bg-teal-800 text-white focus-visible:ring-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500',
    nav_active:
      'bg-teal-50 text-teal-900 border border-teal-200/80 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-800/60',
    texte_accent: 'text-teal-700 dark:text-teal-400',
    fond_accent_doux: 'bg-teal-50 dark:bg-teal-950/40',
    classe_etiquette:
      'bg-teal-100 text-teal-900 border border-teal-300/80 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-700/70',
    anneau_focus: 'focus-visible:ring-teal-600',
    remplissage_progression: 'bg-teal-600',
  },
  violet: {
    bouton_principal:
      'bg-violet-700 hover:bg-violet-800 text-white focus-visible:ring-violet-600 dark:bg-violet-600 dark:hover:bg-violet-500',
    nav_active:
      'bg-violet-50 text-violet-900 border border-violet-200/80 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800/60',
    texte_accent: 'text-violet-700 dark:text-violet-400',
    fond_accent_doux: 'bg-violet-50 dark:bg-violet-950/40',
    classe_etiquette:
      'bg-violet-100 text-violet-900 border border-violet-300/80 dark:bg-violet-950/80 dark:text-violet-200 dark:border-violet-700/70',
    anneau_focus: 'focus-visible:ring-violet-600',
    remplissage_progression: 'bg-violet-600',
  },
  orange: {
    bouton_principal:
      'bg-orange-600 hover:bg-orange-700 text-white focus-visible:ring-orange-500 dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950',
    nav_active:
      'bg-orange-50 text-orange-900 border border-orange-200/80 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-800/60',
    texte_accent: 'text-orange-700 dark:text-orange-400',
    fond_accent_doux: 'bg-orange-50 dark:bg-orange-950/40',
    classe_etiquette:
      'bg-orange-100 text-orange-900 border border-orange-300/80 dark:bg-orange-950/80 dark:text-orange-200 dark:border-orange-700/70',
    anneau_focus: 'focus-visible:ring-orange-500',
    remplissage_progression: 'bg-orange-500',
  },
  red: {
    bouton_principal:
      'bg-red-700 hover:bg-red-800 text-white focus-visible:ring-red-600 dark:bg-red-600 dark:hover:bg-red-500',
    nav_active:
      'bg-red-50 text-red-900 border border-red-200/80 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800/60',
    texte_accent: 'text-red-700 dark:text-red-400',
    fond_accent_doux: 'bg-red-50 dark:bg-red-950/40',
    classe_etiquette:
      'bg-red-100 text-red-900 border border-red-300/80 dark:bg-red-950/80 dark:text-red-200 dark:border-red-700/70',
    anneau_focus: 'focus-visible:ring-red-600',
    remplissage_progression: 'bg-red-600',
  },
  navy: {
    bouton_principal:
      'bg-indigo-900 hover:bg-indigo-950 text-white focus-visible:ring-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600',
    nav_active:
      'bg-indigo-50 text-indigo-950 border border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800/60',
    texte_accent: 'text-indigo-900 dark:text-indigo-300',
    fond_accent_doux: 'bg-indigo-50 dark:bg-indigo-950/40',
    classe_etiquette:
      'bg-indigo-100 text-indigo-950 border border-indigo-300/80 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-700/70',
    anneau_focus: 'focus-visible:ring-indigo-700',
    remplissage_progression: 'bg-indigo-800',
  },
};

export function obtenir_theme_etablissement(
  type: TypeEtablissement,
  couleur_accent?: CouleurAccentEtablissement
): JetonsThemeEtablissement {
  const couleur_par_type: Record<TypeEtablissement, CouleurAccentEtablissement> = {
    PRO: 'orange',
    SCOLAIRE: 'blue',
    UNIVERSITE: 'violet',
  };
  return THEMES[couleur_accent ?? couleur_par_type[type]];
}
