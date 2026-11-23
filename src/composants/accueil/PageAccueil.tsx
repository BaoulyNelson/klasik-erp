import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Home,
  Laptop,
  Layers,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Phone,
  Plus,
  QrCode,
  Smartphone,
  Sun,
  Users,
  Wallet,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { CATALOGUE_FORFAITS_SAAS } from '../../configuration/forfaits_saas';
import {
  DICTIONNAIRE_ACCUEIL,
  LangueSupportee,
  OPTIONS_LANGUES,
} from '../../configuration/internationalisation';
import {
  PROFILS_PAYS,
  TOUTES_LES_DEVISES,
  TOUS_LES_PAYS,
} from '../../configuration/regions_devises';
import { utiliserErp } from '../../contexte/ContexteErp';
import { TypeEtablissement } from '../../modeles/erp';
import { envoyerMessageContactApi } from '../../services/clientApi';
import { BadgeTypeEtablissement } from '../interface/BadgeTypeEtablissement';
import { Bouton } from '../interface/Bouton';
import { LogoPlateforme } from '../interface/LogoPlateforme';

const DEMO_PUBLIQUE_ACTIVE = import.meta.env.VITE_DEMO_PUBLIQUE === 'true';

const DONNEES_APERCU_MOBILE: Record<
  TypeEtablissement,
  {
    nom_ecole: string;
    badge_region: string;
    indicateur_1_libelle: string;
    indicateur_1_valeur: string;
    indicateur_2_libelle: string;
    indicateur_2_valeur: string;
    titre_action: string;
    description_action: string;
    fond_accent: string;
    lignes: { nom: string; sous_titre: string; badge: string }[];
    montant_caisse: string;
    mode_caisse: string;
  }
> = {
  SCOLAIRE: {
    nom_ecole: 'Lycée International Horizon',
    badge_region: 'FR · EUR',
    indicateur_1_libelle: 'Élèves actifs',
    indicateur_1_valeur: '540',
    indicateur_2_libelle: 'Recouvrement',
    indicateur_2_valeur: '94 %',
    titre_action: 'Appel numérique · Terminale S',
    description_action: '28/29 présents · Synchronisation PWA prête',
    fond_accent: 'bg-blue-600',
    lignes: [
      { nom: 'Moreau Camille', sous_titre: 'Terminale S · 16,8/20', badge: 'À jour' },
      { nom: 'Diallo Ibrahim', sous_titre: 'Seconde A · 14,9/20', badge: 'Partiel' },
    ],
    montant_caisse: '1 250,00 €',
    mode_caisse: 'Stripe / SEPA · Reçu QR #8492',
  },
  PRO: {
    nom_ecole: 'Institut Pro-Tech Global',
    badge_region: 'CA · CAD',
    indicateur_1_libelle: 'Stagiaires',
    indicateur_1_valeur: '215',
    indicateur_2_libelle: 'Placement stage',
    indicateur_2_valeur: '92 %',
    titre_action: 'Atelier Énergie Solaire & Réseaux',
    description_action: 'Compétences validées : 18 / 20 apprenants',
    fond_accent: 'bg-amber-600',
    lignes: [
      { nom: 'Ndiaye Fatou', sous_titre: 'Filière Solaire · 88/100', badge: 'Certifiable' },
      { nom: 'Bélanger Thomas', sous_titre: 'Réseau Fibre · 84/100', badge: 'En stage' },
    ],
    montant_caisse: '980,00 $ CA',
    mode_caisse: 'Carte Visa / Interac · Reçu #3104',
  },
  UNIVERSITE: {
    nom_ecole: 'Polytechnique & LMD Global',
    badge_region: 'SN · XOF',
    indicateur_1_libelle: 'Étudiants LMD',
    indicateur_1_valeur: '1 420',
    indicateur_2_libelle: 'Crédits ECTS',
    indicateur_2_valeur: '95 %',
    titre_action: 'Jury Licence 3 Génie Logiciel',
    description_action: '60 ECTS validés · Relevé QR disponible',
    fond_accent: 'bg-violet-600',
    lignes: [
      { nom: 'Sow Aminata', sous_titre: 'L3 Info · GPA 3,78', badge: '60 ECTS' },
      { nom: 'Jean-François Léa', sous_titre: 'M1 Finance · GPA 3,52', badge: 'Admis' },
    ],
    montant_caisse: '245 000 FCFA',
    mode_caisse: 'Wave / Virement · Reçu #9021',
  },
};

