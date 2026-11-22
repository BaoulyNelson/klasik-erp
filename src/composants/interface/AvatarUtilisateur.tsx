import React from 'react';
import { CompteUtilisateur } from '../../modeles/erp';

interface ProprietesAvatarUtilisateur {
  utilisateur: Pick<CompteUtilisateur, 'nom_complet' | 'initiales_avatar' | 'url_avatar'>;
  taille?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const CLASSES_TAILLES: Record<NonNullable<ProprietesAvatarUtilisateur['taille']>, string> = {
  xs: 'w-6 h-6 text-[10px] rounded-md',
  sm: 'w-7 h-7 text-xs rounded-lg',
  md: 'w-9 h-9 text-xs rounded-lg',
  lg: 'w-14 h-14 text-base rounded-xl',
  xl: 'w-24 h-24 text-2xl rounded-2xl',
};

export const AvatarUtilisateur: React.FC<ProprietesAvatarUtilisateur> = ({
  utilisateur,
  taille = 'sm',
  className = '',
}) => {
  const classe_taille = CLASSES_TAILLES[taille];

  if (utilisateur.url_avatar) {
    return (
      <div
        className={`${classe_taille} overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 ring-1 ring-slate-200 dark:ring-slate-700 ${className}`}
      >
        <img
          src={utilisateur.url_avatar}
          alt={utilisateur.nom_complet}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${classe_taille} bg-slate-900 dark:bg-slate-700 text-white font-display font-bold flex items-center justify-center shrink-0 select-none ${className}`}
      aria-label={utilisateur.nom_complet}
    >
      {utilisateur.initiales_avatar}
    </div>
  );
};
