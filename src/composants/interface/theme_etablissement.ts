import { TypeEtablissement } from '../../modeles/erp';

export interface JetonsThemeEtablissement {
  bouton_principal: string;
  nav_active: string;
  texte_accent: string;
  fond_accent_doux: string;
  classe_etiquette: string;
  anneau_focus: string;
  remplissage_progression: string;
}

export function obtenir_theme_etablissement(type: TypeEtablissement): JetonsThemeEtablissement {
  switch (type) {
    case 'PRO':
      return {
        bouton_principal:
          'bg-amber-600 hover:bg-amber-700 text-white focus-visible:ring-amber-500 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950',
        nav_active:
          'bg-amber-50 text-amber-900 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/60',
        texte_accent: 'text-amber-700 dark:text-amber-400',
        fond_accent_doux: 'bg-amber-50 dark:bg-amber-950/40',
        classe_etiquette:
          'bg-amber-100 text-amber-900 border border-amber-300/80 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700/70',
        anneau_focus: 'focus-visible:ring-amber-500',
        remplissage_progression: 'bg-amber-500',
      };
    case 'SCOLAIRE':
      return {
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
      };
    case 'UNIVERSITE':
      return {
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
      };
  }
}
