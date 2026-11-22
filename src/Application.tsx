import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Ban, Clock, CreditCard, ShieldAlert } from 'lucide-react';
import { PageAccueil } from './composants/accueil/PageAccueil';
import { Bouton } from './composants/interface/Bouton';
import { Carte } from './composants/interface/Carte';
import { ConteneurNotificationsToast } from './composants/interface/ConteneurNotificationsToast';
import { BarreLaterale } from './composants/mise_en_page/BarreLaterale';
import { BarreSuperieure } from './composants/mise_en_page/BarreSuperieure';
import { EcranConnexion } from './composants/mise_en_page/EcranConnexion';
import { ModaleChangementMotDePasseForce } from './composants/mise_en_page/ModaleChangementMotDePasseForce';
import { ModaleNouvelEtablissement } from './composants/mise_en_page/ModaleNouvelEtablissement';
import { NavigationMobileBasse } from './composants/mise_en_page/NavigationMobileBasse';
import { PaletteCommandes } from './composants/mise_en_page/PaletteCommandes';
import { resoudre_statut_abonnement_saas } from './configuration/forfaits_saas';
import { DICTIONNAIRE_I18N } from './configuration/internationalisation';
import { PERMISSIONS_PAR_ROUTE } from './configuration/roles_permissions';
import { FournisseurErp, utiliserErp } from './contexte/ContexteErp';
import { VueActualites } from './modules/actualites/VueActualites';
import { VueAdmissions } from './modules/admissions/VueAdmissions';
import { VueBadges } from './modules/badges/VueBadges';
import { VueBibliothequeMateriels } from './modules/bibliotheque_materiels/VueBibliothequeMateriels';
import { VueCampusNumerique } from './modules/campus_numerique/VueCampusNumerique';
import { VueCommunication } from './modules/communication/VueCommunication';
import { VueComptes } from './modules/comptes/VueComptes';
import { VueDocuments } from './modules/documents/VueDocuments';
import { VueEmploisDuTemps } from './modules/emplois_du_temps/VueEmploisDuTemps';
import { VueFinances } from './modules/finances/VueFinances';
import { VueImportations } from './modules/importations/VueImportations';
import { VueMessagerie } from './modules/messagerie/VueMessagerie';
import { VueParametres } from './modules/parametres/VueParametres';
import { VuePedagogie } from './modules/pedagogie/VuePedagogie';
import { VueAdministrationPlateforme } from './modules/plateforme/VueAdministrationPlateforme';
import { VuePortails } from './modules/portails/VuePortails';
import { VueProfil } from './modules/profil/VueProfil';
import { VueRapports } from './modules/rapports/VueRapports';
import { VueRessourcesHumaines } from './modules/ressources_humaines/VueRessourcesHumaines';
import { VueRgpd } from './modules/rgpd/VueRgpd';
import { VueServicesAnnexes } from './modules/services_annexes/VueServicesAnnexes';
import { VueAnnuaireApprenants } from './modules/socle/VueAnnuaireApprenants';
import { VueAuditRoles } from './modules/socle/VueAuditRoles';
import { VueMoteurTerminologie } from './modules/socle/VueMoteurTerminologie';
import { VueStructureTarifs } from './modules/socle/VueStructureTarifs';
import { VueTableauDeBord } from './modules/socle/VueTableauDeBord';
import { VueStages } from './modules/stages/VueStages';

interface EtatLimiteErreur {
  a_erreur: boolean;
  message_erreur: string;
}

