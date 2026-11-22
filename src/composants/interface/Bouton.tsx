import React from 'react';

interface ProprietesBouton extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'principal' | 'secondaire' | 'fantome' | 'danger';
  taille?: 'sm' | 'md' | 'lg';
  classe_accent?: string;
}

export const Bouton: React.FC<ProprietesBouton> = ({
  variante = 'secondaire',
  taille = 'md',
  classe_accent,
  className = '',
  children,
  ...props
}) => {
  const classes_taille =
    taille === 'sm'
      ? 'px-3 py-1.5 text-xs min-h-[34px]'
      : taille === 'lg'
        ? 'px-5 py-2.5 text-sm min-h-[42px]'
        : 'px-4 py-2 text-sm min-h-[38px]';

  const classes_variante =
    variante === 'principal'
      ? classe_accent ??
        'bg-indigo-600 hover:bg-indigo-700 text-white focus-visible:ring-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-600'
      : variante === 'danger'
        ? 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-600'
        : variante === 'fantome'
          ? 'bg-transparent hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:ring-slate-400'
          : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-100 dark:border-slate-700 focus-visible:ring-slate-400';

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-950 ${classes_taille} ${classes_variante} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
