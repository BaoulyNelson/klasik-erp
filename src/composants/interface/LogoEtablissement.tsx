import React from 'react';
import { TypeEtablissement } from '../../modeles/erp';

interface ProprietesLogoEtablissement {
  type: TypeEtablissement;
  code: string;
  url_logo?: string;
  nom?: string;
  taille?: 'petit' | 'moyen' | 'grand';
}

export const LogoEtablissement: React.FC<ProprietesLogoEtablissement> = ({
  type,
  code,
  url_logo,
  nom,
  taille = 'moyen',
}) => {
  const dimensions =
    taille === 'petit'
      ? 'h-8 w-8 text-xs'
      : taille === 'grand'
        ? 'h-12 w-12 text-base'
        : 'h-9 w-9 text-xs';

  if (url_logo) {
    return (
      <div
        className={`${dimensions} rounded-lg overflow-hidden bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center shrink-0 shadow-xs`}
      >
        <img
          src={url_logo}
          alt={nom ? `Logo ${nom}` : `Logo ${code}`}
          className="w-full h-full object-contain p-0.5"
        />
      </div>
    );
  }

  const classe_fond =
    type === 'PRO'
      ? 'bg-amber-600 text-white'
      : type === 'SCOLAIRE'
        ? 'bg-blue-700 text-white'
        : 'bg-violet-700 text-white';

  return (
    <div
      className={`${dimensions} ${classe_fond} rounded-lg flex items-center justify-center font-display font-bold tracking-tight shrink-0 shadow-xs`}
      aria-hidden="true"
    >
      <span>{code.slice(0, 3)}</span>
    </div>
  );
};