class LimiteErreurErp extends Component<{ children: ReactNode }, EtatLimiteErreur> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { a_erreur: false, message_erreur: '' };
  }

  static getDerivedStateFromError(erreur: Error): EtatLimiteErreur {
    return { a_erreur: true, message_erreur: erreur?.message || 'Erreur inattendue' };
  }

  componentDidCatch(erreur: Error, infos: ErrorInfo) {
    console.error('Limite d’erreur Klasik ERP :', erreur, infos);
  }

  render() {
    if (this.state.a_erreur) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-md w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h1 className="text-base font-display font-bold">
                Récupération de session Klasik ERP
              </h1>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Une donnée locale obsolète a interrompu l’affichage ({this.state.message_erreur}).
              Réinitialisez le cache local pour restaurer immédiatement l’application.
            </p>
            <div className="flex flex-wrap gap-2">
              <Bouton
                variante="principal"
                taille="sm"
                onClick={() => {
                  localStorage.removeItem('klasik_etat_erp_v4');
                  localStorage.removeItem('klasik_session_v4');
                  window.location.reload();
                }}
              >
                Réinitialiser et recharger
              </Bouton>
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => this.setState({ a_erreur: false, message_erreur: '' })}
              >
                Réessayer
              </Bouton>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const CoquilleEspaceTravail: React.FC = () => {
  const {
    etablissement_actif,
    etablissements_accessibles,
    utilisateur_actif,
    langue_active,
    route_active,
    a_permission,
    definir_route_active,
    definir_modale_nouvel_etablissement_ouverte,
    simuler_role_etablissement,
    basculer_statut_etablissement,
    deconnecter,
  } = utiliserErp();

  const textes = DICTIONNAIRE_I18N[langue_active];
  const etablissement_suspendu = etablissement_actif.statut === 'SUSPENDU';
  const statut_abonnement_saas = resoudre_statut_abonnement_saas(etablissement_actif);
  const afficher_bandeau_essai_saas =
    !etablissement_suspendu &&
    a_permission('parametres:gerer') &&
    (statut_abonnement_saas === 'ESSAI_14J' ||
      statut_abonnement_saas === 'EN_ATTENTE_PAIEMENT');
  const permission_requise = PERMISSIONS_PAR_ROUTE[route_active];
  const acces_autorise =
    route_active === 'profil' || !permission_requise || a_permission(permission_requise);

  const rendre_contenu = () => {
    if (
      !utilisateur_actif.est_super_admin_plateforme &&
      etablissements_accessibles.length === 0
    ) {
      return (
        <Carte rembourrage="grand" className="max-w-xl">
          <div className="space-y-3">
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
              Aucun établissement rattaché à votre compte
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Par sécurité multi-établissements, vous ne pouvez accéder qu’aux établissements dont
              vous êtes membre. Créez votre propre établissement pour démarrer sur un espace vierge
              et isolé.
            </p>
            <div className="flex flex-wrap gap-2">
              <Bouton
                variante="principal"
                taille="sm"
                onClick={() => definir_modale_nouvel_etablissement_ouverte(true)}
              >
                Créer mon établissement
              </Bouton>
              <Bouton variante="secondaire" taille="sm" onClick={deconnecter}>
                {textes.deconnexion_accueil}
              </Bouton>
            </div>
          </div>
        </Carte>
      );
    }

    if (
      etablissement_suspendu &&
      !utilisateur_actif.est_super_admin_plateforme &&
      route_active !== 'plateforme'
    ) {
      return (
        <Carte rembourrage="grand" className="max-w-xl border-red-200 dark:border-red-900/60">
          <div className="flex items-start gap-3">
            <Ban className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
                  {textes.titre_suspendu} — {etablissement_actif.nom_court}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {textes.description_suspendu}
                </p>
              </div>
              <Bouton variante="secondaire" taille="sm" onClick={deconnecter}>
                {textes.deconnexion_accueil}
              </Bouton>
            </div>
          </div>
        </Carte>
      );
    }

    if (!acces_autorise) {
      return (
        <Carte rembourrage="grand" className="max-w-xl">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
                Accès restreint par vos permissions RBAC
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Votre rôle actuel ne dispose pas de l’autorisation requise (
                <code className="font-mono text-xs">{permission_requise}</code>) pour consulter cet
                écran.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  onClick={() => simuler_role_etablissement('DIRECTEUR')}
                >
                  Revenir en vue Direction
                </Bouton>
                <Bouton
                  variante="fantome"
                  taille="sm"
                  onClick={() => definir_route_active('tableau_de_bord')}
                >
                  Accueil
                </Bouton>
              </div>
            </div>
          </div>
        </Carte>
      );
    }

    switch (route_active) {
      case 'tableau_de_bord':
        return <VueTableauDeBord />;
      case 'apprenants':
        return <VueAnnuaireApprenants />;
      case 'structure':
        return <VueStructureTarifs />;
      case 'terminologie':
        return <VueMoteurTerminologie />;
      case 'roles_audit':
        return <VueAuditRoles />;
      case 'comptes':
        return <VueComptes />;
      case 'rgpd':
        return <VueRgpd />;
      case 'admissions':
        return <VueAdmissions />;
      case 'pedagogie':
        return <VuePedagogie />;
      case 'emplois_du_temps':
        return <VueEmploisDuTemps />;
      case 'stages':
        return <VueStages />;
      case 'badges':
        return <VueBadges />;
      case 'finances':
        return <VueFinances />;
      case 'ressources_humaines':
        return <VueRessourcesHumaines />;
      case 'documents':
        return <VueDocuments />;
      case 'communication':
        return <VueCommunication />;
      case 'messagerie':
        return <VueMessagerie />;
      case 'actualites':
        return <VueActualites />;
      case 'bibliotheque_materiels':
        return <VueBibliothequeMateriels />;
      case 'services':
        return <VueServicesAnnexes />;
      case 'importations':
        return <VueImportations />;
      case 'rapports':
        return <VueRapports />;
      case 'parametres':
        return <VueParametres />;
      case 'portail_parent':
        return <VuePortails type_portail="parent" />;
      case 'portail_apprenant':
        return <VuePortails type_portail="apprenant" />;
      case 'portail_enseignant':
        return <VuePortails type_portail="enseignant" />;
      case 'campus_numerique':
        return <VueCampusNumerique />;
      case 'plateforme':
        return <VueAdministrationPlateforme />;
      case 'profil':
        return <VueProfil />;
      default:
        return <VueTableauDeBord />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <BarreLaterale />

      <div className="flex-1 flex flex-col min-w-0">
        <BarreSuperieure />

        {etablissement_suspendu && utilisateur_actif.est_super_admin_plateforme && (
          <div className="no-print bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/70 px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200 font-medium">
              <Ban className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                <strong>Établissement suspendu :</strong> {etablissement_actif.nom} est actuellement
                verrouillé pour ses utilisateurs.
              </span>
            </div>
            <Bouton
              variante="secondaire"
              taille="sm"
              onClick={() => basculer_statut_etablissement(etablissement_actif.id)}
            >
              {textes.reactiver_etablissement}
            </Bouton>
          </div>
        )}

        {afficher_bandeau_essai_saas && (
          <div className="no-print bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/70 px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {statut_abonnement_saas === 'EN_ATTENTE_PAIEMENT' ? (
                  <>
                    <strong>Paiement SaaS en attente :</strong> forfait{' '}
                    {etablissement_actif.offre_saas} non encore réglé.
                  </>
                ) : (
                  <>
                    <strong>Essai gratuit 14 jours :</strong> forfait{' '}
                    {etablissement_actif.offre_saas} actif sans paiement jusqu’au{' '}
                    <span className="font-mono">
                      {etablissement_actif.date_fin_essai_saas ?? '14 jours'}
                    </span>
                    .
                  </>
                )}
              </span>
            </div>
            <Bouton
              variante="secondaire"
              taille="sm"
              onClick={() => definir_route_active('parametres')}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Valider le paiement ou passer au Gratuit</span>
            </Bouton>
          </div>
        )}

        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-5 pb-24 md:py-6 max-w-[1440px] w-full mx-auto">
          {rendre_contenu()}
        </main>
      </div>

      <NavigationMobileBasse />
      <PaletteCommandes />
    </div>
  );
};

const RouteurPrincipal: React.FC = () => {
  const { mode_affichage } = utiliserErp();

  return (
    <>
      {mode_affichage === 'accueil' ? <PageAccueil /> : <CoquilleEspaceTravail />}
      <ModaleNouvelEtablissement />
      <EcranConnexion />
      <ModaleChangementMotDePasseForce />
      <ConteneurNotificationsToast />
    </>
  );
};

export default function Application() {
  return (
    <LimiteErreurErp>
      <FournisseurErp>
        <RouteurPrincipal />
      </FournisseurErp>
    </LimiteErreurErp>
  );
}
