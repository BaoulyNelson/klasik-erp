import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ProprietesModale {
  ouverte: boolean;
  sur_fermeture: () => void;
  titre: string;
  sous_titre?: string;
  classe_largeur_max?: string;
  children: React.ReactNode;
  pied_page?: React.ReactNode;
}

export const Modale: React.FC<ProprietesModale> = ({
  ouverte,
  sur_fermeture,
  titre,
  sous_titre,
  classe_largeur_max = 'max-w-2xl',
  children,
  pied_page,
}) => {
  useEffect(() => {
    if (!ouverte) return;
    const sur_touche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') sur_fermeture();
    };
    window.addEventListener('keydown', sur_touche);
    return () => window.removeEventListener('keydown', sur_touche);
  }, [ouverte, sur_fermeture]);

  if (!ouverte) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titre-modale"
      onClick={sur_fermeture}
    >
      <div
        className={`w-full ${classe_largeur_max} rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]`}
        onClick={(evenement) => evenement.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2
              id="titre-modale"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {titre}
            </h2>
            {sous_titre && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{sous_titre}</p>
            )}
          </div>
          <button
            type="button"
            onClick={sur_fermeture}
            aria-label="Fermer la fenêtre"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">{children}</div>

        {pied_page && (
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end gap-3">
            {pied_page}
          </div>
        )}
      </div>
    </div>
  );
};
