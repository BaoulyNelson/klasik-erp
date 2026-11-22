import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Globe,
  KeyRound,
  Lock,
  Mail,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  LangueSupportee,
  OPTIONS_LANGUES,
} from '../../configuration/internationalisation';
import { ROLES } from '../../configuration/roles_permissions';
import { utiliserErp } from '../../contexte/ContexteErp';
import { BadgeTypeEtablissement } from '../interface/BadgeTypeEtablissement';
import { Bouton } from '../interface/Bouton';
import { ChampMotDePasse } from '../interface/ChampMotDePasse';
import { JaugeForceMotDePasse } from '../interface/JaugeForceMotDePasse';
import { LogoPlateforme } from '../interface/LogoPlateforme';

const TEXTES_CONNEXION: Record<
  LangueSupportee,
  {
    creer_etab: string;
    retour_accueil: string;
    retour_espace: string;
    badge_rbac: string;
    titre_connexion: string;
    sous_titre_connexion: string;
    label_identifiant: string;
    label_mdp: string;
    mdp_oublie: string;
    se_connecter: string;
    ou: string;
    google_chargement: string;
    google_continuer: string;
    mdp_demo: string;
    id_super: string;
    nouveau_sur: string;
    desc_nouveau: string;
    titre_roles: string;
    sous_titre_roles: string;
    ouvrir_super: string;
  }
> = {
  fr: {
    creer_etab: 'Créer mon établissement',
    retour_accueil: 'Retour à l’accueil',
    retour_espace: 'Revenir à l’espace de travail',
    badge_rbac: 'Accès sécurisé RBAC',
    titre_connexion: 'Connexion à votre espace',
    sous_titre_connexion:
      'Connectez-vous par courriel, identifiant (« superuser ») ou téléphone international.',
    label_identifiant: 'Courriel, téléphone ou identifiant',
    label_mdp: 'Mot de passe',
    mdp_oublie: 'Mot de passe oublié ?',
    se_connecter: 'Se connecter',
    ou: 'ou',
    google_chargement: 'Connexion avec Google...',
    google_continuer: 'Continuer avec Google',
    mdp_demo: 'Accès démo réservé au développement.',
    id_super: 'Identifiant rapide super-utilisateur :',
    nouveau_sur: 'Nouveau sur',
    desc_nouveau:
      'Déployez immédiatement votre propre école, centre de formation ou université en mode SaaS multi-établissement avec votre compte administrateur.',
    titre_roles: 'Accès rapide par rôle & Super-Administrateur',
    sous_titre_roles:
      'Cliquez sur un établissement rattaché ou sur la console Super-Admin pour ouvrir la session correspondante.',
    ouvrir_super: 'Ouvrir Console Super-Admin',
  },
  en: {
    creer_etab: 'Create my institution',
    retour_accueil: 'Back to home',
    retour_espace: 'Return to workspace',
    badge_rbac: 'RBAC Secure Access',
    titre_connexion: 'Sign in to your workspace',
    sous_titre_connexion:
      'Sign in using your email, username (“superuser”), or international phone number.',
    label_identifiant: 'Email, phone, or username',
    label_mdp: 'Password',
    mdp_oublie: 'Forgot password?',
    se_connecter: 'Sign in',
    ou: 'or',
    google_chargement: 'Signing in with Google...',
    google_continuer: 'Continue with Google',
    mdp_demo: 'Demo access is for development only.',
    id_super: 'Quick superuser handle:',
    nouveau_sur: 'New to',
    desc_nouveau:
      'Deploy your own school, training center, or university instantly in multi-tenant SaaS mode with your administrator account.',
    titre_roles: 'Quick Role Access & Super-Administrator',
    sous_titre_roles:
      'Click any attached institution or the Super-Admin Console to open that session.',
    ouvrir_super: 'Open Super-Admin Console',
  },
  es: {
    creer_etab: 'Crear mi institución',
    retour_accueil: 'Volver al inicio',
    retour_espace: 'Volver al espacio de trabajo',
    badge_rbac: 'Acceso seguro RBAC',
    titre_connexion: 'Iniciar sesión',
    sous_titre_connexion:
      'Acceda con su correo, usuario (« superuser ») o teléfono internacional.',
    label_identifiant: 'Correo, teléfono o usuario',
    label_mdp: 'Contraseña',
    mdp_oublie: '¿Olvidaste tu contraseña?',
    se_connecter: 'Entrar',
    ou: 'o',
    google_chargement: 'Conectando con Google...',
    google_continuer: 'Continuar con Google',
    mdp_demo: 'Acceso demo solo para desarrollo.',
    id_super: 'Acceso rápido superusuario:',
    nouveau_sur: '¿Nuevo en',
    desc_nouveau:
      'Implemente su propia escuela, centro profesional o universidad al instante en modo SaaS multisede.',
    titre_roles: 'Acceso rápido por rol y Super-Administrador',
    sous_titre_roles:
      'Haga clic en una institución asociada o en la consola Super-Admin para iniciar sesión.',
    ouvrir_super: 'Abrir Consola Super-Admin',
  },
  ht: {
    creer_etab: 'Kreye etablisman mwen',
    retour_accueil: 'Retounen lakay',
    retour_espace: 'Retounen nan espas travay la',
    badge_rbac: 'Aksè sekirize RBAC',
    titre_connexion: 'Koneksyon nan espas ou',
    sous_titre_connexion:
      'Konekte ak imèl, idantifyan (« superuser ») oswa nimewo telefòn entènasyonal.',
    label_identifiant: 'Imèl, telefòn oswa idantifyan',
    label_mdp: 'Modpas',
    mdp_oublie: 'Ou bliye modpas ou?',
    se_connecter: 'Konekte',
    ou: 'oswa',
    google_chargement: 'Koneksyon ak Google...',
    google_continuer: 'Kontinye ak Google',
    mdp_demo: 'Aksè demo a rezève pou devlopman.',
    id_super: 'Idantifyan rapid sipè-itilizatè:',
    nouveau_sur: 'Nouvo sou',
    desc_nouveau:
      'Deplwaye lekòl ou, sant fòmasyon oswa inivèsite ou touswit nan mòd SaaS milti-etablisman.',
    titre_roles: 'Aksè rapid pa wòl ak Sipè-Administratè',
    sous_titre_roles:
      'Klike sou yon etablisman oswa sou konsòl Sipè-Admin pou louvri sesyon an.',
    ouvrir_super: 'Louvri Konsòl Sipè-Admin',
  },
};

