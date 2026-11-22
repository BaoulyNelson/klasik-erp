import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  IdCard,
  Printer,
  QrCode,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { CodeQrSvg } from '../../composants/interface/CodeQrSvg';
import { LogoEtablissement } from '../../composants/interface/LogoEtablissement';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { utiliserErp } from '../../contexte/ContexteErp';
import { AttributionBadge } from '../../modeles/erp';

export const VueBadges: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    utilisateur_actif,
    id_role_actif,
    unites_etablissement,
    apprenants_etablissement,
    badges_etablissement,
    attribuer_badge_apprenant,
    journaliser_scan_badge,
    a_permission,
  } = utiliserErp();

  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type);
  const peut_gerer = a_permission('badges:gerer');
  const est_profil_personnel = id_role_actif === 'APPRENANT' || id_role_actif === 'PARENT';

  const [onglet_actif, definir_onglet_actif] = useState<'cartes' | 'scanner' | 'merites'>('cartes');
  const [filtre_unite, definir_filtre_unite] = useState<string>('TOUTES');

  useEffect(() => {
    if (!peut_gerer && onglet_actif === 'scanner') {
      definir_onglet_actif('cartes');
    }
  }, [peut_gerer, onglet_actif]);

  const apprenants_visibles = useMemo(() => {
    if (!est_profil_personnel) return apprenants_etablissement;
    if (utilisateur_actif.ids_apprenants_lies && utilisateur_actif.ids_apprenants_lies.length > 0) {
      const lies = apprenants_etablissement.filter((a) =>
        utilisateur_actif.ids_apprenants_lies?.includes(a.id)
      );
      if (lies.length > 0) return lies;
    }
    const par_courriel = apprenants_etablissement.filter(
      (a) => (a.courriel ?? '').toLowerCase() === utilisateur_actif.courriel.toLowerCase()
    );
    if (par_courriel.length > 0) return par_courriel;
    return apprenants_etablissement.slice(0, 1);
  }, [
    est_profil_personnel,
    apprenants_etablissement,
    utilisateur_actif.ids_apprenants_lies,
    utilisateur_actif.courriel,
  ]);

  const ids_apprenants_visibles = useMemo(
    () => new Set(apprenants_visibles.map((a) => a.id)),
    [apprenants_visibles]
  );

  const badges_visibles = useMemo(() => {
    if (!est_profil_personnel) return badges_etablissement;
    return badges_etablissement.filter((b) => ids_apprenants_visibles.has(b.id_apprenant));
  }, [est_profil_personnel, badges_etablissement, ids_apprenants_visibles]);

  const [saisie_scan, definir_saisie_scan] = useState<string>(
    apprenants_etablissement[0]?.matricule ?? ''
  );
  const [verdict_scan, definir_verdict_scan] = useState<{
    matricule: string;
    nom_apprenant: string;
    nom_unite: string;
    statut: 'AUTORISE' | 'ALERTE_SOLDE' | 'SUSPENDU' | 'INCONNU';
    message: string;
  } | null>(null);

  const [id_apprenant_merite, definir_id_apprenant_merite] = useState<string>(
    apprenants_etablissement[0]?.id ?? ''
  );
  const [titre_merite, definir_titre_merite] = useState('');
  const [categorie_merite, definir_categorie_merite] =
    useState<AttributionBadge['categorie']>('Excellence');

  const apprenants_filtres = useMemo(() => {
    if (est_profil_personnel) return apprenants_visibles;
    return apprenants_visibles.filter(
      (apprenant) => filtre_unite === 'TOUTES' || apprenant.id_unite === filtre_unite
    );
  }, [est_profil_personnel, apprenants_visibles, filtre_unite]);

  const gerer_verification_scan = (matricule_ou_qr: string) => {
    const nettoye = matricule_ou_qr.trim().toLowerCase();
    const correspondance = apprenants_etablissement.find(
      (apprenant) =>
        apprenant.matricule.toLowerCase() === nettoye ||
        nettoye.includes(apprenant.matricule.toLowerCase())
    );
    if (!correspondance) {
      definir_verdict_scan({
        matricule: matricule_ou_qr || '—',
        nom_apprenant: 'Inconnu dans cet établissement',
        nom_unite: '—',
        statut: 'INCONNU',
        message: 'Aucun badge actif ne correspond à ce code QR sur cet établissement.',
      });
      return;
    }

    const nom_unite =
      unites_etablissement.find((u) => u.id === correspondance.id_unite)?.nom ??
      correspondance.libelle_niveau;

    if (correspondance.statut === 'SUSPENDU') {
      journaliser_scan_badge(correspondance.id, 'SUSPENDU');
      definir_verdict_scan({
        matricule: correspondance.matricule,
        nom_apprenant: `${correspondance.prenom} ${correspondance.nom}`,
        nom_unite,
        statut: 'SUSPENDU',
        message: 'Accès refusé : dossier administratif suspendu.',
      });
      return;
    }

    if (
      etablissement_actif.bloquer_documents_si_impaye &&
      correspondance.statut_paiement === 'EN_RETARD'
    ) {
      journaliser_scan_badge(correspondance.id, 'ALERTE_SOLDE');
      definir_verdict_scan({
        matricule: correspondance.matricule,
        nom_apprenant: `${correspondance.prenom} ${correspondance.nom}`,
        nom_unite,
        statut: 'ALERTE_SOLDE',
        message: 'Passage signalé : retard de scolarité à régulariser à l’économat.',
      });
      return;
    }

    journaliser_scan_badge(correspondance.id, 'AUTORISE');
    definir_verdict_scan({
      matricule: correspondance.matricule,
      nom_apprenant: `${correspondance.prenom} ${correspondance.nom}`,
      nom_unite,
      statut: 'AUTORISE',
      message: `Carte valide (${etablissement_actif.annee_academique}) · Accès campus & bibliothèque autorisé.`,
    });
  };

  const gerer_attribution_merite = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!id_apprenant_merite || !titre_merite.trim()) return;
    attribuer_badge_apprenant({
      id_apprenant: id_apprenant_merite,
      titre_badge: titre_merite.trim(),
      categorie: categorie_merite,
    });
    definir_titre_merite('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            {est_profil_personnel
              ? id_role_actif === 'PARENT'
                ? 'Cartes QR & Badges de mes enfants'
                : 'Ma Carte QR & Badges personnels'
              : 'Cartes, Badges QR & Contrôle d’Accès'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {est_profil_personnel
              ? 'Consultez et imprimez uniquement votre carte d’accès officielle et vos distinctions.'
              : 'Génération en lot des cartes d’identité scolaires/universitaires, vérification QR au portail et badges de mérite.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Bouton
            variante={onglet_actif === 'cartes' ? 'principal' : 'secondaire'}
            taille="sm"
            classe_accent={onglet_actif === 'cartes' ? theme_etab.bouton_principal : undefined}
            onClick={() => definir_onglet_actif('cartes')}
          >
            <IdCard className="w-4 h-4" />
            <span>{est_profil_personnel ? 'Ma carte QR' : 'Cartes QR'}</span>
          </Bouton>
          {peut_gerer && (
            <Bouton
              variante={onglet_actif === 'scanner' ? 'principal' : 'secondaire'}
              taille="sm"
              classe_accent={onglet_actif === 'scanner' ? theme_etab.bouton_principal : undefined}
              onClick={() => definir_onglet_actif('scanner')}
            >
              <QrCode className="w-4 h-4" />
              <span>Contrôle d’accès</span>
            </Bouton>
          )}
          <Bouton
            variante={onglet_actif === 'merites' ? 'principal' : 'secondaire'}
            taille="sm"
            classe_accent={onglet_actif === 'merites' ? theme_etab.bouton_principal : undefined}
            onClick={() => definir_onglet_actif('merites')}
          >
            <Award className="w-4 h-4" />
            <span>
              {est_profil_personnel ? 'Mes mérites' : 'Mérites'} ({badges_visibles.length})
            </span>
          </Bouton>
        </div>
      </div>

      {/* Onglet 1 : Cartes QR */}
      {onglet_actif === 'cartes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            {!est_profil_personnel ? (
              <select
                value={filtre_unite}
                onChange={(e) => definir_filtre_unite(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:w-72"
              >
                <option value="TOUTES">
                  Toutes les {terminologie.unite_pluriel.toLowerCase()} (
                  {apprenants_etablissement.length})
                </option>
                {unites_etablissement.map((unite) => (
                  <option key={unite.id} value={unite.id}>
                    {unite.code} · {unite.nom}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Accès cloisonné à votre dossier personnel ({apprenants_filtres.length} carte
                {apprenants_filtres.length > 1 ? 's' : ''})
              </div>
            )}

            <Bouton
              variante="principal"
              taille="sm"
              classe_accent={theme_etab.bouton_principal}
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4" />
              <span>
                {est_profil_personnel
                  ? apprenants_filtres.length > 1
                    ? `Imprimer mes cartes (${apprenants_filtres.length})`
                    : 'Imprimer ma carte QR'
                  : `Imprimer la planche (${apprenants_filtres.length})`}
              </span>
            </Bouton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {apprenants_filtres.map((apprenant) => {
              const unite = unites_etablissement.find((u) => u.id === apprenant.id_unite);
              const contenu_qr = `KLASIK|${etablissement_actif.code}|${apprenant.matricule}|${etablissement_actif.annee_academique}`;
              return (
                <Carte key={apprenant.id} className="space-y-3 print:break-inside-avoid">
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <LogoEtablissement
                        type={etablissement_actif.type}
                        code={etablissement_actif.code}
                        url_logo={etablissement_actif.url_logo}
                        nom={etablissement_actif.nom}
                        taille="petit"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-display font-bold truncate">
                          {etablissement_actif.nom_court}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Carte {terminologie.apprenant_singulier} ·{' '}
                          {etablissement_actif.annee_academique}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                      {apprenant.statut}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 text-xs">
                      <div className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {apprenant.prenom} {apprenant.nom}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {apprenant.matricule}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        {unite?.nom ?? apprenant.libelle_niveau}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Niveau : {apprenant.libelle_niveau}
                      </div>
                    </div>

                    <CodeQrSvg valeur={contenu_qr} taille={74} />
                  </div>
                </Carte>
              );
            })}
          </div>
        </div>
      )}

      {/* Onglet 2 : Contrôle d'accès & Scan QR (réservé au personnel autorisé) */}
      {onglet_actif === 'scanner' && peut_gerer && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Carte className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <QrCode className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-display font-bold">Vérificateur de badge / portail</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  Code QR ou Matricule {terminologie.apprenant_singulier.toLowerCase()}
                </label>
                <input
                  type="text"
                  value={saisie_scan}
                  onChange={(e) => definir_saisie_scan(e.target.value)}
                  placeholder={`Ex: ${apprenants_etablissement[0]?.matricule ?? 'EPM-2026-001'}`}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>

              <Bouton
                variante="principal"
                taille="sm"
                classe_accent={theme_etab.bouton_principal}
                className="w-full"
                onClick={() => gerer_verification_scan(saisie_scan)}
              >
                <QrCode className="w-4 h-4" />
                <span>Contrôler le badge</span>
              </Bouton>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400">
                  Test rapide sur un dossier :
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {apprenants_etablissement.slice(0, 4).map((apprenant) => (
                    <button
                      key={apprenant.id}
                      type="button"
                      onClick={() => {
                        definir_saisie_scan(apprenant.matricule);
                        gerer_verification_scan(apprenant.matricule);
                      }}
                      className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-mono hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {apprenant.matricule}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Carte>

          <Carte className="lg:col-span-7">
            {!verdict_scan ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Scannez un code QR ou saisissez un matricule pour afficher la décision d’accès
                campus.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  {verdict_scan.statut === 'AUTORISE' && (
                    <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" />
                  )}
                  {verdict_scan.statut === 'ALERTE_SOLDE' && (
                    <ShieldAlert className="w-7 h-7 text-amber-500 shrink-0" />
                  )}
                  {(verdict_scan.statut === 'SUSPENDU' || verdict_scan.statut === 'INCONNU') && (
                    <XCircle className="w-7 h-7 text-red-500 shrink-0" />
                  )}
                  <div>
                    <div className="text-base font-display font-bold">
                      {verdict_scan.statut === 'AUTORISE'
                        ? 'Accès autorisé'
                        : verdict_scan.statut === 'ALERTE_SOLDE'
                          ? 'Alerte financière'
                          : 'Accès refusé'}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {verdict_scan.message}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                  <div>
                    <div className="text-slate-400">Titulaire</div>
                    <div className="font-semibold mt-0.5">{verdict_scan.nom_apprenant}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Matricule</div>
                    <div className="font-mono font-semibold mt-0.5">{verdict_scan.matricule}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">{terminologie.unite_singulier}</div>
                    <div className="font-semibold mt-0.5 truncate">{verdict_scan.nom_unite}</div>
                  </div>
                </div>
              </div>
            )}
          </Carte>
        </div>
      )}

      {/* Onglet 3 : Badges de mérite */}
      {onglet_actif === 'merites' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {peut_gerer && (
            <Carte className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-display font-bold">Décerner un badge de mérite</h3>
              </div>

              <form onSubmit={gerer_attribution_merite} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">
                    {terminologie.apprenant_singulier}
                  </label>
                  <select
                    value={id_apprenant_merite}
                    onChange={(e) => definir_id_apprenant_merite(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {apprenants_etablissement.map((apprenant) => (
                      <option key={apprenant.id} value={apprenant.id}>
                        {apprenant.prenom} {apprenant.nom} ({apprenant.matricule})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Catégorie</label>
                  <select
                    value={categorie_merite}
                    onChange={(e) =>
                      definir_categorie_merite(e.target.value as AttributionBadge['categorie'])
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Excellence">Excellence académique</option>
                    <option value="Assiduité">Assiduité exemplaire</option>
                    <option value="Leadership">Leadership & Vie associative</option>
                    <option value="Compétence">Compétence technique validée</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Intitulé du badge *</label>
                  <input
                    type="text"
                    required
                    value={titre_merite}
                    onChange={(e) => definir_titre_merite(e.target.value)}
                    placeholder="Ex: Prix d’excellence en Mathématiques"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <Bouton
                  type="submit"
                  variante="principal"
                  taille="sm"
                  classe_accent={theme_etab.bouton_principal}
                  className="w-full"
                >
                  <Award className="w-4 h-4" />
                  <span>Attribuer le badge</span>
                </Bouton>
              </form>
            </Carte>
          )}

          <Carte rembourrage="aucun" className={peut_gerer ? 'lg:col-span-8' : 'lg:col-span-12'}>
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-display font-bold">
                {est_profil_personnel
                  ? `Mes badges de mérite & distinctions (${badges_visibles.length})`
                  : `Tableau d’honneur & Badges décernés (${badges_visibles.length})`}
              </h3>
            </div>
            {badges_visibles.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Aucun badge de mérite attribué pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {badges_visibles.map((attribution) => {
                  const apprenant = apprenants_etablissement.find(
                    (item) => item.id === attribution.id_apprenant
                  );
                  return (
                    <div
                      key={attribution.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                          <Award className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {attribution.titre_badge}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {apprenant
                              ? `${apprenant.prenom} ${apprenant.nom} (${apprenant.matricule})`
                              : attribution.id_apprenant}{' '}
                            · {attribution.categorie} · Par {attribution.attribue_par}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 shrink-0">
                        {attribution.attribue_le}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Carte>
        </div>
      )}
    </div>
  );
};
