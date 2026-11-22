import React, { useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { utiliserErp } from '../../contexte/ContexteErp';
import {
  convertir_pivot_vers_devise,
  formater_montant,
} from '../../services/service_donnees';
import { telecharger_fichier_csv } from '../../utilitaires/export_csv';

export const VueRapports: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    devise_active,
    apprenants_etablissement,
    unites_etablissement,
    paiements_etablissement,
    ajouter_toast,
  } = utiliserErp();

  const theme = obtenir_theme_etablissement(etablissement_actif.type);
  const [filtre_unite, definir_filtre_unite] = useState('TOUS');

  const apprenants_filtres = useMemo(
    () =>
      apprenants_etablissement.filter(
        (apprenant) => filtre_unite === 'TOUS' || apprenant.id_unite === filtre_unite
      ),
    [apprenants_etablissement, filtre_unite]
  );

  const synthese_ministere = useMemo(() => {
    return unites_etablissement.map((unite) => {
      const liste = apprenants_etablissement.filter((apprenant) => apprenant.id_unite === unite.id);
      const effectif_feminin = liste.filter((apprenant) => apprenant.sexe === 'F').length;
      const effectif_masculin = liste.length - effectif_feminin;
      const reussis = liste.filter(
        (apprenant) => apprenant.moyenne_generale >= etablissement_actif.note_passage
      ).length;
      const taux_reussite = liste.length > 0 ? Math.round((reussis / liste.length) * 100) : 0;
      const assiduite_moyenne =
        liste.length > 0
          ? Math.round(liste.reduce((somme, apprenant) => somme + apprenant.taux_assiduite, 0) / liste.length)
          : 0;
      return {
        unite,
        total: liste.length,
        effectif_feminin,
        effectif_masculin,
        taux_reussite,
        assiduite_moyenne,
      };
    });
  }, [unites_etablissement, apprenants_etablissement, etablissement_actif.note_passage]);

  const exporter_effectifs_csv = () => {
    telecharger_fichier_csv(
      `effectifs_${etablissement_actif.code}_${etablissement_actif.annee_academique}`,
      [
        'Matricule',
        'Nom',
        'Prénom',
        'Genre',
        'Téléphone',
        'Unité',
        'Moyenne',
        'Assiduité %',
        `Payé (${devise_active})`,
        `Dû (${devise_active})`,
      ],
      apprenants_filtres.map((apprenant) => {
        const unite = unites_etablissement.find((u) => u.id === apprenant.id_unite);
        return [
          apprenant.matricule,
          apprenant.nom,
          apprenant.prenom,
          apprenant.sexe,
          apprenant.telephone,
          unite?.nom ?? apprenant.id_unite,
          apprenant.moyenne_generale,
          apprenant.taux_assiduite,
          convertir_pivot_vers_devise(
            apprenant.total_paye_htg,
            devise_active,
            etablissement_actif.taux_change_usd
          ),
          convertir_pivot_vers_devise(
            apprenant.total_du_htg,
            devise_active,
            etablissement_actif.taux_change_usd
          ),
        ];
      })
    );
    ajouter_toast({ titre: 'Export CSV des effectifs téléchargé', variante: 'success' });
  };

  const exporter_ministere_csv = () => {
    telecharger_fichier_csv(
      `declaration_ministere_${etablissement_actif.code}`,
      [
        'Code',
        'Unité',
        'Effectif Total',
        'Filles/Femmes',
        'Garçons/Hommes',
        'Taux Réussite %',
        'Assiduité Moyenne %',
      ],
      synthese_ministere.map((ligne) => [
        ligne.unite.code,
        ligne.unite.nom,
        ligne.total,
        ligne.effectif_feminin,
        ligne.effectif_masculin,
        ligne.taux_reussite,
        ligne.assiduite_moyenne,
      ])
    );
    ajouter_toast({ titre: 'Rapport ministériel CSV téléchargé', variante: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Rapports, Statistiques & Déclarations ({etablissement_actif.autorite_tutelle})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Exports compatibles Excel (CSV UTF-8), norme CITE / UNESCO (ISCED) et synthèses pour{' '}
            {etablissement_actif.nom_pays}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filtre_unite}
            onChange={(e) => definir_filtre_unite(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="TOUS">Toutes ({terminologie.unite_pluriel.toLowerCase()})</option>
            {unites_etablissement.map((unite) => (
              <option key={unite.id} value={unite.id}>
                {unite.nom}
              </option>
            ))}
          </select>
          <Bouton variante="secondaire" taille="sm" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer PDF</span>
          </Bouton>
          <Bouton
            variante="principal"
            taille="sm"
            classe_accent={theme.bouton_principal}
            onClick={exporter_effectifs_csv}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter Effectifs (CSV)</span>
          </Bouton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Carte>
          <div className="text-xs text-slate-500">Effectif filtré</div>
          <div className="font-mono text-2xl font-bold mt-1">{apprenants_filtres.length}</div>
        </Carte>
        <Carte>
          <div className="text-xs text-slate-500">Encaissements récents validés</div>
          <div className="font-mono text-2xl font-bold mt-1">
            {formater_montant(
              paiements_etablissement
                .filter((paiement) => paiement.statut === 'VALIDE')
                .reduce((somme, paiement) => somme + paiement.montant_htg, 0),
              devise_active,
              etablissement_actif.taux_change_usd
            )}
          </div>
        </Carte>
        <Carte>
          <div className="text-xs text-slate-500">Taux d’assiduité moyen</div>
          <div className="font-mono text-2xl font-bold mt-1">
            {apprenants_filtres.length > 0
              ? Math.round(
                  apprenants_filtres.reduce((somme, apprenant) => somme + apprenant.taux_assiduite, 0) /
                    apprenants_filtres.length
                )
              : 0}
            %
          </div>
        </Carte>
      </div>

      {/* Tableau déclaration ministère */}
      <Carte rembourrage="aucun">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-display font-bold">
              Tableau officiel pour déclaration ministérielle ({etablissement_actif.annee_academique})
            </h3>
          </div>
          <Bouton variante="secondaire" taille="sm" onClick={exporter_ministere_csv}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exporter tableau CSV</span>
          </Bouton>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-slate-500">
                <th className="px-4 py-2.5 text-left font-semibold">
                  {terminologie.unite_singulier}
                </th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                <th className="px-4 py-2.5 text-right font-semibold">Féminin</th>
                <th className="px-4 py-2.5 text-right font-semibold">Masculin</th>
                <th className="px-4 py-2.5 text-right font-semibold">Réussite</th>
                <th className="px-4 py-2.5 text-right font-semibold">Assiduité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {synthese_ministere.map((ligne) => (
                <tr key={ligne.unite.id}>
                  <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                    {ligne.unite.nom}{' '}
                    <span className="font-mono text-slate-400">({ligne.unite.code})</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{ligne.total}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    {ligne.effectif_feminin}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    {ligne.effectif_masculin}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">
                    {ligne.taux_reussite}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    {ligne.assiduite_moyenne}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Carte>
    </div>
  );
};