export const EcranConnexion: React.FC = () => {
  const {
    mode_affichage,
    ecran_connexion_ouvert,
    definir_ecran_connexion_ouvert,
    definir_modale_nouvel_etablissement_ouverte,
    langue_active,
    definir_langue_active,
    connecter_utilisateur,
    connecter_avec_google,
    authentifier_par_identifiants,
    authentifier_par_identifiants_api,
    demander_reinitialisation_mot_de_passe,
    confirmer_reinitialisation_mot_de_passe,
    etablissements,
    utilisateurs,
    utilisateur_actif,
    ajouter_toast,
    configuration_plateforme,
  } = utiliserErp();

  const txt = TEXTES_CONNEXION[langue_active] ?? TEXTES_CONNEXION.fr;

  const [courriel_saisi, definir_courriel_saisi] = useState('');
  const [mot_de_passe_saisi, definir_mot_de_passe_saisi] = useState('');
  const [message_erreur, definir_message_erreur] = useState<string | null>(null);
  const [chargement_google, definir_chargement_google] = useState(false);

  // Parcours Mot de passe oublié (OTP)
  const [mode_reinitialisation, definir_mode_reinitialisation] = useState<
    'aucun' | 'demande' | 'confirmation'
  >('aucun');
  const [identifiant_reinit, definir_identifiant_reinit] = useState('');
  const [code_otp_reinit, definir_code_otp_reinit] = useState('');
  const [nouveau_mot_de_passe_reinit, definir_nouveau_mot_de_passe_reinit] = useState('');
  const [confirmation_mot_de_passe_reinit, definir_confirmation_mot_de_passe_reinit] =
    useState('');
  const [cible_masquee_reinit, definir_cible_masquee_reinit] = useState<string | null>(null);
  const [otp_demo_reinit, definir_otp_demo_reinit] = useState<string | null>(null);
  const [erreur_reinit, definir_erreur_reinit] = useState<string | null>(null);
  const source_api = import.meta.env.PROD || import.meta.env.VITE_SOURCE_DONNEES === 'api';

  if (!ecran_connexion_ouvert) return null;

  const super_utilisateur =
    utilisateurs.find((utilisateur) => utilisateur.est_super_admin_plateforme) ?? utilisateurs[0];
  const autres_utilisateurs = utilisateurs.filter(
    (utilisateur) => utilisateur.id !== super_utilisateur?.id
  );

  const gerer_connexion_manuelle = async (evenement: React.FormEvent) => {
    evenement.preventDefault();
    const resultat = source_api
      ? await authentifier_par_identifiants_api(courriel_saisi, mot_de_passe_saisi)
      : authentifier_par_identifiants(courriel_saisi, mot_de_passe_saisi);
    if (!resultat.ok) {
      definir_message_erreur(resultat.erreur ?? 'Identifiants incorrects.');
      return;
    }
    definir_message_erreur(null);
  };

  const gerer_connexion_google = async () => {
    definir_message_erreur(null);
    definir_chargement_google(true);
    try {
      const resultat = await connecter_avec_google();
      if (!resultat.ok) {
        definir_message_erreur(resultat.erreur ?? 'Connexion Google impossible.');
      }
    } finally {
      definir_chargement_google(false);
    }
  };

  const gerer_demande_reinitialisation = async (evenement: React.FormEvent) => {
    evenement.preventDefault();
    const resultat = await demander_reinitialisation_mot_de_passe(identifiant_reinit);
    if (!resultat.ok) {
      definir_erreur_reinit(resultat.erreur ?? 'Impossible d’envoyer le code.');
      return;
    }
    definir_erreur_reinit(null);
    definir_cible_masquee_reinit(resultat.cible_masquee ?? null);
    definir_otp_demo_reinit(resultat.otp_demo ?? null);
    definir_mode_reinitialisation('confirmation');
  };

  const gerer_confirmation_reinitialisation = async (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (nouveau_mot_de_passe_reinit !== confirmation_mot_de_passe_reinit) {
      definir_erreur_reinit('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    const resultat = await confirmer_reinitialisation_mot_de_passe(
      identifiant_reinit,
      code_otp_reinit,
      nouveau_mot_de_passe_reinit
    );
    if (!resultat.ok) {
      definir_erreur_reinit(resultat.erreur ?? 'Réinitialisation impossible.');
      return;
    }
    definir_courriel_saisi(identifiant_reinit);
    definir_mot_de_passe_saisi(nouveau_mot_de_passe_reinit);
    definir_mode_reinitialisation('aucun');
    definir_code_otp_reinit('');
    definir_nouveau_mot_de_passe_reinit('');
    definir_confirmation_mot_de_passe_reinit('');
    definir_otp_demo_reinit(null);
    definir_cible_masquee_reinit(null);
    definir_erreur_reinit(null);
    definir_message_erreur(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <LogoPlateforme configuration={configuration_plateforme} taille="moyen" />
            <div>
              <div className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">
                {configuration_plateforme.nom_plateforme}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {configuration_plateforme.accroche_courte}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Language"
                value={langue_active}
                onChange={(e) => definir_langue_active(e.target.value as LangueSupportee)}
                className="text-xs font-medium bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {OPTIONS_LANGUES.map((opt) => (
                  <option
                    key={opt.code}
                    value={opt.code}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    {opt.code_court} · {opt.libelle}
                  </option>
                ))}
              </select>
            </div>
            {configuration_plateforme.autoriser_creation_autonome && (
              <Bouton
                variante="principal"
                taille="sm"
                onClick={() => {
                  definir_ecran_connexion_ouvert(false);
                  definir_modale_nouvel_etablissement_ouverte(true);
                }}
              >
                <Plus className="w-4 h-4" />
                <span>{txt.creer_etab}</span>
              </Bouton>
            )}
            <Bouton
              variante="secondaire"
              taille="sm"
              onClick={() => {
                definir_ecran_connexion_ouvert(false);
                if (mode_affichage === 'espace_travail') {
                  ajouter_toast({
                    titre: 'Session maintenue',
                    description: `Vous êtes connecté en tant que ${utilisateur_actif.nom_complet}.`,
                    variante: 'info',
                  });
                }
              }}
            >
              <X className="w-4 h-4" />
              <span>
                {mode_affichage === 'accueil' ? txt.retour_accueil : txt.retour_espace}
              </span>
            </Bouton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulaire de connexion classique + création SaaS */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              {mode_reinitialisation === 'aucun' ? (
                <>
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{txt.badge_rbac}</span>
                  </div>
                  <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100">
                    {txt.titre_connexion}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {txt.sous_titre_connexion}
                  </p>

                  <form onSubmit={gerer_connexion_manuelle} className="mt-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {txt.label_identifiant}
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={courriel_saisi}
                          onChange={(evenement) => definir_courriel_saisi(evenement.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                          placeholder="superadmin@klasik-erp.org"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {txt.label_mdp}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            definir_identifiant_reinit(courriel_saisi);
                            definir_erreur_reinit(null);
                            definir_mode_reinitialisation('demande');
                          }}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                        >
                          {txt.mdp_oublie}
                        </button>
                      </div>
                      <ChampMotDePasse
                        icone_gauche={<Lock className="w-4 h-4" />}
                        value={mot_de_passe_saisi}
                        onChange={(evenement) =>
                          definir_mot_de_passe_saisi(evenement.target.value)
                        }
                        className="w-full py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      />
                    </div>

                    {message_erreur && (
                      <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-2.5">
                        {message_erreur}
                      </p>
                    )}

                    <Bouton type="submit" variante="principal" className="w-full">
                      <span>{txt.se_connecter}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Bouton>
                  </form>

                  <div className="my-4 flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    <span>{txt.ou}</span>
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  </div>

                  <button
                    type="button"
                    disabled={chargement_google}
                    onClick={gerer_connexion_google}
                    className="w-full min-h-[40px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                    <span>
                      {chargement_google ? txt.google_chargement : txt.google_continuer}
                    </span>
                  </button>

                  <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{txt.mdp_demo}</span>
                      <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        DEV
                      </code>
                    </div>
                    <p>
                      {txt.id_super} <code className="font-mono">superuser</code>
                    </p>
                  </div>
                </>
              ) : mode_reinitialisation === 'demande' ? (
                <>
                  <button
                    type="button"
                    onClick={() => definir_mode_reinitialisation('aucun')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-3 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Retour à la connexion</span>
                  </button>
                  <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                    Réinitialiser votre mot de passe
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Saisissez votre courriel, téléphone ou identifiant pour recevoir un code à 6
                    chiffres.
                  </p>

                  <form onSubmit={gerer_demande_reinitialisation} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Courriel, téléphone ou identifiant *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={identifiant_reinit}
                          onChange={(evenement) =>
                            definir_identifiant_reinit(evenement.target.value)
                          }
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                          placeholder="nom@etablissement.org"
                        />
                      </div>
                    </div>

                    {erreur_reinit && (
                      <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-2.5">
                        {erreur_reinit}
                      </p>
                    )}

                    <Bouton type="submit" variante="principal" className="w-full">
                      <span>Envoyer le code de vérification</span>
                      <ArrowRight className="w-4 h-4" />
                    </Bouton>
                  </form>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => definir_mode_reinitialisation('demande')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-3 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Modifier l’identifiant</span>
                  </button>
                  <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                    Définir un nouveau mot de passe
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Code envoyé vers{' '}
                    <span className="font-mono font-semibold">{cible_masquee_reinit}</span> (valide
                    15 min).
                  </p>

                  {otp_demo_reinit && (
                    <div className="mt-3 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30 text-xs flex items-center justify-between gap-2">
                      <span className="text-indigo-800 dark:text-indigo-300">
                        Code OTP (aperçu local sans SMTP) :
                      </span>
                      <button
                        type="button"
                        onClick={() => definir_code_otp_reinit(otp_demo_reinit)}
                        className="font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 cursor-pointer"
                        title="Cliquer pour remplir automatiquement"
                      >
                        {otp_demo_reinit}
                      </button>
                    </div>
                  )}

                  <form onSubmit={gerer_confirmation_reinitialisation} className="mt-4 space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">
                        Code de vérification (6 chiffres) *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={code_otp_reinit}
                        onChange={(evenement) => definir_code_otp_reinit(evenement.target.value)}
                        placeholder="123456"
                        className="w-full px-3 py-2 text-sm font-mono tracking-widest rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Nouveau mot de passe *</label>
                      <ChampMotDePasse
                        required
                        icone_gauche={<Lock className="w-4 h-4" />}
                        value={nouveau_mot_de_passe_reinit}
                        onChange={(evenement) =>
                          definir_nouveau_mot_de_passe_reinit(evenement.target.value)
                        }
                        className="w-full py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                      <JaugeForceMotDePasse
                        mot_de_passe={nouveau_mot_de_passe_reinit}
                        sur_generation={(genere) => {
                          definir_nouveau_mot_de_passe_reinit(genere);
                          definir_confirmation_mot_de_passe_reinit(genere);
                        }}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Confirmer le mot de passe *
                      </label>
                      <ChampMotDePasse
                        required
                        icone_gauche={<Lock className="w-4 h-4" />}
                        value={confirmation_mot_de_passe_reinit}
                        onChange={(evenement) =>
                          definir_confirmation_mot_de_passe_reinit(evenement.target.value)
                        }
                        className="w-full py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>

                    {erreur_reinit && (
                      <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-2.5">
                        {erreur_reinit}
                      </p>
                    )}

                    <Bouton type="submit" variante="principal" className="w-full">
                      <span>Valider le nouveau mot de passe</span>
                    </Bouton>
                  </form>
                </>
              )}
            </div>

            {configuration_plateforme.autoriser_creation_autonome ? (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/50 dark:bg-indigo-950/30 p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                  <Building2 className="w-4 h-4" />
                  <span>
                    {txt.nouveau_sur} {configuration_plateforme.nom_plateforme} ?
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {txt.desc_nouveau}
                </p>
                <Bouton
                  variante="principal"
                  taille="sm"
                  className="w-full"
                  onClick={() => {
                    definir_ecran_connexion_ouvert(false);
                    definir_modale_nouvel_etablissement_ouverte(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>{txt.creer_etab}</span>
                </Bouton>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>{configuration_plateforme.entite_legale}</span>
                </div>
                <p>Ouverture de compte sur invitation de l’opérateur.</p>
                <p className="font-mono text-[11px] text-slate-500">
                  {configuration_plateforme.courriel_support} ·{' '}
                  {configuration_plateforme.telephone_support}
                </p>
              </div>
            )}
          </div>

          {/* Grille des comptes de test par rôle */}
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
                  {txt.titre_roles}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {txt.sous_titre_roles}
                </p>
              </div>
            </div>

            {super_utilisateur && (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/40 dark:bg-indigo-950/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {super_utilisateur.nom_complet} — Super-Administrateur Plateforme (Superuser)
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                    {super_utilisateur.courriel} · Accès global à tous les établissements (
                    {etablissements.length})
                  </div>
                </div>
                <Bouton
                  variante="principal"
                  taille="sm"
                  onClick={() => connecter_utilisateur(super_utilisateur.id)}
                >
                  <span>{txt.ouvrir_super}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Bouton>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {autres_utilisateurs.map((utilisateur) => (
                <div
                  key={utilisateur.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col justify-between gap-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {utilisateur.nom_complet}
                      </span>
                      {utilisateur.affiliations.length > 1 && (
                        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                          Multi-établissements ({utilisateur.affiliations.length})
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {utilisateur.courriel} · {utilisateur.telephone}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {utilisateur.affiliations.map((affiliation) => {
                      const etab = etablissements.find(
                        (element) => element.id === affiliation.id_etablissement
                      );
                      if (!etab) return null;
                      return (
                        <button
                          key={`${utilisateur.id}-${affiliation.id_etablissement}`}
                          type="button"
                          onClick={() => connecter_utilisateur(utilisateur.id, etab.id)}
                          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <BadgeTypeEtablissement type={etab.type} compact />
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                              {etab.nom_court}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                            {(ROLES[affiliation.id_role] ?? ROLES.DIRECTEUR).libelle_court} →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
