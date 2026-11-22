import React from 'react';

interface ProprietesCarte {
  children: React.ReactNode;
  className?: string;
  rembourrage?: 'aucun' | 'petit' | 'moyen' | 'grand';
}

export const Carte: React.FC<ProprietesCarte> = ({
  children,
  className = '',
  rembourrage = 'moyen',
}) => {
  const classe_rembourrage =
    rembourrage === 'aucun'
      ? ''
      : rembourrage === 'petit'
        ? 'p-4'
        : rembourrage === 'grand'
          ? 'p-6'
          : 'p-5';

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${classe_rembourrage} ${className}`}
    >
      {children}
    </div>
  );
};
