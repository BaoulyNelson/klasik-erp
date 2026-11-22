import React, { useEffect, useState } from 'react';
import { Check, Save } from 'lucide-react';
import { BadgeTypeEtablissement } from '../../composants/interface/BadgeTypeEtablissement';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import {
  CATALOGUE_DEVISES,
  PROFILS_PAYS,
  TOUS_LES_PAYS,
  TOUTES_LES_DEVISES,
} from '../../configuration/regions_devises';
import { DICTIONNAIRES_TERMINOLOGIE } from '../../configuration/terminologie';
import { utiliserErp } from '../../contexte/ContexteErp';
import { CodeDevise, CodePays, TypeEtablissement } from '../../modeles/erp';

export const VueMoteurTerminologie: React.FC = () => {
  const {
    etablissement_actif,
    etablissements_accessibles,
    changer_etablissement,
    mettre_a_jour_etablissement,
    definir_devise_active,
    a_permission,
  } = utiliserErp();
  const theme = obtenir_theme_etablissement(etablissement_actif.type);
  const peut_modifier = a_permission('parametres:gerer');

  const [nom, definir_nom] = useState(etablissement_actif.nom);
  const [code_pays, definir_code_pays] = useState<CodePays>(etablissement_actif.code_pays);
  const [devise_defaut, definir_devise_defaut] = useState<CodeDevise>(
    etablissement_actif.devise_defaut
  );
  const [autorite_tutelle, definir_autorite_tutelle] = useState(
    etablissement_actif.autorite_tutelle
  );
  const [annee_academique, definir_annee_academique] = useState(
    etablissement_actif.annee_academique
  );
  const [libelle_periode, definir_libelle_periode] = useState(
    etablissement_actif.libelle_periode_courante
  );
  const [format_matricule, definir_format_matricule] = useState(
    etablissement_actif.format_matricule
  );
  const [taux_usd, definir_taux_usd] = useState(String(etablissement_actif.taux_change_usd));
  const [echelle_notation, definir_echelle_notation] = useState<10 | 20 | 100>(
    etablissement_actif.echelle_notation
  );
  const [bloquer_documents, definir_bloquer_documents] = useState(
    etablissement_actif.bloquer_documents_si_impaye
  );

  useEffect(() => {
    definir_nom(etablissement_actif.nom);
    definir_code_pays(etablissement_actif.code_pays);
    definir_devise_defaut(etablissement_actif.devise_defaut);
    definir_autorite_tutelle(etablissement_actif.autorite_tutelle);
    definir_annee_academique(etablissement_actif.annee_academique);
    definir_libelle_periode(etablissement_actif.libelle_periode_courante);
    definir_format_matricule(etablissement_actif.format_matricule);
    definir_taux_usd(String(etablissement_actif.taux_change_usd));
    definir_echelle_notation(etablissement_actif.echelle_notation);
    definir_bloquer_documents(etablissement_actif.bloquer_documents_si_impaye);
  }, [etablissement_actif]);

  const gerer_enregistrement = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!peut_modifier) return;
    const taux_analyse = Number(taux_usd) > 0 ? Number(taux_usd) : etablissement_actif.taux_change_usd;
    const profil = PROFILS_PAYS[code_pays];
    mettre_a_jour_etablissement(etablissement_actif.id, {
      nom: nom.trim() || etablissement_actif.nom,
      code_pays,
      nom_pays: code_pays === 'INTL' ? etablissement_actif.nom_pays : profil.nom,
      fuseau_horaire: code_pays === 'INTL' ? etablissement_actif.fuseau_horaire : profil.fuseau_horaire,
      devise_defaut,
      autorite_tutelle: autorite_tutelle.trim() || profil.autorite_tutelle,
      annee_academique: annee_academique.trim() || etablissement_actif.annee_academique,
      libelle_periode_courante:
        libelle_periode.trim() || etablissement_actif.libelle_periode_courante,
      format_matricule: format_matricule.trim() || etablissement_actif.format_matricule,
      taux_change_usd: taux_analyse,
      echelle_notation,
      bloquer_documents_si_impaye: bloquer_documents,
    });
    definir_devise_active(devise_defaut);
  };

  const lignes_comparatives: {
    concept: string;
    obtenir_valeur: (type_etab: TypeEtablissement) => string;
  }[] = [
    {
      concept: 'Apprenant',
      obtenir_valeur: (t) => DICTIONNAIRES_TERMINOLOGIE[t].apprenant_pluriel,
    },
    {
      concept: 'Enseignant',
      obtenir_valeur: (t) => DICTIONNAIRES_TERMINOLOGIE[t].enseignant_pluriel,
    },
    {
      concept: 'Unité d’étude',
      obtenir_valeur: (t) => DICTIONNAIRES_TERMINOLOGIE[t].unite_pluriel,
    },
    {
      concept: 'Contenu pédagogique',
      obtenir_valeur: (t) => DICTIONNAIRES_TERMINOLOGIE[t].contenu_pluriel,
    },
    {
      concept: 'Découpage temporel',
      obtenir_valeur: (t) => DICTIONNAIRES_TERMINOLOGIE[t].periode_pluriel,
    },
    {
      concept: 'Évaluation',
      obtenir_valeur: (t) => DICTIONNAIRES_TERMINOLOGIE[t].libelle_evaluation,
    },
    {
      concept: 'Sortie / Diplômation',
      obtenir_valeur: (t) => DICTIONNAIRES_TERMINOLOGIE[t].libelle_issue_parcours,
    },
    {
      concept: 'Documents officiels',
      obtenir_valeur: (t) => DICTIONNAIRES_TERMINOLOGIE[t].documents_officiels.join(', '),
    },
    {
      concept: 'Facturation',
      obtenir_valeur: (t) => DICTIONNAIRES_TERMINOLOGIE[t].libelle_modele_facturation,
    },
  ];

  const types_etablissements: TypeEtablissement[] = ['PRO', 'SCOLAIRE', 'UNIVERSITE'];

  return (
    <div className="space-y-6">
      {/* Matrice comparative du moteur contextuel */}
      <Carte rembourrage="aucun">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
              Moteur d’adaptation contextuelle (Dictionnaire centralisé)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Aucun libellé n’est codé en dur : la colonne active reflète l’établissement
              sélectionné ({etablissement_actif.nom_court}).
            </p>
          </div>
          {etablissements_accessibles.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {etablissements_accessibles.slice(0, 5).map((etab) => (
                <button
                  key={etab.id}
                  type="button"
                  onClick={() => changer_etablissement(etab.id)}
                  className={`px-2.5 py-1 text-xs rounded-md border cursor-pointer ${
                    etablissement_actif.id === etab.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/50 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {etab.nom_court} ({etab.code_pays})
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400 w-44">
                  Concept métier
                </th>
                {types_etablissements.map((type_etab) => {
                  const est_actif = etablissement_actif.type === type_etab;
                  return (
                    <th
                      key={type_etab}
                      className={`px-4 py-3 text-left font-semibold ${
                        est_actif
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <BadgeTypeEtablissement type={type_etab} />
                        {est_actif && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                            <span>Actif</span>
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lignes_comparatives.map((ligne) => (
                <tr key={ligne.concept}>
                  <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                    {ligne.concept}
                  </td>
                  {types_etablissements.map((type_etab) => {
                    const est_actif = etablissement_actif.type === type_etab;
                    return (
                      <td
                        key={type_etab}
                        className={`px-4 py-2.5 text-slate-600 dark:text-slate-300 ${
                          est_actif
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20 font-medium text-slate-900 dark:text-slate-100'
                            : ''
                        }`}
                      >
                        {ligne.obtenir_valeur(type_etab)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Carte>

      {/* Paramètres spécifiques de l'établissement actif */}
      <Carte>
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
            Configuration isolée — {etablissement_actif.nom_court}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Chaque établissement conserve sa propre numérotation, sa devise, son taux de change, son
            échelle de notes et ses règles de blocage documentaire.
          </p>
        </div>

        <form
          onSubmit={gerer_enregistrement}
          className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nom officiel
            </label>
            <input
              type="text"
              value={nom}
              disabled={!peut_modifier}
              onChange={(e) => definir_nom(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Format des matricules
            </label>
            <input
              type="text"
              value={format_matricule}
              disabled={!peut_modifier}
              onChange={(e) => definir_format_matricule(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Année académique active
            </label>
            <input
              type="text"
              value={annee_academique}
              disabled={!peut_modifier}
              onChange={(e) => definir_annee_academique(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Période en cours
            </label>
            <input
              type="text"
              value={libelle_periode}
              disabled={!peut_modifier}
              onChange={(e) => definir_libelle_periode(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Taux de change de référence (1 USD en unité pivot)
            </label>
            <input
              type="number"
              value={taux_usd}
              disabled={!peut_modifier}
              onChange={(e) => definir_taux_usd(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pays / Profil régional
            </label>
            <select
              value={code_pays}
              disabled={!peut_modifier}
              onChange={(e) => {
                const pays = e.target.value as CodePays;
                definir_code_pays(pays);
                definir_devise_defaut(PROFILS_PAYS[pays].devise_defaut);
                definir_autorite_tutelle(PROFILS_PAYS[pays].autorite_tutelle);
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
            >
              {TOUS_LES_PAYS.map((pays) => (
                <option key={pays} value={pays}>
                  {PROFILS_PAYS[pays].nom} ({PROFILS_PAYS[pays].fuseau_horaire})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Devise par défaut
            </label>
            <select
              value={devise_defaut}
              disabled={!peut_modifier}
              onChange={(e) => definir_devise_defaut(e.target.value as CodeDevise)}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
            >
              {TOUTES_LES_DEVISES.map((dev) => (
                <option key={dev} value={dev}>
                  {CATALOGUE_DEVISES[dev].libelle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Autorité / Norme de tutelle
            </label>
            <input
              type="text"
              value={autorite_tutelle}
              disabled={!peut_modifier}
              onChange={(e) => definir_autorite_tutelle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Échelle de notation
            </label>
            <select
              value={echelle_notation}
              disabled={!peut_modifier}
              onChange={(e) => definir_echelle_notation(Number(e.target.value) as 10 | 20 | 100)}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
            >
              <option value={10}>Sur 10 (/10)</option>
              <option value={20}>Sur 20 (/20)</option>
              <option value={100}>Sur 100 (/100)</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={bloquer_documents}
                disabled={!peut_modifier}
                onChange={(e) => definir_bloquer_documents(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>
                Bloquer la délivrance des documents officiels en cas de solde impayé
              </span>
            </label>

            {peut_modifier && (
              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                classe_accent={theme.bouton_principal}
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer la configuration</span>
              </Bouton>
            )}
          </div>
        </form>
      </Carte>
    </div>
  );
};
