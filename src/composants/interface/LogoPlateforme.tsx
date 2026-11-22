import React from 'react';
import { ConfigurationPlateforme } from '../../modeles/erp';

interface ProprietesLogoPlateforme {
  configuration: Pick<
    ConfigurationPlateforme,
    'nom_plateforme' | 'url_logo' | 'initiales_logo' | 'couleur_marque'
  >;
  taille?: 'petit' | 'moyen' | 'grand';
}

const CLASSE_TAILLE: Record<NonNullable<ProprietesLogoPlateforme['taille']>, string> = {
  petit: 'w-6 h-6 text-xs rounded-md',
  moyen: 'w-8 h-8 text-sm rounded-lg',
  grand: 'w-11 h-11 text-base rounded-xl',
};

const CLASSE_COULEUR: Record<ConfigurationPlateforme['couleur_marque'], string> = {
  indigo: 'bg-indigo-600 text-white dark:bg-indigo-500',
  blue: 'bg-blue-700 text-white dark:bg-blue-600',
  emerald: 'bg-emerald-600 text-white dark:bg-emerald-500',
  amber: 'bg-amber-600 text-white dark:bg-amber-500',
  violet: 'bg-violet-600 text-white dark:bg-violet-500',
  slate: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
};

export const LogoPlateforme: React.FC<ProprietesLogoPlateforme> = ({
  configuration,
  taille = 'moyen',
}) => {
  const classe_taille = CLASSE_TAILLE[taille];

  if (configuration.url_logo) {
    return (
      <div
        className={`${classe_taille} overflow-hidden bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center shrink-0`}
      >
        <img
          src={configuration.url_logo}
          alt={configuration.nom_plateforme}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`${classe_taille} ${CLASSE_COULEUR[configuration.couleur_marque] ?? CLASSE_COULEUR.slate} flex items-center justify-center font-display font-bold shrink-0 select-none`}
    >
      {configuration.initiales_logo.slice(0, 3).toUpperCase() || 'K'}
    </div>
  );
};
