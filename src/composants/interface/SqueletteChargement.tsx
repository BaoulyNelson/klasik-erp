import React from 'react';

export const SqueletteTableau: React.FC<{ lignes?: number; colonnes?: number }> = ({
  lignes = 6,
  colonnes = 5,
}) => {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-3 flex gap-4">
        {Array.from({ length: colonnes }).map((_, indice) => (
          <div
            key={indice}
            className="h-3.5 rounded bg-slate-200 dark:bg-slate-800 animate-pulse flex-1"
          />
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
        {Array.from({ length: lignes }).map((_, indice_ligne) => (
          <div key={indice_ligne} className="px-4 py-3 flex gap-4 items-center">
            {Array.from({ length: colonnes }).map((_, indice_colonne) => (
              <div
                key={indice_colonne}
                className="h-4 rounded bg-slate-100 dark:bg-slate-800/70 animate-pulse flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
