import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Layers, Search, User, Users } from 'lucide-react';
import { obtenir_elements_navigation } from '../../configuration/navigation';
import { utiliserErp } from '../../contexte/ContexteErp';

export const PaletteCommandes: React.FC = () => {
  const {
    palette_commandes_ouverte,
    definir_palette_commandes_ouverte,
    etablissement_actif,
    terminologie,
    a_permission,
    definir_route_active,
    ouvrir_dossier_apprenant,
    apprenants_etablissement,
    unites_etablissement,
    enseignants_etablissement,
  } = utiliserErp();

  const [requete, definir_requete] = useState('');
  const ref_champ_saisie = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (palette_commandes_ouverte) {
      definir_requete('');
      setTimeout(() => ref_champ_saisie.current?.focus(), 20);
    }
  }, [palette_commandes_ouverte]);

  useEffect(() => {
    if (!palette_commandes_ouverte) return;
    const sur_touche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') definir_palette_commandes_ouverte(false);
    };
    window.addEventListener('keydown', sur_touche);
    return () => window.removeEventListener('keydown', sur_touche);
  }, [palette_commandes_ouverte, definir_palette_commandes_ouverte]);

  const resultats = useMemo(() => {
    const q = requete.trim().toLowerCase();
    const elements_nav = obtenir_elements_navigation(etablissement_actif.type).filter((element) =>
      a_permission(element.permission_requise)
    );

    return {
      navigation: elements_nav
        .filter((element) => !q || element.libelle.toLowerCase().includes(q))
        .slice(0, 5),
      apprenants: apprenants_etablissement
        .filter(
          (apprenant) =>
            !q ||
            `${apprenant.prenom} ${apprenant.nom}`.toLowerCase().includes(q) ||
            apprenant.matricule.toLowerCase().includes(q)
        )
        .slice(0, 5),
      unites: unites_etablissement
        .filter(
          (unite) =>
            !q || unite.nom.toLowerCase().includes(q) || unite.code.toLowerCase().includes(q)
        )
        .slice(0, 4),
      enseignants: enseignants_etablissement
        .filter(
          (enseignant) =>
            !q ||
            enseignant.nom_complet.toLowerCase().includes(q) ||
            enseignant.specialite.toLowerCase().includes(q)
        )
        .slice(0, 3),
    };
  }, [
    requete,
    etablissement_actif,
    a_permission,
    apprenants_etablissement,
    unites_etablissement,
    enseignants_etablissement,
  ]);

  if (!palette_commandes_ouverte) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-slate-950/55 backdrop-blur-[2px]"
      onClick={() => definir_palette_commandes_ouverte(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Recherche globale"
    >
      <div
        className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden"
        onClick={(evenement) => evenement.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={ref_champ_saisie}
            type="text"
            value={requete}
            onChange={(evenement) => definir_requete(evenement.target.value)}
            placeholder={`Rechercher dans ${etablissement_actif.nom_court} (${terminologie.apprenant_pluriel.toLowerCase()}, ${terminologie.unite_pluriel.toLowerCase()}, modules)...`}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400">
            Échap
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {resultats.navigation.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                Navigation
              </div>
              {resultats.navigation.map((element) => (
                <button
                  key={element.id}
                  type="button"
                  onClick={() => {
                    definir_route_active(element.id);
                    definir_palette_commandes_ouverte(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <span>{element.libelle}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          )}

          {resultats.apprenants.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                {terminologie.apprenant_pluriel} (ouvrir Dossier 360°)
              </div>
              {resultats.apprenants.map((apprenant) => (
                <button
                  key={apprenant.id}
                  type="button"
                  onClick={() => {
                    ouvrir_dossier_apprenant(apprenant.id);
                    definir_palette_commandes_ouverte(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {apprenant.prenom} {apprenant.nom}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-slate-400 shrink-0">
                    {apprenant.matricule}
                  </span>
                </button>
              ))}
            </div>
          )}

          {resultats.unites.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                {terminologie.unite_pluriel}
              </div>
              {resultats.unites.map((unite) => (
                <button
                  key={unite.id}
                  type="button"
                  onClick={() => {
                    definir_route_active('structure');
                    definir_palette_commandes_ouverte(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{unite.nom}</span>
                  </span>
                  <span className="font-mono text-xs text-slate-400 shrink-0">{unite.code}</span>
                </button>
              ))}
            </div>
          )}

          {resultats.enseignants.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                {terminologie.enseignant_pluriel}
              </div>
              {resultats.enseignants.map((enseignant) => (
                <button
                  key={enseignant.id}
                  type="button"
                  onClick={() => {
                    definir_route_active('structure');
                    definir_palette_commandes_ouverte(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{enseignant.nom_complet}</span>
                  </span>
                  <span className="text-xs text-slate-400 truncate max-w-[180px]">
                    {enseignant.specialite}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
