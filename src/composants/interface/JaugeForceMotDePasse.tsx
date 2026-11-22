import React from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import {
  evaluer_force_mot_de_passe,
  generer_mot_de_passe_robuste,
} from '../../services/service_mots_de_passe';

interface ProprietesJaugeForceMotDePasse {
  mot_de_passe: string;
  sur_generation?: (genere: string) => void;
  compact?: boolean;
}

export const JaugeForceMotDePasse: React.FC<ProprietesJaugeForceMotDePasse> = ({
  mot_de_passe,
  sur_generation,
  compact = false,
}) => {
  const force = evaluer_force_mot_de_passe(mot_de_passe);

  const criteres = [
    { valide: force.criteres.longueur_minimale, libelle: '8+ caractères' },
    {
      valide: force.criteres.contient_majuscule && force.criteres.contient_minuscule,
      libelle: 'Maj. & min.',
    },
    { valide: force.criteres.contient_chiffre, libelle: 'Chiffre' },
    { valide: force.criteres.contient_caractere_special, libelle: 'Symbole (!@#)' },
  ];

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((palier) => (
            <div
              key={palier}
              className={`h-1.5 rounded-full transition-colors ${
                force.score >= palier ? force.couleur_barre : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>
        <span className={`text-[11px] font-semibold shrink-0 ${force.couleur_texte}`}>
          {force.libelle}
        </span>
        {sur_generation && (
          <button
            type="button"
            onClick={() => sur_generation(generer_mot_de_passe_robuste(12))}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3 h-3" />
            <span>Générer</span>
          </button>
        )}
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {criteres.map((critere) => (
            <span
              key={critere.libelle}
              className={`inline-flex items-center gap-1 text-[11px] ${
                critere.valide
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {critere.valide ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>{critere.libelle}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
