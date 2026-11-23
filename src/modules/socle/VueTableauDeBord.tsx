import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  FileWarning,
  GraduationCap,
  Layers,
  MessageSquare,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { BadgeTypeEtablissement } from '../../composants/interface/BadgeTypeEtablissement';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { LogoEtablissement } from '../../composants/interface/LogoEtablissement';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { PROFILS_PAYS } from '../../configuration/regions_devises';
import { obtenir_libelle_role_etablissement } from '../../configuration/roles_permissions';
import { utiliserErp } from '../../contexte/ContexteErp';
import { formater_montant } from '../../services/service_donnees';

export const VueTableauDeBord: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    devise_active,
    id_role_actif,
    journaux_audit,
    definir_route_active,
    etablissements_accessibles,
    changer_etablissement,
    apprenants_etablissement,
    unites_etablissement,
    enseignants_etablissement,
    paiements_etablissement,
    a_permission,
  } = utiliserErp();

  const theme = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);

  const indicateurs = useMemo(() => {
    const total_du = apprenants_etablissement.reduce((somme, a) => somme + a.total_du_htg, 0);
    const total_paye = apprenants_etablissement.reduce((somme, a) => somme + a.total_paye_htg, 0);
    const taux_recouvrement = total_du > 0 ? Math.round((total_paye / total_du) * 100) : 0;
    const nombre_retards = apprenants_etablissement.filter(
      (a) => a.statut_paiement === 'EN_RETARD'
    ).length;
    const nombre_dossiers_incomplets = apprenants_etablissement.filter(
      (a) => !a.dossier_complet
    ).length;
    const nombre_assiduite_faible = apprenants_etablissement.filter(
      (a) => a.taux_assiduite < 82
    ).length;
    const assiduite_moyenne =
      apprenants_etablissement.length > 0
        ? Math.round(
            apprenants_etablissement.reduce((somme, a) => somme + a.taux_assiduite, 0) /
              apprenants_etablissement.length
          )
        : 0;
    const moyenne_generale =
      apprenants_etablissement.length > 0
        ? Number(
            (
              apprenants_etablissement.reduce((somme, a) => somme + a.moyenne_generale, 0) /
              apprenants_etablissement.length
            ).toFixed(1)
          )
        : 0;
    const nombre_admis = apprenants_etablissement.filter(
      (a) => a.moyenne_generale >= etablissement_actif.note_passage
    ).length;
    const taux_reussite =
      apprenants_etablissement.length > 0
        ? Math.round((nombre_admis / apprenants_etablissement.length) * 100)
        : 0;
    const nombre_femmes = apprenants_etablissement.filter((a) => a.sexe === 'F').length;
    const pourcentage_femmes =
      apprenants_etablissement.length > 0
        ? Math.round((nombre_femmes / apprenants_etablissement.length) * 100)
        : 0;
    const taux_placement_stage =
      apprenants_etablissement.length > 0
        ? Math.round(
            (apprenants_etablissement.filter((a) => Boolean(a.entreprise_stage)).length /
              apprenants_etablissement.length) *
              100
          )
        : 0;

    return {
      nombre_apprenants: apprenants_etablissement.length,
      total_du,
      total_paye,
      solde_restant: total_du - total_paye,
      taux_recouvrement,
      nombre_retards,
      nombre_dossiers_incomplets,
      nombre_assiduite_faible,
      assiduite_moyenne,
      moyenne_generale,
      taux_reussite,
      nombre_femmes,
      nombre_hommes: apprenants_etablissement.length - nombre_femmes,
      pourcentage_femmes,
      taux_placement_stage,
    };
  }, [apprenants_etablissement, etablissement_actif.note_passage]);

  const effectifs_par_etape = terminologie.etapes_parcours.map((etape_parcours) => ({
    ...etape_parcours,
    effectif: apprenants_etablissement.filter((a) => a.indice_etape === etape_parcours.etape)
      .length,
  }));

  // Données mensuelles d'encaissement estimées à partir des règlements validés
  const serie_mensuelle = useMemo(() => {
    const base = indicateurs.total_paye;
    return [
      { mois: 'Sept.', montant_htg: Math.round(base * 0.34) },
      { mois: 'Oct.', montant_htg: Math.round(base * 0.39) },
      {
        mois: 'Nov.',
        montant_htg:
          Math.round(base * 0.27) +
          paiements_etablissement
            .filter((p) => p.statut === 'VALIDE')
            .reduce((somme, p) => somme + p.montant_htg, 0) *
            0.05,
      },
      { mois: 'Déc. (prév.)', montant_htg: Math.round(indicateurs.solde_restant * 0.45) },
    ];
  }, [indicateurs.total_paye, indicateurs.solde_restant, paiements_etablissement]);

  const maximum_mensuel = Math.max(...serie_mensuelle.map((m) => m.montant_htg), 1);

  // Répartition par tranche d'âge
  const tranches_age = useMemo(() => {
    const groupes = [
      { libelle: 'Moins de 15 ans', effectif: 0 },
      { libelle: '15 – 19 ans', effectif: 0 },
      { libelle: '20 – 24 ans', effectif: 0 },
      { libelle: '25 ans et +', effectif: 0 },
    ];
    apprenants_etablissement.forEach((apprenant) => {
      const annee = Number(apprenant.date_naissance.split('-')[0]) || 2004;
      const age = 2026 - annee;
      if (age < 15) groupes[0].effectif++;
      else if (age <= 19) groupes[1].effectif++;
      else if (age <= 24) groupes[2].effectif++;
      else groupes[3].effectif++;
    });
    return groupes;
  }, [apprenants_etablissement]);

  const autres_etablissements = etablissements_accessibles.filter(
    (e) => e.id !== etablissement_actif.id
  );

  return (
    <div className="space-y-6">
      {/* En-tête établissement + Raccourcis d'actions rapides */}
      <Carte rembourrage="grand">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <LogoEtablissement
              type={etablissement_actif.type}
              code={etablissement_actif.code}
              url_logo={etablissement_actif.url_logo}
              nom={etablissement_actif.nom}
              taille="grand"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100">
                  {etablissement_actif.nom}
                </h2>
                <BadgeTypeEtablissement type={etablissement_actif.type} />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {etablissement_actif.devise_etablissement} · {etablissement_actif.ville} ·{' '}
                {etablissement_actif.libelle_periode_courante}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {etablissement_actif.titre_direction} :{' '}
                  <strong className="text-slate-700 dark:text-slate-200 font-medium">
                    {etablissement_actif.nom_direction}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Session :{' '}
                  <strong className="text-slate-700 dark:text-slate-200 font-medium">
                    {obtenir_libelle_role_etablissement(id_role_actif, etablissement_actif.type)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {a_permission('admissions:gerer') && (
              <Bouton
                variante="principal"
                taille="sm"
                classe_accent={theme.bouton_principal}
                onClick={() => definir_route_active('admissions')}
              >
                <UserPlus className="w-4 h-4" />
                <span>Nouvelle inscription</span>
              </Bouton>
            )}
            {a_permission('finances:encaisser') && (
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => definir_route_active('finances')}
              >
                <Wallet className="w-4 h-4" />
                <span>Encaisser</span>
              </Bouton>
            )}
            {a_permission('pedagogie:noter') && (
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => definir_route_active('pedagogie')}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Notes & Appel</span>
              </Bouton>
            )}
            {a_permission('communication:envoyer') && (
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => definir_route_active('communication')}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message</span>
              </Bouton>
            )}
          </div>
        </div>
      </Carte>

      {/* Bandeau d'onboarding vierge si aucun apprenant ou aucune unité */}
      {(unites_etablissement.length === 0 || apprenants_etablissement.length === 0) && (
        <Carte className="border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/40 dark:bg-indigo-950/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                Espace vierge initialisé — Prêt pour votre configuration
              </div>
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Démarrez {etablissement_actif.nom_court} en 3 étapes
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Toutes vos données sont strictement isolées (0{' '}
                {terminologie.apprenant_pluriel.toLowerCase()}, {unites_etablissement.length}{' '}
                {terminologie.unite_pluriel.toLowerCase()}, {enseignants_etablissement.length}{' '}
                {terminologie.enseignant_pluriel.toLowerCase()}).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Bouton
                variante={unites_etablissement.length === 0 ? 'principal' : 'secondaire'}
                taille="sm"
                classe_accent={
                  unites_etablissement.length === 0 ? theme.bouton_principal : undefined
                }
                onClick={() => definir_route_active('structure')}
              >
                <Layers className="w-4 h-4" />
                <span>
                  1. {unites_etablissement.length === 0 ? 'Créer' : 'Gérer'}{' '}
                  {terminologie.unite_pluriel.toLowerCase()} & tarifs
                </span>
              </Bouton>
              <Bouton
                variante={unites_etablissement.length > 0 ? 'principal' : 'secondaire'}
                taille="sm"
                classe_accent={
                  unites_etablissement.length > 0 ? theme.bouton_principal : undefined
                }
                onClick={() => definir_route_active('admissions')}
              >
                <UserPlus className="w-4 h-4" />
                <span>2. Inscrire un {terminologie.apprenant_singulier.toLowerCase()}</span>
              </Bouton>
            </div>
          </div>
        </Carte>
      )}

      {/* Bandeau 4 indicateurs clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Carte>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {terminologie.libelles_indicateurs.apprenants_actifs}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {indicateurs.nombre_apprenants}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {unites_etablissement.length} {terminologie.unite_pluriel.toLowerCase()}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {enseignants_etablissement.length} {terminologie.enseignant_pluriel.toLowerCase()}
          </div>
        </Carte>

        <Carte>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Taux de recouvrement ({devise_active})
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {indicateurs.taux_recouvrement}%
            </span>
            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
              {formater_montant(
                indicateurs.total_paye,
                devise_active,
                etablissement_actif.taux_change_usd
              )}
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${theme.remplissage_progression}`}
              style={{ width: `${indicateurs.taux_recouvrement}%` }}
            />
          </div>
        </Carte>

        <Carte>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Impayés à recouvrer
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {formater_montant(
                indicateurs.solde_restant,
                devise_active,
                etablissement_actif.taux_change_usd
              )}
            </span>
          </div>
          <div className="mt-2 text-xs text-red-600 dark:text-red-400 tabular-nums">
            {indicateurs.nombre_retards} dossier{indicateurs.nombre_retards > 1 ? 's' : ''} en
            retard critique
          </div>
        </Carte>

        <Carte>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Assiduité & Réussite
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {indicateurs.assiduite_moyenne}%
            </span>
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 tabular-nums">
              Moy. {indicateurs.moyenne_generale}/{etablissement_actif.echelle_notation}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {etablissement_actif.type === 'PRO'
              ? `Placement stage : ${indicateurs.taux_placement_stage}%`
              : `Taux de réussite : ${indicateurs.taux_reussite}%`}
          </div>
        </Carte>
      </div>

      {/* Graphiques analytiques + Centre d'alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Carte className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                Encaissements mensuels & Démographie
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Suivi des recettes ({devise_active}) et répartition des effectifs par genre et âge
              </p>
            </div>
            <button
              type="button"
              onClick={() => definir_route_active('rapports')}
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
            >
              Rapports complets →
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 pt-2 items-end h-40">
            {serie_mensuelle.map((element_mois) => {
              const hauteur_pct = Math.max(
                14,
                Math.round((element_mois.montant_htg / maximum_mensuel) * 100)
              );
              return (
                <div
                  key={element_mois.mois}
                  className="flex flex-col items-center justify-end h-full gap-1.5"
                >
                  <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 tabular-nums text-center">
                    {formater_montant(
                      element_mois.montant_htg,
                      devise_active,
                      etablissement_actif.taux_change_usd
                    )}
                  </span>
                  <div className="w-full max-w-[54px] bg-slate-100 dark:bg-slate-800 rounded-t-md h-24 flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-t-md ${theme.remplissage_progression} transition-all duration-300`}
                      style={{ height: `${hauteur_pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {element_mois.mois}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Répartition par genre
                </span>
                <span className="font-mono text-slate-500 tabular-nums">
                  {indicateurs.nombre_femmes} F · {indicateurs.nombre_hommes} M
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                <div
                  className="bg-indigo-600 h-full"
                  style={{ width: `${indicateurs.pourcentage_femmes}%` }}
                />
                <div
                  className="bg-sky-400 h-full"
                  style={{ width: `${100 - indicateurs.pourcentage_femmes}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>Femmes ({indicateurs.pourcentage_femmes}%)</span>
                <span>Hommes ({100 - indicateurs.pourcentage_femmes}%)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tranches d’âge
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {tranches_age.map((tranche) => (
                  <div key={tranche.libelle} className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{tranche.libelle}</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {tranche.effectif}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Carte>

        {/* Centre d'alertes actionnables */}
        <Carte className="lg:col-span-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
              Centre d’alertes opérationnelles
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2 text-xs">
            <div className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-red-700 dark:text-red-400">
                  {indicateurs.nombre_retards} paiement(s) en retard
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Relance recommandée via SMS / WhatsApp (
                  {(PROFILS_PAYS[etablissement_actif.code_pays] ?? PROFILS_PAYS.HT)
                    .indicatif_telephonique}
                  ).
                </p>
              </div>
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => definir_route_active('finances')}
              >
                Gérer
              </Bouton>
            </div>

            <div className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <FileWarning className="w-3.5 h-3.5" />
                  <span>{indicateurs.nombre_dossiers_incomplets} dossier(s) incomplet(s)</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Pièces justificatives manquantes à régulariser.
                </p>
              </div>
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => definir_route_active('apprenants')}
              >
                Vérifier
              </Bouton>
            </div>

            <div className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {indicateurs.nombre_assiduite_faible}{' '}
                  {terminologie.apprenant_pluriel.toLowerCase()} &lt; 82% d’assiduité
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Suivi des absences répétées à effectuer.
                </p>
              </div>
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => definir_route_active('pedagogie')}
              >
                Appel
              </Bouton>
            </div>

            <div className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  Échéance : {etablissement_actif.libelle_periode_courante}
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  {terminologie.libelle_issue_parcours}
                </p>
              </div>
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => definir_route_active('documents')}
              >
                Documents
              </Bouton>
            </div>
          </div>
        </Carte>
      </div>

      {/* Pipeline de progression contextuel */}
      <Carte>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
              Parcours de progression — {terminologie.libelle_type_complet}
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {terminologie.periode_singulier} : {etablissement_actif.libelle_periode_courante}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4">
          {effectifs_par_etape.map((etape_item) => (
            <div
              key={etape_item.etape}
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/40"
            >
              <div className="flex items-center justify-between">
                <span className={`font-mono text-xs font-semibold ${theme.texte_accent}`}>
                  Étape {etape_item.etape}
                </span>
                <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {etape_item.effectif}
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1.5">
                {etape_item.libelle}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {etape_item.description}
              </p>
            </div>
          ))}
        </div>
      </Carte>

      {/* Unités & Bascule multi-établissements + Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Carte className="lg:col-span-7">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                Effectifs par {terminologie.unite_singulier.toLowerCase()}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => definir_route_active('structure')}
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
            >
              Détails & Tarifs →
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {unites_etablissement.length === 0 ? (
              <div className="py-8 text-center space-y-2.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aucune {terminologie.unite_singulier.toLowerCase()} configurée pour le moment.
                </p>
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  onClick={() => definir_route_active('structure')}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Créer une {terminologie.unite_singulier.toLowerCase()}</span>
                </Bouton>
              </div>
            ) : (
              unites_etablissement.map((unite) => {
                const effectif = apprenants_etablissement.filter(
                  (a) => a.id_unite === unite.id
                ).length;
                const pourcentage =
                  unite.capacite > 0
                    ? Math.min(100, Math.round((effectif / unite.capacite) * 100))
                    : 0;
                return (
                  <div
                    key={unite.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{unite.code}</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {unite.nom}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {unite.niveau_ou_duree} ·{' '}
                        <span className="font-mono tabular-nums">
                          {formater_montant(
                            unite.frais_scolarite_htg,
                            devise_active,
                            etablissement_actif.taux_change_usd
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${theme.remplissage_progression}`}
                          style={{ width: `${pourcentage}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums w-14 text-right">
                        {effectif}/{unite.capacite}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Carte>

        <div className="lg:col-span-5 space-y-4">
          {autres_etablissements.length > 0 && (
            <Carte>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Building2 className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                  Mes autres établissements ({autres_etablissements.length})
                </h3>
              </div>
              <div className="space-y-2 mt-3">
                {autres_etablissements.map((etab) => (
                  <button
                    key={etab.id}
                    type="button"
                    onClick={() => changer_etablissement(etab.id)}
                    className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <LogoEtablissement
                        type={etab.type}
                        code={etab.code}
                        url_logo={etab.url_logo}
                        nom={etab.nom}
                        taille="petit"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {etab.nom}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <BadgeTypeEtablissement type={etab.type} compact />
                          <span className="text-[11px] text-slate-500 truncate">
                            {etab.ville}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            </Carte>
          )}

          <Carte>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                Activité récente (Audit)
              </h3>
              <button
                type="button"
                onClick={() => definir_route_active('roles_audit')}
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
              >
                Tout voir →
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
              {journaux_audit.slice(0, 4).map((journal) => (
                <div key={journal.id} className="py-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {journal.action}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 shrink-0">
                      {journal.horodatage.split(' ')[1] ?? journal.horodatage}
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {journal.nom_acteur} · {journal.cible}
                  </div>
                </div>
              ))}
            </div>
          </Carte>
        </div>
      </div>
    </div>
  );
};
