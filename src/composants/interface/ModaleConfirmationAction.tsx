import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, LogOut, ShieldAlert } from 'lucide-react';
import { Bouton } from './Bouton';
import { Modale } from './Modale';

export interface ElementImpactConfirmation {
  libelle: string;
  valeur?: string | number;
}

interface ProprietesModaleConfirmationAction {
  ouverte: boolean;
  sur_fermeture: () => void;
  sur_confirmation: () => void;
  titre: string;
  sous_titre?: string;
  description: string;
  tonalite?: 'danger' | 'avertissement' | 'info';
  icone?: 'danger' | 'avertissement' | 'deconnexion' | 'info';
  elements_impact?: ElementImpactConfirmation[];
  note_irreversible?: string;
  phrase_requise?: string;
  libelle_phrase_requise?: string;
  libelle_confirmation?: string;
  libelle_annulation?: string;
}

export const ModaleConfirmationAction: React.FC<ProprietesModaleConfirmationAction> = ({
  ouverte,
  sur_fermeture,
  sur_confirmation,
  titre,
  sous_titre,
  description,
  tonalite = 'danger',
  icone,
  elements_impact,
  note_irreversible,
  phrase_requise,
  libelle_phrase_requise,
  libelle_confirmation = 'Confirmer',
  libelle_annulation = 'Annuler',
}) => {
  const [phrase_saisie, definir_phrase_saisie] = useState('');

  useEffect(() => {
    if (!ouverte) {
      definir_phrase_saisie('');
    }
  }, [ouverte]);

  const phrase_attendue = phrase_requise?.trim();
  const phrase_correspond = !phrase_attendue || phrase_saisie.trim() === phrase_attendue;

  const styles_tonalite =
    tonalite === 'danger'
      ? {
          fond_banniere:
            'bg-red-50/90 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900/70 dark:text-red-200',
          cadre_icone:
            'bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-400 border border-red-200 dark:border-red-900',
          fond_note:
            'bg-red-50/70 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900/60 dark:text-red-300',
          variante_bouton: 'danger' as const,
        }
      : tonalite === 'avertissement'
        ? {
            fond_banniere:
              'bg-amber-50/90 border-amber-200 text-amber-950 dark:bg-amber-950/40 dark:border-amber-900/70 dark:text-amber-200',
            cadre_icone:
              'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-900',
            fond_note:
              'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/60 dark:text-amber-200',
            variante_bouton: 'principal' as const,
          }
        : {
            fond_banniere:
              'bg-indigo-50/90 border-indigo-200 text-indigo-950 dark:bg-indigo-950/40 dark:border-indigo-900/70 dark:text-indigo-200',
            cadre_icone:
              'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900',
            fond_note:
              'bg-indigo-50/70 border-indigo-200 text-indigo-900 dark:bg-indigo-950/30 dark:border-indigo-900/60 dark:text-indigo-200',
            variante_bouton: 'principal' as const,
          };

  const icone_resolue =
    icone ?? (tonalite === 'danger' ? 'danger' : tonalite === 'avertissement' ? 'avertissement' : 'info');

  const ComposantIcone =
    icone_resolue === 'deconnexion'
      ? LogOut
      : icone_resolue === 'danger'
        ? ShieldAlert
        : icone_resolue === 'avertissement'
          ? AlertTriangle
          : Info;

  const gerer_confirmation = () => {
    if (!phrase_correspond) return;
    sur_confirmation();
    sur_fermeture();
  };

  return (
    <Modale
      ouverte={ouverte}
      sur_fermeture={sur_fermeture}
      titre={titre}
      sous_titre={sous_titre}
      classe_largeur_max="max-w-lg"
      pied_page={
        <>
          <Bouton type="button" variante="secondaire" onClick={sur_fermeture}>
            {libelle_annulation}
          </Bouton>
          <Bouton
            type="button"
            variante={styles_tonalite.variante_bouton}
            classe_accent={
              tonalite === 'avertissement'
                ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                : undefined
            }
            disabled={!phrase_correspond}
            onClick={gerer_confirmation}
          >
            {libelle_confirmation}
          </Bouton>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        <div
          className={`rounded-xl border p-4 flex items-start gap-3.5 ${styles_tonalite.fond_banniere}`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${styles_tonalite.cadre_icone}`}
          >
            <ComposantIcone className="w-5 h-5" />
          </div>
          <p className="text-sm leading-relaxed">{description}</p>
        </div>

        {elements_impact && elements_impact.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
            {elements_impact.map((element) => (
              <div
                key={element.libelle}
                className="px-3.5 py-2.5 flex items-center justify-between gap-3"
              >
                <span className="text-slate-600 dark:text-slate-400">{element.libelle}</span>
                {element.valeur !== undefined && (
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 text-right">
                    {element.valeur}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {note_irreversible && (
          <div
            className={`rounded-lg border px-3.5 py-2.5 flex items-start gap-2 ${styles_tonalite.fond_note}`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{note_irreversible}</span>
          </div>
        )}

        {phrase_attendue && (
          <div className="space-y-2 pt-1">
            <label className="block font-semibold text-slate-700 dark:text-slate-200">
              {libelle_phrase_requise ?? 'Confirmation de sécurité : saisissez exactement'}{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-red-600 dark:text-red-400 select-all">
                {phrase_attendue}
              </code>
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={phrase_saisie}
                onChange={(e) => definir_phrase_saisie(e.target.value)}
                placeholder={phrase_attendue}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
              {phrase_correspond && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>
        )}
      </div>
    </Modale>
  );
};
