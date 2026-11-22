import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface ProprietesChampMotDePasse
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  icone_gauche?: React.ReactNode;
  classe_conteneur?: string;
}

export const ChampMotDePasse: React.FC<ProprietesChampMotDePasse> = ({
  icone_gauche,
  className = '',
  classe_conteneur = '',
  ...props
}) => {
  const [est_visible, definir_est_visible] = useState(false);

  return (
    <div className={`relative ${classe_conteneur}`}>
      {icone_gauche && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
          {icone_gauche}
        </span>
      )}
      <input
        {...props}
        type={est_visible ? 'text' : 'password'}
        className={`${icone_gauche ? 'pl-9' : 'px-3'} pr-9 ${className}`}
      />
      <button
        type="button"
        onClick={() => definir_est_visible((v) => !v)}
        aria-label={est_visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        title={est_visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        {est_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};
