import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CalendarClock,
  Download,
  Landmark,
  Lock,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { CodeQrSvg } from '../../composants/interface/CodeQrSvg';
import { declencher_impression_ciblee } from '../../composants/interface/FicheInscriptionImprimable';
import { LogoEtablissement } from '../../composants/interface/LogoEtablissement';
import { Modale } from '../../composants/interface/Modale';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { PROFILS_PAYS } from '../../configuration/regions_devises';
import { utiliserErp } from '../../contexte/ContexteErp';
import { DepenseEnregistree, PaiementEnregistre } from '../../modeles/erp';
import {
  convertir_devise_vers_pivot,
  convertir_pivot_vers_devise,
  formater_date_fr,
  formater_montant,
} from '../../services/service_donnees';
import {
  calculer_jours_retard_echeance,
  construire_echeancier_defaut,
  obtenir_comptes_bancaires_defaut_pays,
} from '../../utilitaires/echeancier';
import { telecharger_fichier_csv } from '../../utilitaires/export_csv';
import { obtenir_modes_paiement_pays } from '../../utilitaires/validation_metier';

export const VueFinances: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    devise_active,
    utilisateur_actif,
    apprenants_etablissement,
    paiements_etablissement,
    depenses_etablissement,
    encaisser_paiement,
    annuler_paiement,
    enregistrer_depense,
    modifier_depense,
    supprimer_depense,
    envoyer_communication,
    a_permission,
    ajouter_toast,
  } = utiliserErp();

  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const profil_pays = PROFILS_PAYS[etablissement_actif.code_pays] ?? PROFILS_PAYS.INTL;
  const modes_paiement_pays = useMemo(
    () => obtenir_modes_paiement_pays(etablissement_actif.code_pays),
    [etablissement_actif.code_pays]
  );
  const [onglet, definir_onglet] = useState<
    'paiements' | 'echeancier' | 'creances' | 'depenses' | 'caisse'
  >('paiements');

  const comptes_bancaires = useMemo(() => {
    const bruts =
      etablissement_actif.comptes_bancaires && etablissement_actif.comptes_bancaires.length > 0
        ? etablissement_actif.comptes_bancaires
        : obtenir_comptes_bancaires_defaut_pays(
            etablissement_actif.code_pays,
            etablissement_actif.nom_court,
            etablissement_actif.devise_defaut
          );
    return bruts.filter((b) => b.actif);
  }, [etablissement_actif]);

  // Encaissement (saisie directe dans devise_active)
  const [id_apprenant, definir_id_apprenant] = useState(apprenants_etablissement[0]?.id ?? '');
  const [montant_saisi, definir_montant_saisi] = useState(() =>
    convertir_pivot_vers_devise(10000, devise_active, etablissement_actif.taux_change_usd)
  );
  const [mode_paiement, definir_mode_paiement] = useState<PaiementEnregistre['mode_paiement']>(
    (profil_pays.modes_paiement_preferes[0] as PaiementEnregistre['mode_paiement']) ??
      'Carte bancaire (Stripe/Visa)'
  );
  const [code_reference, definir_code_reference] = useState('');
  const [libelle_paiement, definir_libelle_paiement] = useState('Versement scolarité / tranche');
  const [libelle_compte_bancaire, definir_libelle_compte_bancaire] = useState('');
  const [modale_recu, definir_modale_recu] = useState<PaiementEnregistre | null>(null);
  const [format_impression_recu, definir_format_impression_recu] = useState<'a4' | '80mm'>('80mm');

  // Annulation
  const [cible_annulation, definir_cible_annulation] = useState<PaiementEnregistre | null>(null);
  const [motif_annulation, definir_motif_annulation] = useState('');

  // Dépenses (saisie directe dans devise_active)
  const [categorie_depense, definir_categorie_depense] =
    useState<DepenseEnregistree['categorie']>('Fournitures');
  const [description_depense, definir_description_depense] = useState('');
  const [fournisseur_depense, definir_fournisseur_depense] = useState('');
  const [montant_depense_saisi, definir_montant_depense_saisi] = useState(() =>
    convertir_pivot_vers_devise(5000, devise_active, etablissement_actif.taux_change_usd)
  );
  const [depense_edition, definir_depense_edition] = useState<DepenseEnregistree | null>(null);
  const [montant_depense_edition_saisi, definir_montant_depense_edition_saisi] = useState(0);
  const [cible_suppression_depense, definir_cible_suppression_depense] =
    useState<DepenseEnregistree | null>(null);

  // Clôture de caisse
  const [caisse_cloturee, definir_caisse_cloturee] = useState(false);

  useEffect(() => {
    const profil = PROFILS_PAYS[etablissement_actif.code_pays] ?? PROFILS_PAYS.INTL;
    definir_id_apprenant(apprenants_etablissement[0]?.id ?? '');
    definir_mode_paiement(
      (profil.modes_paiement_preferes[0] as PaiementEnregistre['mode_paiement']) ??
        'Carte bancaire (Stripe/Visa)'
    );
    definir_libelle_compte_bancaire('');
  }, [etablissement_actif.id, etablissement_actif.code_pays, apprenants_etablissement]);

  useEffect(() => {
    definir_montant_saisi(
      convertir_pivot_vers_devise(10000, devise_active, etablissement_actif.taux_change_usd)
    );
    definir_montant_depense_saisi(
      convertir_pivot_vers_devise(5000, devise_active, etablissement_actif.taux_change_usd)
    );
  }, [devise_active, etablissement_actif.taux_change_usd]);

  const statistiques = useMemo(() => {
    const total_du = apprenants_etablissement.reduce((s, a) => s + a.total_du_htg, 0);
    const total_paye = apprenants_etablissement.reduce((s, a) => s + a.total_paye_htg, 0);
    const total_depenses = depenses_etablissement.reduce((s, d) => s + d.montant_htg, 0);
    const somme_paiements_valides = paiements_etablissement
      .filter((p) => p.statut === 'VALIDE')
      .reduce((s, p) => s + p.montant_htg, 0);
    return {
      total_du,
      total_paye,
      solde_restant: total_du - total_paye,
      total_depenses,
      somme_paiements_valides,
      solde_net_caisse: somme_paiements_valides - total_depenses,
    };
  }, [apprenants_etablissement, depenses_etablissement, paiements_etablissement]);

  const apprenants_en_retard = useMemo(
    () =>
      apprenants_etablissement
        .filter((a) => a.total_du_htg - a.total_paye_htg > 0)
        .sort(
          (a, b) =>
            b.total_du_htg - b.total_paye_htg - (a.total_du_htg - a.total_paye_htg)
        ),
    [apprenants_etablissement]
  );

  const libelle_banque_actif =
    libelle_compte_bancaire ||
    (comptes_bancaires.find((b) => b.par_defaut) ?? comptes_bancaires[0])?.nom_banque ||
    'Caisse Principale';

  const montant_pivot_courant = convertir_devise_vers_pivot(
    montant_saisi,
    devise_active,
    etablissement_actif.taux_change_usd
  );

  const gerer_encaissement = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!id_apprenant || montant_saisi <= 0) return;
    if (mode_paiement !== 'Espèces' && !code_reference.trim()) {
      ajouter_toast({
        titre: 'Référence de règlement requise',
        description: 'Saisissez la référence du règlement déclaré avant de générer le reçu.',
        variante: 'error',
      });
      return;
    }
    const recu = encaisser_paiement(
      id_apprenant,
      montant_pivot_courant,
      mode_paiement,
      libelle_paiement,
      code_reference,
      libelle_banque_actif
    );
    definir_modale_recu(recu);
    definir_code_reference('');
  };

  const gerer_ajout_depense = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!description_depense.trim() || montant_depense_saisi <= 0) return;
    enregistrer_depense({
      categorie: categorie_depense,
      description: description_depense.trim(),
      fournisseur: fournisseur_depense.trim() || 'Fournisseur local',
      montant_htg: convertir_devise_vers_pivot(
        montant_depense_saisi,
        devise_active,
        etablissement_actif.taux_change_usd
      ),
      payee_le: new Date().toISOString().slice(0, 10),
      enregistree_par: utilisateur_actif.nom_complet,
    });
    definir_description_depense('');
    definir_fournisseur_depense('');
  };

  const gerer_export_csv = () => {
    telecharger_fichier_csv(
      `recettes_${etablissement_actif.code}_${new Date().toISOString().slice(0, 10)}`,
      ['Reçu', 'Date', 'Matricule', `Montant (${devise_active})`, 'Mode', 'Référence', 'Statut'],
      paiements_etablissement.map((p) => {
        const apprenant = apprenants_etablissement.find((a) => a.id === p.id_apprenant);
        return [
          p.numero_recu,
          p.paye_le,
          apprenant?.matricule ?? p.id_apprenant,
          convertir_pivot_vers_devise(
            p.montant_htg,
            devise_active,
            etablissement_actif.taux_change_usd
          ),
          p.mode_paiement,
          p.code_reference ?? '',
          p.statut,
        ];
      })
    );
    ajouter_toast({ titre: 'Export CSV financier téléchargé', variante: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Finances, Encaissements & Comptabilité
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Devise locale : {etablissement_actif.devise_defaut} ({etablissement_actif.nom_pays}).
            Les modes listés enregistrent un règlement déclaré avec sa référence; aucune passerelle
            en ligne n’est connectée.
          </p>
        </div>
        <p className="text-[11px] text-slate-500">
          Enregistrement manuel : aucune transaction en ligne n’a été effectuée.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Bouton variante="secondaire" taille="sm" onClick={gerer_export_csv}>
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Bouton>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(
              [
                { id: 'paiements', libelle: 'Encaissements' },
                { id: 'echeancier', libelle: 'Échéancier' },
                { id: 'creances', libelle: `Créances (${apprenants_en_retard.length})` },
                { id: 'depenses', libelle: 'Dépenses' },
                { id: 'caisse', libelle: 'Caisse du jour' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => definir_onglet(item.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  onglet === item.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {item.libelle}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Indicateurs financiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Carte>
          <div className="text-xs text-slate-500">Total encaissé (Scolarité)</div>
          <div className="mt-1.5 font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formater_montant(
              statistiques.total_paye,
              devise_active,
              etablissement_actif.taux_change_usd
            )}
          </div>
        </Carte>
        <Carte>
          <div className="text-xs text-slate-500">Créances à recouvrer</div>
          <div className="mt-1.5 font-mono text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">
            {formater_montant(
              statistiques.solde_restant,
              devise_active,
              etablissement_actif.taux_change_usd
            )}
          </div>
        </Carte>
        <Carte>
          <div className="text-xs text-slate-500">Dépenses enregistrées</div>
          <div className="mt-1.5 font-mono text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {formater_montant(
              statistiques.total_depenses,
              devise_active,
              etablissement_actif.taux_change_usd
            )}
          </div>
        </Carte>
        <Carte>
          <div className="text-xs text-slate-500">Solde net caisse récente</div>
          <div className="mt-1.5 font-mono text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {formater_montant(
              statistiques.solde_net_caisse,
              devise_active,
              etablissement_actif.taux_change_usd
            )}
          </div>
        </Carte>
      </div>

      {/* Onglet 1 : Encaissement & Reçus */}
      {onglet === 'paiements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {a_permission('finances:encaisser') && (
            <Carte className="lg:col-span-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Wallet className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-display font-bold">Encaisser un versement</h3>
              </div>

              <form onSubmit={gerer_encaissement} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">
                    {terminologie.apprenant_singulier}
                  </label>
                  <select
                    value={id_apprenant}
                    onChange={(e) => definir_id_apprenant(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {apprenants_etablissement.map((apprenant) => (
                      <option key={apprenant.id} value={apprenant.id}>
                        {apprenant.matricule} · {apprenant.prenom} {apprenant.nom} (reste{' '}
                        {formater_montant(
                          Math.max(0, apprenant.total_du_htg - apprenant.total_paye_htg),
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                        )
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">Montant ({devise_active})</label>
                    <input
                      type="number"
                      step="any"
                      min={0.01}
                      value={montant_saisi}
                      onChange={(e) => definir_montant_saisi(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {devise_active !== etablissement_actif.devise_defaut
                        ? `≈ ${formater_montant(
                            montant_pivot_courant,
                            etablissement_actif.devise_defaut,
                            etablissement_actif.taux_change_usd
                          )}`
                        : `Devise locale : ${devise_active}`}
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Mode de règlement</label>
                    <select
                      value={mode_paiement}
                      onChange={(e) =>
                        definir_mode_paiement(
                          e.target.value as PaiementEnregistre['mode_paiement']
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      {modes_paiement_pays.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {mode_paiement !== 'Espèces' && (
                  <div>
                    <label className="block font-semibold mb-1">
                      Référence transaction ({mode_paiement.split(' ')[0]})
                    </label>
                    <input
                      type="text"
                      required
                      value={code_reference}
                      onChange={(e) => definir_code_reference(e.target.value)}
                      placeholder="ex. ch_Stripe994 / WAVE-2026 / IBAN-REF"
                      className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold mb-1">Compte bancaire / Caisse cible</label>
                  <select
                    value={libelle_banque_actif}
                    onChange={(e) => definir_libelle_compte_bancaire(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {comptes_bancaires.map((compte) => (
                      <option
                        key={compte.id}
                        value={`${compte.nom_banque} (${compte.numero_compte})`}
                      >
                        {compte.nom_banque} · {compte.numero_compte} ({compte.devise})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Libellé du reçu</label>
                  <input
                    type="text"
                    value={libelle_paiement}
                    onChange={(e) => definir_libelle_paiement(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <Bouton
                  type="submit"
                  variante="principal"
                  taille="sm"
                  classe_accent={theme_etab.bouton_principal}
                  disabled={caisse_cloturee}
                  className="w-full"
                >
                  <Receipt className="w-4 h-4" />
                  <span>
                    {caisse_cloturee ? 'Caisse clôturée' : 'Encaisser et générer le reçu'}
                  </span>
                </Bouton>
              </form>
            </Carte>
          )}

          <Carte
            rembourrage="aucun"
            className={a_permission('finances:encaisser') ? 'lg:col-span-8' : 'lg:col-span-12'}
          >
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-display font-bold">
                Registre des reçus émis ({paiements_etablissement.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-slate-500">
                    <th className="px-4 py-2.5 text-left font-semibold">Reçu</th>
                    <th className="px-4 py-2.5 text-left font-semibold">
                      {terminologie.apprenant_singulier}
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold">Mode & Réf.</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Montant</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paiements_etablissement.map((paiement) => {
                    const apprenant = apprenants_etablissement.find(
                      (a) => a.id === paiement.id_apprenant
                    );
                    return (
                      <tr
                        key={paiement.id}
                        className={paiement.statut === 'ANNULE' ? 'opacity-50' : ''}
                      >
                        <td className="px-4 py-2.5 font-mono font-semibold">
                          <div>{paiement.numero_recu}</div>
                          <div className="text-[11px] text-slate-400">
                            {formater_date_fr(paiement.paye_le)}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {apprenant
                              ? `${apprenant.prenom} ${apprenant.nom}`
                              : paiement.id_apprenant}
                          </div>
                          <div className="text-slate-500">{paiement.libelle}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span>{paiement.mode_paiement}</span>
                          {paiement.libelle_compte_bancaire && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Landmark className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]">
                                {paiement.libelle_compte_bancaire}
                              </span>
                            </div>
                          )}
                          {paiement.code_reference && (
                            <div className="font-mono text-[11px] text-slate-400">
                              {paiement.code_reference}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums">
                          {formater_montant(
                            paiement.montant_htg,
                            devise_active,
                            etablissement_actif.taux_change_usd
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right space-x-1 whitespace-nowrap">
                          <Bouton
                            variante="fantome"
                            taille="sm"
                            onClick={() => definir_modale_recu(paiement)}
                          >
                            Reçu QR
                          </Bouton>
                          {paiement.statut === 'VALIDE' && a_permission('finances:gerer') && (
                            <button
                              type="button"
                              onClick={() => definir_cible_annulation(paiement)}
                              title="Annuler avec justification"
                              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Carte>
        </div>
      )}

      {/* Onglet 2 : Échéancier détaillé par tranches */}
      {onglet === 'echeancier' && (
        <div className="space-y-4">
          <Carte className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Échéancier par tranches & calcul automatique des retards
                </span>
                <p className="text-slate-500 mt-0.5">
                  Chaque paiement encaissé réalloue automatiquement les tranches (Inscription, 1ère,
                  2ème, 3ème tranche).
                </p>
              </div>
            </div>
          </Carte>

          {apprenants_etablissement.length === 0 ? (
            <Carte className="text-center py-10 text-xs text-slate-500">
              Aucun {terminologie.apprenant_singulier.toLowerCase()} inscrit pour afficher un
              échéancier.
            </Carte>
          ) : (
            <div className="space-y-3">
              {apprenants_etablissement.slice(0, 15).map((apprenant) => {
                const tranches =
                  apprenant.echeancier && apprenant.echeancier.length > 0
                    ? apprenant.echeancier
                    : construire_echeancier_defaut(
                        apprenant.total_du_htg,
                        apprenant.total_paye_htg,
                        apprenant.date_inscription
                      );
                const reste_total = Math.max(0, apprenant.total_du_htg - apprenant.total_paye_htg);
                return (
                  <Carte key={apprenant.id} rembourrage="aucun">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50/60 dark:bg-slate-900/50">
                      <div>
                        <span className="font-mono text-slate-500 mr-2">{apprenant.matricule}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {apprenant.prenom} {apprenant.nom}
                        </span>
                        <span className="text-slate-500 ml-2">· {apprenant.libelle_niveau}</span>
                      </div>
                      <div className="font-mono text-[11px]">
                        Payé :{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {formater_montant(
                            apprenant.total_paye_htg,
                            devise_active,
                            etablissement_actif.taux_change_usd
                          )}
                        </strong>{' '}
                        /{' '}
                        {formater_montant(
                          apprenant.total_du_htg,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                        {reste_total > 0 && (
                          <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">
                            (Reste :{' '}
                            {formater_montant(
                              reste_total,
                              devise_active,
                              etablissement_actif.taux_change_usd
                            )}
                            )
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                            <th className="px-4 py-2 text-left font-semibold">Tranche</th>
                            <th className="px-4 py-2 text-left font-semibold">Date limite</th>
                            <th className="px-4 py-2 text-right font-semibold">Dû</th>
                            <th className="px-4 py-2 text-right font-semibold">Versé</th>
                            <th className="px-4 py-2 text-left font-semibold">Statut</th>
                            <th className="px-4 py-2 text-right font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {tranches.map((tranche) => {
                            const reste = Math.max(
                              0,
                              tranche.montant_du_htg - tranche.montant_paye_htg
                            );
                            const jours_retard =
                              tranche.statut === 'EN_RETARD'
                                ? calculer_jours_retard_echeance(tranche.date_echeance)
                                : 0;
                            const style_badge =
                              tranche.statut === 'PAYEE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : tranche.statut === 'EN_RETARD'
                                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                                  : tranche.statut === 'PARTIELLE'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

                            return (
                              <tr key={tranche.id}>
                                <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">
                                  {tranche.libelle}
                                </td>
                                <td className="px-4 py-2 font-mono text-slate-500">
                                  {formater_date_fr(tranche.date_echeance)}
                                  {jours_retard > 0 && (
                                    <span className="ml-1.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                                      (+{jours_retard} j)
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right font-mono tabular-nums">
                                  {formater_montant(
                                    tranche.montant_du_htg,
                                    devise_active,
                                    etablissement_actif.taux_change_usd
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                                  {formater_montant(
                                    tranche.montant_paye_htg,
                                    devise_active,
                                    etablissement_actif.taux_change_usd
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  <span
                                    className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded border ${style_badge}`}
                                  >
                                    {tranche.statut === 'PAYEE'
                                      ? 'Soldée'
                                      : tranche.statut === 'EN_RETARD'
                                        ? `En retard (${jours_retard}j)`
                                        : tranche.statut === 'PARTIELLE'
                                          ? 'Partielle'
                                          : 'À payer'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right">
                                  {reste > 0 && a_permission('finances:encaisser') && (
                                    <Bouton
                                      variante="secondaire"
                                      taille="sm"
                                      onClick={() => {
                                        definir_id_apprenant(apprenant.id);
                                        definir_montant_saisi(
                                          convertir_pivot_vers_devise(
                                            reste,
                                            devise_active,
                                            etablissement_actif.taux_change_usd
                                          )
                                        );
                                        definir_libelle_paiement(`Règlement — ${tranche.libelle}`);
                                        definir_onglet('paiements');
                                      }}
                                    >
                                      Encaisser cette tranche
                                    </Bouton>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Carte>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Onglet 3 : Créances & Relances */}
      {onglet === 'creances' && (
        <Carte rembourrage="aucun">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold">
              Suivi des impayés ({apprenants_en_retard.length})
            </h3>
            <Bouton
              variante="secondaire"
              taille="sm"
              onClick={() =>
                envoyer_communication({
                  titre: 'Relance automatique de paiement',
                  contenu: `Rappel de solde scolarité pour ${etablissement_actif.nom_court} (${profil_pays.modes_paiement_preferes[0]} / Économat).`,
                  canal: 'WhatsApp',
                  audience: `${apprenants_en_retard.length} dossiers avec solde dû`,
                  nombre_destinataires: apprenants_en_retard.length,
                })
              }
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Relancer tout le lot (WhatsApp)</span>
            </Bouton>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {apprenants_en_retard.map((apprenant) => {
              const reste = apprenant.total_du_htg - apprenant.total_paye_htg;
              return (
                <div
                  key={apprenant.id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-mono text-slate-500 mr-2">{apprenant.matricule}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {apprenant.prenom} {apprenant.nom}
                    </span>
                    <span className="font-mono text-slate-400 ml-2">{apprenant.telephone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-red-600 dark:text-red-400 tabular-nums">
                      {formater_montant(
                        reste,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                    </span>
                    <Bouton
                      variante="secondaire"
                      taille="sm"
                      onClick={() => {
                        definir_id_apprenant(apprenant.id);
                        definir_montant_saisi(
                          convertir_pivot_vers_devise(
                            reste,
                            devise_active,
                            etablissement_actif.taux_change_usd
                          )
                        );
                        definir_onglet('paiements');
                      }}
                    >
                      Encaisser
                    </Bouton>
                  </div>
                </div>
              );
            })}
          </div>
        </Carte>
      )}

      {/* Onglet 4 : Dépenses */}
      {onglet === 'depenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Carte className="lg:col-span-4">
            <h3 className="text-sm font-display font-bold mb-3">Nouvelle dépense</h3>
            <form onSubmit={gerer_ajout_depense} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Catégorie</label>
                <select
                  value={categorie_depense}
                  onChange={(e) =>
                    definir_categorie_depense(e.target.value as DepenseEnregistree['categorie'])
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="Fournitures">Fournitures</option>
                  <option value="Énergie / Génératrice">Énergie / Génératrice</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Loyer & Eau">Loyer & Eau</option>
                  <option value="Équipement">Équipement</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Description *</label>
                <input
                  type="text"
                  value={description_depense}
                  onChange={(e) => definir_description_depense(e.target.value)}
                  placeholder="ex. Facture électricité / fournitures"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Fournisseur</label>
                <input
                  type="text"
                  value={fournisseur_depense}
                  onChange={(e) => definir_fournisseur_depense(e.target.value)}
                  placeholder="Nom du fournisseur"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Montant ({devise_active})</label>
                <input
                  type="number"
                  step="any"
                  min={0.01}
                  value={montant_depense_saisi}
                  onChange={(e) => definir_montant_depense_saisi(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                classe_accent={theme_etab.bouton_principal}
              >
                <Plus className="w-4 h-4" />
                <span>Enregistrer la dépense</span>
              </Bouton>
            </form>
          </Carte>

          <Carte rembourrage="aucun" className="lg:col-span-8">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-display font-bold">Journal des dépenses</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {depenses_etablissement.map((depense) => (
                <div
                  key={depense.id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {depense.description}
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      {depense.categorie} · {depense.fournisseur} ·{' '}
                      {formater_date_fr(depense.payee_le)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      -
                      {formater_montant(
                        depense.montant_htg,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                    </span>
                    {a_permission('finances:gerer') && (
                      <>
                        <Bouton
                          type="button"
                          variante="fantome"
                          taille="sm"
                          onClick={() => {
                            definir_depense_edition({ ...depense });
                            definir_montant_depense_edition_saisi(
                              convertir_pivot_vers_devise(
                                depense.montant_htg,
                                devise_active,
                                etablissement_actif.taux_change_usd
                              )
                            );
                          }}
                          aria-label="Modifier la dépense"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Bouton>
                        <Bouton
                          type="button"
                          variante="danger"
                          taille="sm"
                          onClick={() => definir_cible_suppression_depense(depense)}
                          aria-label="Supprimer la dépense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Bouton>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Carte>
        </div>
      )}

      {/* Onglet 5 : Caisse journalière */}
      {onglet === 'caisse' && (
        <Carte className="max-w-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-display font-bold">Clôture de caisse journalière</h3>
            <span
              className={`text-xs font-semibold ${caisse_cloturee ? 'text-amber-600' : 'text-emerald-600'}`}
            >
              {caisse_cloturee ? 'Caisse clôturée' : 'Caisse ouverte'}
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Total encaissements valides</span>
              <span className="font-mono font-bold">
                {formater_montant(
                  statistiques.somme_paiements_valides,
                  devise_active,
                  etablissement_actif.taux_change_usd
                )}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Total dépenses</span>
              <span className="font-mono font-bold">
                -
                {formater_montant(
                  statistiques.total_depenses,
                  devise_active,
                  etablissement_actif.taux_change_usd
                )}
              </span>
            </div>
            <div className="flex justify-between py-2 border-t border-slate-200 dark:border-slate-800 text-sm font-bold">
              <span>Solde net à déposer</span>
              <span className="font-mono">
                {formater_montant(
                  statistiques.solde_net_caisse,
                  devise_active,
                  etablissement_actif.taux_change_usd
                )}
              </span>
            </div>
          </div>
          <Bouton
            variante={caisse_cloturee ? 'secondaire' : 'principal'}
            taille="sm"
            classe_accent={caisse_cloturee ? undefined : theme_etab.bouton_principal}
            onClick={() => {
              definir_caisse_cloturee(!caisse_cloturee);
              ajouter_toast({
                titre: !caisse_cloturee ? 'Caisse journalière clôturée' : 'Caisse réouverte',
                variante: 'info',
              });
            }}
          >
            <Lock className="w-4 h-4" />
            <span>{caisse_cloturee ? 'Réouvrir la caisse' : 'Valider la clôture du jour'}</span>
          </Bouton>
        </Carte>
      )}

      {/* Modale Reçu imprimable avec QR Code (80mm / A4) */}
      <Modale
        ouverte={Boolean(modale_recu)}
        sur_fermeture={() => definir_modale_recu(null)}
        titre="Reçu de paiement officiel"
        sous_titre={`${modale_recu?.numero_recu ?? ''} · ${format_impression_recu === '80mm' ? 'Ticket Thermique 80mm' : 'Format A4'}`}
        classe_largeur_max={format_impression_recu === '80mm' ? 'max-w-md' : 'max-w-2xl'}
        pied_page={
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => definir_format_impression_recu('80mm')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  format_impression_recu === '80mm'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Ticket 80mm
              </button>
              <button
                type="button"
                onClick={() => definir_format_impression_recu('a4')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  format_impression_recu === 'a4'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                A4 Officiel
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Bouton variante="fantome" onClick={() => definir_modale_recu(null)}>
                Fermer
              </Bouton>
              <Bouton
                variante="principal"
                classe_accent={theme_etab.bouton_principal}
                onClick={declencher_impression_ciblee}
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer ({format_impression_recu.toUpperCase()})</span>
              </Bouton>
            </div>
          </div>
        }
      >
        {modale_recu &&
          (() => {
            const apprenant = apprenants_etablissement.find(
              (a) => a.id === modale_recu.id_apprenant
            );
            const libelle_apprenant = apprenant
              ? `${apprenant.prenom} ${apprenant.nom} (${apprenant.matricule})`
              : modale_recu.id_apprenant;
            const donnees_qr = `${etablissement_actif.code}|RECU|${modale_recu.numero_recu}|${modale_recu.montant_htg}`;

            return format_impression_recu === '80mm' ? (
              <div className="printable-document-root">
                <div className="ticket-80mm max-w-[330px] mx-auto bg-white border border-slate-300 shadow-sm p-5 font-mono text-[11.5px] text-slate-900 leading-relaxed space-y-3">
                  <div className="text-center border-b border-dashed border-slate-400 pb-3 space-y-1">
                    {etablissement_actif.url_logo && (
                      <div className="flex justify-center pb-1">
                        <img
                          src={etablissement_actif.url_logo}
                          alt={`Logo ${etablissement_actif.nom}`}
                          className="h-9 w-9 object-contain"
                        />
                      </div>
                    )}
                    <div className="font-bold text-sm uppercase">
                      {etablissement_actif.nom_court}
                    </div>
                    <div className="text-[10px] text-slate-600">{etablissement_actif.nom}</div>
                    <div className="text-[10px] text-slate-500">
                      {etablissement_actif.adresse} · {etablissement_actif.telephone}
                    </div>
                    <div className="pt-1 font-bold uppercase text-xs">REÇU DE PAIEMENT</div>
                    <div className="text-[10px] text-slate-500">{modale_recu.numero_recu}</div>
                  </div>

                  <div className="space-y-1 border-b border-dashed border-slate-400 pb-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date:</span>
                      <span>{formater_date_fr(modale_recu.paye_le)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Élève:</span>
                      <span className="font-bold text-right">{libelle_apprenant}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Mode:</span>
                      <span className="text-right">{modale_recu.mode_paiement}</span>
                    </div>
                    {modale_recu.libelle_compte_bancaire && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Caisse/Banque:</span>
                        <span className="text-right">{modale_recu.libelle_compte_bancaire}</span>
                      </div>
                    )}
                    {modale_recu.code_reference && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Réf:</span>
                        <span>{modale_recu.code_reference}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-b border-dashed border-slate-400 pb-3 space-y-1">
                    <div className="text-[10px] text-slate-500">{modale_recu.libelle}</div>
                    <div className="flex justify-between text-sm font-bold">
                      <span>MONTANT PAYÉ:</span>
                      <span>
                        {formater_montant(
                          modale_recu.montant_htg,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="text-[9px] text-center text-slate-500 border-t border-dashed border-slate-400 pt-2">
                    Enregistrement manuel : aucune transaction en ligne n’a été effectuée.
                  </div>

                  <div className="flex flex-col items-center text-center gap-1.5 pt-1">
                    <CodeQrSvg valeur={donnees_qr} taille={76} />
                    <div className="text-[10px] text-slate-500">
                      Perçu par : {modale_recu.encaisse_par}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Sceau : {etablissement_actif.code_sceau}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="printable-document-root">
                <div className="print-sheet-a4 rounded-xl border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-950 space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <LogoEtablissement
                        type={etablissement_actif.type}
                        code={etablissement_actif.code}
                        url_logo={etablissement_actif.url_logo}
                        nom={etablissement_actif.nom}
                        taille="moyen"
                      />
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {etablissement_actif.nom}
                        </div>
                        <div className="text-slate-500">
                          {etablissement_actif.adresse} · {etablissement_actif.telephone}
                        </div>
                      </div>
                    </div>
                    <CodeQrSvg valeur={donnees_qr} taille={64} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Reçu N° : </span>
                      <strong className="font-mono">{modale_recu.numero_recu}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">Date : </span>
                      <strong className="font-mono">{formater_date_fr(modale_recu.paye_le)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Payé par : </span>
                      <strong>{libelle_apprenant}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">Mode : </span>
                      <strong>
                        {modale_recu.mode_paiement}{' '}
                        {modale_recu.code_reference ? `(${modale_recu.code_reference})` : ''}
                      </strong>
                    </div>
                    {modale_recu.libelle_compte_bancaire && (
                      <div className="col-span-2">
                        <span className="text-slate-500">Compte crédité / Caisse : </span>
                        <strong>{modale_recu.libelle_compte_bancaire}</strong>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                    <span className="font-medium">{modale_recu.libelle}</span>
                    <span className="font-mono text-base font-bold">
                      {formater_montant(
                        modale_recu.montant_htg,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-center text-slate-500">
                    Enregistrement manuel : aucune transaction en ligne n’a été effectuée.
                  </p>

                  <div className="flex justify-between text-[11px] text-slate-400 pt-2">
                    <span>Perçu par : {modale_recu.encaisse_par}</span>
                    <span>Sceau : {etablissement_actif.code_sceau}</span>
                  </div>
                </div>
              </div>
            );
          })()}
      </Modale>

      {/* Modale Annulation de reçu avec justification */}
      <Modale
        ouverte={Boolean(cible_annulation)}
        sur_fermeture={() => definir_cible_annulation(null)}
        titre={`Annuler le reçu ${cible_annulation?.numero_recu ?? ''}`}
        classe_largeur_max="max-w-md"
        pied_page={
          <>
            <Bouton variante="fantome" onClick={() => definir_cible_annulation(null)}>
              Retour
            </Bouton>
            <Bouton
              variante="danger"
              disabled={!motif_annulation.trim()}
              onClick={() => {
                if (cible_annulation)
                  annuler_paiement(cible_annulation.id, motif_annulation.trim());
                definir_cible_annulation(null);
                definir_motif_annulation('');
              }}
            >
              Confirmer l’annulation
            </Bouton>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-500">
            Une annulation est tracée dans le journal d’audit. Veuillez saisir le motif exact :
          </p>
          <input
            type="text"
            value={motif_annulation}
            onChange={(e) => definir_motif_annulation(e.target.value)}
            placeholder="ex. Erreur de saisie du montant / Référence rejetée"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>
      </Modale>

      {/* Modale Édition Dépense */}
      <Modale
        ouverte={Boolean(depense_edition)}
        sur_fermeture={() => definir_depense_edition(null)}
        titre="Modifier une dépense"
        classe_largeur_max="max-w-md"
      >
        {depense_edition && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!depense_edition.description.trim() || montant_depense_edition_saisi <= 0) return;
              modifier_depense(depense_edition.id, {
                categorie: depense_edition.categorie,
                description: depense_edition.description.trim(),
                fournisseur: depense_edition.fournisseur.trim() || 'Fournisseur local',
                payee_le: depense_edition.payee_le,
                montant_htg: convertir_devise_vers_pivot(
                  montant_depense_edition_saisi,
                  devise_active,
                  etablissement_actif.taux_change_usd
                ),
              });
              definir_depense_edition(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1">Catégorie</label>
              <select
                value={depense_edition.categorie}
                onChange={(e) =>
                  definir_depense_edition({
                    ...depense_edition,
                    categorie: e.target.value as DepenseEnregistree['categorie'],
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Fournitures">Fournitures</option>
                <option value="Énergie / Génératrice">Énergie / Génératrice</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Loyer & Eau">Loyer & Eau</option>
                <option value="Équipement">Équipement</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Description *</label>
              <input
                type="text"
                required
                value={depense_edition.description}
                onChange={(e) =>
                  definir_depense_edition({ ...depense_edition, description: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Fournisseur</label>
                <input
                  type="text"
                  value={depense_edition.fournisseur}
                  onChange={(e) =>
                    definir_depense_edition({ ...depense_edition, fournisseur: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Date</label>
                <input
                  type="date"
                  value={depense_edition.payee_le}
                  onChange={(e) =>
                    definir_depense_edition({ ...depense_edition, payee_le: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Montant ({devise_active}) *</label>
              <input
                type="number"
                step="any"
                min={0.01}
                required
                value={montant_depense_edition_saisi}
                onChange={(e) =>
                  definir_montant_depense_edition_saisi(Number(e.target.value) || 0)
                }
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Bouton
                type="button"
                variante="secondaire"
                taille="sm"
                onClick={() => definir_depense_edition(null)}
              >
                Annuler
              </Bouton>
              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                classe_accent={theme_etab.bouton_principal}
              >
                Enregistrer
              </Bouton>
            </div>
          </form>
        )}
      </Modale>

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression_depense)}
        sur_fermeture={() => definir_cible_suppression_depense(null)}
        sur_confirmation={() => {
          if (cible_suppression_depense) supprimer_depense(cible_suppression_depense.id);
        }}
        tonalite="danger"
        titre="Supprimer cette dépense ?"
        sous_titre={cible_suppression_depense?.description}
        description="La dépense sera supprimée du journal financier et le solde net de caisse sera recalculé."
        libelle_confirmation="Supprimer la dépense"
      />
    </div>
  );
};
