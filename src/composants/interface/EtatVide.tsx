import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Bouton } from './Bouton';

interface ProprietesEtatVide {
  titre: string;
  description: string;
  libelle_action?: string;
  sur_action?: () => void;
  icone?: React.ReactNode;
}

export const EtatVide: React.FC<ProprietesEtatVide> = ({
  titre,
  description,
  libelle_action,
  sur_action,
  icone,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
      <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-3">
        {icone ?? <FolderOpen className="w-5 h-5" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titre}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1">{description}</p>
      {libelle_action && sur_action && (
        <div className="mt-4">
          <Bouton variante="secondaire" taille="sm" onClick={sur_action}>
            {libelle_action}
          </Bouton>
        </div>
      )}
    </div>
  );
};