export const PageAccueil: React.FC = () => {
  const {
    configuration_plateforme,
    etablissements,
    etablissements_accessibles,
    utilisateur_actif,
    etablissement_actif,
    est_authentifie,
    definir_mode_affichage,
    deconnecter,
    theme,
    basculer_theme,
    langue_active,
    definir_langue_active,
    definir_ecran_connexion_ouvert,
    definir_modale_nouvel_etablissement_ouverte,
  } = utiliserErp();

  const textes = DICTIONNAIRE_ACCUEIL[langue_active];
  const peut_entrer_espace =
    est_authentifie &&
    (utilisateur_actif.est_super_admin_plateforme || etablissements_accessibles.length > 0);

  const [mode_apercu, definir_mode_apercu] = useState<TypeEtablissement>('SCOLAIRE');
  const [onglet_apercu, definir_onglet_apercu] = useState<'accueil' | 'appel' | 'finances'>(
    'accueil'
  );
  const [contact_ouvert, definir_contact_ouvert] = useState(false);
  const [contact_en_cours, definir_contact_en_cours] = useState(false);
  const [contact_succes, definir_contact_succes] = useState(false);
  const [contact_erreur, definir_contact_erreur] = useState(false);
  const [contact_formulaire, definir_contact_formulaire] = useState({
    nom: '',
    courriel: '',
    sujet: '',
    message: '',
  });
  const apercu_actif = DONNEES_APERCU_MOBILE[mode_apercu];
  const ouvrir_contact = () => {
    definir_contact_formulaire({ nom: '', courriel: '', sujet: '', message: '' });
    definir_contact_succes(false);
    definir_contact_erreur(false);
    definir_contact_ouvert(true);
  };
  const envoyer_contact = async (evenement: React.FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    definir_contact_en_cours(true);
    definir_contact_erreur(false);
    try {
      await envoyerMessageContactApi(contact_formulaire);
      definir_contact_succes(true);
      definir_contact_formulaire({ nom: '', courriel: '', sujet: '', message: '' });
    } catch {
      definir_contact_erreur(true);
    } finally {
      definir_contact_en_cours(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      {/* Barre de navigation publique */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <LogoPlateforme configuration={configuration_plateforme} taille="moyen" />
            <div>
              <span className="font-display font-bold text-base tracking-tight">
                {configuration_plateforme.nom_plateforme}
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-500 dark:text-slate-400">
                {configuration_plateforme.accroche_courte}
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-3 text-[11px] lg:text-xs font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#institutions"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {textes.nav_modes}
            </a>
            <a
              href="#fonctionnalites"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {textes.nav_fonctionnalites}
            </a>
            {DEMO_PUBLIQUE_ACTIVE ? (
              <a
                href="#demo"
                className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                {textes.nav_demo}
              </a>
            ) : (
              <button
                type="button"
                onClick={ouvrir_contact}
                className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                {textes.nav_contact}
              </button>
            )}
            <a
              href="#tarifs"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {textes.nav_tarifs}
            </a>
          </nav>

          <div className="flex w-full min-w-0 max-w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:gap-2">
            <select
              aria-label="Langue"
              value={langue_active}
              onChange={(e) => definir_langue_active(e.target.value as LangueSupportee)}
              className="px-2 py-1.5 text-[11px] font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              {OPTIONS_LANGUES.map((langue) => (
                <option key={langue.code} value={langue.code}>
                  {langue.code_court}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={basculer_theme}
              aria-label={theme === 'sombre' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'sombre' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {est_authentifie ? (
              <>
                {peut_entrer_espace ? (
                  <Bouton
                    variante="principal"
                    taille="sm"
                    onClick={() => definir_mode_affichage('espace_travail')}
                  >
                    <span className="whitespace-nowrap">
                      {textes.btn_mon_espace}
                      <span className="hidden md:inline">
                        {' '}
                        (
                        {utilisateur_actif.est_super_admin_plateforme
                          ? 'Console SaaS'
                          : etablissement_actif.nom_court}
                        )
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Bouton>
                ) : (
                  configuration_plateforme.autoriser_creation_autonome && (
                    <Bouton
                      variante="principal"
                      taille="sm"
                      onClick={() => definir_modale_nouvel_etablissement_ouverte(true)}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="whitespace-nowrap">{textes.btn_creer_etablissement}</span>
                    </Bouton>
                  )
                )}
                <div className="hidden md:block">
                  <Bouton
                    variante="secondaire"
                    taille="sm"
                    onClick={() => definir_ecran_connexion_ouvert(true)}
                    className="whitespace-nowrap"
                  >
                    <span>{textes.btn_changer_compte}</span>
                  </Bouton>
                </div>
                <Bouton
                  variante="fantome"
                  taille="sm"
                  onClick={deconnecter}
                  title={`${textes.btn_deconnexion} (${utilisateur_actif.nom_complet})`}
                  aria-label={`${textes.btn_deconnexion} (${utilisateur_actif.nom_complet})`}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30 whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">{textes.btn_deconnexion}</span>
                </Bouton>
              </>
            ) : (
              <>
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  onClick={() => definir_ecran_connexion_ouvert(true)}
                  className="whitespace-nowrap"
                >
                  {textes.btn_connexion}
                </Bouton>
                {configuration_plateforme.autoriser_creation_autonome && (
                  <Bouton
                    variante="principal"
                    taille="sm"
                    onClick={() => definir_modale_nouvel_etablissement_ouverte(true)}
                    className="whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{textes.btn_creer_etablissement}</span>
                    <span className="sm:hidden">Créer</span>
                  </Bouton>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Section d'accroche */}
        <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>{textes.hero_badge}</span>
                </div>

                <h1 className="mt-4 text-3xl sm:text-5xl font-display font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.12] [text-wrap:balance]">
                  {textes.hero_titre}
                </h1>

                <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  {textes.hero_sous_titre}
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Bouton
                    variante="principal"
                    taille="lg"
                    onClick={() => definir_modale_nouvel_etablissement_ouverte(true)}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>{textes.hero_cta_principal}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Bouton>

                  <Bouton
                    variante="secondaire"
                    taille="lg"
                    onClick={() => definir_ecran_connexion_ouvert(true)}
                  >
                    <Lock className="w-4 h-4" />
                    <span>{textes.hero_cta_connexion}</span>
                  </Bouton>

                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {etablissements.length}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {textes.stat_etablissements}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {textes.stat_pays}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {textes.stat_pays_detail}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {textes.stat_roles}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {textes.stat_roles_detail}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {TOUTES_LES_DEVISES.length} devises
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">{textes.stat_pwa}</div>
                  </div>
                </div>
              </div>

              {/* Aperçu Mobile Interactif */}
              <div className="lg:col-span-5 flex flex-col items-center lg:items-end">
                <div className="w-full max-w-[336px]">
                  <div className="flex items-center justify-between mb-2.5 px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Aperçu Mobile PWA en direct</span>
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                      Hors-ligne prêt
                    </span>
                  </div>

                  {/* Châssis Smartphone */}
                  <div className="rounded-[2.25rem] border-[6px] border-slate-900 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 shadow-2xl overflow-hidden">
                    <div className="bg-white dark:bg-slate-900 px-5 pt-2.5 pb-1.5 flex items-center justify-between text-[10px] font-mono text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">09:41</span>
                      <div className="w-16 h-3.5 rounded-full bg-slate-900 dark:bg-slate-800" />
                      <div className="flex items-center gap-1.5">
                        <Wifi className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>100%</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <LogoPlateforme configuration={configuration_plateforme} taille="petit" />
                        <div className="min-w-0">
                          <div className="text-xs font-display font-bold text-slate-900 dark:text-slate-100 truncate">
                            {apercu_actif.nom_ecole}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {configuration_plateforme.nom_plateforme} · {apercu_actif.badge_region}
                          </div>
                        </div>
                      </div>
                      <BadgeTypeEtablissement type={mode_apercu} compact />
                    </div>

                    {/* Sélecteur interactif des 3 modes */}
                    <div className="px-3 pt-2.5 pb-1.5 bg-slate-50 dark:bg-slate-950">
                      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800/80 text-[10px] font-semibold">
                        {(['SCOLAIRE', 'PRO', 'UNIVERSITE'] as TypeEtablissement[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => definir_mode_apercu(mode)}
                            className={`py-1 rounded-md transition-colors cursor-pointer ${
                              mode_apercu === mode
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            {mode === 'UNIVERSITE' ? 'UNIV.' : mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Corps de l'écran mobile */}
                    <div className="px-3 py-2.5 space-y-2.5 min-h-[268px] bg-slate-50 dark:bg-slate-950">
                      {onglet_apercu === 'accueil' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {apercu_actif.indicateur_1_libelle}
                              </div>
                              <div className="text-base font-display font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                                {apercu_actif.indicateur_1_valeur}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {apercu_actif.indicateur_2_libelle}
                              </div>
                              <div className="text-base font-display font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                                {apercu_actif.indicateur_2_valeur}
                              </div>
                            </div>
                          </div>

                          <div className={`p-3 rounded-xl text-white ${apercu_actif.fond_accent}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold">
                                {apercu_actif.titre_action}
                              </span>
                              <QrCode className="w-3.5 h-3.5 opacity-90 shrink-0" />
                            </div>
                            <p className="text-[10px] text-white/85 mt-1">
                              {apercu_actif.description_action}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                            {apercu_actif.lignes.map((ligne) => (
                              <div
                                key={ligne.nom}
                                className="px-3 py-2 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {ligne.nom}
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    {ligne.sous_titre}
                                  </div>
                                </div>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                                  {ligne.badge}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {onglet_apercu === 'appel' && (
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                                Appel rapide hors-ligne
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Synchro auto dès retour réseau
                              </div>
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          </div>
                          {apercu_actif.lignes.map((ligne, indice) => (
                            <div
                              key={ligne.nom}
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {ligne.nom}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {ligne.sous_titre}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                  indice === 0
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                }`}
                              >
                                {indice === 0 ? 'Présent' : 'Retard'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {onglet_apercu === 'finances' && (
                        <div className="space-y-2">
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              Dernier encaissement vérifié
                            </div>
                            <div className="text-lg font-display font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                              {apercu_actif.montant_caisse}
                            </div>
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                              {apercu_actif.mode_caisse}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                            <span className="text-slate-600 dark:text-slate-300">
                              Reçu infalsifiable QR
                            </span>
                            <QrCode className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Barre de navigation mobile basse */}
                    <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3 py-2 grid grid-cols-4 gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => definir_onglet_apercu('accueil')}
                        className={`flex flex-col items-center gap-0.5 py-1 rounded-lg cursor-pointer ${
                          onglet_apercu === 'accueil'
                            ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        <Home className="w-3.5 h-3.5" />
                        <span>Accueil</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => definir_onglet_apercu('appel')}
                        className={`flex flex-col items-center gap-0.5 py-1 rounded-lg cursor-pointer ${
                          onglet_apercu === 'appel'
                            ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Appel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => definir_onglet_apercu('finances')}
                        className={`flex flex-col items-center gap-0.5 py-1 rounded-lg cursor-pointer ${
                          onglet_apercu === 'finances'
                            ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Caisse</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => definir_modale_nouvel_etablissement_ouverte(true)}
                        className="flex flex-col items-center gap-0.5 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Créer</span>
                      </button>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-center lg:text-right text-[11px] text-slate-500 dark:text-slate-400">
                  {textes.apercu_illustratif}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Modes d'institutions */}
        <section id="institutions" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
                {textes.section_modes_titre}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {textes.section_modes_sous_titre}
              </p>
            </div>
            <Bouton
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_nouvel_etablissement_ouverte(true)}
            >
              <Plus className="w-4 h-4" />
              <span>Configurer un autre établissement</span>
            </Bouton>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <BadgeTypeEtablissement type="PRO" />
                  <span className="font-mono text-xs text-slate-400">Sessions 3–6 mois</span>
                </div>
                <h3 className="mt-4 text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                  École Professionnelle & Centre Technique
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Gestion des apprenants/stagiaires, filières métiers, modules pratiques et
                  théoriques, encaissement par tranches, stages en entreprise et certificats QR.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Notation sur 100 · Certificats & attestations de stage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Suivi des partenaires et tuteurs d’entreprise</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  className="w-full"
                  onClick={() => definir_ecran_connexion_ouvert(true)}
                >
                  <span>{textes.btn_connexion}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Bouton>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <BadgeTypeEtablissement type="SCOLAIRE" />
                  <span className="font-mono text-xs text-slate-400">Trimestres & Cycles</span>
                </div>
                <h3 className="mt-4 text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                  Établissement Scolaire (K-12 · Primaire à Terminale)
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Classes et coefficients, bulletins périodiques, protection des mineurs (tuteurs
                  autorisés), portail parents multi-enfants, cantine, transport et infirmerie.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Barèmes /10, /20 ou /100 · Équivalences internationales</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Cantine, transport scolaire, bibliothèque & discipline</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  className="w-full"
                  onClick={() => definir_ecran_connexion_ouvert(true)}
                >
                  <span>{textes.btn_connexion}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Bouton>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <BadgeTypeEtablissement type="UNIVERSITE" />
                  <span className="font-mono text-xs text-slate-400">Système LMD / ECTS</span>
                </div>
                <h3 className="mt-4 text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                  Université & Institut Supérieur
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Facultés, Unités d’Enseignement et crédits ECTS, facturation au prorata des
                  crédits, GPA 4.0, mobilité internationale (visas), soutenances et relevés
                  officiels.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    <span>Conversion automatique GPA 4.0 & mentions LMD</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    <span>Jurys de mémoires, thèses & réseau Alumni</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  className="w-full"
                  onClick={() => definir_ecran_connexion_ouvert(true)}
                >
                  <span>{textes.btn_connexion}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Bouton>
              </div>
            </div>
          </div>
        </section>

        {/* Fonctionnalités clés */}
        <section
          id="fonctionnalites"
          className="border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 py-14"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
              {textes.section_fonctionnalites_titre}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {textes.section_fonctionnalites_sous_titre}
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icone: Layers,
                  titre: 'Isolation stricte & Auto-création SaaS',
                  description:
                    'N’importe quel fondateur ou directeur dans le monde peut créer son établissement en 6 étapes avec choix libre du pays, du fuseau et de la devise.',
                },
                {
                  icone: Wallet,
                  titre: `Paiements mondiaux & ${TOUTES_LES_DEVISES.length} devises`,
                  description:
                    'Carte Stripe/Visa, virements SEPA/SWIFT, Mobile Money (Orange, Wave, M-Pesa, MonCash) et conversion instantanée en USD, EUR, CAD, GBP, XOF, CHF…',
                },
                {
                  icone: Laptop,
                  titre: 'Campus Numérique & LMS hybride',
                  description:
                    'Supports PDF, replays vidéo, liens de classe virtuelle (Zoom/Meet/Jitsi) et remise de devoirs en ligne.',
                },
                {
                  icone: QrCode,
                  titre: 'Documents officiels vérifiables par QR',
                  description:
                    'Bulletins, relevés ECTS/GPA, certificats et diplômes avec sceau, signature, blocage configurable sur impayés et vérification publique.',
                },
                {
                  icone: WifiOff,
                  titre: 'Résilience hors-ligne (PWA)',
                  description:
                    'Saisie des présences et des notes même en cas de coupure internet avec file locale et synchronisation automatique.',
                },
                {
                  icone: Users,
                  titre: 'Portails dédiés & RBAC 12 rôles',
                  description:
                    'Espaces mobiles dédiés pour Parents, Apprenants/Étudiants, Enseignants et équipes de direction.',
                },
              ].map((fonctionnalite) => {
                const Icone = fonctionnalite.icone;
                return (
                  <div
                    key={fonctionnalite.titre}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 p-5"
                  >
                    <Icone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="mt-3 text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                      {fonctionnalite.titre}
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {fonctionnalite.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {DEMO_PUBLIQUE_ACTIVE && (
          <section id="demo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100">
                    {textes.section_demo_titre}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {textes.section_demo_sous_titre}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={ouvrir_contact}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                >
                  {textes.demander_demo}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Tarifs SaaS */}
        <section id="tarifs" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="mb-8">
            <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
              {textes.section_tarifs_titre}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {textes.section_tarifs_sous_titre} Régions préconfigurées :{' '}
              {TOUS_LES_PAYS.filter((c) => c !== 'INTL')
                .map((c) => PROFILS_PAYS[c].nom)
                .join(', ')}{' '}
              + Autre pays (Monde).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {CATALOGUE_FORFAITS_SAAS.map((forfait) => (
              <div
                key={forfait.nom}
                className={`rounded-xl p-6 flex flex-col justify-between bg-white dark:bg-slate-900 ${
                  forfait.recommande
                    ? 'border-2 border-indigo-600 dark:border-indigo-400'
                    : 'border border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-display font-bold">{forfait.nom}</span>
                    {forfait.badge && (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          forfait.recommande
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                        }`}
                      >
                        {forfait.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-display font-extrabold font-mono tabular-nums">
                      {forfait.libelle_prix}
                    </span>
                    <span className="text-xs text-slate-500">/ mois</span>
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {forfait.prix_mensuel_usd === 0
                      ? 'Accès permanent gratuit · 30 apprenants'
                      : 'Essai gratuit 14 jours ou activation immédiate'}
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {forfait.description}
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {forfait.inclus.map((element) => (
                      <li key={element} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{element}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Bouton
                  variante={forfait.recommande ? 'principal' : 'secondaire'}
                  taille="sm"
                  className="w-full mt-6"
                  onClick={() => definir_modale_nouvel_etablissement_ouverte(true, forfait.nom)}
                >
                  <span>
                    {forfait.prix_mensuel_usd === 0
                      ? 'Démarrer gratuitement'
                      : `Choisir ${forfait.nom}`}
                  </span>
                </Bouton>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative bg-[#0B1120] text-slate-300 border-t border-slate-800">
        {/* Filet supérieur distinctif */}
        <div
          aria-hidden="true"
          className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-slate-800/90">
            {/* Colonne 1 : Identité & Mission (pilotée par le Super Admin) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-3">
                <LogoPlateforme configuration={configuration_plateforme} taille="moyen" />
                <div className="min-w-0">
                  <div className="font-display font-bold text-base text-white tracking-tight truncate">
                    {configuration_plateforme.nom_plateforme}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {configuration_plateforme.accroche_courte}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                {configuration_plateforme.resume_pied_page ||
                  'Infrastructure SaaS multi-établissements conçue pour les écoles professionnelles, établissements scolaires et universités LMD.'}
              </p>

              <div className="pt-1 space-y-1.5 text-xs text-slate-400">
                <div className="font-medium text-slate-200">
                  {configuration_plateforme.entite_legale}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{configuration_plateforme.adresse_siege}</span>
                </div>
              </div>
            </div>

            {/* Colonne 2 : Plateforme & Navigation */}
            <div className="lg:col-span-2 space-y-3.5">
              <h3 className="text-xs font-display font-semibold text-white tracking-wide">
                Plateforme
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <a href="#institutions" className="hover:text-white transition-colors inline-block">
                    3 Modes d’institutions
                  </a>
                </li>
                <li>
                  <a href="#fonctionnalites" className="hover:text-white transition-colors inline-block">
                    Modules &amp; QR Codes
                  </a>
                </li>
                {DEMO_PUBLIQUE_ACTIVE && (
                  <li>
                    <a href="#demo" className="hover:text-white transition-colors inline-block">
                      Démo interactive
                    </a>
                  </li>
                )}
                <li>
                  <a href="#tarifs" className="hover:text-white transition-colors inline-block">
                    Offres &amp; Tarifs SaaS
                  </a>
                </li>
                {configuration_plateforme.autoriser_creation_autonome && (
                  <li>
                    <button
                      type="button"
                      onClick={() => definir_modale_nouvel_etablissement_ouverte(true)}
                      className="text-indigo-300 hover:text-indigo-200 font-medium transition-colors cursor-pointer text-left"
                    >
                      Créer un établissement
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* Colonne 3 : Modèles d’institutions */}
            <div className="lg:col-span-3 space-y-3.5">
              <h3 className="text-xs font-display font-semibold text-white tracking-wide">
                Institutions
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <a href="#institutions" className="hover:text-white transition-colors">
                    École Professionnelle &amp; Technique
                  </a>
                </li>
                <li>
                  <a href="#institutions" className="hover:text-white transition-colors">
                    Établissement Scolaire (Primaire–Term.)
                  </a>
                </li>
                <li>
                  <a href="#institutions" className="hover:text-white transition-colors">
                    Université &amp; Institut LMD / ECTS
                  </a>
                </li>
              </ul>
            </div>

            {/* Colonne 4 : Support, Coordonnées & Couverture */}
            <div className="lg:col-span-3 space-y-3.5">
              <h3 className="text-xs font-display font-semibold text-white tracking-wide">
                Support &amp; Opérateur
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <a
                    href={`mailto:${configuration_plateforme.courriel_support}`}
                    className="inline-flex items-center gap-2 hover:text-white transition-colors break-all"
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{configuration_plateforme.courriel_support}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${configuration_plateforme.telephone_support.split('/')[0].replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="font-mono text-[11px]">
                      {configuration_plateforme.telephone_support}
                    </span>
                  </a>
                </li>
                {configuration_plateforme.site_web && (
                  <li>
                    <a
                      href={configuration_plateforme.site_web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 hover:text-white transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{configuration_plateforme.site_web}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                    </a>
                  </li>
                )}
                {configuration_plateforme.horaires_support && (
                  <li className="inline-flex items-start gap-2 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>{configuration_plateforme.horaires_support}</span>
                  </li>
                )}
              </ul>

              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 tabular-nums">
                {etablissements.length} établissements actifs · 15+ pays &amp; mode Monde ·{' '}
                {TOUTES_LES_DEVISES.length} devises · RGPD &amp; Audit
              </div>
            </div>
          </div>

          {/* Barre inférieure : Copyright + Bouton Haut de page */}
          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-slate-200">
                © {new Date().getFullYear()} {configuration_plateforme.nom_plateforme}
              </span>
              <span aria-hidden="true">·</span>
              <span>{configuration_plateforme.entite_legale}</span>
              <span aria-hidden="true">·</span>
              <span>Tous droits réservés</span>
            </div>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Revenir en haut de la page"
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-100 hover:text-white border border-slate-700 hover:border-indigo-500 text-xs font-medium transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              <span>{textes.haut_page}</span>
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
      {contact_ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
          onMouseDown={(evenement) => {
            if (evenement.target === evenement.currentTarget) definir_contact_ouvert(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-titre"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="contact-titre" className="text-xl font-display font-bold">
                  {textes.contact_titre}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {textes.contact_sous_titre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => definir_contact_ouvert(false)}
                aria-label={textes.contact_annuler}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </div>
            <form onSubmit={envoyer_contact} className="space-y-4">
              <label className="block text-sm font-medium">
                {textes.contact_nom}
                <input
                  required
                  maxLength={120}
                  autoComplete="name"
                  value={contact_formulaire.nom}
                  onChange={(evenement) =>
                    definir_contact_formulaire({ ...contact_formulaire, nom: evenement.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              <label className="block text-sm font-medium">
                {textes.contact_courriel}
                <input
                  required
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={contact_formulaire.courriel}
                  onChange={(evenement) =>
                    definir_contact_formulaire({
                      ...contact_formulaire,
                      courriel: evenement.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              <label className="block text-sm font-medium">
                {textes.contact_sujet}
                <input
                  required
                  maxLength={160}
                  value={contact_formulaire.sujet}
                  onChange={(evenement) =>
                    definir_contact_formulaire({
                      ...contact_formulaire,
                      sujet: evenement.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              <label className="block text-sm font-medium">
                {textes.contact_message}
                <textarea
                  required
                  maxLength={5000}
                  rows={5}
                  value={contact_formulaire.message}
                  onChange={(evenement) =>
                    definir_contact_formulaire({
                      ...contact_formulaire,
                      message: evenement.target.value,
                    })
                  }
                  className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              {contact_succes && (
                <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
                  {textes.contact_envoye}
                </p>
              )}
              {contact_erreur && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {textes.contact_erreur}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => definir_contact_ouvert(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium dark:border-slate-700"
                >
                  {textes.contact_annuler}
                </button>
                <button
                  type="submit"
                  disabled={contact_en_cours}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {contact_en_cours ? '…' : textes.contact_envoyer}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
