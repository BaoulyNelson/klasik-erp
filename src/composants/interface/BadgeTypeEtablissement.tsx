import React from 'react';
import { TypeEtablissement } from '../../modeles/erp';
import { obtenir_theme_etablissement } from './theme_etablissement';

interface ProprietesBadgeTypeEtablissement {
  type: TypeEtablissement;
  compact?: boolean;
}

const LIBELLES_TYPE: Record<TypeEtablissement, string> = {
  PRO: 'PRO',
  SCOLAIRE: 'SCOLAIRE',
  UNIVERSITE: 'UNIVERSITÉ',
};

export const BadgeTypeEtablissement: React.FC<ProprietesBadgeTypeEtablissement> = ({
  type,
  compact = false,
}) => {
  const theme = obtenir_theme_etablissement(type);
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider whitespace-nowrap shrink-0 ${theme.classe_etiquette}`}
      title={
        type === 'PRO'
          ? 'École Professionnelle / Centre technique'
          : type === 'SCOLAIRE'
            ? 'Établissement Scolaire'
            : 'Université / Institut Supérieur'
      }
    >
      {compact ? LIBELLES_TYPE[type] : `[${LIBELLES_TYPE[type]}]`}
    </span>
  );
};
