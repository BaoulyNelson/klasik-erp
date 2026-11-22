import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { EtatVide } from './EtatVide';
import { SqueletteTableau } from './SqueletteChargement';

export interface ColonneTableauDonnees<T> {
  cle: string;
  entete: string;
  alignement?: 'left' | 'right' | 'center';
  valeur_tri?: (ligne: T) => string | number;
  rendu: (ligne: T) => React.ReactNode;
  classe_largeur?: string;
}

interface ProprietesTableauDonnees<T> {
  donnees: T[];
  colonnes: ColonneTableauDonnees<T>[];
  extracteur_cle: (ligne: T) => string;
  placeholder_recherche?: string;
  filtre_recherche?: (ligne: T, requete: string) => boolean;
  taille_page?: number;
  chargement?: boolean;
  sur_clic_ligne?: (ligne: T) => void;
  barre_outils_extra?: React.ReactNode;
  titre_vide?: string;
  description_vide?: string;
}

export function TableauDonnees<T>({
  donnees,
  colonnes,
  extracteur_cle,
  placeholder_recherche = 'Rechercher...',
  filtre_recherche,
  taille_page = 10,
  chargement = false,
  sur_clic_ligne,
  barre_outils_extra,
  titre_vide = 'Aucun résultat trouvé',
  description_vide = 'Modifiez vos critères de recherche ou réinitialisez les filtres actifs.',
}: ProprietesTableauDonnees<T>) {
  const [requete, definir_requete] = useState('');
  const [page, definir_page] = useState(1);
  const [colonne_tri, definir_colonne_tri] = useState<string | null>(null);
  const [sens_tri, definir_sens_tri] = useState<'asc' | 'desc'>('asc');

  const donnees_filtrees = useMemo(() => {
    let lignes = donnees;
    if (requete.trim() && filtre_recherche) {
      const texte = requete.trim().toLowerCase();
      lignes = lignes.filter((ligne) => filtre_recherche(ligne, texte));
    }
    if (colonne_tri) {
      const colonne = colonnes.find((c) => c.cle === colonne_tri);
      if (colonne?.valeur_tri) {
        const extracteur = colonne.valeur_tri;
        lignes = [...lignes].sort((a, b) => {
          const va = extracteur(a);
          const vb = extracteur(b);
          if (va < vb) return sens_tri === 'asc' ? -1 : 1;
          if (va > vb) return sens_tri === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }
    return lignes;
  }, [donnees, requete, filtre_recherche, colonne_tri, sens_tri, colonnes]);

  const total_pages = Math.max(1, Math.ceil(donnees_filtrees.length / taille_page));
  const page_securisee = Math.min(page, total_pages);
  const lignes_paginees = useMemo(() => {
    const debut = (page_securisee - 1) * taille_page;
    return donnees_filtrees.slice(debut, debut + taille_page);
  }, [donnees_filtrees, page_securisee, taille_page]);

  const gerer_tri = (cle: string) => {
    if (colonne_tri === cle) {
      definir_sens_tri((sens) => (sens === 'asc' ? 'desc' : 'asc'));
    } else {
      definir_colonne_tri(cle);
      definir_sens_tri('asc');
    }
  };

  if (chargement) {
    return <SqueletteTableau lignes={taille_page} colonnes={colonnes.length} />;
  }

  return (
    <div className="space-y-3">
      {(filtre_recherche || barre_outils_extra) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {filtre_recherche ? (
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={requete}
                onChange={(e) => {
                  definir_requete(e.target.value);
                  definir_page(1);
                }}
                placeholder={placeholder_recherche}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          ) : (
            <div />
          )}
          {barre_outils_extra && (
            <div className="flex items-center gap-2 flex-wrap">{barre_outils_extra}</div>
          )}
        </div>
      )}

      {lignes_paginees.length === 0 ? (
        <EtatVide
          titre={titre_vide}
          description={description_vide}
          libelle_action={requete ? 'Effacer la recherche' : undefined}
          sur_action={requete ? () => definir_requete('') : undefined}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
                  {colonnes.map((colonne) => {
                    const classe_alignement =
                      colonne.alignement === 'right'
                        ? 'text-right'
                        : colonne.alignement === 'center'
                          ? 'text-center'
                          : 'text-left';
                    return (
                      <th
                        key={colonne.cle}
                        className={`px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap ${classe_alignement} ${colonne.classe_largeur ?? ''}`}
                      >
                        {colonne.valeur_tri ? (
                          <button
                            type="button"
                            onClick={() => gerer_tri(colonne.cle)}
                            className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <span>{colonne.entete}</span>
                            <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </button>
                        ) : (
                          colonne.entete
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {lignes_paginees.map((ligne) => (
                  <tr
                    key={extracteur_cle(ligne)}
                    onClick={sur_clic_ligne ? () => sur_clic_ligne(ligne) : undefined}
                    className={`transition-colors ${
                      sur_clic_ligne
                        ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {colonnes.map((colonne) => {
                      const classe_alignement =
                        colonne.alignement === 'right'
                          ? 'text-right tabular-nums'
                          : colonne.alignement === 'center'
                            ? 'text-center'
                            : 'text-left';
                      return (
                        <td
                          key={colonne.cle}
                          className={`px-4 py-2.5 text-slate-700 dark:text-slate-200 align-middle ${classe_alignement}`}
                        >
                          {colonne.rendu(ligne)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
            <span className="tabular-nums">
              {donnees_filtrees.length} élément{donnees_filtrees.length > 1 ? 's' : ''} · Page{' '}
              {page_securisee} sur {total_pages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page_securisee <= 1}
                onClick={() => definir_page((p) => Math.max(1, p - 1))}
                aria-label="Page précédente"
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={page_securisee >= total_pages}
                onClick={() => definir_page((p) => Math.min(total_pages, p + 1))}
                aria-label="Page suivante"
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
