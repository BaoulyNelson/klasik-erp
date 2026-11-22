import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  PERMISSIONS_METIER_QUOTIDIEN_EXCLUES_SUPER_ADMIN,
  ROLES,
} from '../configuration/roles_permissions';
import {
  detecter_langue_navigateur,
  LangueSupportee,
} from '../configuration/internationalisation';
import { DictionnaireTerminologie, obtenir_terminologie } from '../configuration/terminologie';
import {
  generer_code_otp,
  masquer_courriel_ou_telephone,
  valider_politique_mot_de_passe,
} from '../services/service_mots_de_passe';
import { formater_montant } from '../services/service_donnees';
import {
  construire_echeancier_defaut,
  recalculer_repartition_echeancier,
} from '../utilitaires/echeancier';
import { connecter_avec_popup_google, deconnecter_firebase } from '../services/service_firebase';
import {
  connecterApi,
  connecterDemoApi,
  deconnecterApi,
  ErreurApi,
  requeteApi,
  sessionApiPresente,
} from '../services/clientApi';
import {
  APPRENANTS_INITIAUX,
  DOCUMENTS_INITIAUX,
  ELEMENTS_PEDAGOGIQUES_INITIAUX,
  EMPLOIS_DU_TEMPS_INITIAUX,
  ENSEIGNANTS_INITIAUX,
  ETABLISSEMENTS_INITIAUX,
  JOURNAUX_AUDIT_INITIAUX,
  NOTES_INITIALES,
  NOTIFICATIONS_INITIALES,
  PAIEMENTS_INITIAUX,
  PARTENAIRES_INITIAUX,
  PRESENCES_INITIALES,
  UNITES_INITIALES,
  UTILISATEURS_INITIAUX,
} from '../donnees/donnees_initiales';
import {
  calculer_bulletin_paie,
  construire_inscriptions_initiales,
  valider_courriel,
  valider_fuseau_iana,
  valider_telephone_pays,
} from '../utilitaires/validation_metier';
import {
  ABONNEMENTS_SERVICES_INITIAUX,
  ANCIENS_ETUDIANTS_INITIAUX,
  CAHIERS_TEXTES_INITIAUX,
  DEMANDES_CONGE_INITIALES,
  DEPENSES_INITIALES,
  DEVOIRS_LMS_INITIAUX,
  EMPRUNTS_BIBLIOTHEQUE_INITIAUX,
  EVENEMENTS_CALENDRIER_INITIAUX,
  INCIDENTS_DISCIPLINE_INITIAUX,
  INVENTAIRE_INITIAL,
  LIVRES_BIBLIOTHEQUE_INITIAUX,
  PAIE_INITIALE,
  PRETS_MATERIELS_INITIAUX,
  REMISES_DEVOIRS_LMS_INITIALES,
  RESSOURCES_LMS_INITIALES,
  SOUTENANCES_INITIALES,
  VISITES_INFIRMERIE_INITIALES,
  COMMUNICATIONS_INITIALES,
} from '../donnees/donnees_modules_avances';
import {
  ARTICLES_ACTUALITES_INITIAUX,
  BADGES_INITIAUX,
  CONSENTEMENTS_RGPD_INITIAUX,
  DEMANDES_RGPD_INITIALES,
  FILS_DISCUSSION_INITIAUX,
  LOTS_IMPORTATIONS_INITIAUX,
} from '../donnees/donnees_modules_complementaires';
import {
  AbonnementService,
  Apprenant,
  ArticleActualite,
  ArticleInventaire,
  AttributionBadge,
  BulletinPaie,
  CodeDevise,
  CompteUtilisateur,
  ConfigurationEtablissement,
  ConfigurationPlateforme,
  ConsentementRgpd,
  CreneauEmploiDuTemps,
  DemandeConge,
  DemandeRgpd,
  DepenseEnregistree,
  DevoirLms,
  DocumentOfficielEmis,
  ElementPedagogique,
  ElementSynchroHorsLigne,
  EmpruntBibliotheque,
  EntreeCahierTextes,
  EntreeJournalAudit,
  EvenementCalendrierAcademique,
  FicheAncienEtudiant,
  FilDiscussionDirecte,
  IdentifiantPermission,
  IdentifiantRole,
  IdentifiantRoute,
  IncidentDiscipline,
  InscriptionApprenant,
  LivreBibliotheque,
  LotImportation,
  MessageCommunication,
  MessageToast,
  NoteEvaluation,
  NotificationSysteme,
  PaiementEnregistre,
  PartenaireStage,
  PersonnelEnseignant,
  PieceJointeDevoirLms,
  PresenceEnregistree,
  PretMateriel,
  RemiseDevoirLms,
  RessourcePedagogiqueLms,
  SoutenanceMemoire,
  StatutInscription,
  TypeDevoirLms,
  CritereGrilleDevoir,
  UniteAcademique,
  VisiteInfirmerie,
  EtatMateriel,
} from '../modeles/erp';

const CLE_STOCKAGE_ETAT = 'klasik_etat_erp_v4';
const CLE_STOCKAGE_SESSION = 'klasik_session_v4';
const SOURCE_API = import.meta.env.PROD || import.meta.env.VITE_SOURCE_DONNEES === 'api';

interface ProfilApi {
  id: string;
  nom_complet: string;
  courriel: string;
  telephone: string;
  role: IdentifiantRole;
  est_super_admin_plateforme: boolean;
  est_actif: boolean;
  affiliations: CompteUtilisateur['affiliations'];
  ids_apprenants_lies: string[];
  url_avatar?: string | null;
}

export interface SaisieFondateurEtablissement {
  nom_complet: string;
  courriel: string;
  telephone: string;
  mot_de_passe: string;
}

interface SessionPersistee {
  mode_affichage: 'accueil' | 'espace_travail';
  est_authentifie?: boolean;
  id_utilisateur_actif: string;
  id_etablissement_actif: string;
  route_active: IdentifiantRoute;
  langue_active?: LangueSupportee;
}

export const CONFIGURATION_PLATEFORME_DEFAUT: ConfigurationPlateforme = {
  nom_plateforme: 'Klasik ERP',
  accroche_courte: '',
  slogan: 'Plateforme SaaS Multi-Tenant · Déploiement Mondial · 10 Devises',
  titre_banniere: 'L’ERP éducatif mondial qui s’adapte automatiquement à votre institution.',
  resume_pied_page:
    'Infrastructure SaaS multi-établissements internationale dédiée aux écoles professionnelles, établissements scolaires et universités LMD. Multi-pays, multi-devises, caisse QR et résilience hors-ligne.',
  horaires_support: 'Lun–Sam · Support multi-fuseaux (Amériques · Europe · Afrique)',
  initiales_logo: 'K',
  couleur_marque: 'slate',
  courriel_support: 'support@klasik-erp.org',
  telephone_support: '+33 1 86 95 20 10 · +1 (514) 555-0190',
  site_web: 'https://klasik-erp.org',
  adresse_siege: 'Paris · Montréal · Dakar · Londres · Port-au-Prince',
  entite_legale: 'Klasik Technologies Éducatives SAS',
  autoriser_creation_autonome: true,
};

interface EtatPersiste {
  configuration_plateforme: ConfigurationPlateforme;
  etablissements: ConfigurationEtablissement[];
  utilisateurs: CompteUtilisateur[];
  unites: UniteAcademique[];
  elements: ElementPedagogique[];
  enseignants: PersonnelEnseignant[];
  apprenants: Apprenant[];
  inscriptions: InscriptionApprenant[];
  paiements: PaiementEnregistre[];
  notes: NoteEvaluation[];
  presences: PresenceEnregistree[];
  emplois_du_temps: CreneauEmploiDuTemps[];
  evenements_calendrier: EvenementCalendrierAcademique[];
  documents: DocumentOfficielEmis[];
  partenaires: PartenaireStage[];
  depenses: DepenseEnregistree[];
  paie: BulletinPaie[];
  communications: MessageCommunication[];
  cahiers_textes: EntreeCahierTextes[];
  soutenances: SoutenanceMemoire[];
  livres_bibliotheque: LivreBibliotheque[];
  emprunts_bibliotheque: EmpruntBibliotheque[];
  visites_infirmerie: VisiteInfirmerie[];
  incidents_discipline: IncidentDiscipline[];
  abonnements: AbonnementService[];
  inventaire: ArticleInventaire[];
  prets_materiels: PretMateriel[];
  anciens: FicheAncienEtudiant[];
  ressources_lms: RessourcePedagogiqueLms[];
  devoirs_lms: DevoirLms[];
  remises_devoirs_lms: RemiseDevoirLms[];
  articles_actualites: ArticleActualite[];
  consentements_rgpd: ConsentementRgpd[];
  demandes_rgpd: DemandeRgpd[];
  fils_discussion: FilDiscussionDirecte[];
  badges_attribues: AttributionBadge[];
  journaux_importations: LotImportation[];
  demandes_conge: DemandeConge[];
  journaux_audit: EntreeJournalAudit[];
  file_hors_ligne: ElementSynchroHorsLigne[];
  surcharges_permissions: Record<string, IdentifiantPermission[]>;
}

const COLLECTIONS_API: { cle: keyof EtatPersiste; collection: string }[] = [
  { cle: 'unites', collection: 'unites' },
  { cle: 'elements', collection: 'elements' },
  { cle: 'enseignants', collection: 'enseignants' },
  { cle: 'apprenants', collection: 'apprenants' },
  { cle: 'inscriptions', collection: 'inscriptions' },
  { cle: 'paiements', collection: 'paiements' },
  { cle: 'notes', collection: 'notes' },
  { cle: 'presences', collection: 'presences' },
  { cle: 'emplois_du_temps', collection: 'emplois_du_temps' },
  { cle: 'evenements_calendrier', collection: 'evenements_calendrier' },
  { cle: 'documents', collection: 'documents' },
  { cle: 'partenaires', collection: 'partenaires' },
  { cle: 'depenses', collection: 'depenses' },
  { cle: 'paie', collection: 'paie' },
  { cle: 'communications', collection: 'communications' },
  { cle: 'cahiers_textes', collection: 'cahiers_textes' },
  { cle: 'soutenances', collection: 'soutenances' },
  { cle: 'livres_bibliotheque', collection: 'livres_bibliotheque' },
  { cle: 'emprunts_bibliotheque', collection: 'emprunts_bibliotheque' },
  { cle: 'visites_infirmerie', collection: 'visites_infirmerie' },
  { cle: 'incidents_discipline', collection: 'incidents_discipline' },
  { cle: 'abonnements', collection: 'abonnements' },
  { cle: 'inventaire', collection: 'inventaire' },
  { cle: 'prets_materiels', collection: 'prets_materiels' },
  { cle: 'anciens', collection: 'anciens' },
  { cle: 'ressources_lms', collection: 'ressources_lms' },
  { cle: 'devoirs_lms', collection: 'devoirs_lms' },
  { cle: 'remises_devoirs_lms', collection: 'remises_devoirs_lms' },
  { cle: 'articles_actualites', collection: 'articles_actualites' },
  { cle: 'consentements_rgpd', collection: 'consentements_rgpd' },
  { cle: 'demandes_rgpd', collection: 'demandes_rgpd' },
  { cle: 'fils_discussion', collection: 'fils_discussion' },
  { cle: 'badges_attribues', collection: 'badges_attribues' },
  { cle: 'journaux_importations', collection: 'journaux_importations' },
  { cle: 'demandes_conge', collection: 'demandes_conge' },
];

const COLLECTIONS_RELATIONNELLES_TYPED = new Set([
  'unites',
  'elements',
  'apprenants',
  'inscriptions',
  'enseignants',
  'notes',
  'presences',
  'emplois_du_temps',
  'evenements_calendrier',
  'cahiers_textes',
  'soutenances',
  'paiements',
  'depenses',
  'paie',
  'abonnements',
  'documents',
  'communications',
  'notifications',
  'articles_actualites',
  'livres_bibliotheque',
  'emprunts_bibliotheque',
  'visites_infirmerie',
  'incidents_discipline',
  'inventaire',
  'prets_materiels',
  'anciens',
  'ressources_lms',
  'devoirs_lms',
  'remises_devoirs_lms',
  'consentements_rgpd',
  'demandes_rgpd',
  'journaux_importations',
  'badges_attribues',
]);

async function charger_collection_api(
  id_etablissement: string,
  collection: string
): Promise<unknown[]> {
  const resultats: unknown[] = [];
  let page = 1;
  while (true) {
    let reponse: { results: unknown[]; next: number | null };
    const collection_typed = COLLECTIONS_RELATIONNELLES_TYPED.has(collection);
    const chemin_collection = collection_typed
      ? `/etablissements/${encodeURIComponent(id_etablissement)}/${collection}/`
      : `/etablissements/${encodeURIComponent(id_etablissement)}/donnees/${collection}/`;
    try {
      reponse = await requeteApi<{ results: unknown[]; next: number | null }>(
        `${chemin_collection}?page=${page}&page_size=100`
      );
    } catch (erreur: unknown) {
      if (erreur instanceof ErreurApi && erreur.statut === 403) return [];
      throw erreur;
    }
    resultats.push(...reponse.results);
    if (reponse.next === null) return resultats;
    page = reponse.next;
  }
}

async function charger_surcharges_permissions_api(
  id_etablissement: string
): Promise<Record<string, IdentifiantPermission[]>> {
  try {
    const resultat = await requeteApi<{
      permissions: Record<string, IdentifiantPermission[]>;
    }>(`/etablissements/${encodeURIComponent(id_etablissement)}/permissions/`);
    return Object.fromEntries(
      Object.entries(resultat.permissions).map(([role, permissions]) => [
        `${id_etablissement}:${role}`,
        permissions,
      ])
    );
  } catch (erreur: unknown) {
    if (erreur instanceof ErreurApi && erreur.statut === 403) return {};
    throw erreur;
  }
}

async function charger_utilisateurs_api(
  id_etablissement: string,
  utilisateur_courant: CompteUtilisateur
): Promise<CompteUtilisateur[]> {
  try {
    return await requeteApi<CompteUtilisateur[]>(
      `/etablissements/${encodeURIComponent(id_etablissement)}/utilisateurs/`
    );
  } catch (erreur: unknown) {
    if (erreur instanceof ErreurApi && erreur.statut === 403) {
      return [utilisateur_courant];
    }
    throw erreur;
  }
}

async function charger_journaux_audit_api(
  id_etablissement: string
): Promise<EntreeJournalAudit[]> {
  try {
    return await requeteApi<EntreeJournalAudit[]>(
      `/etablissements/${encodeURIComponent(id_etablissement)}/audit/`
    );
  } catch (erreur: unknown) {
    if (erreur instanceof ErreurApi && erreur.statut === 403) return [];
    throw erreur;
  }
}

function obtenir_etat_persiste_defaut(): EtatPersiste {
  return {
    configuration_plateforme: CONFIGURATION_PLATEFORME_DEFAUT,
    etablissements: ETABLISSEMENTS_INITIAUX,
    utilisateurs: UTILISATEURS_INITIAUX,
    unites: UNITES_INITIALES,
    elements: ELEMENTS_PEDAGOGIQUES_INITIAUX,
    enseignants: ENSEIGNANTS_INITIAUX,
    apprenants: APPRENANTS_INITIAUX,
    inscriptions: construire_inscriptions_initiales(
      APPRENANTS_INITIAUX,
      UNITES_INITIALES,
      ETABLISSEMENTS_INITIAUX
    ),
    paiements: PAIEMENTS_INITIAUX,
    notes: NOTES_INITIALES,
    presences: PRESENCES_INITIALES,
    emplois_du_temps: EMPLOIS_DU_TEMPS_INITIAUX,
    evenements_calendrier: EVENEMENTS_CALENDRIER_INITIAUX,
    documents: DOCUMENTS_INITIAUX,
    partenaires: PARTENAIRES_INITIAUX,
    depenses: DEPENSES_INITIALES,
    paie: PAIE_INITIALE,
    communications: COMMUNICATIONS_INITIALES,
    cahiers_textes: CAHIERS_TEXTES_INITIAUX,
    soutenances: SOUTENANCES_INITIALES,
    livres_bibliotheque: LIVRES_BIBLIOTHEQUE_INITIAUX,
    emprunts_bibliotheque: EMPRUNTS_BIBLIOTHEQUE_INITIAUX,
    visites_infirmerie: VISITES_INFIRMERIE_INITIALES,
    incidents_discipline: INCIDENTS_DISCIPLINE_INITIAUX,
    abonnements: ABONNEMENTS_SERVICES_INITIAUX,
    inventaire: INVENTAIRE_INITIAL,
    prets_materiels: PRETS_MATERIELS_INITIAUX,
    anciens: ANCIENS_ETUDIANTS_INITIAUX,
    ressources_lms: RESSOURCES_LMS_INITIALES,
    devoirs_lms: DEVOIRS_LMS_INITIAUX,
    remises_devoirs_lms: REMISES_DEVOIRS_LMS_INITIALES,
    articles_actualites: ARTICLES_ACTUALITES_INITIAUX,
    consentements_rgpd: CONSENTEMENTS_RGPD_INITIAUX,
    demandes_rgpd: DEMANDES_RGPD_INITIALES,
    fils_discussion: FILS_DISCUSSION_INITIAUX,
    badges_attribues: BADGES_INITIAUX,
    journaux_importations: LOTS_IMPORTATIONS_INITIAUX,
    demandes_conge: DEMANDES_CONGE_INITIALES,
    journaux_audit: JOURNAUX_AUDIT_INITIAUX,
    file_hors_ligne: [],
    surcharges_permissions: {},
  };
}

function charger_etat_initial(): EtatPersiste {
  const defaut = obtenir_etat_persiste_defaut();
  if (SOURCE_API) return defaut;
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE_ETAT);
    if (!brut) return defaut;
    const analyse = JSON.parse(brut) as Partial<EtatPersiste>;

    const utilisateurs_fusionnes =
      Array.isArray(analyse.utilisateurs) && analyse.utilisateurs.length > 0
        ? [
            ...UTILISATEURS_INITIAUX.map(
              (su) => analyse.utilisateurs?.find((pu) => pu.id === su.id) ?? su
            ),
            ...analyse.utilisateurs.filter(
              (pu) => !UTILISATEURS_INITIAUX.some((su) => su.id === pu.id)
            ),
          ]
        : defaut.utilisateurs;

    const etablissements_fusionnes =
      Array.isArray(analyse.etablissements) && analyse.etablissements.length > 0
        ? analyse.etablissements.map((etab) => ({
            ...ETABLISSEMENTS_INITIAUX[0],
            ...etab,
          }))
        : defaut.etablissements;

    return {
      configuration_plateforme:
        analyse.configuration_plateforme && typeof analyse.configuration_plateforme === 'object'
          ? { ...CONFIGURATION_PLATEFORME_DEFAUT, ...analyse.configuration_plateforme }
          : CONFIGURATION_PLATEFORME_DEFAUT,
      etablissements: etablissements_fusionnes,
      utilisateurs: utilisateurs_fusionnes,
      unites: Array.isArray(analyse.unites) ? analyse.unites : defaut.unites,
      elements: Array.isArray(analyse.elements) ? analyse.elements : defaut.elements,
      enseignants: Array.isArray(analyse.enseignants) ? analyse.enseignants : defaut.enseignants,
      apprenants: Array.isArray(analyse.apprenants) ? analyse.apprenants : defaut.apprenants,
      inscriptions: Array.isArray(analyse.inscriptions)
        ? analyse.inscriptions
        : construire_inscriptions_initiales(
            Array.isArray(analyse.apprenants) ? analyse.apprenants : defaut.apprenants,
            Array.isArray(analyse.unites) ? analyse.unites : defaut.unites,
            etablissements_fusionnes
          ),
      paiements: Array.isArray(analyse.paiements) ? analyse.paiements : defaut.paiements,
      notes: Array.isArray(analyse.notes) ? analyse.notes : defaut.notes,
      presences: Array.isArray(analyse.presences) ? analyse.presences : defaut.presences,
      emplois_du_temps: Array.isArray(analyse.emplois_du_temps)
        ? analyse.emplois_du_temps
        : defaut.emplois_du_temps,
      evenements_calendrier: Array.isArray(analyse.evenements_calendrier)
        ? analyse.evenements_calendrier
        : defaut.evenements_calendrier,
      documents: Array.isArray(analyse.documents) ? analyse.documents : defaut.documents,
      partenaires: Array.isArray(analyse.partenaires) ? analyse.partenaires : defaut.partenaires,
      depenses: Array.isArray(analyse.depenses) ? analyse.depenses : defaut.depenses,
      paie: Array.isArray(analyse.paie) ? analyse.paie : defaut.paie,
      communications: Array.isArray(analyse.communications)
        ? analyse.communications
        : defaut.communications,
      cahiers_textes: Array.isArray(analyse.cahiers_textes)
        ? analyse.cahiers_textes
        : defaut.cahiers_textes,
      soutenances: Array.isArray(analyse.soutenances) ? analyse.soutenances : defaut.soutenances,
      livres_bibliotheque: Array.isArray(analyse.livres_bibliotheque)
        ? analyse.livres_bibliotheque
        : defaut.livres_bibliotheque,
      emprunts_bibliotheque: Array.isArray(analyse.emprunts_bibliotheque)
        ? analyse.emprunts_bibliotheque
        : defaut.emprunts_bibliotheque,
      visites_infirmerie: Array.isArray(analyse.visites_infirmerie)
        ? analyse.visites_infirmerie
        : defaut.visites_infirmerie,
      incidents_discipline: Array.isArray(analyse.incidents_discipline)
        ? analyse.incidents_discipline
        : defaut.incidents_discipline,
      abonnements: Array.isArray(analyse.abonnements) ? analyse.abonnements : defaut.abonnements,
      inventaire: Array.isArray(analyse.inventaire)
        ? analyse.inventaire.map((item) => ({
            ...item,
            quantite_disponible: item.quantite_disponible ?? item.quantite,
          }))
        : defaut.inventaire,
      prets_materiels: Array.isArray(analyse.prets_materiels)
        ? analyse.prets_materiels
        : defaut.prets_materiels,
      anciens: Array.isArray(analyse.anciens) ? analyse.anciens : defaut.anciens,
      ressources_lms: Array.isArray(analyse.ressources_lms)
        ? analyse.ressources_lms
        : defaut.ressources_lms,
      devoirs_lms: Array.isArray(analyse.devoirs_lms)
        ? [
            ...analyse.devoirs_lms.map((d) => {
              const modele = DEVOIRS_LMS_INITIAUX.find((m) => m.id === d.id);
              return modele ? { ...modele, ...d, criteres_grille: d.criteres_grille ?? modele.criteres_grille, pieces_jointes: d.pieces_jointes ?? modele.pieces_jointes, commentaires_classe: d.commentaires_classe ?? modele.commentaires_classe } : d;
            }),
            ...DEVOIRS_LMS_INITIAUX.filter(
              (m) => !analyse.devoirs_lms?.some((d) => d.id === m.id)
            ),
          ]
        : defaut.devoirs_lms,
      remises_devoirs_lms: Array.isArray(analyse.remises_devoirs_lms)
        ? analyse.remises_devoirs_lms
        : defaut.remises_devoirs_lms,
      articles_actualites: Array.isArray(analyse.articles_actualites)
        ? analyse.articles_actualites
        : defaut.articles_actualites,
      consentements_rgpd: Array.isArray(analyse.consentements_rgpd)
        ? analyse.consentements_rgpd
        : defaut.consentements_rgpd,
      demandes_rgpd: Array.isArray(analyse.demandes_rgpd)
        ? analyse.demandes_rgpd
        : defaut.demandes_rgpd,
      fils_discussion: Array.isArray(analyse.fils_discussion)
        ? analyse.fils_discussion
        : defaut.fils_discussion,
      badges_attribues: Array.isArray(analyse.badges_attribues)
        ? analyse.badges_attribues
        : defaut.badges_attribues,
      journaux_importations: Array.isArray(analyse.journaux_importations)
        ? analyse.journaux_importations
        : defaut.journaux_importations,
      demandes_conge: Array.isArray(analyse.demandes_conge)
        ? analyse.demandes_conge
        : defaut.demandes_conge,
      journaux_audit: Array.isArray(analyse.journaux_audit)
        ? analyse.journaux_audit
        : defaut.journaux_audit,
      file_hors_ligne: Array.isArray(analyse.file_hors_ligne)
        ? analyse.file_hors_ligne
        : defaut.file_hors_ligne,
      surcharges_permissions:
        analyse.surcharges_permissions && typeof analyse.surcharges_permissions === 'object'
          ? Object.fromEntries(
              Object.entries(analyse.surcharges_permissions).map(([cle, perms]) => [
                cle,
                cle.endsWith(':SUPER_ADMIN') && Array.isArray(perms)
                  ? perms.filter(
                      (p) => !PERMISSIONS_METIER_QUOTIDIEN_EXCLUES_SUPER_ADMIN.includes(p)
                    )
                  : perms,
              ])
            )
          : defaut.surcharges_permissions,
    };
  } catch {
    return defaut;
  }
}

function charger_session_initiale(): SessionPersistee {
  const langue_navigateur = detecter_langue_navigateur();
  if (SOURCE_API) {
    return {
      mode_affichage: 'accueil',
      est_authentifie: false,
      id_utilisateur_actif: UTILISATEURS_INITIAUX[1].id,
      id_etablissement_actif: ETABLISSEMENTS_INITIAUX[0].id,
      route_active: 'tableau_de_bord',
      langue_active: langue_navigateur,
    };
  }
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE_SESSION);
    if (!brut) {
      return {
        mode_affichage: 'accueil',
        est_authentifie: false,
        id_utilisateur_actif: UTILISATEURS_INITIAUX[1].id,
        id_etablissement_actif: ETABLISSEMENTS_INITIAUX[0].id,
        route_active: 'tableau_de_bord',
        langue_active: langue_navigateur,
      };
    }
    const analyse = JSON.parse(brut) as Partial<SessionPersistee>;
    const mode_resolu = analyse.mode_affichage === 'espace_travail' ? 'espace_travail' : 'accueil';
    return {
      mode_affichage: mode_resolu,
      est_authentifie:
        typeof analyse.est_authentifie === 'boolean'
          ? analyse.est_authentifie
          : mode_resolu === 'espace_travail',
      id_utilisateur_actif: analyse.id_utilisateur_actif || UTILISATEURS_INITIAUX[1].id,
      id_etablissement_actif: analyse.id_etablissement_actif || ETABLISSEMENTS_INITIAUX[0].id,
      route_active: analyse.route_active || 'tableau_de_bord',
      langue_active:
        analyse.langue_active && ['fr', 'en', 'ht', 'es'].includes(analyse.langue_active)
          ? analyse.langue_active
          : langue_navigateur,
    };
  } catch {
    return {
      mode_affichage: 'accueil',
      est_authentifie: false,
      id_utilisateur_actif: UTILISATEURS_INITIAUX[1].id,
      id_etablissement_actif: ETABLISSEMENTS_INITIAUX[0].id,
      route_active: 'tableau_de_bord',
      langue_active: langue_navigateur,
    };
  }
}

interface ValeurContexteErp {
  // État multi-établissements & utilisateur
  configuration_plateforme: ConfigurationPlateforme;
  mode_affichage: 'accueil' | 'espace_travail';
  definir_mode_affichage: (mode: 'accueil' | 'espace_travail') => void;
  est_authentifie: boolean;
  etablissements: ConfigurationEtablissement[];
  etablissements_accessibles: ConfigurationEtablissement[];
  utilisateurs: CompteUtilisateur[];
  etablissement_actif: ConfigurationEtablissement;
  terminologie: DictionnaireTerminologie;
  utilisateur_actif: CompteUtilisateur;
  id_role_actif: IdentifiantRole;
  devise_active: CodeDevise;
  langue_active: LangueSupportee;
  definir_langue_active: (langue: LangueSupportee) => void;
  theme: 'clair' | 'sombre';
  barre_laterale_reduite: boolean;
  route_active: IdentifiantRoute;
  id_apprenant_selectionne: string | null;
  ecran_connexion_ouvert: boolean;
  palette_commandes_ouverte: boolean;
  modale_nouvel_etablissement_ouverte: boolean;
  offre_saas_creation_selectionnee: ConfigurationEtablissement['offre_saas'];
  hors_ligne_simule: boolean;
  navigateur_en_ligne: boolean;
  notifications_toast: MessageToast[];
  notifications: NotificationSysteme[];

  // Données strictement isolées pour l'établissement actif
  unites_etablissement: UniteAcademique[];
  elements_etablissement: ElementPedagogique[];
  enseignants_etablissement: PersonnelEnseignant[];
  apprenants_etablissement: Apprenant[];
  inscriptions_etablissement: InscriptionApprenant[];
  paiements_etablissement: PaiementEnregistre[];
  notes_etablissement: NoteEvaluation[];
  presences_etablissement: PresenceEnregistree[];
  emplois_du_temps_etablissement: CreneauEmploiDuTemps[];
  evenements_calendrier_etablissement: EvenementCalendrierAcademique[];
  documents_etablissement: DocumentOfficielEmis[];
  partenaires_etablissement: PartenaireStage[];
  depenses_etablissement: DepenseEnregistree[];
  paie_etablissement: BulletinPaie[];
  communications_etablissement: MessageCommunication[];
  cahiers_textes_etablissement: EntreeCahierTextes[];
  soutenances_etablissement: SoutenanceMemoire[];
  livres_bibliotheque_etablissement: LivreBibliotheque[];
  emprunts_bibliotheque_etablissement: EmpruntBibliotheque[];
  infirmerie_etablissement: VisiteInfirmerie[];
  discipline_etablissement: IncidentDiscipline[];
  abonnements_etablissement: AbonnementService[];
  inventaire_etablissement: ArticleInventaire[];
  prets_materiels_etablissement: PretMateriel[];
  anciens_etablissement: FicheAncienEtudiant[];
  ressources_lms_etablissement: RessourcePedagogiqueLms[];
  devoirs_lms_etablissement: DevoirLms[];
  remises_devoirs_etablissement: RemiseDevoirLms[];
  utilisateurs_etablissement: CompteUtilisateur[];
  actualites_etablissement: ArticleActualite[];
  consentements_rgpd_etablissement: ConsentementRgpd[];
  demandes_rgpd_etablissement: DemandeRgpd[];
  fils_discussion_etablissement: FilDiscussionDirecte[];
  badges_etablissement: AttributionBadge[];
  journaux_import_etablissement: LotImportation[];
  demandes_conge_etablissement: DemandeConge[];
  tous_les_apprenants: Apprenant[];
  tous_les_paiements: PaiementEnregistre[];
  tous_les_documents: DocumentOfficielEmis[];
  journaux_audit: EntreeJournalAudit[];
  file_hors_ligne: ElementSynchroHorsLigne[];

  // Navigation & Interface
  changer_etablissement: (id_etablissement: string) => void;
  mettre_a_jour_etablissement: (
    id_etablissement: string,
    modifications: Partial<ConfigurationEtablissement>
  ) => boolean;
  basculer_statut_etablissement: (id_etablissement: string) => void;
  creer_etablissement_complet: (
    etablissement: ConfigurationEtablissement,
    nouvelles_unites: UniteAcademique[],
    nouveaux_elements: ElementPedagogique[],
    compte_fondateur?: SaisieFondateurEtablissement
  ) => boolean;
  supprimer_etablissement: (id_etablissement: string) => boolean;
  connecter_utilisateur: (id_utilisateur: string, id_etablissement_prefere?: string) => void;
  connecter_avec_google: () => Promise<{ ok: boolean; besoin_etablissement?: boolean; erreur?: string }>;
  authentifier_par_identifiants: (
    identifiant: string,
    mot_de_passe: string
  ) => { ok: boolean; erreur?: string };
  authentifier_par_identifiants_api: (
    identifiant: string,
    mot_de_passe: string
  ) => Promise<{ ok: boolean; erreur?: string }>;
  demander_reinitialisation_mot_de_passe: (identifiant: string) => {
    ok: boolean;
    erreur?: string;
    cible_masquee?: string;
    otp_demo?: string;
  };
  confirmer_reinitialisation_mot_de_passe: (
    identifiant: string,
    code_otp: string,
    nouveau_mot_de_passe: string
  ) => { ok: boolean; erreur?: string };
  deconnecter: () => void;
  simuler_role_etablissement: (
    id_role: IdentifiantRole,
    options?: { rester_sur_vue?: boolean }
  ) => void;
  definir_route_active: (route: IdentifiantRoute) => void;
  ouvrir_dossier_apprenant: (id_apprenant: string) => void;
  fermer_dossier_apprenant: () => void;
  definir_devise_active: (devise: CodeDevise) => void;
  basculer_theme: () => void;
  definir_barre_laterale_reduite: (reduite: boolean) => void;
  definir_ecran_connexion_ouvert: (ouvert: boolean) => void;
  definir_palette_commandes_ouverte: (ouverte: boolean) => void;
  definir_modale_nouvel_etablissement_ouverte: (
    ouverte: boolean,
    offre?: ConfigurationEtablissement['offre_saas']
  ) => void;
  definir_offre_saas_creation_selectionnee: (
    offre: ConfigurationEtablissement['offre_saas']
  ) => void;
  definir_hors_ligne_simule: (hors_ligne: boolean) => void;

  // Contrôle d'accès par rôle (RBAC)
  obtenir_permissions_role: (
    id_etablissement: string,
    id_role: IdentifiantRole
  ) => IdentifiantPermission[];
  basculer_permission_role: (
    id_etablissement: string,
    id_role: IdentifiantRole,
    id_permission: IdentifiantPermission
  ) => void;
  a_permission: (id_permission: IdentifiantPermission) => boolean;

  // Actions métier
  ajouter_unite_academique: (
    unite: Omit<UniteAcademique, 'id' | 'id_etablissement'>
  ) => UniteAcademique;
  modifier_unite_academique: (
    id_unite: string,
    modifications: Partial<UniteAcademique>
  ) => void;
  supprimer_unite_academique: (id_unite: string) => boolean;
  dupliquer_unite_academique: (id_unite: string) => UniteAcademique | null;
  deployer_pack_cycle: (
    titre_pack: string,
    unites_pack: (Omit<UniteAcademique, 'id' | 'id_etablissement'> & {
      elements_initiaux?: Omit<ElementPedagogique, 'id' | 'id_etablissement' | 'id_unite'>[];
    })[]
  ) => number;
  ajouter_element_pedagogique: (
    element: Omit<ElementPedagogique, 'id' | 'id_etablissement'>
  ) => ElementPedagogique;
  modifier_element_pedagogique: (
    id_element: string,
    modifications: Partial<ElementPedagogique>
  ) => void;
  supprimer_element_pedagogique: (id_element: string) => boolean;
  ajouter_personnel_enseignant: (
    enseignant: Omit<PersonnelEnseignant, 'id' | 'id_etablissement'>
  ) => PersonnelEnseignant;
  modifier_personnel_enseignant: (
    id_enseignant: string,
    modifications: Partial<PersonnelEnseignant>
  ) => void;
  supprimer_personnel_enseignant: (id_enseignant: string) => boolean;
  affecter_enseignant_pedagogie: (
    id_enseignant: string,
    ids_unites: string[],
    ids_elements: string[]
  ) => void;
  inscrire_apprenant: (
    apprenant: Apprenant,
    paiement_initial?: Omit<PaiementEnregistre, 'id' | 'id_etablissement'>,
    options_inscription?: {
      type_inscription?: InscriptionApprenant['type_inscription'];
      annee_academique?: string;
      libelle_periode?: string;
      montant_brut_htg?: number;
      pieces_fournies?: string[];
      option_cantine?: boolean;
      option_transport?: boolean;
      observations?: string;
    }
  ) => boolean;
  reinscrire_apprenant: (saisie: {
    id_apprenant: string;
    id_unite: string;
    libelle_niveau: string;
    annee_academique: string;
    libelle_periode: string;
    pourcentage_bourse: number;
    montant_brut_htg: number;
    montant_net_htg: number;
    pieces_fournies: string[];
    observations?: string;
    paiement_initial?: Omit<PaiementEnregistre, 'id' | 'id_etablissement'>;
  }) => InscriptionApprenant | null;
  modifier_inscription: (
    id_inscription: string,
    modifications_inscription: Partial<InscriptionApprenant>,
    modifications_apprenant?: Partial<Apprenant>
  ) => boolean;
  annuler_inscription: (id_inscription: string, motif: string) => boolean;
  archiver_inscription: (id_inscription: string, motif?: string) => boolean;
  supprimer_inscription: (id_inscription: string) => boolean;
  inscrire_apprenants_lot: (apprenants: Apprenant[]) => void;
  mettre_a_jour_apprenant: (id_apprenant: string, modifications: Partial<Apprenant>) => void;
  encaisser_paiement: (
    id_apprenant: string,
    montant_htg: number,
    mode_paiement: PaiementEnregistre['mode_paiement'],
    libelle: string,
    code_reference?: string,
    libelle_compte_bancaire?: string
  ) => PaiementEnregistre;
  annuler_paiement: (id_paiement: string, motif: string) => void;
  enregistrer_note: (entree: Omit<NoteEvaluation, 'id' | 'id_etablissement'>) => void;
  modifier_note: (id_note: string, modifications: Partial<NoteEvaluation>) => boolean;
  supprimer_note: (id_note: string) => boolean;
  basculer_verrouillage_notes_element: (
    id_element: string,
    libelle_periode: string,
    verrouillee: boolean
  ) => void;
  enregistrer_presences_lot: (
    entrees: Omit<PresenceEnregistree, 'id' | 'id_etablissement'>[]
  ) => void;
  synchroniser_file_hors_ligne: () => void;
  ajouter_creneau_emploi_du_temps: (
    creneau: Omit<CreneauEmploiDuTemps, 'id' | 'id_etablissement'>
  ) => void;
  modifier_creneau_emploi_du_temps: (
    id_creneau: string,
    modifications: Partial<CreneauEmploiDuTemps>
  ) => void;
  supprimer_creneau_emploi_du_temps: (id_creneau: string) => void;
  ajouter_evenement_calendrier: (
    evenement: Omit<EvenementCalendrierAcademique, 'id' | 'id_etablissement'>
  ) => EvenementCalendrierAcademique;
  modifier_evenement_calendrier: (
    id_evenement: string,
    modifications: Partial<EvenementCalendrierAcademique>
  ) => void;
  supprimer_evenement_calendrier: (id_evenement: string) => void;
  ajouter_entree_cahier_textes: (
    entree: Omit<EntreeCahierTextes, 'id' | 'id_etablissement'>
  ) => void;
  modifier_entree_cahier_textes: (
    id_entree: string,
    modifications: Partial<EntreeCahierTextes>
  ) => void;
  supprimer_entree_cahier_textes: (id_entree: string) => void;
  attribuer_stage: (id_apprenant: string, nom_entreprise: string) => void;
  ajouter_partenaire_stage: (
    partenaire: Omit<PartenaireStage, 'id' | 'id_etablissement'>
  ) => PartenaireStage;
  modifier_partenaire_stage: (
    id_partenaire: string,
    modifications: Partial<PartenaireStage>
  ) => void;
  supprimer_partenaire_stage: (id_partenaire: string) => void;
  ajouter_soutenance: (soutenance: Omit<SoutenanceMemoire, 'id' | 'id_etablissement'>) => void;
  mettre_a_jour_soutenance: (
    id_soutenance: string,
    modifications: Partial<SoutenanceMemoire>
  ) => void;
  supprimer_soutenance: (id_soutenance: string) => void;
  enregistrer_depense: (depense: Omit<DepenseEnregistree, 'id' | 'id_etablissement'>) => void;
  modifier_depense: (id_depense: string, modifications: Partial<DepenseEnregistree>) => void;
  supprimer_depense: (id_depense: string) => void;
  creer_bulletin_paie: (saisie: {
    id_personnel: string;
    nom_personnel: string;
    libelle_role: string;
    libelle_mois: string;
    heures_travaillees: number;
    salaire_base_htg: number;
    primes_htg: number;
    motif_primes?: string;
    retenues_htg: number;
    motif_retenues?: string;
    statut?: 'PAYE' | 'EN_ATTENTE';
    mode_paiement?: string;
    observations?: string;
  }) => BulletinPaie | null;
  modifier_bulletin_paie: (
    id_paie: string,
    saisie: {
      id_personnel?: string;
      nom_personnel?: string;
      libelle_role?: string;
      libelle_mois?: string;
      heures_travaillees?: number;
      salaire_base_htg: number;
      primes_htg: number;
      motif_primes?: string;
      retenues_htg: number;
      motif_retenues?: string;
      statut?: 'PAYE' | 'EN_ATTENTE';
      mode_paiement?: string;
      observations?: string;
    }
  ) => boolean;
  supprimer_bulletin_paie: (id_paie: string) => void;
  marquer_paie_payee: (id_paie: string) => void;
  creer_demande_conge: (
    demande: Omit<DemandeConge, 'id' | 'id_etablissement' | 'statut' | 'demande_le'>
  ) => void;
  modifier_demande_conge: (id_conge: string, modifications: Partial<DemandeConge>) => void;
  supprimer_demande_conge: (id_conge: string) => void;
  mettre_a_jour_statut_conge: (id_conge: string, statut: 'APPROUVE' | 'REFUSE') => void;
  emettre_document_officiel: (
    id_apprenant: string,
    type_document: string
  ) => DocumentOfficielEmis | null;
  envoyer_communication: (
    message: Omit<MessageCommunication, 'id' | 'id_etablissement' | 'envoye_le' | 'envoye_par'>
  ) => void;
  ajouter_livre_bibliotheque: (
    livre: Omit<LivreBibliotheque, 'id' | 'id_etablissement'>
  ) => LivreBibliotheque | null;
  mettre_a_jour_livre_bibliotheque: (
    id_livre: string,
    modifications: Partial<LivreBibliotheque>
  ) => void;
  supprimer_livre_bibliotheque: (id_livre: string) => boolean;
  emprunter_livre: (
    id_livre: string,
    id_apprenant: string,
    retour_prevu_le?: string,
    remarque?: string
  ) => void;
  retourner_livre: (
    id_emprunt: string,
    etat_retour?: EmpruntBibliotheque['etat_retour'],
    remarque?: string
  ) => void;
  prolonger_emprunt_livre: (id_emprunt: string, jours?: number) => void;
  ajouter_article_inventaire: (
    article: Omit<ArticleInventaire, 'id' | 'id_etablissement'>
  ) => ArticleInventaire | null;
  mettre_a_jour_article_inventaire: (
    id_article: string,
    modifications: Partial<ArticleInventaire>
  ) => void;
  supprimer_article_inventaire: (id_article: string) => boolean;
  preter_materiel: (
    pret: Omit<PretMateriel, 'id' | 'id_etablissement' | 'retourne_le' | 'etat_retour'>
  ) => boolean;
  retourner_materiel: (
    id_pret: string,
    etat_retour?: EtatMateriel,
    remarque?: string
  ) => void;
  ajouter_visite_infirmerie: (
    visite: Omit<VisiteInfirmerie, 'id' | 'id_etablissement'>
  ) => void;
  supprimer_visite_infirmerie: (id_visite: string) => void;
  ajouter_incident_discipline: (
    incident: Omit<IncidentDiscipline, 'id' | 'id_etablissement'>
  ) => void;
  supprimer_incident_discipline: (id_incident: string) => void;
  ajouter_ancien_etudiant: (
    ancien: Omit<FicheAncienEtudiant, 'id' | 'id_etablissement'>
  ) => FicheAncienEtudiant;
  modifier_ancien_etudiant: (
    id_ancien: string,
    modifications: Partial<FicheAncienEtudiant>
  ) => void;
  supprimer_ancien_etudiant: (id_ancien: string) => void;
  supprimer_abonnement_service: (id_abonnement: string) => void;
  basculer_abonnement_service: (
    id_apprenant: string,
    type_service: AbonnementService['type_service'],
    tarif: number,
    formule: string
  ) => void;
  ajouter_ressource_lms: (
    ressource: Omit<RessourcePedagogiqueLms, 'id' | 'id_etablissement' | 'publie_le'>
  ) => void;
  ajouter_devoir_lms: (saisie: {
    id_unite: string;
    id_element: string;
    titre: string;
    date_limite: string;
    points_max: number;
    total_attendu?: number;
    type_devoir?: TypeDevoirLms;
    theme_ou_chapitre?: string;
    consignes?: string;
    statut?: DevoirLms['statut'];
    pieces_jointes?: PieceJointeDevoirLms[];
    criteres_grille?: CritereGrilleDevoir[];
  }) => void;
  basculer_statut_devoir_lms: (id_devoir: string, statut: DevoirLms['statut']) => void;
  deposer_travail_devoir_lms: (saisie: {
    id_devoir: string;
    id_apprenant: string;
    lien_ou_fichier?: string;
    nom_fichier?: string;
    id_fichier_local?: string;
    taille_octets?: number;
    type_mime?: string;
    pieces_remises?: PieceJointeDevoirLms[];
    commentaire_apprenant?: string;
  }) => void;
  annuler_remise_devoir_lms: (id_devoir: string, id_apprenant: string) => void;
  evaluer_remise_devoir_lms: (saisie: {
    id_devoir: string;
    id_apprenant: string;
    note_attribuee: number;
    points_par_critere?: Record<string, number>;
    commentaire_enseignant?: string;
    statut?: 'EVALUE' | 'A_REVOIR';
    synchroniser_bulletin?: boolean;
  }) => void;
  ajouter_commentaire_devoir_lms: (id_devoir: string, message: string) => void;
  soumettre_devoir_lms: (id_devoir: string) => void;
  promouvoir_annee_academique: (nouveau_libelle_annee: string) => number;
  reinitialiser_donnees_demo: () => void;

  // Modules complémentaires
  ajouter_article_actualite: (
    article: Omit<ArticleActualite, 'id' | 'id_etablissement' | 'publie_le' | 'nom_auteur'>
  ) => void;
  modifier_article_actualite: (
    id_article: string,
    modifications: Partial<ArticleActualite>
  ) => void;
  basculer_epingle_actualite: (id_article: string) => void;
  supprimer_article_actualite: (id_article: string) => void;
  mettre_a_jour_consentement_rgpd: (
    id_apprenant: string,
    modifications: Partial<
      Pick<
        ConsentementRgpd,
        'droit_image' | 'traitement_donnees' | 'accord_parental' | 'consentement_sms_whatsapp'
      >
    >
  ) => void;
  creer_demande_rgpd: (
    demande: Omit<DemandeRgpd, 'id' | 'id_etablissement' | 'statut' | 'demandee_le'>
  ) => void;
  traiter_demande_rgpd: (id_demande: string) => void;
  anonymiser_apprenant_rgpd: (id_apprenant: string) => void;
  creer_utilisateur_etablissement: (saisie: {
    nom_complet: string;
    courriel: string;
    telephone: string;
    id_role: IdentifiantRole;
    fonction_locale: string;
    mot_de_passe_demo: string;
    double_facteur_actif: boolean;
    doit_changer_mot_de_passe?: boolean;
  }) => void;
  modifier_utilisateur_etablissement: (
    id_utilisateur: string,
    modifications: {
      nom_complet?: string;
      courriel?: string;
      telephone?: string;
      fonction_locale?: string;
    }
  ) => void;
  supprimer_utilisateur_etablissement: (id_utilisateur: string) => boolean;
  mettre_a_jour_role_utilisateur: (id_utilisateur: string, id_role: IdentifiantRole) => void;
  basculer_actif_utilisateur: (id_utilisateur: string) => void;
  basculer_2fa_utilisateur: (id_utilisateur: string) => void;
  reinitialiser_mot_de_passe_utilisateur: (
    id_utilisateur: string,
    nouveau_mot_de_passe: string,
    options?: { doit_changer_mot_de_passe?: boolean }
  ) => boolean;
  deverrouiller_compte_utilisateur: (id_utilisateur: string) => void;
  importer_donnees_lot: (saisie: {
    cible: LotImportation['cible'];
    nom_fichier: string;
    apprenants?: Apprenant[];
    notes?: Omit<NoteEvaluation, 'id' | 'id_etablissement'>[];
    paiements?: {
      id_apprenant: string;
      montant_htg: number;
      mode_paiement: PaiementEnregistre['mode_paiement'];
      libelle: string;
    }[];
    unites?: UniteAcademique[];
  }) => void;
  attribuer_badge_apprenant: (
    attribution: Omit<AttributionBadge, 'id' | 'id_etablissement' | 'attribue_le' | 'attribue_par'>
  ) => void;
  journaliser_scan_badge: (
    id_apprenant: string,
    resultat: 'AUTORISE' | 'ALERTE_SOLDE' | 'SUSPENDU'
  ) => void;
  creer_fil_discussion: (saisie: {
    sujet: string;
    nom_interlocuteur: string;
    role_interlocuteur: string;
    categorie: FilDiscussionDirecte['categorie'];
    message_initial: string;
  }) => string;
  envoyer_message_direct: (id_fil: string, contenu: string) => void;
  marquer_fil_lu: (id_fil: string) => void;
  mettre_a_jour_profil_utilisateur: (
    modifications: Partial<
      Pick<
        CompteUtilisateur,
        | 'nom_complet'
        | 'courriel'
        | 'telephone'
        | 'url_avatar'
        | 'initiales_avatar'
        | 'biographie'
        | 'poste'
        | 'departement'
        | 'ville'
        | 'pays'
        | 'url_linkedin'
        | 'langue_preferee'
        | 'preferences_notifications'
        | 'double_facteur_actif'
      >
    >
  ) => void;
  modifier_mon_mot_de_passe: (
    mot_de_passe_actuel: string,
    nouveau_mot_de_passe: string
  ) => boolean;
  finaliser_changement_mot_de_passe_obligatoire: (nouveau_mot_de_passe: string) => {
    ok: boolean;
    erreur?: string;
  };
  mettre_a_jour_configuration_plateforme: (
    modifications: Partial<ConfigurationPlateforme>
  ) => void;
  reinitialiser_configuration_plateforme: () => void;

  // Notifications, Toasts & Audit
  ajouter_toast: (toast: Omit<MessageToast, 'id'>) => void;
  fermer_toast: (id: string) => void;
  marquer_toutes_notifications_lues: () => void;
  ajouter_entree_audit: (entree: Omit<EntreeJournalAudit, 'id' | 'horodatage'>) => void;
}

const ContexteErp = createContext<ValeurContexteErp | null>(null);

export const FournisseurErp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [etat, definir_etat] = useState<EtatPersiste>(charger_etat_initial);
  const session_initiale = useMemo(() => charger_session_initiale(), []);
  const instantane_api = useRef<EtatPersiste | null>(null);
  const file_synchronisation_api = useRef<Promise<void>>(Promise.resolve());
  const [mode_affichage, definir_mode_affichage] = useState<'accueil' | 'espace_travail'>(
    session_initiale.mode_affichage
  );
  const [est_authentifie, definir_est_authentifie] = useState<boolean>(
    Boolean(session_initiale.est_authentifie)
  );
  const [id_etablissement_actif, definir_id_etablissement_actif] = useState<string>(
    session_initiale.id_etablissement_actif
  );
  const [id_utilisateur_actif, definir_id_utilisateur_actif] = useState<string>(
    session_initiale.id_utilisateur_actif
  );
  const [surcharge_role, definir_surcharge_role] = useState<IdentifiantRole | null>(null);
  const [devise_active, definir_devise_active] = useState<CodeDevise>(() => {
    const etab = charger_etat_initial().etablissements.find(
      (element) => element.id === session_initiale.id_etablissement_actif
    );
    return etab?.devise_defaut ?? 'USD';
  });
  const [langue_active, definir_langue_active] = useState<LangueSupportee>(
    session_initiale.langue_active ?? detecter_langue_navigateur()
  );
  const [theme, definir_theme] = useState<'clair' | 'sombre'>('clair');
  const [barre_laterale_reduite, definir_barre_laterale_reduite] = useState<boolean>(false);
  const [route_active, definir_route_active_interne] = useState<IdentifiantRoute>(
    session_initiale.route_active
  );
  const [id_apprenant_selectionne, definir_id_apprenant_selectionne] = useState<string | null>(
    null
  );
  const [ecran_connexion_ouvert, definir_ecran_connexion_ouvert] = useState<boolean>(false);
  const [palette_commandes_ouverte, definir_palette_commandes_ouverte] = useState<boolean>(false);
  const [
    modale_nouvel_etablissement_ouverte,
    definir_modale_nouvel_etablissement_ouverte_interne,
  ] = useState<boolean>(false);
  const [offre_saas_creation_selectionnee, definir_offre_saas_creation_selectionnee] =
    useState<ConfigurationEtablissement['offre_saas']>('Gratuit');
  const definir_modale_nouvel_etablissement_ouverte = useCallback(
    (ouverte: boolean, offre?: ConfigurationEtablissement['offre_saas']) => {
      if (ouverte) {
        definir_offre_saas_creation_selectionnee(offre ?? 'Gratuit');
      }
      definir_modale_nouvel_etablissement_ouverte_interne(ouverte);
    },
    []
  );
  const [hors_ligne_simule, definir_hors_ligne_simule] = useState<boolean>(false);
  const [navigateur_en_ligne, definir_navigateur_en_ligne] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [notifications_toast, definir_notifications_toast] = useState<MessageToast[]>([]);
  const [notifications, definir_notifications] =
    useState<NotificationSysteme[]>(NOTIFICATIONS_INITIALES);
  const [jetons_reinitialisation, definir_jetons_reinitialisation] = useState<
    Record<string, { code: string; expire_le: number }>
  >({});

  // Persistance automatique dans localStorage
  useEffect(() => {
    if (SOURCE_API) return;
    try {
      localStorage.setItem(CLE_STOCKAGE_ETAT, JSON.stringify(etat));
    } catch {
      // Ignorer si le quota navigateur est dépassé
    }
  }, [etat]);

  useEffect(() => {
    if (SOURCE_API) return;
    try {
      const session: SessionPersistee = {
        mode_affichage,
        est_authentifie,
        id_utilisateur_actif,
        id_etablissement_actif,
        route_active,
        langue_active,
      };
      localStorage.setItem(CLE_STOCKAGE_SESSION, JSON.stringify(session));
    } catch {
      // Ignorer les erreurs de stockage
    }
  }, [
    mode_affichage,
    est_authentifie,
    id_utilisateur_actif,
    id_etablissement_actif,
    route_active,
    langue_active,
  ]);

  useEffect(() => {
    const sur_en_ligne = () => definir_navigateur_en_ligne(true);
    const sur_hors_ligne = () => definir_navigateur_en_ligne(false);
    window.addEventListener('online', sur_en_ligne);
    window.addEventListener('offline', sur_hors_ligne);
    return () => {
      window.removeEventListener('online', sur_en_ligne);
      window.removeEventListener('offline', sur_hors_ligne);
    };
  }, []);

  useEffect(() => {
    if (!SOURCE_API) return;
    const session_expiree = () => {
      definir_est_authentifie(false);
      definir_mode_affichage('accueil');
    };
    window.addEventListener('klasik-api-session-expiree', session_expiree);
    return () => window.removeEventListener('klasik-api-session-expiree', session_expiree);
  }, []);

  useEffect(() => {
    // La classe CSS « dark » est imposée par Tailwind CSS pour activer la variante dark:*
    const racine = document.documentElement;
    if (theme === 'sombre') racine.classList.add('dark');
    else racine.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    const sur_touche_clavier = (evenement: KeyboardEvent) => {
      if ((evenement.metaKey || evenement.ctrlKey) && evenement.key.toLowerCase() === 'k') {
        evenement.preventDefault();
        definir_palette_commandes_ouverte((precedent) => !precedent);
      }
    };
    window.addEventListener('keydown', sur_touche_clavier);
    return () => window.removeEventListener('keydown', sur_touche_clavier);
  }, []);

  useEffect(() => {
    document.title = `${etat.configuration_plateforme.nom_plateforme} — ${etat.configuration_plateforme.accroche_courte}`;
  }, [
    etat.configuration_plateforme.nom_plateforme,
    etat.configuration_plateforme.accroche_courte,
  ]);

  const utilisateur_actif = useMemo(
    () =>
      etat.utilisateurs.find((u) => u.id === id_utilisateur_actif) ??
      etat.utilisateurs[0] ??
      UTILISATEURS_INITIAUX[0],
    [etat.utilisateurs, id_utilisateur_actif]
  );

  const etablissements_accessibles = useMemo(
    () =>
      utilisateur_actif.est_super_admin_plateforme
        ? etat.etablissements
        : etat.etablissements.filter((e) =>
            utilisateur_actif.affiliations.some((a) => a.id_etablissement === e.id)
          ),
    [etat.etablissements, utilisateur_actif]
  );

  const etablissement_actif = useMemo(() => {
    const autorise =
      etablissements_accessibles.find((e) => e.id === id_etablissement_actif) ??
      etablissements_accessibles[0];
    if (autorise) return autorise;
    return (
      etat.etablissements.find((e) => e.id === id_etablissement_actif) ??
      etat.etablissements[0] ??
      ETABLISSEMENTS_INITIAUX[0]
    );
  }, [etablissements_accessibles, etat.etablissements, id_etablissement_actif]);

  const etablissement_favicon =
    est_authentifie &&
    mode_affichage === 'espace_travail' &&
    !ecran_connexion_ouvert &&
    !modale_nouvel_etablissement_ouverte
      ? etablissements_accessibles.find(
          (etablissement) => etablissement.id === id_etablissement_actif
        )
      : undefined;

  useEffect(() => {
    const lien_icone =
      document.querySelector<HTMLLinkElement>('link[rel~="icon"]') ??
      document.createElement('link');
    if (!lien_icone.isConnected) {
      lien_icone.rel = 'icon';
      document.head.appendChild(lien_icone);
    }

    const appliquer_icone_plateforme = () => {
      lien_icone.href = '/icon.svg';
      lien_icone.type = 'image/svg+xml';
    };

    appliquer_icone_plateforme();
    const url_logo = etablissement_favicon?.url_logo?.trim();
    if (!url_logo) return;

    let effet_actif = true;
    const image_logo = new Image();
    image_logo.onload = () => {
      if (effet_actif) {
        lien_icone.href = url_logo;
        const type_mime = url_logo.match(/^data:(image\/[^;,]+)/i)?.[1];
        if (type_mime) lien_icone.type = type_mime;
        else lien_icone.removeAttribute('type');
      }
    };
    image_logo.onerror = () => {
      if (effet_actif) appliquer_icone_plateforme();
    };
    image_logo.src = url_logo;

    return () => {
      effet_actif = false;
      image_logo.onload = null;
      image_logo.onerror = null;
    };
  }, [
    etablissement_favicon?.id,
    etablissement_favicon?.url_logo,
    est_authentifie,
    mode_affichage,
    ecran_connexion_ouvert,
    modale_nouvel_etablissement_ouverte,
  ]);

  useEffect(() => {
    if (
      !utilisateur_actif.est_super_admin_plateforme &&
      etablissements_accessibles.length > 0 &&
      !etablissements_accessibles.some((e) => e.id === id_etablissement_actif)
    ) {
      const repli = etablissements_accessibles[0];
      definir_id_etablissement_actif(repli.id);
      definir_devise_active(repli.devise_defaut);
    }
  }, [
    utilisateur_actif.est_super_admin_plateforme,
    etablissements_accessibles,
    id_etablissement_actif,
  ]);

  const terminologie = useMemo(
    () => obtenir_terminologie(etablissement_actif.type),
    [etablissement_actif.type]
  );

  const id_role_actif: IdentifiantRole = useMemo(() => {
    if (surcharge_role && ROLES[surcharge_role]) return surcharge_role;
    if (utilisateur_actif.est_super_admin_plateforme) return 'SUPER_ADMIN';
    const affiliation = utilisateur_actif.affiliations.find(
      (a) => a.id_etablissement === etablissement_actif.id
    );
    if (affiliation && ROLES[affiliation.id_role]) return affiliation.id_role;
    return utilisateur_actif.affiliations[0]?.id_role ?? 'AUDITEUR';
  }, [utilisateur_actif, etablissement_actif.id, surcharge_role]);

  const ajouter_toast = useCallback((toast: Omit<MessageToast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    definir_notifications_toast((precedent) => [...precedent, { ...toast, id }]);
    setTimeout(() => {
      definir_notifications_toast((precedent) => precedent.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const fermer_toast = useCallback((id: string) => {
    definir_notifications_toast((precedent) => precedent.filter((t) => t.id !== id));
  }, []);

  const ajouter_entree_audit = useCallback(
    (entree: Omit<EntreeJournalAudit, 'id' | 'horodatage'>) => {
      const maintenant = new Date();
      const completer = (n: number) => String(n).padStart(2, '0');
      const horodatage = `${maintenant.getFullYear()}-${completer(maintenant.getMonth() + 1)}-${completer(
        maintenant.getDate()
      )} ${completer(maintenant.getHours())}:${completer(maintenant.getMinutes())}`;
      const nouvelle_entree: EntreeJournalAudit = {
        ...entree,
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        horodatage,
      };
      definir_etat((precedent) => ({
        ...precedent,
        journaux_audit: [nouvelle_entree, ...precedent.journaux_audit],
      }));
    },
    []
  );

  const obtenir_permissions_role = useCallback(
    (id_etablissement: string, id_role: IdentifiantRole): IdentifiantPermission[] => {
      const cle = `${id_etablissement}:${id_role}`;
      const base = etat.surcharges_permissions[cle] ?? ROLES[id_role].permissions_defaut;
      if (id_role === 'SUPER_ADMIN') {
        return base.filter((p) => !PERMISSIONS_METIER_QUOTIDIEN_EXCLUES_SUPER_ADMIN.includes(p));
      }
      return base;
    },
    [etat.surcharges_permissions]
  );

  const a_permission = useCallback(
    (id_permission: IdentifiantPermission): boolean => {
      const permissions = obtenir_permissions_role(etablissement_actif.id, id_role_actif);
      return permissions.includes(id_permission);
    },
    [obtenir_permissions_role, etablissement_actif.id, id_role_actif]
  );

  const basculer_permission_role = useCallback(
    (
      id_etablissement: string,
      id_role: IdentifiantRole,
      id_permission: IdentifiantPermission
    ) => {
      if (id_role === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Principe de séparation des privilèges',
          description:
            'Le profil Super-administrateur Plateforme est verrouillé pour préserver la séparation SaaS / exécution métier.',
          variante: 'warning',
        });
        return;
      }
      const cle = `${id_etablissement}:${id_role}`;
      const obtenir_permissions_mises_a_jour = (
        precedent: IdentifiantPermission[]
      ): IdentifiantPermission[] => {
        const existe = precedent.includes(id_permission);
        return existe
          ? precedent.filter((permission) => permission !== id_permission)
          : [...precedent, id_permission];
      };
      if (SOURCE_API) {
        void (async () => {
          try {
            const permissions = obtenir_permissions_mises_a_jour(
              obtenir_permissions_role(id_etablissement, id_role)
            );
            await requeteApi(`/etablissements/${encodeURIComponent(id_etablissement)}/permissions/`, {
              method: 'PUT',
              body: { role: id_role, permissions },
            });
            definir_etat((precedent) => ({
              ...precedent,
              surcharges_permissions: {
                ...precedent.surcharges_permissions,
                [cle]: permissions,
              },
            }));
            ajouter_entree_audit({
              id_etablissement,
              nom_acteur: utilisateur_actif.nom_complet,
              role_acteur: ROLES[id_role_actif].libelle,
              action: `Modification permission « ${id_permission} »`,
              cible: `Rôle ${ROLES[id_role].libelle}`,
              categorie: 'RBAC',
            });
          } catch (erreur: unknown) {
            ajouter_toast({
              titre: 'Modification des permissions impossible',
              description:
                erreur instanceof Error
                  ? erreur.message
                  : 'Le serveur n’a pas pu enregistrer cette modification.',
              variante: 'error',
            });
          }
        })();
        return;
      }
      definir_etat((precedent) => {
        const actuelles = precedent.surcharges_permissions[cle] ?? ROLES[id_role].permissions_defaut;
        const mises_a_jour = obtenir_permissions_mises_a_jour(actuelles);
        return {
          ...precedent,
          surcharges_permissions: { ...precedent.surcharges_permissions, [cle]: mises_a_jour },
        };
      });
      ajouter_entree_audit({
        id_etablissement,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Modification permission « ${id_permission} »`,
        cible: `Rôle ${ROLES[id_role].libelle}`,
        categorie: 'RBAC',
      });
    },
      [
        ajouter_entree_audit,
        ajouter_toast,
        obtenir_permissions_role,
        utilisateur_actif.nom_complet,
        id_role_actif,
      ]
  );

  const changer_etablissement = useCallback(
    (id_etablissement: string) => {
      const cible = etat.etablissements.find((e) => e.id === id_etablissement);
      if (!cible) return;
      const est_autorise =
        utilisateur_actif.est_super_admin_plateforme ||
        utilisateur_actif.affiliations.some((a) => a.id_etablissement === id_etablissement);
      if (!est_autorise) {
        ajouter_toast({
          titre: 'Accès refusé',
          description: 'Vous ne disposez pas de droits sur cet établissement.',
          variante: 'error',
        });
        return;
      }
      const appliquer_changement = () => {
        definir_id_etablissement_actif(id_etablissement);
        definir_id_apprenant_selectionne(null);
        definir_surcharge_role(null);
        definir_devise_active(cible.devise_defaut);
        const term_cible = obtenir_terminologie(cible.type);
        definir_route_active_interne((route_precedente) => {
          if (route_precedente === 'stages' && !term_cible.module_stages_actif)
            return 'tableau_de_bord';
          if (route_precedente === 'portail_parent' && cible.type !== 'SCOLAIRE')
            return 'tableau_de_bord';
          return route_precedente;
        });
        ajouter_toast({
          titre: `Établissement actif : ${cible.nom_court}`,
          description: `Interface adaptée en mode ${term_cible.libelle_type_complet}.`,
          variante: 'info',
        });
      };
      if (SOURCE_API) {
        void (async () => {
          const donnees_api: Partial<EtatPersiste> = {};
          await Promise.all(
            COLLECTIONS_API.map(async ({ cle, collection }) => {
              const lignes = await charger_collection_api(id_etablissement, collection);
              (donnees_api as Record<string, unknown>)[cle] = lignes;
            })
          );
          const [surcharges_permissions, utilisateurs_api, journaux_audit_api] =
            await Promise.all([
            charger_surcharges_permissions_api(id_etablissement),
            charger_utilisateurs_api(id_etablissement, utilisateur_actif),
            charger_journaux_audit_api(id_etablissement),
          ]);
          const nouvel_etat: EtatPersiste = {
            ...etat,
            ...donnees_api,
            utilisateurs: utilisateurs_api,
            journaux_audit: journaux_audit_api,
            surcharges_permissions: {
              ...Object.fromEntries(
                Object.entries(etat.surcharges_permissions).filter(
                  ([cle]) => !cle.startsWith(`${id_etablissement}:`)
                )
              ),
              ...surcharges_permissions,
            },
          };
          instantane_api.current = nouvel_etat;
          definir_etat(nouvel_etat);
          appliquer_changement();
        })().catch((erreur: unknown) => {
          ajouter_toast({
            titre: 'Changement d’établissement impossible',
            description:
              erreur instanceof Error ? erreur.message : 'Le serveur API est indisponible.',
            variante: 'error',
          });
        });
        return;
      }
      appliquer_changement();
    },
    [
      etat.etablissements,
      utilisateur_actif,
      utilisateur_actif.est_super_admin_plateforme,
      utilisateur_actif.affiliations,
      ajouter_toast,
    ]
  );

  const mettre_a_jour_etablissement = useCallback(
    (id_etablissement: string, modifications: Partial<ConfigurationEtablissement>): boolean => {
      const etab_actuel = etat.etablissements.find((e) => e.id === id_etablissement);
      if (modifications.courriel !== undefined && !valider_courriel(modifications.courriel)) {
        ajouter_toast({
          titre: 'Courriel établissement invalide',
          description: 'Veuillez saisir une adresse courriel valide.',
          variante: 'error',
        });
        return false;
      }
      if (
        modifications.taux_change_usd !== undefined &&
        (!Number.isFinite(modifications.taux_change_usd) || modifications.taux_change_usd <= 0)
      ) {
        ajouter_toast({
          titre: 'Taux de change invalide',
          description: 'Le taux de change doit être strictement positif.',
          variante: 'error',
        });
        return false;
      }
      if (etab_actuel && (modifications.telephone !== undefined || modifications.code_pays !== undefined)) {
        const pays_cible = modifications.code_pays ?? etab_actuel.code_pays;
        const tel_cible = modifications.telephone ?? etab_actuel.telephone;
        const indicatif_hint = tel_cible.trim().startsWith('+')
          ? tel_cible.trim().split(/\s+/)[0]
          : undefined;
        const check_tel = valider_telephone_pays(pays_cible, tel_cible, indicatif_hint);
        if (!check_tel.valide) {
          ajouter_toast({
            titre: 'Numéro de téléphone invalide',
            description: check_tel.erreur,
            variante: 'error',
          });
          return false;
        }
        modifications = { ...modifications, telephone: check_tel.numero_normalise };
      }

      if (SOURCE_API) {
        void requeteApi<ConfigurationEtablissement>(
          `/etablissements/${encodeURIComponent(id_etablissement)}/`,
          { method: 'PATCH', body: modifications }
        )
          .then((etablissement_api) => {
            definir_etat((precedent) => ({
              ...precedent,
              etablissements: precedent.etablissements.map((etablissement) =>
                etablissement.id === id_etablissement ? etablissement_api : etablissement
              ),
            }));
            ajouter_toast({
              titre: 'Configuration enregistrée',
              description: 'Les paramètres de l’établissement ont été mis à jour.',
              variante: 'success',
            });
          })
          .catch((erreur: unknown) => {
            ajouter_toast({
              titre: 'Configuration non enregistrée',
              description:
                erreur instanceof Error
                  ? erreur.message
                  : 'Le serveur n’a pas pu enregistrer les paramètres.',
              variante: 'error',
            });
          });
        return true;
      }

      definir_etat((precedent) => ({
        ...precedent,
        etablissements: precedent.etablissements.map((e) =>
          e.id === id_etablissement ? { ...e, ...modifications } : e
        ),
      }));
      ajouter_entree_audit({
        id_etablissement,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Mise à jour de la configuration établissement',
        cible:
          etat.etablissements.find((e) => e.id === id_etablissement)?.nom ?? id_etablissement,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: 'Configuration enregistrée',
        description: 'Les paramètres de l’établissement ont été mis à jour.',
        variante: 'success',
      });
      return true;
    },
    [
      etat.etablissements,
      ajouter_entree_audit,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_toast,
    ]
  );

  const basculer_statut_etablissement = useCallback(
    (id_etablissement: string) => {
      const cible = etat.etablissements.find((e) => e.id === id_etablissement);
      if (!cible) return;
      const statut_suivant: ConfigurationEtablissement['statut'] =
        cible.statut === 'SUSPENDU' ? 'ACTIF' : 'SUSPENDU';

      if (SOURCE_API) {
        void requeteApi<ConfigurationEtablissement>(
          `/etablissements/${encodeURIComponent(id_etablissement)}/`,
          { method: 'PATCH', body: { statut: statut_suivant } }
        )
          .then((etablissement_api) => {
            definir_etat((precedent) => ({
              ...precedent,
              etablissements: precedent.etablissements.map((etablissement) =>
                etablissement.id === id_etablissement ? etablissement_api : etablissement
              ),
            }));
            ajouter_toast({
              titre:
                statut_suivant === 'SUSPENDU'
                  ? `${cible.nom_court} suspendu`
                  : `${cible.nom_court} réactivé`,
              description:
                statut_suivant === 'SUSPENDU'
                  ? 'Les accès opérationnels de cet établissement sont temporairement bloqués.'
                  : 'Les utilisateurs de cet établissement peuvent de nouveau travailler.',
              variante: statut_suivant === 'SUSPENDU' ? 'warning' : 'success',
            });
          })
          .catch((erreur: unknown) => {
            ajouter_toast({
              titre: 'Statut non modifié',
              description:
                erreur instanceof Error
                  ? erreur.message
                  : 'Le serveur n’a pas pu modifier le statut.',
              variante: 'error',
            });
          });
        return;
      }

      definir_etat((precedent) => ({
        ...precedent,
        etablissements: precedent.etablissements.map((e) =>
          e.id === id_etablissement ? { ...e, statut: statut_suivant } : e
        ),
      }));

      ajouter_entree_audit({
        id_etablissement,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action:
          statut_suivant === 'SUSPENDU'
            ? `Suspension SaaS de l’établissement [${cible.code}]`
            : `Réactivation SaaS de l’établissement [${cible.code}]`,
        cible: cible.nom,
        categorie: 'CONFIG',
      });

      ajouter_toast({
        titre:
          statut_suivant === 'SUSPENDU'
            ? `${cible.nom_court} suspendu`
            : `${cible.nom_court} réactivé`,
        description:
          statut_suivant === 'SUSPENDU'
            ? 'Les accès opérationnels de cet établissement sont temporairement bloqués.'
            : 'Les utilisateurs de cet établissement peuvent de nouveau travailler.',
        variante: statut_suivant === 'SUSPENDU' ? 'warning' : 'success',
      });
    },
    [
      etat.etablissements,
      ajouter_entree_audit,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_toast,
    ]
  );

  const creer_etablissement_complet = useCallback(
    (
      etablissement: ConfigurationEtablissement,
      nouvelles_unites: UniteAcademique[],
      nouveaux_elements: ElementPedagogique[],
      compte_fondateur?: SaisieFondateurEtablissement
    ): boolean => {
      if (SOURCE_API) {
        ajouter_toast({
          titre: 'Création non disponible',
          description:
            'La création autonome n’est pas encore prise en charge par l’API sécurisée.',
          variante: 'error',
        });
        return false;
      }
      if (!etablissement.nom.trim() || etablissement.nom.trim().length < 2) {
        ajouter_toast({
          titre: 'Nom d’établissement requis',
          description: 'Indiquez un nom officiel d’au moins 2 caractères.',
          variante: 'error',
        });
        return false;
      }
      if (!etablissement.ville.trim() || etablissement.ville.trim().length < 2) {
        ajouter_toast({
          titre: 'Ville requise',
          description: 'Indiquez la ville de l’établissement.',
          variante: 'error',
        });
        return false;
      }
      if (etablissement.code_pays === 'INTL' && !valider_fuseau_iana(etablissement.fuseau_horaire)) {
        ajouter_toast({
          titre: 'Fuseau horaire invalide',
          description: 'Indiquez un identifiant IANA valide (ex. Europe/Paris, Africa/Tunis, UTC).',
          variante: 'error',
        });
        return false;
      }
      if (
        !etablissement.annee_academique.trim() ||
        !etablissement.libelle_periode_courante.trim()
      ) {
        ajouter_toast({
          titre: 'Période académique requise',
          description: 'L’année académique et la période courante sont obligatoires.',
          variante: 'error',
        });
        return false;
      }
      if (
        etablissement.offre_saas !== 'Gratuit' &&
        etablissement.statut_abonnement_saas === 'PAYE' &&
        !(etablissement.reference_paiement_saas ?? '').trim()
      ) {
        ajouter_toast({
          titre: 'Référence de paiement SaaS manquante',
          description: 'Renseignez une référence de règlement ou activez l’essai gratuit 14 jours.',
          variante: 'error',
        });
        return false;
      }

      const indicatif_hint = etablissement.telephone.trim().startsWith('+')
        ? etablissement.telephone.trim().split(/\s+/)[0]
        : undefined;
      const check_tel = valider_telephone_pays(
        etablissement.code_pays,
        etablissement.telephone,
        indicatif_hint
      );
      if (!check_tel.valide) {
        ajouter_toast({
          titre: 'Téléphone établissement invalide',
          description: check_tel.erreur,
          variante: 'error',
        });
        return false;
      }

      if (compte_fondateur?.telephone?.trim()) {
        const hint_fondateur = compte_fondateur.telephone.trim().startsWith('+')
          ? compte_fondateur.telephone.trim().split(/\s+/)[0]
          : indicatif_hint;
        const check_tel_admin = valider_telephone_pays(
          etablissement.code_pays,
          compte_fondateur.telephone,
          hint_fondateur
        );
        if (!check_tel_admin.valide) {
          ajouter_toast({
            titre: 'Téléphone administrateur invalide',
            description: check_tel_admin.erreur,
            variante: 'error',
          });
          return false;
        }
      }

      const etablissement_normalise: ConfigurationEtablissement = {
        ...etablissement,
        nom: etablissement.nom.trim(),
        nom_court: etablissement.nom_court.trim() || etablissement.nom.trim().slice(0, 22),
        ville: etablissement.ville.trim(),
        telephone: check_tel.numero_normalise,
      };

      const unites_normalisees = nouvelles_unites.map((u) => ({
        ...u,
        frais_inscription_htg: Math.max(0, Number(u.frais_inscription_htg) || 0),
        frais_scolarite_htg: Math.max(0, Number(u.frais_scolarite_htg) || 0),
        capacite: Math.max(1, Number(u.capacite) || 35),
      }));

      const nom_direction = (
        compte_fondateur?.nom_complet.trim() ||
        etablissement_normalise.nom_direction ||
        ''
      ).trim();
      const courriel_saisi = (
        compte_fondateur?.courriel.trim() || etablissement_normalise.courriel
      ).trim();
      const courriel_normalise = courriel_saisi.toLowerCase();

      if (nom_direction.length < 2) {
        ajouter_toast({
          titre: 'Nom du responsable requis',
          description: 'Renseignez le nom complet du responsable ou fondateur.',
          variante: 'error',
        });
        return false;
      }
      if (!valider_courriel(courriel_saisi)) {
        ajouter_toast({
          titre: 'Courriel administrateur invalide',
          description: 'Veuillez saisir un courriel valide pour le responsable.',
          variante: 'error',
        });
        return false;
      }

      const initiales =
        nom_direction
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((m) => m[0]?.toUpperCase() ?? '')
          .join('') || 'DG';

      const est_fondateur_google =
        utilisateur_actif.id.startsWith('usr-google-') &&
        courriel_normalise === utilisateur_actif.courriel.toLowerCase();

      const est_fondateur_personnalise =
        est_fondateur_google ||
        (est_authentifie &&
          mode_affichage === 'espace_travail' &&
          !ecran_connexion_ouvert &&
          !utilisateur_actif.est_super_admin_plateforme &&
          courriel_normalise === utilisateur_actif.courriel.toLowerCase());

      if (
        !est_fondateur_personnalise &&
        etat.utilisateurs.some((u) => u.courriel.toLowerCase() === courriel_normalise)
      ) {
        ajouter_toast({
          titre: 'Courriel déjà utilisé',
          description: 'Ce courriel administrateur est déjà rattaché à un compte existant.',
          variante: 'error',
        });
        return false;
      }

      const mot_de_passe_saisi = (compte_fondateur?.mot_de_passe ?? '').trim();
      if (!est_fondateur_personnalise && mot_de_passe_saisi.length < 8) {
        ajouter_toast({
          titre: 'Mot de passe trop court',
          description: 'Le mot de passe du compte administrateur doit contenir au moins 8 caractères.',
          variante: 'error',
        });
        return false;
      }

      const id_nouveau_fondateur = `usr-founder-${Date.now()}`;
      const utilisateur_fondateur: CompteUtilisateur = {
        id: id_nouveau_fondateur,
        nom_complet: nom_direction,
        courriel: courriel_saisi,
        telephone: compte_fondateur?.telephone.trim() || etablissement_normalise.telephone,
        mot_de_passe_demo: mot_de_passe_saisi,
        initiales_avatar: initiales,
        est_actif: true,
        affiliations: [
          {
            id_etablissement: etablissement_normalise.id,
            id_role: 'DIRECTEUR',
            fonction_locale: etablissement_normalise.titre_direction,
          },
        ],
      };

      const doit_basculer_vers_fondateur =
        !utilisateur_actif.est_super_admin_plateforme && !est_fondateur_personnalise;

      const evenements_initiaux_etab: EvenementCalendrierAcademique[] = [
        {
          id: `cal-init-${Date.now()}-1`,
          id_etablissement: etablissement_normalise.id,
          type: 'ANNEE_LIMITE',
          titre: `Ouverture de l’année académique ${etablissement_normalise.annee_academique}`,
          date_debut: '2026-09-07',
          concerne_unites: 'Tout l’établissement',
        },
        {
          id: `cal-init-${Date.now()}-2`,
          id_etablissement: etablissement_normalise.id,
          type: 'PERIODE',
          titre: etablissement_normalise.libelle_periode_courante,
          date_debut: '2026-09-14',
          date_fin: '2026-12-18',
          concerne_unites: 'Toutes les unités',
        },
        {
          id: `cal-init-${Date.now()}-3`,
          id_etablissement: etablissement_normalise.id,
          type: 'ANNEE_LIMITE',
          titre: `Clôture de l’année académique ${etablissement_normalise.annee_academique}`,
          date_debut: '2027-07-10',
          concerne_unites: 'Tout l’établissement',
        },
      ];

      definir_etat((precedent) => ({
        ...precedent,
        etablissements: [...precedent.etablissements, etablissement_normalise],
        unites: [...precedent.unites, ...unites_normalisees],
        elements: [...precedent.elements, ...nouveaux_elements],
        evenements_calendrier: [...precedent.evenements_calendrier, ...evenements_initiaux_etab],
        utilisateurs: est_fondateur_personnalise
          ? precedent.utilisateurs.map((u) => {
              if (u.id === utilisateur_actif.id) {
                return {
                  ...u,
                  nom_complet: nom_direction || u.nom_complet,
                  affiliations: [
                    ...u.affiliations,
                    {
                      id_etablissement: etablissement.id,
                      id_role: 'DIRECTEUR' as IdentifiantRole,
                      fonction_locale: etablissement.titre_direction,
                    },
                  ],
                };
              }
              if (u.est_super_admin_plateforme) {
                return {
                  ...u,
                  affiliations: [
                    ...u.affiliations,
                    {
                      id_etablissement: etablissement.id,
                      id_role: 'SUPER_ADMIN' as IdentifiantRole,
                      fonction_locale: 'Super-admin Plateforme',
                    },
                  ],
                };
              }
              return u;
            })
          : [
              ...precedent.utilisateurs.map((u) =>
                u.est_super_admin_plateforme
                  ? {
                      ...u,
                      affiliations: [
                        ...u.affiliations,
                        {
                          id_etablissement: etablissement.id,
                          id_role: 'SUPER_ADMIN' as IdentifiantRole,
                          fonction_locale: 'Super-admin Plateforme',
                        },
                      ],
                    }
                  : u
              ),
              utilisateur_fondateur,
            ],
      }));

      definir_id_etablissement_actif(etablissement.id);
      definir_devise_active(etablissement.devise_defaut);
      definir_id_apprenant_selectionne(null);
      if (doit_basculer_vers_fondateur) {
        definir_id_utilisateur_actif(id_nouveau_fondateur);
        definir_surcharge_role('DIRECTEUR');
      } else if (est_fondateur_personnalise) {
        definir_surcharge_role('DIRECTEUR');
      } else {
        definir_surcharge_role(null);
      }
      definir_route_active_interne('tableau_de_bord');
      definir_est_authentifie(true);
      definir_mode_affichage('espace_travail');
      definir_ecran_connexion_ouvert(false);

      ajouter_entree_audit({
        id_etablissement: etablissement.id,
        nom_acteur: doit_basculer_vers_fondateur
          ? utilisateur_fondateur.nom_complet
          : utilisateur_actif.nom_complet,
        role_acteur: doit_basculer_vers_fondateur
          ? ROLES.DIRECTEUR.libelle
          : ROLES[id_role_actif].libelle,
        action: `Création d’établissement isolé [${etablissement.type}]`,
        cible:
          unites_normalisees.length === 0
            ? `${etablissement.nom} (Espace vierge)`
            : `${etablissement.nom} (${unites_normalisees.length} unité)`,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: `${etablissement.nom} initialisé`,
        description:
          unites_normalisees.length === 0
            ? 'Espace 100% vierge et isolé prêt à être configuré.'
            : `${unites_normalisees.length} unité(s), terminologie et espace administrateur isolé prêts.`,
        variante: 'success',
      });
      return true;
    },
    [
      est_authentifie,
      mode_affichage,
      ecran_connexion_ouvert,
      etat.utilisateurs,
      utilisateur_actif.est_super_admin_plateforme,
      utilisateur_actif.id,
      utilisateur_actif.courriel,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const supprimer_etablissement = useCallback(
    (id_etablissement: string): boolean => {
      if (etat.etablissements.length <= 1) {
        ajouter_toast({
          titre: 'Suppression impossible',
          description: 'Au moins un établissement doit rester actif sur la plateforme.',
          variante: 'error',
        });
        return false;
      }

      const cible = etat.etablissements.find((e) => e.id === id_etablissement);
      if (!cible) return false;

      const etablissements_restants = etat.etablissements.filter(
        (e) => e.id !== id_etablissement
      );
      const etablissement_repli = etablissements_restants[0];

      definir_etat((precedent) => {
        const surcharges_nettoyees: Record<string, IdentifiantPermission[]> = {};
        for (const [cle, valeur] of Object.entries(precedent.surcharges_permissions)) {
          if (!cle.startsWith(`${id_etablissement}:`)) {
            surcharges_nettoyees[cle] = valeur;
          }
        }
        return {
          ...precedent,
          etablissements: precedent.etablissements.filter((e) => e.id !== id_etablissement),
          unites: precedent.unites.filter((x) => x.id_etablissement !== id_etablissement),
          elements: precedent.elements.filter((x) => x.id_etablissement !== id_etablissement),
          enseignants: precedent.enseignants.filter((x) => x.id_etablissement !== id_etablissement),
          apprenants: precedent.apprenants.filter((x) => x.id_etablissement !== id_etablissement),
          paiements: precedent.paiements.filter((x) => x.id_etablissement !== id_etablissement),
          notes: precedent.notes.filter((x) => x.id_etablissement !== id_etablissement),
          presences: precedent.presences.filter((x) => x.id_etablissement !== id_etablissement),
          emplois_du_temps: precedent.emplois_du_temps.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          documents: precedent.documents.filter((x) => x.id_etablissement !== id_etablissement),
          partenaires: precedent.partenaires.filter((x) => x.id_etablissement !== id_etablissement),
          depenses: precedent.depenses.filter((x) => x.id_etablissement !== id_etablissement),
          paie: precedent.paie.filter((x) => x.id_etablissement !== id_etablissement),
          communications: precedent.communications.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          cahiers_textes: precedent.cahiers_textes.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          soutenances: precedent.soutenances.filter((x) => x.id_etablissement !== id_etablissement),
          livres_bibliotheque: precedent.livres_bibliotheque.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          emprunts_bibliotheque: precedent.emprunts_bibliotheque.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          visites_infirmerie: precedent.visites_infirmerie.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          incidents_discipline: precedent.incidents_discipline.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          abonnements: precedent.abonnements.filter((x) => x.id_etablissement !== id_etablissement),
          inventaire: precedent.inventaire.filter((x) => x.id_etablissement !== id_etablissement),
          prets_materiels: precedent.prets_materiels.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          anciens: precedent.anciens.filter((x) => x.id_etablissement !== id_etablissement),
          ressources_lms: precedent.ressources_lms.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          devoirs_lms: precedent.devoirs_lms.filter((x) => x.id_etablissement !== id_etablissement),
          remises_devoirs_lms: precedent.remises_devoirs_lms.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          articles_actualites: precedent.articles_actualites.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          consentements_rgpd: precedent.consentements_rgpd.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          demandes_rgpd: precedent.demandes_rgpd.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          fils_discussion: precedent.fils_discussion.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          badges_attribues: precedent.badges_attribues.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          journaux_importations: precedent.journaux_importations.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          demandes_conge: precedent.demandes_conge.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          journaux_audit: precedent.journaux_audit.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          file_hors_ligne: precedent.file_hors_ligne.filter(
            (x) => x.id_etablissement !== id_etablissement
          ),
          surcharges_permissions: surcharges_nettoyees,
          utilisateurs: precedent.utilisateurs.map((u) => ({
            ...u,
            affiliations: u.affiliations.filter((a) => a.id_etablissement !== id_etablissement),
          })),
        };
      });

      definir_notifications((precedent) =>
        precedent.filter((n) => n.id_etablissement !== id_etablissement)
      );

      if (id_etablissement_actif === id_etablissement && etablissement_repli) {
        definir_id_apprenant_selectionne(null);
        definir_surcharge_role(null);
        if (utilisateur_actif.est_super_admin_plateforme) {
          definir_id_etablissement_actif(etablissement_repli.id);
          definir_devise_active(etablissement_repli.devise_defaut);
          definir_route_active_interne('plateforme');
        } else {
          const autre_affiliation = utilisateur_actif.affiliations.find(
            (a) =>
              a.id_etablissement !== id_etablissement &&
              etablissements_restants.some((e) => e.id === a.id_etablissement)
          );
          if (autre_affiliation) {
            const etablissement_suivant =
              etablissements_restants.find((e) => e.id === autre_affiliation.id_etablissement) ??
              etablissement_repli;
            definir_id_etablissement_actif(etablissement_suivant.id);
            definir_devise_active(etablissement_suivant.devise_defaut);
            definir_route_active_interne('tableau_de_bord');
          } else {
            const utilisateur_repli =
              etat.utilisateurs.find(
                (u) =>
                  !u.est_super_admin_plateforme &&
                  u.affiliations.some((a) => a.id_etablissement === etablissement_repli.id)
              ) ?? UTILISATEURS_INITIAUX[1];
            definir_id_etablissement_actif(etablissement_repli.id);
            definir_id_utilisateur_actif(utilisateur_repli.id);
            definir_devise_active(etablissement_repli.devise_defaut);
            definir_route_active_interne('tableau_de_bord');
            definir_mode_affichage('accueil');
          }
        }
      }

      if (etablissement_repli) {
        ajouter_entree_audit({
          id_etablissement: etablissement_repli.id,
          nom_acteur: utilisateur_actif.nom_complet,
          role_acteur: (ROLES[id_role_actif] ?? ROLES.DIRECTEUR).libelle,
          action: `Suppression définitive d’établissement [${cible.code}]`,
          cible: cible.nom,
          categorie: 'CONFIG',
        });
      }

      ajouter_toast({
        titre: `Établissement supprimé : ${cible.nom_court}`,
        description: 'Toutes les données isolées de cet établissement ont été purgées.',
        variante: 'info',
      });
      return true;
    },
    [
      etat.etablissements,
      etat.utilisateurs,
      id_etablissement_actif,
      utilisateur_actif,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const ouvrir_session_api = useCallback(
    async (
      id_etablissement_prefere?: string
    ): Promise<{ ok: boolean; erreur?: string }> => {
      const [profil, etablissements_api] = await Promise.all([
        requeteApi<ProfilApi>('/auth/me/'),
        requeteApi<ConfigurationEtablissement[]>('/etablissements/'),
      ]);
      const configuration_logo_api = await requeteApi<{ url_logo: string }>(
        '/plateforme/configuration/'
      );
      if (!profil.est_actif) {
        return { ok: false, erreur: 'Ce compte utilisateur est désactivé.' };
      }

      const etablissements_accessibles = profil.est_super_admin_plateforme
        ? etablissements_api
        : etablissements_api.filter((etablissement) =>
            profil.affiliations.some(
              (affiliation) => affiliation.id_etablissement === etablissement.id
            )
          );
      const etablissement_api =
        etablissements_accessibles.find(
          (etablissement) => etablissement.id === id_etablissement_prefere
        ) ??
        etablissements_accessibles.find((etablissement) =>
          profil.affiliations.some(
            (affiliation) => affiliation.id_etablissement === etablissement.id
          )
        ) ??
        etablissements_accessibles[0];
      const utilisateur_source =
        etat.utilisateurs.find((utilisateur) => utilisateur.id === profil.id) ??
        UTILISATEURS_INITIAUX.find((utilisateur) => utilisateur.id === profil.id);
      const initiales = profil.nom_complet
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((mot) => mot[0]?.toUpperCase() ?? '')
        .join('');
      const utilisateur_api: CompteUtilisateur = {
        ...(utilisateur_source ?? {
          id: profil.id,
          nom_complet: profil.nom_complet,
          courriel: profil.courriel,
          telephone: profil.telephone,
          mot_de_passe_demo: '',
          initiales_avatar: initiales,
          affiliations: [],
        }),
        id: profil.id,
        nom_complet: profil.nom_complet,
        courriel: profil.courriel,
        telephone: profil.telephone,
        url_avatar: profil.url_avatar ?? undefined,
        affiliations: profil.affiliations,
        est_super_admin_plateforme: profil.est_super_admin_plateforme,
        est_actif: profil.est_actif,
        mot_de_passe_demo: '',
      };
      if (!etablissement_api) {
        if (profil.est_super_admin_plateforme) {
          const donnees_api: Partial<EtatPersiste> = {};
          for (const { cle } of COLLECTIONS_API) {
            (donnees_api as Record<string, unknown>)[cle] = [];
          }
          const nouvel_etat: EtatPersiste = {
            ...etat,
            ...donnees_api,
            configuration_plateforme: {
              ...etat.configuration_plateforme,
              url_logo: configuration_logo_api.url_logo || undefined,
            },
            etablissements: [],
            utilisateurs: [utilisateur_api],
            journaux_audit: [],
            file_hors_ligne: [],
            surcharges_permissions: {},
          };
          instantane_api.current = nouvel_etat;
          definir_etat(nouvel_etat);
          definir_id_utilisateur_actif(profil.id);
          definir_surcharge_role(null);
          definir_id_apprenant_selectionne(null);
          definir_id_etablissement_actif('');
          definir_route_active_interne('plateforme');
          definir_est_authentifie(true);
          definir_mode_affichage('espace_travail');
          definir_ecran_connexion_ouvert(false);
          ajouter_toast({
            titre: `Connecté : ${profil.nom_complet}`,
            description: 'Rôle actif : Super-administrateur Plateforme',
            variante: 'success',
          });
          return { ok: true };
        }
        return {
          ok: false,
          erreur: 'Aucun établissement autorisé n’est associé à ce compte.',
        };
      }
      const donnees_api: Partial<EtatPersiste> = {};
      await Promise.all(
        COLLECTIONS_API.map(async ({ cle, collection }) => {
          const lignes = await charger_collection_api(etablissement_api.id, collection);
          (donnees_api as Record<string, unknown>)[cle] = lignes;
        })
      );
      const surcharges_permissions = await charger_surcharges_permissions_api(
        etablissement_api.id
      );

      const utilisateurs_api = await charger_utilisateurs_api(
        etablissement_api.id,
        utilisateur_api
      );
      const journaux_audit_api = await charger_journaux_audit_api(etablissement_api.id);
      const etablissements_fusionnes = etablissements_api.map((etablissement) => ({
        ...etat.etablissements.find((existant) => existant.id === etablissement.id),
        ...etablissement,
      }));
      const nouvel_etat: EtatPersiste = {
        ...etat,
        ...donnees_api,
        configuration_plateforme: {
          ...etat.configuration_plateforme,
          url_logo: configuration_logo_api.url_logo || undefined,
        },
        etablissements: etablissements_fusionnes,
        utilisateurs: utilisateurs_api,
        journaux_audit: journaux_audit_api,
        file_hors_ligne: [],
        surcharges_permissions,
      };
      instantane_api.current = nouvel_etat;
      definir_etat(nouvel_etat);
      definir_id_utilisateur_actif(profil.id);
      definir_surcharge_role(null);
      definir_id_apprenant_selectionne(null);
      definir_id_etablissement_actif(etablissement_api.id);
      definir_devise_active(etablissement_api.devise_defaut);
      const affiliation = profil.affiliations.find(
        (element) => element.id_etablissement === etablissement_api.id
      );
      const id_role: IdentifiantRole = profil.est_super_admin_plateforme
        ? 'SUPER_ADMIN'
        : affiliation?.id_role ?? 'AUDITEUR';
      definir_route_active_interne(
        profil.est_super_admin_plateforme && !id_etablissement_prefere
          ? 'plateforme'
          : id_role === 'PARENT'
            ? 'portail_parent'
            : id_role === 'APPRENANT'
              ? 'portail_apprenant'
              : id_role === 'ENSEIGNANT'
                ? 'portail_enseignant'
                : 'tableau_de_bord'
      );
      definir_est_authentifie(true);
      definir_mode_affichage('espace_travail');
      definir_ecran_connexion_ouvert(false);
      ajouter_entree_audit({
        id_etablissement: etablissement_api.id,
        nom_acteur: profil.nom_complet,
        role_acteur: (ROLES[id_role] ?? ROLES.DIRECTEUR).libelle,
        action: 'Connexion à la session',
        cible: etablissement_api.nom_court,
        categorie: 'AUTH',
      });
      ajouter_toast({
        titre: `Connecté : ${profil.nom_complet}`,
        description: `Rôle actif : ${(ROLES[id_role] ?? ROLES.DIRECTEUR).libelle}`,
        variante: 'success',
      });
      return { ok: true };
    },
    [ajouter_entree_audit, ajouter_toast, etat.etablissements, etat.utilisateurs]
  );

  useEffect(() => {
    if (!SOURCE_API || !est_authentifie || !instantane_api.current) return;
    const etat_courant = etat;
    const execution = file_synchronisation_api.current.then(async () => {
      const instantane_precedent = instantane_api.current;
      if (!instantane_precedent) return;
      for (const { cle, collection } of COLLECTIONS_API) {
        const anciennes_lignes = instantane_precedent[cle];
        const nouvelles_lignes = etat_courant[cle];
        if (!Array.isArray(anciennes_lignes) || !Array.isArray(nouvelles_lignes)) continue;
        const obtenir_reference = (ligne: unknown): { cle: string; id: string; tenant: string } => {
          if (!ligne || typeof ligne !== 'object') {
            throw new Error('Une donnée métier API doit être un objet.');
          }
          const donnee = ligne as { id?: unknown; id_etablissement?: unknown };
          if (typeof donnee.id !== 'string' || typeof donnee.id_etablissement !== 'string') {
            throw new Error('Une donnée métier API doit préciser son identifiant et son établissement.');
          }
          return {
            cle: `${donnee.id_etablissement}:${donnee.id}`,
            id: donnee.id,
            tenant: donnee.id_etablissement,
          };
        };
        const anciennes = new Map(
          anciennes_lignes.map((ligne) => [obtenir_reference(ligne).cle, ligne])
        );
        const nouvelles = new Map(
          nouvelles_lignes.map((ligne) => [obtenir_reference(ligne).cle, ligne])
        );
        for (const [cle_ligne, ancienne] of anciennes) {
          if (nouvelles.has(cle_ligne)) continue;
          const ligne = obtenir_reference(ancienne);
          const collection_typed = COLLECTIONS_RELATIONNELLES_TYPED.has(collection);
          const base = collection_typed
            ? `/etablissements/${encodeURIComponent(ligne.tenant)}/${collection}/`
            : `/etablissements/${encodeURIComponent(ligne.tenant)}/donnees/${collection}/`;
          await requeteApi<null>(
            `${base}${encodeURIComponent(ligne.id)}/`,
            { method: 'DELETE' }
          );
        }
        for (const [cle_ligne, nouvelle] of nouvelles) {
          const ancienne = anciennes.get(cle_ligne);
          const donnee = obtenir_reference(nouvelle);
          const collection_typed = COLLECTIONS_RELATIONNELLES_TYPED.has(collection);
          const base = collection_typed
            ? `/etablissements/${encodeURIComponent(donnee.tenant)}/${collection}/`
            : `/etablissements/${encodeURIComponent(donnee.tenant)}/donnees/${collection}/`;
          if (!ancienne) {
            await requeteApi<unknown>(base, { method: 'POST', body: nouvelle });
          } else if (JSON.stringify(ancienne) !== JSON.stringify(nouvelle)) {
            await requeteApi<unknown>(`${base}${encodeURIComponent(donnee.id)}/`, {
              method: 'PATCH',
              body: nouvelle,
            });
          }
        }
      }
      instantane_api.current = etat_courant;
    });
    file_synchronisation_api.current = execution.catch((erreur: unknown) => {
      ajouter_toast({
        titre: 'Synchronisation API impossible',
        description:
          erreur instanceof Error ? erreur.message : 'Une erreur empêche la synchronisation.',
        variante: 'error',
      });
    });
  }, [ajouter_toast, est_authentifie, etat]);

  const restauration_session_api_effectuee = useRef(false);
  useEffect(() => {
    if (
      !SOURCE_API ||
      !sessionApiPresente() ||
      restauration_session_api_effectuee.current
    ) {
      return;
    }
    restauration_session_api_effectuee.current = true;
    void ouvrir_session_api().then((resultat) => {
      if (!resultat.ok) {
        ajouter_toast({
          titre: 'Session API indisponible',
          description: resultat.erreur ?? 'Veuillez vous reconnecter.',
          variante: 'error',
        });
      }
    }).catch((erreur: unknown) => {
      ajouter_toast({
        titre: 'Connexion au serveur impossible',
        description:
          erreur instanceof Error ? erreur.message : 'Le serveur API est indisponible.',
        variante: 'error',
      });
    });
  }, [ajouter_toast, ouvrir_session_api]);

  const connecter_utilisateur = useCallback(
    (id_utilisateur: string, id_etablissement_prefere?: string) => {
      if (SOURCE_API) {
        if (import.meta.env.PROD) {
          ajouter_toast({
            titre: 'Accès démo indisponible',
            description: 'Les accès de démonstration sont réservés au développement.',
            variante: 'error',
          });
          return;
        }
        void (async () => {
          try {
            await connecterDemoApi(id_utilisateur, id_etablissement_prefere);
            const resultat = await ouvrir_session_api(id_etablissement_prefere);
            if (!resultat.ok) {
              ajouter_toast({
                titre: 'Connexion impossible',
                description: resultat.erreur ?? 'Aucun établissement autorisé.',
                variante: 'error',
              });
            }
          } catch (erreur: unknown) {
            ajouter_toast({
              titre: 'Connexion impossible',
              description:
                erreur instanceof Error ? erreur.message : 'Le serveur API est indisponible.',
              variante: 'error',
            });
          }
        })();
        return;
      }
      const utilisateur =
        etat.utilisateurs.find((u) => u.id === id_utilisateur) ??
        UTILISATEURS_INITIAUX.find((u) => u.id === id_utilisateur);
      if (!utilisateur) return;
      if (utilisateur.est_actif === false) {
        ajouter_toast({
          titre: 'Compte suspendu',
          description: 'Ce compte utilisateur est désactivé. Contactez un administrateur.',
          variante: 'error',
        });
        return;
      }
      definir_id_utilisateur_actif(utilisateur.id);
      definir_surcharge_role(null);
      definir_id_apprenant_selectionne(null);
      const id_etablissement_suivant =
        id_etablissement_prefere &&
        (utilisateur.est_super_admin_plateforme ||
          utilisateur.affiliations.some((a) => a.id_etablissement === id_etablissement_prefere))
          ? id_etablissement_prefere
          : utilisateur.affiliations[0]?.id_etablissement ??
            etat.etablissements[0]?.id ??
            id_etablissement_actif;
      definir_id_etablissement_actif(id_etablissement_suivant);
      const etablissement_suivant =
        etat.etablissements.find((e) => e.id === id_etablissement_suivant) ??
        etat.etablissements[0];
      if (etablissement_suivant) definir_devise_active(etablissement_suivant.devise_defaut);

      const affiliation_suivante = utilisateur.affiliations.find(
        (a) => a.id_etablissement === id_etablissement_suivant
      );
      const id_role: IdentifiantRole = utilisateur.est_super_admin_plateforme
        ? 'SUPER_ADMIN'
        : affiliation_suivante?.id_role ?? 'AUDITEUR';

      if (utilisateur.est_super_admin_plateforme && !id_etablissement_prefere) {
        definir_route_active_interne('plateforme');
      } else if (id_role === 'PARENT') {
        definir_route_active_interne('portail_parent');
      } else if (id_role === 'APPRENANT') {
        definir_route_active_interne('portail_apprenant');
      } else if (id_role === 'ENSEIGNANT') {
        definir_route_active_interne('portail_enseignant');
      } else {
        definir_route_active_interne('tableau_de_bord');
      }

      definir_est_authentifie(true);
      definir_mode_affichage('espace_travail');
      definir_ecran_connexion_ouvert(false);
      ajouter_entree_audit({
        id_etablissement: id_etablissement_suivant,
        nom_acteur: utilisateur.nom_complet,
        role_acteur: (ROLES[id_role] ?? ROLES.DIRECTEUR).libelle,
        action: 'Connexion à la session',
        cible: etablissement_suivant?.nom_court ?? id_etablissement_suivant,
        categorie: 'AUTH',
      });
      ajouter_toast({
        titre: `Connecté : ${utilisateur.nom_complet}`,
        description: `Rôle actif : ${(ROLES[id_role] ?? ROLES.DIRECTEUR).libelle}`,
        variante: 'success',
      });
    },
    [
      id_etablissement_actif,
      ajouter_entree_audit,
      etat.etablissements,
      etat.utilisateurs,
      ajouter_toast,
      ouvrir_session_api,
    ]
  );

  const connecter_avec_google = useCallback(async (): Promise<{
    ok: boolean;
    besoin_etablissement?: boolean;
    erreur?: string;
  }> => {
    if (SOURCE_API) {
      return {
        ok: false,
        erreur: 'La connexion Google n’est pas encore configurée avec le serveur API.',
      };
    }
    try {
      const utilisateur_google = await connecter_avec_popup_google();
      const courriel_normalise = utilisateur_google.courriel.trim().toLowerCase();
      const existant = etat.utilisateurs.find(
        (u) => u.courriel.trim().toLowerCase() === courriel_normalise
      );

      if (existant) {
        if (existant.est_actif === false) {
          await deconnecter_firebase();
          return {
            ok: false,
            erreur:
              'Ce compte utilisateur est actuellement suspendu par un administrateur. Contactez la direction.',
          };
        }

        if (utilisateur_google.url_photo && !existant.url_avatar) {
          definir_etat((precedent) => ({
            ...precedent,
            utilisateurs: precedent.utilisateurs.map((u) =>
              u.id === existant.id ? { ...u, url_avatar: utilisateur_google.url_photo } : u
            ),
          }));
        }

        if (!existant.est_super_admin_plateforme && existant.affiliations.length === 0) {
          definir_id_utilisateur_actif(existant.id);
          definir_surcharge_role(null);
          definir_id_apprenant_selectionne(null);
          definir_ecran_connexion_ouvert(false);
          definir_est_authentifie(true);
          definir_mode_affichage('accueil');
          definir_modale_nouvel_etablissement_ouverte(true);
          ajouter_toast({
            titre: `Bienvenue ${existant.nom_complet}`,
            description:
              'Compte Google vérifié. Créez votre établissement pour ouvrir votre espace isolé.',
            variante: 'info',
          });
          return { ok: true, besoin_etablissement: true };
        }

        connecter_utilisateur(existant.id);
        return { ok: true };
      }

      const initiales =
        utilisateur_google.nom_affiche
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((m) => m[0]?.toUpperCase() ?? '')
          .join('') || 'UG';

      const nouvel_utilisateur: CompteUtilisateur = {
        id: `usr-google-${utilisateur_google.uid.slice(0, 12)}`,
        nom_complet: utilisateur_google.nom_affiche,
        courriel: utilisateur_google.courriel,
        telephone: '',
        mot_de_passe_demo: '',
        initiales_avatar: initiales,
        url_avatar: utilisateur_google.url_photo,
        est_actif: true,
        mot_de_passe_mis_a_jour_le: new Date().toISOString(),
        affiliations: [],
      };

      definir_etat((precedent) => ({
        ...precedent,
        utilisateurs: [...precedent.utilisateurs, nouvel_utilisateur],
      }));
      definir_id_utilisateur_actif(nouvel_utilisateur.id);
      definir_surcharge_role(null);
      definir_id_apprenant_selectionne(null);
      definir_ecran_connexion_ouvert(false);
      definir_est_authentifie(true);
      definir_mode_affichage('accueil');
      definir_modale_nouvel_etablissement_ouverte(true);

      ajouter_toast({
        titre: `Connecté avec Google (${utilisateur_google.courriel})`,
        description:
          'Aucun établissement rattaché pour le moment : créez votre propre école isolée.',
        variante: 'info',
      });
      return { ok: true, besoin_etablissement: true };
    } catch (erreur: unknown) {
      const code = (erreur as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { ok: false, erreur: 'Fenêtre de connexion Google fermée avant validation.' };
      }
      if (code === 'auth/popup-blocked') {
        return {
          ok: false,
          erreur:
            'La fenêtre contextuelle Google a été bloquée par le navigateur. Autorisez les popups pour ce site.',
        };
      }
      return {
        ok: false,
        erreur:
          erreur instanceof Error
            ? erreur.message
            : 'Impossible de finaliser la connexion avec Google.',
      };
    }
  }, [etat.utilisateurs, connecter_utilisateur, ajouter_toast]);

  const trouver_utilisateur_par_identifiant = useCallback(
    (identifiant: string): CompteUtilisateur | undefined => {
      const brut = identifiant.trim().toLowerCase();
      if (!brut) return undefined;
      return etat.utilisateurs.find((u) => {
        return (
          u.courriel.toLowerCase() === brut ||
          u.telephone.toLowerCase() === brut ||
          (u.est_super_admin_plateforme &&
            (brut === 'superuser' || brut === 'superadmin' || brut === 'admin'))
        );
      });
    },
    [etat.utilisateurs]
  );

  const authentifier_par_identifiants = useCallback(
    (identifiant: string, mot_de_passe: string): { ok: boolean; erreur?: string } => {
      const trouve = trouver_utilisateur_par_identifiant(identifiant);
      if (!trouve) {
        return {
          ok: false,
          erreur:
            'Aucun compte trouvé pour cet identifiant. Vérifiez le courriel, le téléphone ou utilisez « superuser ».',
        };
      }

      if (trouve.est_actif === false) {
        return {
          ok: false,
          erreur:
            'Ce compte utilisateur est actuellement suspendu par un administrateur. Contactez la direction.',
        };
      }

      if (trouve.verrouille_jusqua) {
        const horodatage_verrou = new Date(trouve.verrouille_jusqua).getTime();
        if (horodatage_verrou > Date.now()) {
          const minutes_restantes = Math.max(
            1,
            Math.ceil((horodatage_verrou - Date.now()) / 60000)
          );
          return {
            ok: false,
            erreur: `Compte temporairement verrouillé suite à 5 échecs. Réessayez dans ${minutes_restantes} min ou utilisez « Mot de passe oublié ? ».`,
          };
        }
      }

      if (trouve.mot_de_passe_demo !== mot_de_passe) {
        const tentatives_suivantes = (trouve.tentatives_connexion_echouees ?? 0) + 1;
        const doit_verrouiller = tentatives_suivantes >= 5;
        const verrouille_jusqua = doit_verrouiller
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
          : undefined;

        definir_etat((precedent) => ({
          ...precedent,
          utilisateurs: precedent.utilisateurs.map((u) =>
            u.id === trouve.id
              ? {
                  ...u,
                  tentatives_connexion_echouees: doit_verrouiller ? 0 : tentatives_suivantes,
                  verrouille_jusqua,
                }
              : u
          ),
        }));

        if (doit_verrouiller) {
          ajouter_entree_audit({
            id_etablissement: trouve.affiliations[0]?.id_etablissement ?? id_etablissement_actif,
            nom_acteur: trouve.nom_complet,
            role_acteur: 'Sécurité Auth',
            action: 'Verrouillage temporaire anti-bruteforce (15 min)',
            cible: trouve.courriel,
            categorie: 'AUTH',
          });
          return {
            ok: false,
            erreur:
              'Trop de tentatives infructueuses (5/5). Compte verrouillé 15 minutes — réinitialisez le mot de passe ou demandez le déblocage.',
          };
        }

        const restantes = 5 - tentatives_suivantes;
        return {
          ok: false,
          erreur: `Mot de passe incorrect. Il reste ${restantes} tentative${restantes > 1 ? 's' : ''} avant verrouillage temporaire.`,
        };
      }

      if ((trouve.tentatives_connexion_echouees ?? 0) > 0 || trouve.verrouille_jusqua) {
        definir_etat((precedent) => ({
          ...precedent,
          utilisateurs: precedent.utilisateurs.map((u) =>
            u.id === trouve.id
              ? { ...u, tentatives_connexion_echouees: 0, verrouille_jusqua: undefined }
              : u
          ),
        }));
      }

      connecter_utilisateur(trouve.id);
      return { ok: true };
    },
    [trouver_utilisateur_par_identifiant, id_etablissement_actif, ajouter_entree_audit, connecter_utilisateur]
  );

  const authentifier_par_identifiants_api = useCallback(
    async (identifiant: string, mot_de_passe: string): Promise<{ ok: boolean; erreur?: string }> => {
      try {
        await connecterApi(identifiant, mot_de_passe);
        const resultat = await ouvrir_session_api();
        return resultat.ok
          ? resultat
          : {
              ok: false,
              erreur: resultat.erreur ?? 'Aucun établissement autorisé n’est associé à ce compte.',
            };
      } catch (erreur: unknown) {
        return {
          ok: false,
          erreur: erreur instanceof Error ? erreur.message : 'La connexion au serveur a échoué.',
        };
      }
    },
    [ouvrir_session_api]
  );

  const demander_reinitialisation_mot_de_passe = useCallback(
    (
      identifiant: string
    ): { ok: boolean; erreur?: string; cible_masquee?: string; otp_demo?: string } => {
      const trouve = trouver_utilisateur_par_identifiant(identifiant);
      if (!trouve) {
        return {
          ok: false,
          erreur: 'Aucun compte correspondant à cet identifiant ou courriel.',
        };
      }
      if (trouve.est_actif === false) {
        return {
          ok: false,
          erreur: 'Ce compte est suspendu. Contactez un administrateur pour le réactiver.',
        };
      }

      const code = generer_code_otp();
      definir_jetons_reinitialisation((precedent) => ({
        ...precedent,
        [trouve.id]: {
          code,
          expire_le: Date.now() + 15 * 60 * 1000,
        },
      }));

      ajouter_entree_audit({
        id_etablissement: trouve.affiliations[0]?.id_etablissement ?? id_etablissement_actif,
        nom_acteur: trouve.nom_complet,
        role_acteur: 'Récupération Auth',
        action: 'Demande de réinitialisation mot de passe (code OTP)',
        cible: trouve.courriel,
        categorie: 'AUTH',
      });

      ajouter_toast({
        titre: 'Code de vérification généré',
        description: `Destinataire : ${masquer_courriel_ou_telephone(trouve.courriel)}`,
        variante: 'info',
      });

      return {
        ok: true,
        cible_masquee: masquer_courriel_ou_telephone(trouve.courriel),
        otp_demo: code,
      };
    },
    [trouver_utilisateur_par_identifiant, id_etablissement_actif, ajouter_entree_audit, ajouter_toast]
  );

  const confirmer_reinitialisation_mot_de_passe = useCallback(
    (
      identifiant: string,
      code_otp: string,
      nouveau_mot_de_passe: string
    ): { ok: boolean; erreur?: string } => {
      const trouve = trouver_utilisateur_par_identifiant(identifiant);
      if (!trouve) {
        return { ok: false, erreur: 'Compte introuvable.' };
      }

      const jeton = jetons_reinitialisation[trouve.id];
      if (!jeton) {
        return {
          ok: false,
          erreur: 'Aucun code de réinitialisation actif. Demandez un nouveau code.',
        };
      }
      if (Date.now() > jeton.expire_le) {
        return {
          ok: false,
          erreur: 'Ce code a expiré (validité 15 min). Veuillez en demander un nouveau.',
        };
      }
      if (jeton.code !== code_otp.trim()) {
        return {
          ok: false,
          erreur: 'Code de vérification incorrect.',
        };
      }

      const politique = valider_politique_mot_de_passe(nouveau_mot_de_passe);
      if (!politique.valide) {
        return { ok: false, erreur: politique.message };
      }

      const aujourdhui = new Date().toISOString().slice(0, 10);
      definir_etat((precedent) => ({
        ...precedent,
        utilisateurs: precedent.utilisateurs.map((u) =>
          u.id === trouve.id
            ? {
                ...u,
                mot_de_passe_demo: nouveau_mot_de_passe.trim(),
                mot_de_passe_mis_a_jour_le: aujourdhui,
                doit_changer_mot_de_passe: false,
                tentatives_connexion_echouees: 0,
                verrouille_jusqua: undefined,
              }
            : u
        ),
      }));

      definir_jetons_reinitialisation((precedent) => {
        const copie = { ...precedent };
        delete copie[trouve.id];
        return copie;
      });

      ajouter_entree_audit({
        id_etablissement: trouve.affiliations[0]?.id_etablissement ?? id_etablissement_actif,
        nom_acteur: trouve.nom_complet,
        role_acteur: 'Récupération Auth',
        action: 'Mot de passe réinitialisé via code OTP',
        cible: trouve.courriel,
        categorie: 'AUTH',
      });

      ajouter_toast({
        titre: 'Mot de passe réinitialisé',
        description: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
        variante: 'success',
      });
      return { ok: true };
    },
    [
      trouver_utilisateur_par_identifiant,
      jetons_reinitialisation,
      id_etablissement_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const deconnecter = useCallback(() => {
    if (SOURCE_API) {
      void deconnecterApi().catch((erreur: unknown) => {
        ajouter_toast({
          titre: 'Session fermée localement',
          description:
            erreur instanceof Error
              ? `La révocation du jeton a échoué : ${erreur.message}`
              : 'La révocation du jeton côté serveur a échoué.',
          variante: 'error',
        });
      });
    } else {
      void deconnecter_firebase();
    }
    definir_surcharge_role(null);
    definir_id_apprenant_selectionne(null);
    definir_ecran_connexion_ouvert(false);
    definir_est_authentifie(false);
    definir_mode_affichage('accueil');
    ajouter_toast({
      titre: 'Session déconnectée',
      description: `Vous êtes revenu sur la page d’accueil ${etat.configuration_plateforme.nom_plateforme}.`,
      variante: 'info',
    });
  }, [ajouter_toast, etat.configuration_plateforme.nom_plateforme]);

  const simuler_role_etablissement = useCallback(
    (id_role: IdentifiantRole, options?: { rester_sur_vue?: boolean }) => {
      if (id_role === 'SUPER_ADMIN' && !utilisateur_actif.est_super_admin_plateforme) {
        ajouter_toast({
          titre: 'Action non autorisée',
          description: 'Le rôle Super-Administrateur Plateforme est réservé à l’opérateur SaaS.',
          variante: 'error',
        });
        return;
      }
      definir_surcharge_role(id_role);
      definir_id_apprenant_selectionne(null);
      if (!options?.rester_sur_vue) {
        if (id_role === 'PARENT' && etablissement_actif.type === 'SCOLAIRE') {
          definir_route_active_interne('portail_parent');
        } else if (id_role === 'APPRENANT') {
          definir_route_active_interne('portail_apprenant');
        } else if (id_role === 'ENSEIGNANT') {
          definir_route_active_interne('portail_enseignant');
        } else if (id_role !== 'PARENT' && route_active === 'portail_parent') {
          definir_route_active_interne('tableau_de_bord');
        }
      }
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role].libelle,
        action: `Basculement de simulation RBAC vers ${ROLES[id_role].libelle}`,
        cible: etablissement_actif.nom_court,
        categorie: 'RBAC',
      });
      ajouter_toast({
        titre: `Vue simulée : ${ROLES[id_role].libelle_court}`,
        description: 'Menus et permissions recalculés instantanément.',
        variante: 'info',
      });
    },
    [
      etablissement_actif,
      route_active,
      ajouter_entree_audit,
      utilisateur_actif.nom_complet,
      utilisateur_actif.est_super_admin_plateforme,
      ajouter_toast,
    ]
  );

  const definir_route_active = useCallback((route: IdentifiantRoute) => {
    definir_id_apprenant_selectionne(null);
    definir_route_active_interne(route);
  }, []);

  const ouvrir_dossier_apprenant = useCallback((id_apprenant: string) => {
    definir_id_apprenant_selectionne(id_apprenant);
    definir_route_active_interne('apprenants');
  }, []);

  const fermer_dossier_apprenant = useCallback(() => {
    definir_id_apprenant_selectionne(null);
  }, []);

  const basculer_theme = useCallback(() => {
    definir_theme((precedent) => (precedent === 'clair' ? 'sombre' : 'clair'));
  }, []);

  const marquer_toutes_notifications_lues = useCallback(() => {
    definir_notifications((precedent) =>
      precedent.map((n) =>
        n.id_etablissement === etablissement_actif.id ? { ...n, lue: true } : n
      )
    );
  }, [etablissement_actif.id]);

  // Actions CRUD Métier
  const inscrire_apprenant = useCallback(
    (
      apprenant: Apprenant,
      paiement_initial?: Omit<PaiementEnregistre, 'id' | 'id_etablissement'>,
      options_inscription?: {
        type_inscription?: InscriptionApprenant['type_inscription'];
        annee_academique?: string;
        libelle_periode?: string;
        montant_brut_htg?: number;
        pieces_fournies?: string[];
        option_cantine?: boolean;
        option_transport?: boolean;
        observations?: string;
      }
    ): boolean => {
      const unite_cible = etat.unites.find((u) => u.id === apprenant.id_unite);
      const apprenant_enrichi: Apprenant = {
        ...apprenant,
        echeancier:
          apprenant.echeancier && apprenant.echeancier.length > 0
            ? apprenant.echeancier
            : construire_echeancier_defaut(
                apprenant.total_du_htg,
                apprenant.total_paye_htg,
                apprenant.date_inscription,
                unite_cible?.frais_inscription_htg
              ),
      };

      const enregistrement_paiement: PaiementEnregistre | null =
        paiement_initial && paiement_initial.montant_htg > 0
          ? {
              ...paiement_initial,
              id: `pay-${Date.now()}`,
              id_etablissement: etablissement_actif.id,
            }
          : null;

      const montant_brut_calcule =
        options_inscription?.montant_brut_htg ??
        (unite_cible
          ? unite_cible.frais_inscription_htg + unite_cible.frais_scolarite_htg
          : apprenant.total_du_htg);

      const fiche_inscription: InscriptionApprenant = {
        id: `ins-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        id_etablissement: etablissement_actif.id,
        id_apprenant: apprenant_enrichi.id,
        numero_inscription: `INS-${etablissement_actif.code}-${new Date().getFullYear()}-${String(
          Math.floor(1000 + Math.random() * 8999)
        )}`,
        annee_academique: options_inscription?.annee_academique ?? etablissement_actif.annee_academique,
        libelle_periode: options_inscription?.libelle_periode ?? etablissement_actif.libelle_periode_courante,
        id_unite: apprenant_enrichi.id_unite,
        libelle_niveau: apprenant_enrichi.libelle_niveau,
        type_inscription: options_inscription?.type_inscription ?? 'NOUVELLE',
        date_inscription: apprenant_enrichi.date_inscription,
        statut_inscription: 'VALIDEE',
        montant_brut_htg: montant_brut_calcule,
        pourcentage_bourse: apprenant_enrichi.pourcentage_bourse ?? 0,
        montant_net_htg: apprenant_enrichi.total_du_htg,
        pieces_fournies: options_inscription?.pieces_fournies ?? [],
        option_cantine: options_inscription?.option_cantine,
        option_transport: options_inscription?.option_transport,
        observations: options_inscription?.observations,
        cree_le: new Date().toISOString().slice(0, 10),
      };

      definir_etat((precedent) => ({
        ...precedent,
        apprenants: [apprenant_enrichi, ...precedent.apprenants],
        inscriptions: [fiche_inscription, ...precedent.inscriptions],
        paiements: enregistrement_paiement
          ? [enregistrement_paiement, ...precedent.paiements]
          : precedent.paiements,
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Nouvelle inscription (${fiche_inscription.numero_inscription} · ${apprenant.matricule})`,
        cible: `${apprenant.prenom} ${apprenant.nom}`,
        categorie: 'ADMISSION',
      });
      ajouter_toast({
        titre: `Inscription validée : ${apprenant.matricule}`,
        description: `${apprenant.prenom} ${apprenant.nom} ajouté(e) à ${etablissement_actif.nom_court}.`,
        variante: 'success',
      });
      return true;
    },
    [
      etat.unites,
      etablissement_actif.id,
      etablissement_actif.code,
      etablissement_actif.annee_academique,
      etablissement_actif.libelle_periode_courante,
      etablissement_actif.nom_court,
      ajouter_entree_audit,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_toast,
    ]
  );

  const reinscrire_apprenant = useCallback(
    (saisie: {
      id_apprenant: string;
      id_unite: string;
      libelle_niveau: string;
      annee_academique: string;
      libelle_periode: string;
      pourcentage_bourse: number;
      montant_brut_htg: number;
      montant_net_htg: number;
      pieces_fournies: string[];
      observations?: string;
      paiement_initial?: Omit<PaiementEnregistre, 'id' | 'id_etablissement'>;
    }): InscriptionApprenant | null => {
      if (!a_permission('admissions:gerer')) {
        ajouter_toast({
          titre: 'Permission requise',
          description: 'Vous n’avez pas les droits pour effectuer une réinscription.',
          variante: 'error',
        });
        return null;
      }
      const apprenant_cible = etat.apprenants.find(
        (a) => a.id === saisie.id_apprenant && a.id_etablissement === etablissement_actif.id
      );
      if (!apprenant_cible) return null;

      const aujourdhui = new Date().toISOString().slice(0, 10);
      const unite_cible = etat.unites.find((u) => u.id === saisie.id_unite);
      const fiche: InscriptionApprenant = {
        id: `ins-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        id_etablissement: etablissement_actif.id,
        id_apprenant: apprenant_cible.id,
        numero_inscription: `REINS-${etablissement_actif.code}-${new Date().getFullYear()}-${String(
          Math.floor(1000 + Math.random() * 8999)
        )}`,
        annee_academique: saisie.annee_academique,
        libelle_periode: saisie.libelle_periode,
        id_unite: saisie.id_unite,
        libelle_niveau: saisie.libelle_niveau,
        type_inscription: 'REINSCRIPTION',
        date_inscription: aujourdhui,
        statut_inscription: 'VALIDEE',
        montant_brut_htg: saisie.montant_brut_htg,
        pourcentage_bourse: saisie.pourcentage_bourse,
        montant_net_htg: saisie.montant_net_htg,
        pieces_fournies: saisie.pieces_fournies,
        observations: saisie.observations,
        cree_le: aujourdhui,
      };

      const paiement_cree: PaiementEnregistre | null =
        saisie.paiement_initial && saisie.paiement_initial.montant_htg > 0
          ? {
              ...saisie.paiement_initial,
              id: `pay-${Date.now()}`,
              id_etablissement: etablissement_actif.id,
            }
          : null;

      definir_etat((precedent) => ({
        ...precedent,
        inscriptions: [fiche, ...precedent.inscriptions],
        paiements: paiement_cree ? [paiement_cree, ...precedent.paiements] : precedent.paiements,
        apprenants: precedent.apprenants.map((a) => {
          if (a.id !== apprenant_cible.id) return a;
          const nouveau_du = a.total_du_htg + saisie.montant_net_htg;
          const nouveau_paye = a.total_paye_htg + (paiement_cree?.montant_htg ?? 0);
          const statut_paiement: Apprenant['statut_paiement'] =
            nouveau_paye >= nouveau_du
              ? 'A_JOUR'
              : nouveau_paye >= nouveau_du * 0.4
                ? 'PARTIEL'
                : 'EN_RETARD';
          return {
            ...a,
            id_unite: saisie.id_unite,
            libelle_niveau: saisie.libelle_niveau,
            pourcentage_bourse: saisie.pourcentage_bourse,
            statut: a.statut === 'DIPLOME' ? 'ACTIF' : a.statut,
            total_du_htg: nouveau_du,
            total_paye_htg: nouveau_paye,
            statut_paiement,
            echeancier: construire_echeancier_defaut(
              nouveau_du,
              nouveau_paye,
              aujourdhui,
              unite_cible?.frais_inscription_htg
            ),
          };
        }),
      }));

      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Réinscription (${fiche.numero_inscription})`,
        cible: `${apprenant_cible.matricule} · ${apprenant_cible.prenom} ${apprenant_cible.nom}`,
        categorie: 'ADMISSION',
      });
      ajouter_toast({
        titre: `Réinscription enregistrée : ${fiche.numero_inscription}`,
        description: `${apprenant_cible.prenom} ${apprenant_cible.nom} inscrit(e) en ${saisie.libelle_niveau}.`,
        variante: 'success',
      });
      return fiche;
    },
    [
      a_permission,
      etat.apprenants,
      etat.unites,
      etablissement_actif.id,
      etablissement_actif.code,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const modifier_inscription = useCallback(
    (
      id_inscription: string,
      modifications_inscription: Partial<InscriptionApprenant>,
      modifications_apprenant?: Partial<Apprenant>
    ): boolean => {
      if (!a_permission('admissions:gerer')) {
        ajouter_toast({
          titre: 'Action non autorisée',
          description: 'Permission « admissions:gerer » requise pour modifier une inscription.',
          variante: 'error',
        });
        return false;
      }
      const cible = etat.inscriptions.find(
        (i) => i.id === id_inscription && i.id_etablissement === etablissement_actif.id
      );
      if (!cible) return false;
      const aujourdhui = new Date().toISOString().slice(0, 10);

      definir_etat((precedent) => ({
        ...precedent,
        inscriptions: precedent.inscriptions.map((ins) =>
          ins.id === id_inscription
            ? { ...ins, ...modifications_inscription, modifie_le: aujourdhui }
            : ins
        ),
        apprenants: modifications_apprenant
          ? precedent.apprenants.map((a) => {
              if (a.id !== cible.id_apprenant) return a;
              const fusion = { ...a, ...modifications_apprenant };
              const nouveau_du =
                modifications_inscription.montant_net_htg !== undefined
                  ? Math.max(
                      0,
                      a.total_du_htg - cible.montant_net_htg + modifications_inscription.montant_net_htg
                    )
                  : fusion.total_du_htg;
              const statut_paiement: Apprenant['statut_paiement'] =
                fusion.total_paye_htg >= nouveau_du
                  ? 'A_JOUR'
                  : fusion.total_paye_htg >= nouveau_du * 0.4
                    ? 'PARTIEL'
                    : 'EN_RETARD';
              return { ...fusion, total_du_htg: nouveau_du, statut_paiement };
            })
          : precedent.apprenants,
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Modification inscription ${cible.numero_inscription}`,
        cible: cible.id_apprenant,
        categorie: 'ADMISSION',
      });
      ajouter_toast({
        titre: `Inscription ${cible.numero_inscription} mise à jour`,
        description: 'Les données administratives et du dossier ont été synchronisées.',
        variante: 'success',
      });
      return true;
    },
    [
      a_permission,
      etat.inscriptions,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const annuler_inscription = useCallback(
    (id_inscription: string, motif: string): boolean => {
      if (!a_permission('admissions:gerer')) {
        ajouter_toast({ titre: 'Action non autorisée', variante: 'error' });
        return false;
      }
      const cible = etat.inscriptions.find(
        (i) => i.id === id_inscription && i.id_etablissement === etablissement_actif.id
      );
      if (!cible) return false;
      const aujourdhui = new Date().toISOString().slice(0, 10);
      definir_etat((precedent) => ({
        ...precedent,
        inscriptions: precedent.inscriptions.map((ins) =>
          ins.id === id_inscription
            ? {
                ...ins,
                statut_inscription: 'ANNULEE' as StatutInscription,
                motif_statut: motif.trim() || 'Annulation administrative',
                modifie_le: aujourdhui,
              }
            : ins
        ),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Annulation inscription ${cible.numero_inscription}`,
        cible: motif || cible.id_apprenant,
        categorie: 'ADMISSION',
      });
      ajouter_toast({
        titre: `Inscription ${cible.numero_inscription} annulée`,
        description: 'Le dossier apprenant et l’historique financier restent conservés.',
        variante: 'warning',
      });
      return true;
    },
    [
      a_permission,
      etat.inscriptions,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const archiver_inscription = useCallback(
    (id_inscription: string, motif?: string): boolean => {
      if (!a_permission('admissions:gerer')) {
        ajouter_toast({ titre: 'Action non autorisée', variante: 'error' });
        return false;
      }
      const cible = etat.inscriptions.find(
        (i) => i.id === id_inscription && i.id_etablissement === etablissement_actif.id
      );
      if (!cible) return false;
      const aujourdhui = new Date().toISOString().slice(0, 10);
      definir_etat((precedent) => ({
        ...precedent,
        inscriptions: precedent.inscriptions.map((ins) =>
          ins.id === id_inscription
            ? {
                ...ins,
                statut_inscription: 'ARCHIVEE' as StatutInscription,
                motif_statut: motif?.trim() || 'Archivée',
                modifie_le: aujourdhui,
              }
            : ins
        ),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Archivage inscription ${cible.numero_inscription}`,
        cible: cible.id_apprenant,
        categorie: 'ADMISSION',
      });
      ajouter_toast({
        titre: `Inscription ${cible.numero_inscription} archivée`,
        variante: 'info',
      });
      return true;
    },
    [
      a_permission,
      etat.inscriptions,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const supprimer_inscription = useCallback(
    (id_inscription: string): boolean => {
      if (!a_permission('admissions:gerer')) {
        ajouter_toast({
          titre: 'Suppression refusée',
          description: 'Seuls les profils autorisés (Admissions / Direction) peuvent supprimer une inscription.',
          variante: 'error',
        });
        return false;
      }
      const cible = etat.inscriptions.find(
        (i) => i.id === id_inscription && i.id_etablissement === etablissement_actif.id
      );
      if (!cible) return false;

      // Suppression de la fiche d'inscription UNIQUEMENT : préserve le dossier Apprenant,
      // les paiements historiques, les notes et les documents officiels émis.
      definir_etat((precedent) => ({
        ...precedent,
        inscriptions: precedent.inscriptions.filter((ins) => ins.id !== id_inscription),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Suppression définitive inscription ${cible.numero_inscription} (dossier & paiements préservés)`,
        cible: cible.id_apprenant,
        categorie: 'ADMISSION',
      });
      ajouter_toast({
        titre: `Inscription ${cible.numero_inscription} supprimée`,
        description: 'Le dossier apprenant et l’historique financier/académique ont été préservés.',
        variante: 'warning',
      });
      return true;
    },
    [
      a_permission,
      etat.inscriptions,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const inscrire_apprenants_lot = useCallback(
    (nouveaux_apprenants: Apprenant[]) => {
      const enrichis = nouveaux_apprenants.map((a) => ({
        ...a,
        echeancier:
          a.echeancier && a.echeancier.length > 0
            ? a.echeancier
            : construire_echeancier_defaut(
                a.total_du_htg,
                a.total_paye_htg,
                a.date_inscription
              ),
      }));
      const inscriptions_lot = construire_inscriptions_initiales(
        enrichis,
        etat.unites,
        etat.etablissements
      );
      definir_etat((precedent) => ({
        ...precedent,
        apprenants: [...enrichis, ...precedent.apprenants],
        inscriptions: [...inscriptions_lot, ...precedent.inscriptions],
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Import par lot (${nouveaux_apprenants.length} dossiers)`,
        cible: etablissement_actif.nom_court,
        categorie: 'ADMISSION',
      });
      ajouter_toast({
        titre: `${nouveaux_apprenants.length} dossiers importés`,
        description: 'La liste des apprenants a été mise à jour.',
        variante: 'success',
      });
    },
    [
      etat.unites,
      etat.etablissements,
      etablissement_actif.id,
      etablissement_actif.nom_court,
      ajouter_entree_audit,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_toast,
    ]
  );

  const mettre_a_jour_apprenant = useCallback(
    (id_apprenant: string, modifications: Partial<Apprenant>) => {
      definir_etat((precedent) => ({
        ...precedent,
        apprenants: precedent.apprenants.map((a) =>
          a.id === id_apprenant ? { ...a, ...modifications } : a
        ),
      }));
      ajouter_toast({
        titre: 'Fiche mise à jour',
        variante: 'success',
      });
    },
    [ajouter_toast]
  );

  const encaisser_paiement = useCallback(
    (
      id_apprenant: string,
      montant_htg: number,
      mode_paiement: PaiementEnregistre['mode_paiement'],
      libelle: string,
      code_reference?: string,
      libelle_compte_bancaire?: string
    ): PaiementEnregistre => {
      const numero_recu = `REC-${etablissement_actif.code}-${new Date().getFullYear()}-${String(
        Math.floor(1000 + Math.random() * 8999)
      )}`;
      const aujourdhui = new Date().toISOString().slice(0, 10);
      const enregistrement: PaiementEnregistre = {
        id: `pay-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
        numero_recu,
        id_apprenant,
        montant_htg,
        mode_paiement,
        code_reference: code_reference?.trim() || undefined,
        libelle_compte_bancaire: libelle_compte_bancaire?.trim() || undefined,
        libelle,
        paye_le: aujourdhui,
        encaisse_par: utilisateur_actif.nom_complet,
        statut: 'VALIDE',
      };

      definir_etat((precedent) => {
        const apprenants_mis_a_jour = precedent.apprenants.map((a) => {
          if (a.id !== id_apprenant) return a;
          const nouveau_paye = a.total_paye_htg + montant_htg;
          const statut_paiement: Apprenant['statut_paiement'] =
            nouveau_paye >= a.total_du_htg
              ? 'A_JOUR'
              : nouveau_paye >= a.total_du_htg * 0.4
                ? 'PARTIEL'
                : 'EN_RETARD';
          const unite = precedent.unites.find((u) => u.id === a.id_unite);
          const tranches_base =
            a.echeancier && a.echeancier.length > 0
              ? a.echeancier
              : construire_echeancier_defaut(
                  a.total_du_htg,
                  a.total_paye_htg,
                  a.date_inscription,
                  unite?.frais_inscription_htg
                );
          const echeancier_mis_a_jour = recalculer_repartition_echeancier(
            tranches_base,
            nouveau_paye
          );
          return {
            ...a,
            total_paye_htg: nouveau_paye,
            statut_paiement,
            echeancier: echeancier_mis_a_jour,
          };
        });
        return {
          ...precedent,
          paiements: [enregistrement, ...precedent.paiements],
          apprenants: apprenants_mis_a_jour,
        };
      });

      const apprenant_cible = etat.apprenants.find((a) => a.id === id_apprenant);
      const montant_formate = formater_montant(
        montant_htg,
        etablissement_actif.devise_defaut,
        etablissement_actif.taux_change_usd
      );
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Encaissement ${mode_paiement} (${montant_formate})`,
        cible: apprenant_cible
          ? `${apprenant_cible.matricule} · ${apprenant_cible.prenom} ${apprenant_cible.nom}`
          : id_apprenant,
        categorie: 'FINANCE',
      });
      ajouter_toast({
        titre: `Reçu ${numero_recu} émis`,
        description: `${montant_formate} encaissés (${mode_paiement}).`,
        variante: 'success',
      });
      return enregistrement;
    },
    [
      etablissement_actif.id,
      etablissement_actif.code,
      etablissement_actif.devise_defaut,
      etablissement_actif.taux_change_usd,
      utilisateur_actif.nom_complet,
      id_role_actif,
      etat.apprenants,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const annuler_paiement = useCallback(
    (id_paiement: string, motif: string) => {
      const paiement_cible = etat.paiements.find((p) => p.id === id_paiement);
      if (!paiement_cible || paiement_cible.statut === 'ANNULE') return;

      definir_etat((precedent) => ({
        ...precedent,
        paiements: precedent.paiements.map((p) =>
          p.id === id_paiement
            ? { ...p, statut: 'ANNULE', libelle: `${p.libelle} [ANNULÉ : ${motif}]` }
            : p
        ),
        apprenants: precedent.apprenants.map((a) => {
          if (a.id !== paiement_cible.id_apprenant) return a;
          const nouveau_paye = Math.max(0, a.total_paye_htg - paiement_cible.montant_htg);
          const statut_paiement: Apprenant['statut_paiement'] =
            nouveau_paye >= a.total_du_htg
              ? 'A_JOUR'
              : nouveau_paye >= a.total_du_htg * 0.4
                ? 'PARTIEL'
                : 'EN_RETARD';
          const unite = precedent.unites.find((u) => u.id === a.id_unite);
          const tranches_base =
            a.echeancier && a.echeancier.length > 0
              ? a.echeancier
              : construire_echeancier_defaut(
                  a.total_du_htg,
                  a.total_paye_htg,
                  a.date_inscription,
                  unite?.frais_inscription_htg
                );
          const echeancier_mis_a_jour = recalculer_repartition_echeancier(
            tranches_base,
            nouveau_paye
          );
          return {
            ...a,
            total_paye_htg: nouveau_paye,
            statut_paiement,
            echeancier: echeancier_mis_a_jour,
          };
        }),
      }));

      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Annulation reçu ${paiement_cible.numero_recu}`,
        cible: motif,
        categorie: 'FINANCE',
      });
      ajouter_toast({
        titre: `Reçu ${paiement_cible.numero_recu} annulé`,
        description: 'Le solde apprenant et le journal d’audit ont été ajustés.',
        variante: 'warning',
      });
    },
    [
      etat.paiements,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const enregistrer_note = useCallback(
    (entree: Omit<NoteEvaluation, 'id' | 'id_etablissement'>) => {
      if (!a_permission('pedagogie:noter') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Action pédagogique réservée',
          description:
            'La saisie des notes est réservée aux rôles Enseignant ou Direction des études (séparation SaaS).',
          variante: 'error',
        });
        return;
      }
      const est_en_ligne = navigateur_en_ligne && !hors_ligne_simule;
      const nouvelle_note: NoteEvaluation = {
        ...entree,
        id: `gr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        id_etablissement: etablissement_actif.id,
      };

      definir_etat((precedent) => {
        const notes_mises_a_jour = [nouvelle_note, ...precedent.notes];
        const notes_apprenant = notes_mises_a_jour.filter(
          (n) => n.id_apprenant === entree.id_apprenant
        );
        const moyenne =
          notes_apprenant.length > 0
            ? Number(
                (
                  notes_apprenant.reduce((s, n) => s + n.note, 0) / notes_apprenant.length
                ).toFixed(etablissement_actif.echelle_notation === 100 ? 0 : 2)
              )
            : undefined;
        return {
          ...precedent,
          notes: notes_mises_a_jour,
          apprenants: precedent.apprenants.map((a) =>
            a.id === entree.id_apprenant && moyenne !== undefined
              ? { ...a, moyenne_generale: moyenne }
              : a
          ),
          file_hors_ligne: est_en_ligne
            ? precedent.file_hors_ligne
            : [
                {
                  id: `off-${Date.now()}`,
                  id_etablissement: etablissement_actif.id,
                  type_action: 'NOTE',
                  resume: `Note ${entree.note}/${entree.note_maximale} (${entree.type_evaluation})`,
                  charge_utile: nouvelle_note,
                  cree_le: new Date().toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                },
                ...precedent.file_hors_ligne,
              ],
        };
      });

      ajouter_toast({
        titre: est_en_ligne ? 'Note enregistrée' : 'Note mise en file hors-ligne',
        description: est_en_ligne
          ? `${entree.note}/${entree.note_maximale} ajoutée au relevé.`
          : 'Sera synchronisée automatiquement au retour de la connexion.',
        variante: est_en_ligne ? 'success' : 'warning',
      });
    },
    [
      a_permission,
      id_role_actif,
      etablissement_actif.id,
      etablissement_actif.echelle_notation,
      navigateur_en_ligne,
      hors_ligne_simule,
      ajouter_toast,
    ]
  );

  const modifier_note = useCallback(
    (id_note: string, modifications: Partial<NoteEvaluation>): boolean => {
      if (!a_permission('pedagogie:noter') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({ titre: 'Action pédagogique réservée', variante: 'error' });
        return false;
      }
      const cible = etat.notes.find(
        (n) => n.id === id_note && n.id_etablissement === etablissement_actif.id
      );
      if (!cible) return false;
      if (cible.verrouillee) {
        ajouter_toast({
          titre: 'Note verrouillée',
          description: 'Déverrouillez la période avant de modifier cette note.',
          variante: 'warning',
        });
        return false;
      }
      definir_etat((precedent) => {
        const notes_maj = precedent.notes.map((n) =>
          n.id === id_note ? { ...n, ...modifications } : n
        );
        const notes_app = notes_maj.filter(
          (n) => n.id_apprenant === cible.id_apprenant && n.id_etablissement === etablissement_actif.id
        );
        const moyenne =
          notes_app.length > 0
            ? Number(
                (notes_app.reduce((s, n) => s + n.note, 0) / notes_app.length).toFixed(
                  etablissement_actif.echelle_notation === 100 ? 0 : 2
                )
              )
            : undefined;
        return {
          ...precedent,
          notes: notes_maj,
          apprenants: precedent.apprenants.map((a) =>
            a.id === cible.id_apprenant && moyenne !== undefined
              ? { ...a, moyenne_generale: moyenne }
              : a
          ),
        };
      });
      ajouter_toast({ titre: 'Note modifiée', variante: 'success' });
      return true;
    },
    [
      a_permission,
      id_role_actif,
      etat.notes,
      etablissement_actif.id,
      etablissement_actif.echelle_notation,
      ajouter_toast,
    ]
  );

  const supprimer_note = useCallback(
    (id_note: string): boolean => {
      if (!a_permission('pedagogie:noter') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({ titre: 'Action pédagogique réservée', variante: 'error' });
        return false;
      }
      const cible = etat.notes.find(
        (n) => n.id === id_note && n.id_etablissement === etablissement_actif.id
      );
      if (!cible) return false;
      if (cible.verrouillee) {
        ajouter_toast({
          titre: 'Note verrouillée',
          description: 'Impossible de supprimer une note d’une période verrouillée.',
          variante: 'warning',
        });
        return false;
      }
      definir_etat((precedent) => {
        const notes_maj = precedent.notes.filter((n) => n.id !== id_note);
        const notes_app = notes_maj.filter(
          (n) => n.id_apprenant === cible.id_apprenant && n.id_etablissement === etablissement_actif.id
        );
        const moyenne =
          notes_app.length > 0
            ? Number(
                (notes_app.reduce((s, n) => s + n.note, 0) / notes_app.length).toFixed(
                  etablissement_actif.echelle_notation === 100 ? 0 : 2
                )
              )
            : 0;
        return {
          ...precedent,
          notes: notes_maj,
          apprenants: precedent.apprenants.map((a) =>
            a.id === cible.id_apprenant ? { ...a, moyenne_generale: moyenne } : a
          ),
        };
      });
      ajouter_toast({ titre: 'Note supprimée', variante: 'info' });
      return true;
    },
    [
      a_permission,
      id_role_actif,
      etat.notes,
      etablissement_actif.id,
      etablissement_actif.echelle_notation,
      ajouter_toast,
    ]
  );

  const basculer_verrouillage_notes_element = useCallback(
    (id_element: string, libelle_periode: string, verrouillee: boolean) => {
      if (!a_permission('pedagogie:verrouiller') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Action pédagogique réservée',
          description:
            'Le verrouillage des périodes est réservé à la Direction ou à la Direction des études.',
          variante: 'error',
        });
        return;
      }
      definir_etat((precedent) => ({
        ...precedent,
        notes: precedent.notes.map((n) =>
          n.id_etablissement === etablissement_actif.id &&
          n.id_element === id_element &&
          n.libelle_periode === libelle_periode
            ? { ...n, verrouillee }
            : n
        ),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `${verrouillee ? 'Verrouillage' : 'Déverrouillage'} des notes`,
        cible: `${id_element} · ${libelle_periode}`,
        categorie: 'PEDAGOGIE',
      });
      ajouter_toast({
        titre: verrouillee ? 'Notes verrouillées' : 'Notes déverrouillées',
        variante: 'info',
      });
    },
    [
      a_permission,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const enregistrer_presences_lot = useCallback(
    (entrees: Omit<PresenceEnregistree, 'id' | 'id_etablissement'>[]) => {
      if (!a_permission('pedagogie:appel') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Action pédagogique réservée',
          description:
            'La feuille d’appel numérique est réservée aux rôles Enseignant ou Direction des études.',
          variante: 'error',
        });
        return;
      }
      const est_en_ligne = navigateur_en_ligne && !hors_ligne_simule;
      const horodatees: PresenceEnregistree[] = entrees.map((e, index) => ({
        ...e,
        id: `att-${Date.now()}-${index}`,
        id_etablissement: etablissement_actif.id,
      }));

      definir_etat((precedent) => ({
        ...precedent,
        presences: [...horodatees, ...precedent.presences],
        file_hors_ligne: est_en_ligne
          ? precedent.file_hors_ligne
          : [
              {
                id: `off-${Date.now()}`,
                id_etablissement: etablissement_actif.id,
                type_action: 'PRESENCE',
                resume: `Feuille d’appel (${horodatees.length} statuts · ${horodatees[0]?.date ?? ''})`,
                charge_utile: horodatees,
                cree_le: new Date().toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              },
              ...precedent.file_hors_ligne,
            ],
      }));

      ajouter_toast({
        titre: est_en_ligne
          ? `Appel enregistré (${horodatees.length})`
          : `Appel sauvegardé hors-ligne (${horodatees.length})`,
        description: est_en_ligne
          ? 'Les taux d’assiduité ont été mis à jour.'
          : 'En attente de synchronisation réseau.',
        variante: est_en_ligne ? 'success' : 'warning',
      });
    },
    [
      a_permission,
      id_role_actif,
      etablissement_actif.id,
      navigateur_en_ligne,
      hors_ligne_simule,
      ajouter_toast,
    ]
  );

  const synchroniser_file_hors_ligne = useCallback(() => {
    const nombre = etat.file_hors_ligne.filter(
      (q) => q.id_etablissement === etablissement_actif.id
    ).length;
    if (nombre === 0) return;
    definir_hors_ligne_simule(false);
    definir_etat((precedent) => ({
      ...precedent,
      file_hors_ligne: precedent.file_hors_ligne.filter(
        (q) => q.id_etablissement !== etablissement_actif.id
      ),
    }));
    ajouter_entree_audit({
      id_etablissement: etablissement_actif.id,
      nom_acteur: utilisateur_actif.nom_complet,
      role_acteur: ROLES[id_role_actif].libelle,
      action: `Synchronisation hors-ligne (${nombre} lot${nombre > 1 ? 's' : ''})`,
      cible: etablissement_actif.nom_court,
      categorie: 'PEDAGOGIE',
    });
    ajouter_toast({
      titre: 'Synchronisation terminée',
      description: `${nombre} opération(s) locale(s) envoyée(s) avec succès.`,
      variante: 'success',
    });
  }, [
    etat.file_hors_ligne,
    etablissement_actif.id,
    etablissement_actif.nom_court,
    utilisateur_actif.nom_complet,
    id_role_actif,
    ajouter_entree_audit,
    ajouter_toast,
  ]);

  const ajouter_creneau_emploi_du_temps = useCallback(
    (creneau: Omit<CreneauEmploiDuTemps, 'id' | 'id_etablissement'>) => {
      const nouveau_creneau: CreneauEmploiDuTemps = {
        ...creneau,
        id: `sch-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        emplois_du_temps: [...precedent.emplois_du_temps, nouveau_creneau],
      }));
      ajouter_toast({ titre: 'Créneau ajouté à l’emploi du temps', variante: 'success' });
    },
    [etablissement_actif.id, ajouter_toast]
  );

  const modifier_creneau_emploi_du_temps = useCallback(
    (id_creneau: string, modifications: Partial<CreneauEmploiDuTemps>) => {
      definir_etat((precedent) => ({
        ...precedent,
        emplois_du_temps: precedent.emplois_du_temps.map((c) =>
          c.id === id_creneau ? { ...c, ...modifications } : c
        ),
      }));
      ajouter_toast({ titre: 'Créneau horaire mis à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const supprimer_creneau_emploi_du_temps = useCallback(
    (id_creneau: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        emplois_du_temps: precedent.emplois_du_temps.filter((s) => s.id !== id_creneau),
      }));
      ajouter_toast({ titre: 'Créneau supprimé', variante: 'info' });
    },
    [ajouter_toast]
  );

  const ajouter_evenement_calendrier = useCallback(
    (
      evenement: Omit<EvenementCalendrierAcademique, 'id' | 'id_etablissement'>
    ): EvenementCalendrierAcademique => {
      const cree: EvenementCalendrierAcademique = {
        ...evenement,
        id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        evenements_calendrier: [...precedent.evenements_calendrier, cree],
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Ajout calendrier académique (${cree.type})`,
        cible: cree.titre,
        categorie: 'CONFIG',
      });
      ajouter_toast({ titre: 'Événement ajouté au calendrier académique', variante: 'success' });
      return cree;
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const modifier_evenement_calendrier = useCallback(
    (id_evenement: string, modifications: Partial<EvenementCalendrierAcademique>) => {
      definir_etat((precedent) => ({
        ...precedent,
        evenements_calendrier: precedent.evenements_calendrier.map((ev) =>
          ev.id === id_evenement ? { ...ev, ...modifications } : ev
        ),
      }));
      ajouter_toast({ titre: 'Événement du calendrier mis à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const supprimer_evenement_calendrier = useCallback(
    (id_evenement: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        evenements_calendrier: precedent.evenements_calendrier.filter((ev) => ev.id !== id_evenement),
      }));
      ajouter_toast({ titre: 'Événement supprimé du calendrier', variante: 'info' });
    },
    [ajouter_toast]
  );

  const ajouter_entree_cahier_textes = useCallback(
    (entree: Omit<EntreeCahierTextes, 'id' | 'id_etablissement'>) => {
      if (
        (!a_permission('pedagogie:noter') && !a_permission('pedagogie:appel')) ||
        id_role_actif === 'SUPER_ADMIN'
      ) {
        ajouter_toast({
          titre: 'Action pédagogique réservée',
          description: 'La tenue du cahier de textes est réservée au corps enseignant.',
          variante: 'error',
        });
        return;
      }
      const cahier: EntreeCahierTextes = {
        ...entree,
        id: `tb-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        cahiers_textes: [cahier, ...precedent.cahiers_textes],
      }));
      ajouter_toast({ titre: 'Séance ajoutée au cahier de textes', variante: 'success' });
    },
    [a_permission, id_role_actif, etablissement_actif.id, ajouter_toast]
  );

  const modifier_entree_cahier_textes = useCallback(
    (id_entree: string, modifications: Partial<EntreeCahierTextes>) => {
      definir_etat((precedent) => ({
        ...precedent,
        cahiers_textes: precedent.cahiers_textes.map((tb) =>
          tb.id === id_entree ? { ...tb, ...modifications } : tb
        ),
      }));
      ajouter_toast({ titre: 'Séance mise à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const supprimer_entree_cahier_textes = useCallback(
    (id_entree: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        cahiers_textes: precedent.cahiers_textes.filter((tb) => tb.id !== id_entree),
      }));
      ajouter_toast({ titre: 'Séance supprimée du cahier de textes', variante: 'info' });
    },
    [ajouter_toast]
  );

  const attribuer_stage = useCallback(
    (id_apprenant: string, nom_entreprise: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        apprenants: precedent.apprenants.map((a) =>
          a.id === id_apprenant
            ? {
                ...a,
                entreprise_stage: nom_entreprise || undefined,
                indice_etape: nom_entreprise ? (a.indice_etape < 3 ? 3 : a.indice_etape) : a.indice_etape,
                statut:
                  nom_entreprise && etablissement_actif.type === 'PRO'
                    ? 'EN_STAGE'
                    : !nom_entreprise && a.statut === 'EN_STAGE'
                      ? 'ACTIF'
                      : a.statut,
              }
            : a
        ),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: nom_entreprise ? `Attribution de stage (${nom_entreprise})` : 'Retrait affectation stage',
        cible: id_apprenant,
        categorie: 'PEDAGOGIE',
      });
      ajouter_toast({
        titre: nom_entreprise ? 'Stage attribué' : 'Affectation stage retirée',
        description: nom_entreprise || undefined,
        variante: 'success',
      });
    },
    [
      etablissement_actif.id,
      etablissement_actif.type,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const ajouter_partenaire_stage = useCallback(
    (partenaire: Omit<PartenaireStage, 'id' | 'id_etablissement'>): PartenaireStage => {
      const cree: PartenaireStage = {
        ...partenaire,
        id: `ent-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        partenaires: [cree, ...precedent.partenaires],
      }));
      ajouter_toast({ titre: `Partenaire ajouté : ${cree.nom_entreprise}`, variante: 'success' });
      return cree;
    },
    [etablissement_actif.id, ajouter_toast]
  );

  const modifier_partenaire_stage = useCallback(
    (id_partenaire: string, modifications: Partial<PartenaireStage>) => {
      definir_etat((precedent) => ({
        ...precedent,
        partenaires: precedent.partenaires.map((p) =>
          p.id === id_partenaire ? { ...p, ...modifications } : p
        ),
      }));
      ajouter_toast({ titre: 'Partenaire mis à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const supprimer_partenaire_stage = useCallback(
    (id_partenaire: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        partenaires: precedent.partenaires.filter((p) => p.id !== id_partenaire),
      }));
      ajouter_toast({ titre: 'Partenaire supprimé', variante: 'info' });
    },
    [ajouter_toast]
  );

  const ajouter_soutenance = useCallback(
    (soutenance: Omit<SoutenanceMemoire, 'id' | 'id_etablissement'>) => {
      const element: SoutenanceMemoire = {
        ...soutenance,
        id: `def-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        soutenances: [element, ...precedent.soutenances],
      }));
      ajouter_toast({ titre: 'Soutenance planifiée', variante: 'success' });
    },
    [etablissement_actif.id, ajouter_toast]
  );

  const mettre_a_jour_soutenance = useCallback(
    (id_soutenance: string, modifications: Partial<SoutenanceMemoire>) => {
      definir_etat((precedent) => ({
        ...precedent,
        soutenances: precedent.soutenances.map((d) =>
          d.id === id_soutenance ? { ...d, ...modifications } : d
        ),
      }));
      ajouter_toast({ titre: 'Procès-verbal mis à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const supprimer_soutenance = useCallback(
    (id_soutenance: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        soutenances: precedent.soutenances.filter((d) => d.id !== id_soutenance),
      }));
      ajouter_toast({ titre: 'Soutenance supprimée', variante: 'info' });
    },
    [ajouter_toast]
  );

  const enregistrer_depense = useCallback(
    (depense: Omit<DepenseEnregistree, 'id' | 'id_etablissement'>) => {
      const enregistrement: DepenseEnregistree = {
        ...depense,
        id: `exp-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        depenses: [enregistrement, ...precedent.depenses],
      }));
      const montant_depense_formate = formater_montant(
        depense.montant_htg,
        etablissement_actif.devise_defaut,
        etablissement_actif.taux_change_usd
      );
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Dépense enregistrée (${montant_depense_formate})`,
        cible: depense.description,
        categorie: 'FINANCE',
      });
      ajouter_toast({ titre: 'Dépense enregistrée', variante: 'success' });
    },
    [
      etablissement_actif.id,
      etablissement_actif.devise_defaut,
      etablissement_actif.taux_change_usd,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const modifier_depense = useCallback(
    (id_depense: string, modifications: Partial<DepenseEnregistree>) => {
      definir_etat((precedent) => ({
        ...precedent,
        depenses: precedent.depenses.map((d) =>
          d.id === id_depense ? { ...d, ...modifications } : d
        ),
      }));
      ajouter_toast({ titre: 'Dépense mise à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const supprimer_depense = useCallback(
    (id_depense: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        depenses: precedent.depenses.filter((d) => d.id !== id_depense),
      }));
      ajouter_toast({ titre: 'Dépense supprimée', variante: 'info' });
    },
    [ajouter_toast]
  );

  const creer_bulletin_paie = useCallback(
    (saisie: {
      id_personnel: string;
      nom_personnel: string;
      libelle_role: string;
      libelle_mois: string;
      heures_travaillees: number;
      salaire_base_htg: number;
      primes_htg: number;
      motif_primes?: string;
      retenues_htg: number;
      motif_retenues?: string;
      statut?: 'PAYE' | 'EN_ATTENTE';
      mode_paiement?: string;
      observations?: string;
    }): BulletinPaie | null => {
      const calc = calculer_bulletin_paie(
        saisie.salaire_base_htg,
        saisie.primes_htg,
        saisie.retenues_htg
      );
      if (!calc.valide) {
        ajouter_toast({
          titre: 'Calcul de paie invalide',
          description: calc.erreur,
          variante: 'error',
        });
        return null;
      }
      const aujourdhui = new Date().toISOString().slice(0, 10);
      const statut_final = saisie.statut ?? 'EN_ATTENTE';
      const cree: BulletinPaie = {
        id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        id_etablissement: etablissement_actif.id,
        id_personnel: saisie.id_personnel,
        nom_personnel: saisie.nom_personnel.trim(),
        libelle_role: saisie.libelle_role.trim(),
        libelle_mois: saisie.libelle_mois.trim(),
        heures_travaillees: Math.max(0, saisie.heures_travaillees),
        salaire_base_htg: calc.salaire_base_htg,
        primes_htg: calc.primes_htg,
        motif_primes: saisie.motif_primes?.trim() || undefined,
        montant_brut_htg: calc.montant_brut_htg,
        retenues_htg: calc.retenues_htg,
        motif_retenues: saisie.motif_retenues?.trim() || undefined,
        montant_net_htg: calc.montant_net_htg,
        statut: statut_final,
        mode_paiement: saisie.mode_paiement?.trim() || 'Virement bancaire',
        observations: saisie.observations?.trim() || undefined,
        paye_le: statut_final === 'PAYE' ? aujourdhui : undefined,
        cree_le: aujourdhui,
      };
      definir_etat((precedent) => ({
        ...precedent,
        paie: [cree, ...precedent.paie],
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Création fiche de paie (${cree.libelle_mois})`,
        cible: cree.nom_personnel,
        categorie: 'FINANCE',
      });
      ajouter_toast({
        titre: `Fiche de paie créée : ${cree.nom_personnel}`,
        description: `${cree.libelle_mois} · Net calculé enregistré`,
        variante: 'success',
      });
      return cree;
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const modifier_bulletin_paie = useCallback(
    (
      id_paie: string,
      saisie: {
        id_personnel?: string;
        nom_personnel?: string;
        libelle_role?: string;
        libelle_mois?: string;
        heures_travaillees?: number;
        salaire_base_htg: number;
        primes_htg: number;
        motif_primes?: string;
        retenues_htg: number;
        motif_retenues?: string;
        statut?: 'PAYE' | 'EN_ATTENTE';
        mode_paiement?: string;
        observations?: string;
      }
    ): boolean => {
      const calc = calculer_bulletin_paie(
        saisie.salaire_base_htg,
        saisie.primes_htg,
        saisie.retenues_htg
      );
      if (!calc.valide) {
        ajouter_toast({
          titre: 'Calcul de paie invalide',
          description: calc.erreur,
          variante: 'error',
        });
        return false;
      }
      const aujourdhui = new Date().toISOString().slice(0, 10);
      definir_etat((precedent) => ({
        ...precedent,
        paie: precedent.paie.map((p) => {
          if (p.id !== id_paie) return p;
          const statut_final = saisie.statut ?? p.statut;
          return {
            ...p,
            id_personnel: saisie.id_personnel ?? p.id_personnel,
            nom_personnel: saisie.nom_personnel?.trim() ?? p.nom_personnel,
            libelle_role: saisie.libelle_role?.trim() ?? p.libelle_role,
            libelle_mois: saisie.libelle_mois?.trim() ?? p.libelle_mois,
            heures_travaillees:
              saisie.heures_travaillees !== undefined
                ? Math.max(0, saisie.heures_travaillees)
                : p.heures_travaillees,
            salaire_base_htg: calc.salaire_base_htg,
            primes_htg: calc.primes_htg,
            motif_primes: saisie.motif_primes?.trim() || undefined,
            montant_brut_htg: calc.montant_brut_htg,
            retenues_htg: calc.retenues_htg,
            motif_retenues: saisie.motif_retenues?.trim() || undefined,
            montant_net_htg: calc.montant_net_htg,
            statut: statut_final,
            mode_paiement: saisie.mode_paiement?.trim() || p.mode_paiement,
            observations: saisie.observations?.trim() || undefined,
            paye_le: statut_final === 'PAYE' ? p.paye_le ?? aujourdhui : undefined,
          };
        }),
      }));
      ajouter_toast({ titre: 'Fiche de paie modifiée', variante: 'success' });
      return true;
    },
    [ajouter_toast]
  );

  const supprimer_bulletin_paie = useCallback(
    (id_paie: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        paie: precedent.paie.filter((p) => p.id !== id_paie),
      }));
      ajouter_toast({ titre: 'Fiche de paie supprimée', variante: 'info' });
    },
    [ajouter_toast]
  );

  const marquer_paie_payee = useCallback(
    (id_paie: string) => {
      const aujourdhui = new Date().toISOString().slice(0, 10);
      definir_etat((precedent) => ({
        ...precedent,
        paie: precedent.paie.map((p) =>
          p.id === id_paie ? { ...p, statut: 'PAYE', paye_le: aujourdhui } : p
        ),
      }));
      ajouter_toast({ titre: 'Fiche de paie validée et payée', variante: 'success' });
    },
    [ajouter_toast]
  );

  const emettre_document_officiel = useCallback(
    (id_apprenant: string, type_document: string): DocumentOfficielEmis | null => {
      if (!a_permission('documents:emettre') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Émission officielle réservée',
          description:
            'La validation et l’émission des bulletins/documents officiels relèvent de la Direction ou de la Scolarité de l’établissement.',
          variante: 'error',
        });
        return null;
      }
      const numero_document = `DOC-${etablissement_actif.code}-${new Date().getFullYear()}-${String(
        Math.floor(1000 + Math.random() * 8999)
      )}`;
      const empreinte_verification = `HT-${etablissement_actif.code}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;
      const doc: DocumentOfficielEmis = {
        id: `doc-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
        numero_document,
        id_apprenant,
        type_document,
        emis_le: new Date().toISOString().slice(0, 10),
        emis_par: utilisateur_actif.nom_complet,
        empreinte_verification,
      };
      definir_etat((precedent) => ({
        ...precedent,
        documents: [doc, ...precedent.documents],
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Émission document : ${type_document}`,
        cible: numero_document,
        categorie: 'DOCUMENT',
      });
      ajouter_toast({
        titre: `Document émis : ${numero_document}`,
        description: type_document,
        variante: 'success',
      });
      return doc;
    },
    [
      a_permission,
      etablissement_actif.id,
      etablissement_actif.code,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const envoyer_communication = useCallback(
    (message: Omit<MessageCommunication, 'id' | 'id_etablissement' | 'envoye_le' | 'envoye_par'>) => {
      const maintenant = new Date();
      const completer = (n: number) => String(n).padStart(2, '0');
      const envoye_le = `${maintenant.getFullYear()}-${completer(
        maintenant.getMonth() + 1
      )}-${completer(maintenant.getDate())} ${completer(maintenant.getHours())}:${completer(
        maintenant.getMinutes()
      )}`;
      const enregistrement: MessageCommunication = {
        ...message,
        id: `com-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
        envoye_le,
        envoye_par: utilisateur_actif.nom_complet,
      };
      definir_etat((precedent) => ({
        ...precedent,
        communications: [enregistrement, ...precedent.communications],
      }));
      ajouter_toast({
        titre: `Message envoyé (${message.canal})`,
        description: `${message.nombre_destinataires} destinataire(s) notifié(s).`,
        variante: 'success',
      });
    },
    [etablissement_actif.id, utilisateur_actif.nom_complet, ajouter_toast]
  );

  const ajouter_livre_bibliotheque = useCallback(
    (livre: Omit<LivreBibliotheque, 'id' | 'id_etablissement'>): LivreBibliotheque | null => {
      if (!a_permission('bibliotheque_materiels:gerer') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Action réservée à la gestion bibliothèque',
          description:
            'L’ajout d’ouvrages est réservé au personnel habilité de l’établissement.',
          variante: 'error',
        });
        return null;
      }
      const cree: LivreBibliotheque = {
        ...livre,
        id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        id_etablissement: etablissement_actif.id,
        exemplaires_totaux: Math.max(1, livre.exemplaires_totaux),
        exemplaires_disponibles: Math.min(
          Math.max(1, livre.exemplaires_totaux),
          Math.max(0, livre.exemplaires_disponibles)
        ),
      };
      definir_etat((precedent) => ({
        ...precedent,
        livres_bibliotheque: [cree, ...precedent.livres_bibliotheque],
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Ajout ouvrage bibliothèque',
        cible: `${cree.titre} (${cree.exemplaires_totaux} ex.)`,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: 'Ouvrage ajouté au catalogue',
        description: `${cree.titre} · ${cree.exemplaires_totaux} exemplaire(s)`,
        variante: 'success',
      });
      return cree;
    },
    [
      a_permission,
      id_role_actif,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const mettre_a_jour_livre_bibliotheque = useCallback(
    (id_livre: string, modifications: Partial<LivreBibliotheque>) => {
      if (!a_permission('bibliotheque_materiels:gerer') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Action réservée à la gestion bibliothèque',
          variante: 'error',
        });
        return;
      }
      definir_etat((precedent) => ({
        ...precedent,
        livres_bibliotheque: precedent.livres_bibliotheque.map((b) => {
          if (b.id !== id_livre) return b;
          const fusionne = { ...b, ...modifications };
          const totaux = Math.max(1, fusionne.exemplaires_totaux);
          const disponibles = Math.min(totaux, Math.max(0, fusionne.exemplaires_disponibles));
          return { ...fusionne, exemplaires_totaux: totaux, exemplaires_disponibles: disponibles };
        }),
      }));
      ajouter_toast({ titre: 'Fiche ouvrage mise à jour', variante: 'success' });
    },
    [a_permission, id_role_actif, ajouter_toast]
  );

  const supprimer_livre_bibliotheque = useCallback(
    (id_livre: string): boolean => {
      if (!a_permission('bibliotheque_materiels:gerer') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({ titre: 'Action réservée à la gestion bibliothèque', variante: 'error' });
        return false;
      }
      const pret_actif = etat.emprunts_bibliotheque.some(
        (e) => e.id_livre === id_livre && !e.retourne_le
      );
      if (pret_actif) {
        ajouter_toast({
          titre: 'Suppression bloquée',
          description: 'Cet ouvrage a au moins un emprunt en cours non retourné.',
          variante: 'warning',
        });
        return false;
      }
      definir_etat((precedent) => ({
        ...precedent,
        livres_bibliotheque: precedent.livres_bibliotheque.filter((b) => b.id !== id_livre),
      }));
      ajouter_toast({ titre: 'Ouvrage supprimé du catalogue', variante: 'info' });
      return true;
    },
    [a_permission, id_role_actif, etat.emprunts_bibliotheque, ajouter_toast]
  );

  const emprunter_livre = useCallback(
    (id_livre: string, id_apprenant: string, retour_prevu_le?: string, remarque?: string) => {
      if (
        (!a_permission('bibliotheque_materiels:gerer') && !a_permission('services:gerer')) ||
        id_role_actif === 'SUPER_ADMIN'
      ) {
        ajouter_toast({
          titre: 'Action réservée aux gestionnaires',
          description: 'Le Super-admin consulte la bibliothèque en lecture seule.',
          variante: 'error',
        });
        return;
      }
      const livre_cible = etat.livres_bibliotheque.find((b) => b.id === id_livre);
      if (!livre_cible || livre_cible.exemplaires_disponibles <= 0) {
        ajouter_toast({
          titre: 'Exemplaire indisponible',
          description: 'Tous les exemplaires de cet ouvrage sont actuellement prêtés.',
          variante: 'warning',
        });
        return;
      }
      const aujourdhui = new Date().toISOString().slice(0, 10);
      const echeance =
        retour_prevu_le || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      const emprunt: EmpruntBibliotheque = {
        id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
        id_etablissement: etablissement_actif.id,
        id_livre,
        id_apprenant,
        emprunte_le: aujourdhui,
        retour_prevu_le: echeance,
        remarque: remarque?.trim() || undefined,
      };
      definir_etat((precedent) => ({
        ...precedent,
        emprunts_bibliotheque: [emprunt, ...precedent.emprunts_bibliotheque],
        livres_bibliotheque: precedent.livres_bibliotheque.map((b) =>
          b.id === id_livre && b.exemplaires_disponibles > 0
            ? { ...b, exemplaires_disponibles: b.exemplaires_disponibles - 1 }
            : b
        ),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Prêt d’ouvrage bibliothèque',
        cible: `${livre_cible.titre} → ${id_apprenant}`,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: 'Prêt enregistré',
        description: `Retour attendu le ${echeance}.`,
        variante: 'success',
      });
    },
    [
      a_permission,
      id_role_actif,
      etat.livres_bibliotheque,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const retourner_livre = useCallback(
    (
      id_emprunt: string,
      etat_retour: EmpruntBibliotheque['etat_retour'] = 'Bon état',
      remarque?: string
    ) => {
      if (
        (!a_permission('bibliotheque_materiels:gerer') && !a_permission('services:gerer')) ||
        id_role_actif === 'SUPER_ADMIN'
      ) {
        ajouter_toast({
          titre: 'Action réservée aux gestionnaires',
          variante: 'error',
        });
        return;
      }
      const emprunt = etat.emprunts_bibliotheque.find((e) => e.id === id_emprunt);
      if (!emprunt || emprunt.retourne_le) return;
      const aujourdhui = new Date().toISOString().slice(0, 10);
      definir_etat((precedent) => ({
        ...precedent,
        emprunts_bibliotheque: precedent.emprunts_bibliotheque.map((e) =>
          e.id === id_emprunt
            ? {
                ...e,
                retourne_le: aujourdhui,
                etat_retour,
                remarque: remarque?.trim() || e.remarque,
              }
            : e
        ),
        livres_bibliotheque: precedent.livres_bibliotheque.map((b) =>
          b.id === emprunt.id_livre
            ? {
                ...b,
                exemplaires_disponibles:
                  etat_retour === 'Perdu'
                    ? b.exemplaires_disponibles
                    : Math.min(b.exemplaires_totaux, b.exemplaires_disponibles + 1),
              }
            : b
        ),
      }));
      ajouter_toast({
        titre: `Retour de livre enregistré (${etat_retour})`,
        variante: etat_retour === 'Bon état' ? 'success' : 'warning',
      });
    },
    [a_permission, id_role_actif, etat.emprunts_bibliotheque, ajouter_toast]
  );

  const prolonger_emprunt_livre = useCallback(
    (id_emprunt: string, jours = 7) => {
      if (
        (!a_permission('bibliotheque_materiels:gerer') && !a_permission('services:gerer')) ||
        id_role_actif === 'SUPER_ADMIN'
      ) {
        ajouter_toast({ titre: 'Action réservée aux gestionnaires', variante: 'error' });
        return;
      }
      const emprunt = etat.emprunts_bibliotheque.find((e) => e.id === id_emprunt);
      if (!emprunt || emprunt.retourne_le) return;
      const base_date = new Date(`${emprunt.retour_prevu_le}T12:00:00Z`);
      const nouvelle_date = new Date(base_date.getTime() + jours * 86400000)
        .toISOString()
        .slice(0, 10);
      definir_etat((precedent) => ({
        ...precedent,
        emprunts_bibliotheque: precedent.emprunts_bibliotheque.map((e) =>
          e.id === id_emprunt
            ? {
                ...e,
                retour_prevu_le: nouvelle_date,
                prolongation_compteur: (e.prolongation_compteur ?? 0) + 1,
              }
            : e
        ),
      }));
      ajouter_toast({
        titre: `Prêt prolongé (+${jours} jours)`,
        description: `Nouvelle échéance : ${nouvelle_date}`,
        variante: 'info',
      });
    },
    [a_permission, id_role_actif, etat.emprunts_bibliotheque, ajouter_toast]
  );

  const ajouter_article_inventaire = useCallback(
    (article: Omit<ArticleInventaire, 'id' | 'id_etablissement'>): ArticleInventaire | null => {
      if (!a_permission('bibliotheque_materiels:gerer') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Action réservée à la gestion des matériels',
          variante: 'error',
        });
        return null;
      }
      const quantite_totale = Math.max(1, article.quantite);
      const quantite_dispo = Math.min(
        quantite_totale,
        Math.max(0, article.quantite_disponible ?? quantite_totale)
      );
      const cree: ArticleInventaire = {
        ...article,
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        id_etablissement: etablissement_actif.id,
        quantite: quantite_totale,
        quantite_disponible: quantite_dispo,
      };
      definir_etat((precedent) => ({
        ...precedent,
        inventaire: [cree, ...precedent.inventaire],
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Ajout équipement / matériel',
        cible: `${cree.code} — ${cree.nom} (${cree.quantite} u.)`,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: 'Matériel enregistré dans l’inventaire',
        description: `${cree.code} · ${cree.nom}`,
        variante: 'success',
      });
      return cree;
    },
    [
      a_permission,
      id_role_actif,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const mettre_a_jour_article_inventaire = useCallback(
    (id_article: string, modifications: Partial<ArticleInventaire>) => {
      if (!a_permission('bibliotheque_materiels:gerer') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Action réservée à la gestion des matériels',
          variante: 'error',
        });
        return;
      }
      definir_etat((precedent) => ({
        ...precedent,
        inventaire: precedent.inventaire.map((item) => {
          if (item.id !== id_article) return item;
          const fusionne = { ...item, ...modifications };
          const total = Math.max(0, fusionne.quantite);
          const dispo_courant = fusionne.quantite_disponible ?? item.quantite_disponible ?? item.quantite;
          const dispo = Math.min(total, Math.max(0, dispo_courant));
          return { ...fusionne, quantite: total, quantite_disponible: dispo };
        }),
      }));
      ajouter_toast({ titre: 'Fiche matériel mise à jour', variante: 'success' });
    },
    [a_permission, id_role_actif, ajouter_toast]
  );

  const supprimer_article_inventaire = useCallback(
    (id_article: string): boolean => {
      if (!a_permission('bibliotheque_materiels:gerer') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({ titre: 'Action réservée à la gestion des matériels', variante: 'error' });
        return false;
      }
      const pret_actif = etat.prets_materiels.some(
        (p) => p.id_article === id_article && !p.retourne_le
      );
      if (pret_actif) {
        ajouter_toast({
          titre: 'Suppression bloquée',
          description: 'Un prêt ou une affectation de ce matériel est toujours en cours.',
          variante: 'warning',
        });
        return false;
      }
      definir_etat((precedent) => ({
        ...precedent,
        inventaire: precedent.inventaire.filter((item) => item.id !== id_article),
      }));
      ajouter_toast({ titre: 'Matériel supprimé de l’inventaire', variante: 'info' });
      return true;
    },
    [a_permission, id_role_actif, etat.prets_materiels, ajouter_toast]
  );

  const preter_materiel = useCallback(
    (
      pret: Omit<PretMateriel, 'id' | 'id_etablissement' | 'retourne_le' | 'etat_retour'>
    ): boolean => {
      if (!a_permission('bibliotheque_materiels:gerer') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Action réservée aux gestionnaires',
          description: 'Le Super-admin consulte l’inventaire en lecture seule.',
          variante: 'error',
        });
        return false;
      }
      const article = etat.inventaire.find((i) => i.id === pret.id_article);
      if (!article) return false;
      const dispo = article.quantite_disponible ?? article.quantite;
      if (pret.quantite <= 0 || pret.quantite > dispo) {
        ajouter_toast({
          titre: 'Stock disponible insuffisant',
          description: `${dispo} unité(s) disponible(s) pour ${article.nom}.`,
          variante: 'warning',
        });
        return false;
      }
      if (article.etat === 'Hors service') {
        ajouter_toast({
          titre: 'Matériel hors service',
          description: 'Cet équipement est marqué hors service et ne peut pas être prêté.',
          variante: 'warning',
        });
        return false;
      }
      const nouveau_pret: PretMateriel = {
        ...pret,
        id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        prets_materiels: [nouveau_pret, ...precedent.prets_materiels],
        inventaire: precedent.inventaire.map((item) => {
          if (item.id !== pret.id_article) return item;
          const courant = item.quantite_disponible ?? item.quantite;
          return { ...item, quantite_disponible: Math.max(0, courant - pret.quantite) };
        }),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Prêt / affectation matériel',
        cible: `${pret.quantite} × ${article.nom} → ${pret.emprunteur_nom}`,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: 'Matériel prêté / affecté',
        description: `${pret.quantite} × ${article.nom} remis à ${pret.emprunteur_nom}`,
        variante: 'success',
      });
      return true;
    },
    [
      a_permission,
      id_role_actif,
      etat.inventaire,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const retourner_materiel = useCallback(
    (id_pret: string, etat_retour: EtatMateriel = 'Bon état', remarque?: string) => {
      if (!a_permission('bibliotheque_materiels:gerer') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({ titre: 'Action réservée aux gestionnaires', variante: 'error' });
        return;
      }
      const pret = etat.prets_materiels.find((p) => p.id === id_pret);
      if (!pret || pret.retourne_le) return;
      const aujourdhui = new Date().toISOString().slice(0, 10);
      definir_etat((precedent) => ({
        ...precedent,
        prets_materiels: precedent.prets_materiels.map((p) =>
          p.id === id_pret
            ? {
                ...p,
                retourne_le: aujourdhui,
                etat_retour,
                remarque: remarque?.trim() || p.remarque,
              }
            : p
        ),
        inventaire: precedent.inventaire.map((item) => {
          if (item.id !== pret.id_article) return item;
          const courant = item.quantite_disponible ?? item.quantite;
          const nouveau_dispo = Math.min(item.quantite, courant + pret.quantite);
          return {
            ...item,
            quantite_disponible: nouveau_dispo,
            etat:
              etat_retour === 'À réparer' || etat_retour === 'Hors service'
                ? etat_retour
                : item.etat,
            notes_maintenance:
              etat_retour === 'À réparer' || etat_retour === 'Hors service'
                ? `Signalé ${etat_retour.toLowerCase()} au retour (${aujourdhui})${
                    remarque ? ` : ${remarque}` : ''
                  }`
                : item.notes_maintenance,
          };
        }),
      }));
      ajouter_toast({
        titre: `Retour de matériel enregistré (${etat_retour})`,
        variante: etat_retour === 'Bon état' || etat_retour === 'Neuf' ? 'success' : 'warning',
      });
    },
    [a_permission, id_role_actif, etat.prets_materiels, ajouter_toast]
  );

  const ajouter_visite_infirmerie = useCallback(
    (visite: Omit<VisiteInfirmerie, 'id' | 'id_etablissement'>) => {
      const element: VisiteInfirmerie = {
        ...visite,
        id: `inf-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        visites_infirmerie: [element, ...precedent.visites_infirmerie],
      }));
      ajouter_toast({ titre: 'Passage infirmerie enregistré', variante: 'success' });
    },
    [etablissement_actif.id, ajouter_toast]
  );

  const supprimer_visite_infirmerie = useCallback(
    (id_visite: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        visites_infirmerie: precedent.visites_infirmerie.filter((v) => v.id !== id_visite),
      }));
      ajouter_toast({ titre: 'Passage infirmerie supprimé', variante: 'info' });
    },
    [ajouter_toast]
  );

  const ajouter_incident_discipline = useCallback(
    (incident: Omit<IncidentDiscipline, 'id' | 'id_etablissement'>) => {
      const element: IncidentDiscipline = {
        ...incident,
        id: `dis-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        incidents_discipline: [element, ...precedent.incidents_discipline],
      }));
      ajouter_toast({ titre: 'Incident disciplinaire consigné', variante: 'warning' });
    },
    [etablissement_actif.id, ajouter_toast]
  );

  const supprimer_incident_discipline = useCallback(
    (id_incident: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        incidents_discipline: precedent.incidents_discipline.filter((d) => d.id !== id_incident),
      }));
      ajouter_toast({ titre: 'Incident disciplinaire supprimé', variante: 'info' });
    },
    [ajouter_toast]
  );

  const ajouter_ancien_etudiant = useCallback(
    (ancien: Omit<FicheAncienEtudiant, 'id' | 'id_etablissement'>): FicheAncienEtudiant => {
      const cree: FicheAncienEtudiant = {
        ...ancien,
        id: `alu-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        anciens: [cree, ...precedent.anciens],
      }));
      ajouter_toast({ titre: `Fiche diplômé ajoutée : ${cree.nom_complet}`, variante: 'success' });
      return cree;
    },
    [etablissement_actif.id, ajouter_toast]
  );

  const modifier_ancien_etudiant = useCallback(
    (id_ancien: string, modifications: Partial<FicheAncienEtudiant>) => {
      definir_etat((precedent) => ({
        ...precedent,
        anciens: precedent.anciens.map((a) =>
          a.id === id_ancien ? { ...a, ...modifications } : a
        ),
      }));
      ajouter_toast({ titre: 'Fiche diplômé mise à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const supprimer_ancien_etudiant = useCallback(
    (id_ancien: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        anciens: precedent.anciens.filter((a) => a.id !== id_ancien),
      }));
      ajouter_toast({ titre: 'Fiche diplômé supprimée', variante: 'info' });
    },
    [ajouter_toast]
  );

  const supprimer_abonnement_service = useCallback(
    (id_abonnement: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        abonnements: precedent.abonnements.filter((s) => s.id !== id_abonnement),
      }));
      ajouter_toast({ titre: 'Abonnement service supprimé', variante: 'info' });
    },
    [ajouter_toast]
  );

  const basculer_abonnement_service = useCallback(
    (
      id_apprenant: string,
      type_service: AbonnementService['type_service'],
      tarif: number,
      formule: string
    ) => {
      definir_etat((precedent) => {
        const existant = precedent.abonnements.find(
          (s) =>
            s.id_etablissement === etablissement_actif.id &&
            s.id_apprenant === id_apprenant &&
            s.type_service === type_service
        );
        if (existant) {
          return {
            ...precedent,
            abonnements: precedent.abonnements.map((s) =>
              s.id === existant.id
                ? {
                    ...s,
                    actif: !s.actif,
                    tarif_mensuel_ou_annuel_htg: tarif || s.tarif_mensuel_ou_annuel_htg,
                    ligne_ou_formule: formule || s.ligne_ou_formule,
                  }
                : s
            ),
          };
        }
        const nouvel_abonnement: AbonnementService = {
          id: `sub-${Date.now()}`,
          id_etablissement: etablissement_actif.id,
          id_apprenant,
          type_service,
          tarif_mensuel_ou_annuel_htg: tarif,
          actif: true,
          ligne_ou_formule: formule,
        };
        return { ...precedent, abonnements: [nouvel_abonnement, ...precedent.abonnements] };
      });
      ajouter_toast({ titre: `Abonnement ${type_service} mis à jour`, variante: 'success' });
    },
    [etablissement_actif.id, ajouter_toast]
  );

  const ajouter_ressource_lms = useCallback(
    (ressource: Omit<RessourcePedagogiqueLms, 'id' | 'id_etablissement' | 'publie_le'>) => {
      if (!a_permission('pedagogie:noter') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Action pédagogique réservée',
          description: 'La publication de supports de cours est réservée aux enseignants.',
          variante: 'error',
        });
        return;
      }
      const entree: RessourcePedagogiqueLms = {
        ...ressource,
        id: `lms-r-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
        publie_le: new Date().toISOString().slice(0, 10),
      };
      definir_etat((precedent) => ({
        ...precedent,
        ressources_lms: [entree, ...precedent.ressources_lms],
      }));
      ajouter_toast({ titre: 'Ressource publiée sur le Campus Numérique', variante: 'success' });
    },
    [a_permission, id_role_actif, etablissement_actif.id, ajouter_toast]
  );

  const ajouter_devoir_lms = useCallback(
    (saisie: {
      id_unite: string;
      id_element: string;
      titre: string;
      date_limite: string;
      points_max: number;
      total_attendu?: number;
      type_devoir?: TypeDevoirLms;
      theme_ou_chapitre?: string;
      consignes?: string;
      statut?: DevoirLms['statut'];
      pieces_jointes?: PieceJointeDevoirLms[];
      criteres_grille?: CritereGrilleDevoir[];
    }) => {
      if (!a_permission('pedagogie:noter') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Action pédagogique réservée',
          description: 'La création de devoirs est réservée aux enseignants.',
          variante: 'error',
        });
        return;
      }
      const apprenants_unite = etat.apprenants.filter(
        (a) => a.id_etablissement === etablissement_actif.id && a.id_unite === saisie.id_unite
      );
      const id_devoir = `lms-a-${Date.now()}`;
      const entree: DevoirLms = {
        id: id_devoir,
        id_etablissement: etablissement_actif.id,
        id_unite: saisie.id_unite,
        id_element: saisie.id_element,
        titre: saisie.titre.trim(),
        type_devoir: saisie.type_devoir ?? 'Devoir',
        theme_ou_chapitre: saisie.theme_ou_chapitre?.trim() || 'Général',
        consignes: saisie.consignes?.trim() || '',
        publie_le: new Date().toISOString().slice(0, 10),
        cree_par: utilisateur_actif.nom_complet,
        date_limite: saisie.date_limite,
        points_max: saisie.points_max,
        nombre_rendus: 0,
        total_attendu:
          apprenants_unite.length > 0 ? apprenants_unite.length : (saisie.total_attendu ?? 15),
        statut: saisie.statut ?? 'OUVERT',
        pieces_jointes: saisie.pieces_jointes ?? [],
        criteres_grille: saisie.criteres_grille ?? [],
        commentaires_classe: [],
      };
      const remises_initiales: RemiseDevoirLms[] = apprenants_unite.map((apprenant) => ({
        id: `rem-${id_devoir}-${apprenant.id}`,
        id_etablissement: etablissement_actif.id,
        id_devoir,
        id_apprenant: apprenant.id,
        statut: 'ASSIGNE',
      }));
      definir_etat((precedent) => ({
        ...precedent,
        devoirs_lms: [entree, ...precedent.devoirs_lms],
        remises_devoirs_lms: [...remises_initiales, ...precedent.remises_devoirs_lms],
      }));
      ajouter_toast({
        titre: entree.statut === 'BROUILLON' ? 'Brouillon de devoir enregistré' : 'Devoir publié',
        description: `${apprenants_unite.length} apprenant(s) assigné(s).`,
        variante: 'success',
      });
    },
    [
      a_permission,
      id_role_actif,
      etat.apprenants,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      ajouter_toast,
    ]
  );

  const basculer_statut_devoir_lms = useCallback(
    (id_devoir: string, statut: DevoirLms['statut']) => {
      if (!a_permission('pedagogie:noter') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Action pédagogique réservée',
          description: 'Seuls les enseignants peuvent modifier le statut d’un devoir.',
          variante: 'error',
        });
        return;
      }
      definir_etat((precedent) => ({
        ...precedent,
        devoirs_lms: precedent.devoirs_lms.map((d) =>
          d.id === id_devoir && d.id_etablissement === etablissement_actif.id
            ? { ...d, statut }
            : d
        ),
      }));
      ajouter_toast({
        titre:
          statut === 'OUVERT'
            ? 'Devoir ouvert aux remises'
            : statut === 'CLOTURE'
              ? 'Devoir clôturé'
              : 'Devoir replacé en brouillon',
        variante: 'info',
      });
    },
    [a_permission, id_role_actif, etablissement_actif.id, ajouter_toast]
  );

  const deposer_travail_devoir_lms = useCallback(
    (saisie: {
      id_devoir: string;
      id_apprenant: string;
      lien_ou_fichier?: string;
      nom_fichier?: string;
      id_fichier_local?: string;
      taille_octets?: number;
      type_mime?: string;
      pieces_remises?: PieceJointeDevoirLms[];
      commentaire_apprenant?: string;
    }) => {
      if (id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Mode Super-administrateur en lecture seule',
          description:
            'Un opérateur plateforme ne remet pas de copie à la place d’un apprenant.',
          variante: 'warning',
        });
        return;
      }
      const devoir = etat.devoirs_lms.find(
        (d) => d.id === saisie.id_devoir && d.id_etablissement === etablissement_actif.id
      );
      if (!devoir) return;
      if (devoir.statut === 'CLOTURE') {
        ajouter_toast({
          titre: 'Remise impossible',
          description: 'Ce devoir est clôturé par l’enseignant.',
          variante: 'warning',
        });
        return;
      }
      const maintenant = new Date();
      const date_iso = maintenant.toISOString().slice(0, 10);
      const heure_iso = maintenant.toTimeString().slice(0, 5);
      const en_retard = date_iso > devoir.date_limite;
      const nouveau_statut: RemiseDevoirLms['statut'] = en_retard ? 'RENDU_EN_RETARD' : 'REMIS';

      definir_etat((precedent) => {
        const existante = precedent.remises_devoirs_lms.find(
          (r) =>
            r.id_devoir === saisie.id_devoir &&
            r.id_apprenant === saisie.id_apprenant &&
            r.id_etablissement === etablissement_actif.id
        );
        const pieces_finales =
          saisie.pieces_remises && saisie.pieces_remises.length > 0
            ? saisie.pieces_remises
            : undefined;
        const premier_fichier = pieces_finales?.find((p) => p.id_fichier_local);
        const premier_lien = pieces_finales?.find((p) => !p.id_fichier_local && p.url);
        const nom_principal =
          saisie.nom_fichier?.trim() ||
          premier_fichier?.nom_fichier ||
          premier_fichier?.titre ||
          premier_lien?.titre;

        const remises_mises_a_jour: RemiseDevoirLms[] = existante
          ? precedent.remises_devoirs_lms.map((r) =>
              r.id === existante.id
                ? {
                    ...r,
                    statut: nouveau_statut,
                    remis_le: `${date_iso} ${heure_iso}`,
                    lien_ou_fichier:
                      saisie.lien_ou_fichier?.trim() || premier_lien?.url || r.lien_ou_fichier,
                    nom_fichier: nom_principal || r.nom_fichier || 'Travail_remis.pdf',
                    id_fichier_local:
                      saisie.id_fichier_local ?? premier_fichier?.id_fichier_local ?? r.id_fichier_local,
                    taille_octets:
                      saisie.taille_octets ?? premier_fichier?.taille_octets ?? r.taille_octets,
                    type_mime: saisie.type_mime ?? premier_fichier?.type_mime ?? r.type_mime,
                    pieces_remises: pieces_finales ?? r.pieces_remises,
                    commentaire_apprenant:
                      saisie.commentaire_apprenant?.trim() || r.commentaire_apprenant,
                  }
                : r
            )
          : [
              {
                id: `rem-${Date.now()}-${saisie.id_apprenant}`,
                id_etablissement: etablissement_actif.id,
                id_devoir: saisie.id_devoir,
                id_apprenant: saisie.id_apprenant,
                statut: nouveau_statut,
                remis_le: `${date_iso} ${heure_iso}`,
                lien_ou_fichier: saisie.lien_ou_fichier?.trim() || premier_lien?.url || undefined,
                nom_fichier: nom_principal || 'Travail_remis.pdf',
                id_fichier_local:
                  saisie.id_fichier_local ?? premier_fichier?.id_fichier_local ?? undefined,
                taille_octets: saisie.taille_octets ?? premier_fichier?.taille_octets ?? undefined,
                type_mime: saisie.type_mime ?? premier_fichier?.type_mime ?? undefined,
                pieces_remises: pieces_finales,
                commentaire_apprenant: saisie.commentaire_apprenant?.trim() || undefined,
              },
              ...precedent.remises_devoirs_lms,
            ];

        const nb_rendus_reels = remises_mises_a_jour.filter(
          (r) =>
            r.id_devoir === saisie.id_devoir &&
            r.id_etablissement === etablissement_actif.id &&
            r.statut !== 'ASSIGNE'
        ).length;

        return {
          ...precedent,
          remises_devoirs_lms: remises_mises_a_jour,
          devoirs_lms: precedent.devoirs_lms.map((d) =>
            d.id === saisie.id_devoir
              ? { ...d, nombre_rendus: Math.max(nb_rendus_reels, d.nombre_rendus) }
              : d
          ),
        };
      });

      ajouter_toast({
        titre: en_retard ? 'Devoir remis (hors délai)' : 'Devoir remis avec succès',
        description: saisie.nom_fichier || saisie.lien_ou_fichier || devoir.titre,
        variante: en_retard ? 'warning' : 'success',
      });
    },
    [id_role_actif, etat.devoirs_lms, etablissement_actif.id, ajouter_toast]
  );

  const annuler_remise_devoir_lms = useCallback(
    (id_devoir: string, id_apprenant: string) => {
      if (id_role_actif === 'SUPER_ADMIN') return;
      definir_etat((precedent) => {
        const remises_mises_a_jour = precedent.remises_devoirs_lms.map((r) =>
          r.id_devoir === id_devoir &&
          r.id_apprenant === id_apprenant &&
          r.id_etablissement === etablissement_actif.id &&
          r.statut !== 'EVALUE'
            ? { ...r, statut: 'ASSIGNE' as const }
            : r
        );
        const nb_rendus = remises_mises_a_jour.filter(
          (r) =>
            r.id_devoir === id_devoir &&
            r.id_etablissement === etablissement_actif.id &&
            r.statut !== 'ASSIGNE'
        ).length;
        return {
          ...precedent,
          remises_devoirs_lms: remises_mises_a_jour,
          devoirs_lms: precedent.devoirs_lms.map((d) =>
            d.id === id_devoir ? { ...d, nombre_rendus: nb_rendus } : d
          ),
        };
      });
      ajouter_toast({
        titre: 'Remise annulée',
        description: 'Vous pouvez modifier votre pièce jointe avant de rendre le devoir.',
        variante: 'info',
      });
    },
    [id_role_actif, etablissement_actif.id, ajouter_toast]
  );

  const evaluer_remise_devoir_lms = useCallback(
    (saisie: {
      id_devoir: string;
      id_apprenant: string;
      note_attribuee: number;
      points_par_critere?: Record<string, number>;
      commentaire_enseignant?: string;
      statut?: 'EVALUE' | 'A_REVOIR';
      synchroniser_bulletin?: boolean;
    }) => {
      if (!a_permission('pedagogie:noter') || id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Correction pédagogique réservée',
          description:
            'La notation des travaux est réservée aux rôles Enseignant ou Direction des études.',
          variante: 'error',
        });
        return;
      }
      const devoir = etat.devoirs_lms.find(
        (d) => d.id === saisie.id_devoir && d.id_etablissement === etablissement_actif.id
      );
      if (!devoir) return;
      const aujourdhui = new Date().toISOString().slice(0, 10);
      const note_bornee = Math.max(0, Math.min(devoir.points_max, saisie.note_attribuee));
      const statut_final = saisie.statut ?? 'EVALUE';

      definir_etat((precedent) => {
        const existante = precedent.remises_devoirs_lms.find(
          (r) =>
            r.id_devoir === saisie.id_devoir &&
            r.id_apprenant === saisie.id_apprenant &&
            r.id_etablissement === etablissement_actif.id
        );
        const remises_mises_a_jour: RemiseDevoirLms[] = existante
          ? precedent.remises_devoirs_lms.map((r) =>
              r.id === existante.id
                ? {
                    ...r,
                    statut: statut_final,
                    note_attribuee: note_bornee,
                    points_par_critere: saisie.points_par_critere ?? r.points_par_critere,
                    commentaire_enseignant:
                      saisie.commentaire_enseignant?.trim() ?? r.commentaire_enseignant,
                    evalue_le: aujourdhui,
                    evalue_par: utilisateur_actif.nom_complet,
                    synchronise_bulletin: Boolean(saisie.synchroniser_bulletin),
                  }
                : r
            )
          : [
              {
                id: `rem-${Date.now()}-${saisie.id_apprenant}`,
                id_etablissement: etablissement_actif.id,
                id_devoir: saisie.id_devoir,
                id_apprenant: saisie.id_apprenant,
                statut: statut_final,
                note_attribuee: note_bornee,
                points_par_critere: saisie.points_par_critere,
                commentaire_enseignant: saisie.commentaire_enseignant?.trim() || undefined,
                evalue_le: aujourdhui,
                evalue_par: utilisateur_actif.nom_complet,
                synchronise_bulletin: Boolean(saisie.synchroniser_bulletin),
              },
              ...precedent.remises_devoirs_lms,
            ];

        let notes_mises_a_jour = precedent.notes;
        let apprenants_mis_a_jour = precedent.apprenants;

        if (saisie.synchroniser_bulletin && statut_final === 'EVALUE') {
          const echelle = etablissement_actif.echelle_notation;
          const note_convertie =
            devoir.points_max > 0
              ? Number(
                  ((note_bornee / devoir.points_max) * echelle).toFixed(echelle === 100 ? 0 : 2)
                )
              : 0;
          const nouvelle_note: NoteEvaluation = {
            id: `gr-lms-${Date.now()}-${saisie.id_apprenant}`,
            id_etablissement: etablissement_actif.id,
            id_apprenant: saisie.id_apprenant,
            id_element: devoir.id_element,
            libelle_periode: etablissement_actif.libelle_periode_courante,
            type_evaluation: 'Devoir',
            note: note_convertie,
            note_maximale: echelle,
            verrouillee: false,
            enregistree_le: aujourdhui,
          };
          notes_mises_a_jour = [nouvelle_note, ...precedent.notes];
          const notes_apprenant = notes_mises_a_jour.filter(
            (n) => n.id_apprenant === saisie.id_apprenant
          );
          if (notes_apprenant.length > 0) {
            const moyenne = Number(
              (notes_apprenant.reduce((s, n) => s + n.note, 0) / notes_apprenant.length).toFixed(
                echelle === 100 ? 0 : 2
              )
            );
            apprenants_mis_a_jour = precedent.apprenants.map((a) =>
              a.id === saisie.id_apprenant ? { ...a, moyenne_generale: moyenne } : a
            );
          }
        }

        return {
          ...precedent,
          remises_devoirs_lms: remises_mises_a_jour,
          notes: notes_mises_a_jour,
          apprenants: apprenants_mis_a_jour,
        };
      });

      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action:
          statut_final === 'EVALUE'
            ? `Copie rendue (${note_bornee}/${devoir.points_max})`
            : 'Révision demandée sur devoir',
        cible: `${devoir.titre} · ${saisie.id_apprenant}`,
        categorie: 'PEDAGOGIE',
      });

      ajouter_toast({
        titre:
          statut_final === 'EVALUE'
            ? `Copie notée et rendue (${note_bornee}/${devoir.points_max})`
            : 'Demande de révision envoyée',
        description: saisie.synchroniser_bulletin
          ? 'Note synchronisée avec le relevé officiel.'
          : undefined,
        variante: statut_final === 'EVALUE' ? 'success' : 'warning',
      });
    },
    [
      a_permission,
      id_role_actif,
      etat.devoirs_lms,
      etablissement_actif.id,
      etablissement_actif.echelle_notation,
      etablissement_actif.libelle_periode_courante,
      utilisateur_actif.nom_complet,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const ajouter_commentaire_devoir_lms = useCallback(
    (id_devoir: string, message: string) => {
      if (id_role_actif === 'SUPER_ADMIN') {
        ajouter_toast({
          titre: 'Mode lecture seule Super-admin',
          description: 'Les échanges pédagogiques de classe sont réservés aux acteurs du cours.',
          variante: 'warning',
        });
        return;
      }
      const texte = message.trim();
      if (!texte) return;
      const maintenant = new Date();
      const cree_le = `${maintenant.toISOString().slice(0, 10)} ${maintenant.toTimeString().slice(0, 5)}`;
      definir_etat((precedent) => ({
        ...precedent,
        devoirs_lms: precedent.devoirs_lms.map((d) =>
          d.id === id_devoir && d.id_etablissement === etablissement_actif.id
            ? {
                ...d,
                commentaires_classe: [
                  ...(d.commentaires_classe ?? []),
                  {
                    id: `com-${Date.now()}`,
                    nom_auteur: utilisateur_actif.nom_complet,
                    role_auteur: ROLES[id_role_actif].libelle_court,
                    message: texte,
                    cree_le,
                  },
                ],
              }
            : d
        ),
      }));
      ajouter_toast({ titre: 'Commentaire publié sur le devoir', variante: 'success' });
    },
    [id_role_actif, etablissement_actif.id, utilisateur_actif.nom_complet, ajouter_toast]
  );

  const soumettre_devoir_lms = useCallback(
    (id_devoir: string) => {
      if (id_role_actif === 'SUPER_ADMIN') return;
      definir_etat((precedent) => ({
        ...precedent,
        devoirs_lms: precedent.devoirs_lms.map((d) =>
          d.id === id_devoir
            ? { ...d, nombre_rendus: Math.min(d.total_attendu, d.nombre_rendus + 1) }
            : d
        ),
      }));
      ajouter_toast({ titre: 'Devoir remis sur la plateforme', variante: 'success' });
    },
    [id_role_actif, ajouter_toast]
  );

  const promouvoir_annee_academique = useCallback(
    (nouveau_libelle_annee: string): number => {
      let promus = 0;
      definir_etat((precedent) => ({
        ...precedent,
        etablissements: precedent.etablissements.map((e) =>
          e.id === etablissement_actif.id
            ? { ...e, annee_academique: nouveau_libelle_annee }
            : e
        ),
        apprenants: precedent.apprenants.map((a) => {
          if (a.id_etablissement !== etablissement_actif.id) return a;
          if (a.moyenne_generale >= etablissement_actif.note_passage && a.indice_etape < 5) {
            promus += 1;
            return { ...a, indice_etape: (a.indice_etape + 1) as Apprenant['indice_etape'] };
          }
          return a;
        }),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Passage année académique ${nouveau_libelle_annee}`,
        cible: `${promus} dossier(s) promu(s)`,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: `Année ${nouveau_libelle_annee} activée`,
        description: `${promus} ${terminologie.apprenant_pluriel.toLowerCase()} promu(s).`,
        variante: 'success',
      });
      return promus;
    },
    [
      etablissement_actif.id,
      etablissement_actif.note_passage,
      utilisateur_actif.nom_complet,
      id_role_actif,
      terminologie.apprenant_pluriel,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const reinitialiser_donnees_demo = useCallback(() => {
    localStorage.removeItem(CLE_STOCKAGE_ETAT);
    localStorage.removeItem(CLE_STOCKAGE_SESSION);
    definir_etat(obtenir_etat_persiste_defaut());
    definir_est_authentifie(false);
    definir_id_etablissement_actif(ETABLISSEMENTS_INITIAUX[0].id);
    definir_id_utilisateur_actif(UTILISATEURS_INITIAUX[1].id);
    definir_devise_active(ETABLISSEMENTS_INITIAUX[0].devise_defaut);
    definir_route_active_interne('tableau_de_bord');
    ajouter_toast({
      titre: 'Données de démonstration réinitialisées',
      description: 'Les établissements internationaux et leurs jeux de données ont été restaurés.',
      variante: 'info',
    });
  }, [ajouter_toast]);

  // Actions des modules complémentaires
  const ajouter_article_actualite = useCallback(
    (
      article: Omit<ArticleActualite, 'id' | 'id_etablissement' | 'publie_le' | 'nom_auteur'>
    ) => {
      const entree: ArticleActualite = {
        ...article,
        id: `news-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
        publie_le: new Date().toISOString().slice(0, 10),
        nom_auteur: utilisateur_actif.nom_complet,
      };
      definir_etat((precedent) => ({
        ...precedent,
        articles_actualites: [entree, ...precedent.articles_actualites],
      }));
      ajouter_toast({ titre: 'Actualité publiée', description: article.titre, variante: 'success' });
    },
    [etablissement_actif.id, utilisateur_actif.nom_complet, ajouter_toast]
  );

  const modifier_article_actualite = useCallback(
    (id_article: string, modifications: Partial<ArticleActualite>) => {
      definir_etat((precedent) => ({
        ...precedent,
        articles_actualites: precedent.articles_actualites.map((n) =>
          n.id === id_article ? { ...n, ...modifications } : n
        ),
      }));
      ajouter_toast({ titre: 'Actualité mise à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const basculer_epingle_actualite = useCallback((id_article: string) => {
    definir_etat((precedent) => ({
      ...precedent,
      articles_actualites: precedent.articles_actualites.map((n) =>
        n.id === id_article ? { ...n, epingle: !n.epingle } : n
      ),
    }));
  }, []);

  const supprimer_article_actualite = useCallback(
    (id_article: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        articles_actualites: precedent.articles_actualites.filter((n) => n.id !== id_article),
      }));
      ajouter_toast({ titre: 'Actualité supprimée', variante: 'info' });
    },
    [ajouter_toast]
  );

  const mettre_a_jour_consentement_rgpd = useCallback(
    (
      id_apprenant: string,
      modifications: Partial<
        Pick<
          ConsentementRgpd,
          'droit_image' | 'traitement_donnees' | 'accord_parental' | 'consentement_sms_whatsapp'
        >
      >
    ) => {
      const aujourdhui = new Date().toISOString().slice(0, 10);
      definir_etat((precedent) => {
        const existe = precedent.consentements_rgpd.find(
          (c) =>
            c.id_etablissement === etablissement_actif.id && c.id_apprenant === id_apprenant
        );
        if (existe) {
          return {
            ...precedent,
            consentements_rgpd: precedent.consentements_rgpd.map((c) =>
              c.id === existe.id
                ? {
                    ...c,
                    ...modifications,
                    mis_a_jour_le: aujourdhui,
                    mis_a_jour_par: utilisateur_actif.nom_complet,
                  }
                : c
            ),
          };
        }
        const cree: ConsentementRgpd = {
          id: `rgpd-c-${Date.now()}`,
          id_etablissement: etablissement_actif.id,
          id_apprenant,
          droit_image: modifications.droit_image ?? false,
          traitement_donnees: modifications.traitement_donnees ?? true,
          accord_parental: modifications.accord_parental ?? true,
          consentement_sms_whatsapp: modifications.consentement_sms_whatsapp ?? false,
          mis_a_jour_le: aujourdhui,
          mis_a_jour_par: utilisateur_actif.nom_complet,
        };
        return {
          ...precedent,
          consentements_rgpd: [cree, ...precedent.consentements_rgpd],
        };
      });
      ajouter_toast({ titre: 'Consentement RGPD mis à jour', variante: 'success' });
    },
    [etablissement_actif.id, utilisateur_actif.nom_complet, ajouter_toast]
  );

  const creer_demande_rgpd = useCallback(
    (demande: Omit<DemandeRgpd, 'id' | 'id_etablissement' | 'statut' | 'demandee_le'>) => {
      const entree: DemandeRgpd = {
        ...demande,
        id: `rgpd-r-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
        statut: 'EN_ATTENTE',
        demandee_le: new Date().toISOString().slice(0, 10),
      };
      definir_etat((precedent) => ({
        ...precedent,
        demandes_rgpd: [entree, ...precedent.demandes_rgpd],
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Nouvelle requête RGPD (${demande.type_demande})`,
        cible: demande.id_apprenant,
        categorie: 'RBAC',
      });
      ajouter_toast({ titre: 'Demande RGPD enregistrée', variante: 'info' });
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const traiter_demande_rgpd = useCallback(
    (id_demande: string) => {
      const aujourdhui = new Date().toISOString().slice(0, 10);
      definir_etat((precedent) => ({
        ...precedent,
        demandes_rgpd: precedent.demandes_rgpd.map((r) =>
          r.id === id_demande ? { ...r, statut: 'TRAITEE', traitee_le: aujourdhui } : r
        ),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Clôture requête RGPD',
        cible: id_demande,
        categorie: 'RBAC',
      });
      ajouter_toast({ titre: 'Demande RGPD marquée comme traitée', variante: 'success' });
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const anonymiser_apprenant_rgpd = useCallback(
    (id_apprenant: string) => {
      const etiquette = id_apprenant.slice(-4).toUpperCase();
      definir_etat((precedent) => ({
        ...precedent,
        apprenants: precedent.apprenants.map((a) =>
          a.id === id_apprenant
            ? {
                ...a,
                prenom: 'Anonyme',
                nom: `RGPD-${etiquette}`,
                telephone: '0000-0000',
                courriel: undefined,
                adresse: 'Données effacées (Art. 17 RGPD)',
                lieu_naissance: 'Confidentiel',
                tuteurs: [],
                statut: 'SUSPENDU',
              }
            : a
        ),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Anonymisation RGPD (Droit à l’oubli Art. 17)',
        cible: id_apprenant,
        categorie: 'RBAC',
      });
      ajouter_toast({
        titre: 'Dossier anonymisé selon l’Art. 17 RGPD',
        description: 'Les données personnelles nominatives ont été effacées.',
        variante: 'warning',
      });
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const creer_utilisateur_etablissement = useCallback(
    (saisie: {
      nom_complet: string;
      courriel: string;
      telephone: string;
      id_role: IdentifiantRole;
      fonction_locale: string;
      mot_de_passe_demo: string;
      double_facteur_actif: boolean;
      doit_changer_mot_de_passe?: boolean;
    }) => {
      if (SOURCE_API) {
        void requeteApi<CompteUtilisateur>(
          `/etablissements/${encodeURIComponent(etablissement_actif.id)}/utilisateurs/`,
          {
            method: 'POST',
            body: {
              nom_complet: saisie.nom_complet,
              courriel: saisie.courriel,
              telephone: saisie.telephone,
              id_role: saisie.id_role,
              fonction_locale: saisie.fonction_locale,
              mot_de_passe: saisie.mot_de_passe_demo,
              double_facteur_actif: saisie.double_facteur_actif,
              doit_changer_mot_de_passe: saisie.doit_changer_mot_de_passe ?? false,
            },
          }
        )
          .then((nouvel_utilisateur) => {
            definir_etat((precedent) => ({
              ...precedent,
              utilisateurs: [nouvel_utilisateur, ...precedent.utilisateurs],
            }));
            ajouter_toast({
              titre: `Compte créé : ${nouvel_utilisateur.nom_complet}`,
              description: `Accès ${ROLES[saisie.id_role].libelle} activé.`,
              variante: 'success',
            });
          })
          .catch((erreur: unknown) => {
            ajouter_toast({
              titre: 'Création du compte impossible',
              description:
                erreur instanceof Error
                  ? erreur.message
                  : 'Le serveur n’a pas pu créer ce compte.',
              variante: 'error',
            });
          });
        return;
      }
      const initiales =
        saisie.nom_complet
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((m) => m[0]?.toUpperCase() ?? '')
          .join('') || 'US';

      const nouvel_utilisateur: CompteUtilisateur = {
        id: `usr-${Date.now()}`,
        nom_complet: saisie.nom_complet.trim(),
        courriel: saisie.courriel.trim(),
        telephone: saisie.telephone.trim(),
        mot_de_passe_demo: saisie.mot_de_passe_demo.trim(),
        initiales_avatar: initiales,
        est_actif: true,
        double_facteur_actif: saisie.double_facteur_actif,
        doit_changer_mot_de_passe: saisie.doit_changer_mot_de_passe ?? false,
        mot_de_passe_mis_a_jour_le: new Date().toISOString().slice(0, 10),
        tentatives_connexion_echouees: 0,
        affiliations: [
          {
            id_etablissement: etablissement_actif.id,
            id_role: saisie.id_role,
            fonction_locale: saisie.fonction_locale.trim() || ROLES[saisie.id_role].libelle,
          },
        ],
      };

      definir_etat((precedent) => ({
        ...precedent,
        utilisateurs: [nouvel_utilisateur, ...precedent.utilisateurs],
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Création compte utilisateur (${ROLES[saisie.id_role].libelle_court})`,
        cible: `${nouvel_utilisateur.nom_complet} · ${nouvel_utilisateur.courriel}`,
        categorie: 'AUTH',
      });
      ajouter_toast({
        titre: `Compte créé : ${nouvel_utilisateur.nom_complet}`,
        description: `Accès ${ROLES[saisie.id_role].libelle} activé.`,
        variante: 'success',
      });
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const modifier_utilisateur_etablissement = useCallback(
    (
      id_utilisateur: string,
      modifications: {
        nom_complet?: string;
        courriel?: string;
        telephone?: string;
        fonction_locale?: string;
      }
    ) => {
      if (SOURCE_API) {
        void requeteApi<CompteUtilisateur>(
          `/etablissements/${encodeURIComponent(etablissement_actif.id)}/utilisateurs/${encodeURIComponent(id_utilisateur)}/`,
          { method: 'PATCH', body: modifications }
        )
          .then((utilisateur_api) => {
            definir_etat((precedent) => ({
              ...precedent,
              utilisateurs: precedent.utilisateurs.map((utilisateur) =>
                utilisateur.id === id_utilisateur ? utilisateur_api : utilisateur
              ),
            }));
            ajouter_toast({ titre: 'Compte utilisateur mis à jour', variante: 'success' });
          })
          .catch((erreur: unknown) => {
            ajouter_toast({
              titre: 'Compte non modifié',
              description: erreur instanceof Error ? erreur.message : 'Modification refusée.',
              variante: 'error',
            });
          });
        return;
      }
      definir_etat((precedent) => ({
        ...precedent,
        utilisateurs: precedent.utilisateurs.map((u) => {
          if (u.id !== id_utilisateur) return u;
          const nom_final = modifications.nom_complet?.trim() || u.nom_complet;
          const initiales =
            nom_final
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((m) => m[0]?.toUpperCase() ?? '')
              .join('') || u.initiales_avatar;
          return {
            ...u,
            nom_complet: nom_final,
            courriel: modifications.courriel?.trim() || u.courriel,
            telephone: modifications.telephone?.trim() || u.telephone,
            initiales_avatar: initiales,
            affiliations:
              modifications.fonction_locale !== undefined
                ? u.affiliations.map((aff) =>
                    aff.id_etablissement === etablissement_actif.id
                      ? { ...aff, fonction_locale: modifications.fonction_locale!.trim() || aff.fonction_locale }
                      : aff
                  )
                : u.affiliations,
          };
        }),
      }));
      ajouter_toast({ titre: 'Compte utilisateur mis à jour', variante: 'success' });
    },
    [etablissement_actif.id, ajouter_toast]
  );

  const supprimer_utilisateur_etablissement = useCallback(
    (id_utilisateur: string): boolean => {
      if (id_utilisateur === utilisateur_actif.id) {
        ajouter_toast({
          titre: 'Suppression refusée',
          description: 'Vous ne pouvez pas supprimer votre propre compte actif.',
          variante: 'warning',
        });
        return false;
      }
      const cible = etat.utilisateurs.find((u) => u.id === id_utilisateur);
      if (cible?.est_super_admin_plateforme) {
        ajouter_toast({
          titre: 'Compte protégé',
          description: 'Le compte Super-admin plateforme ne peut pas être supprimé.',
          variante: 'error',
        });
        return false;
      }
      if (SOURCE_API) {
        void requeteApi<null>(
          `/etablissements/${encodeURIComponent(etablissement_actif.id)}/utilisateurs/${encodeURIComponent(id_utilisateur)}/`,
          { method: 'DELETE' }
        )
          .then(() => {
            definir_etat((precedent) => ({
              ...precedent,
              utilisateurs: precedent.utilisateurs.filter(
                (utilisateur) => utilisateur.id !== id_utilisateur
              ),
            }));
            ajouter_toast({ titre: 'Compte retiré de l’établissement', variante: 'info' });
          })
          .catch((erreur: unknown) => {
            ajouter_toast({
              titre: 'Retrait du compte impossible',
              description: erreur instanceof Error ? erreur.message : 'Opération refusée.',
              variante: 'error',
            });
          });
        return true;
      }
      definir_etat((precedent) => ({
        ...precedent,
        utilisateurs: precedent.utilisateurs
          .map((u) => {
            if (u.id !== id_utilisateur) return u;
            const restantes = u.affiliations.filter(
              (a) => a.id_etablissement !== etablissement_actif.id
            );
            return { ...u, affiliations: restantes };
          })
          .filter((u) => u.est_super_admin_plateforme || u.affiliations.length > 0),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Suppression accès utilisateur',
        cible: cible?.courriel ?? id_utilisateur,
        categorie: 'AUTH',
      });
      ajouter_toast({ titre: 'Compte retiré de l’établissement', variante: 'info' });
      return true;
    },
    [
      utilisateur_actif.id,
      utilisateur_actif.nom_complet,
      etat.utilisateurs,
      etablissement_actif.id,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const mettre_a_jour_role_utilisateur = useCallback(
    (id_utilisateur: string, id_role: IdentifiantRole) => {
      if (SOURCE_API) {
        void requeteApi<CompteUtilisateur>(
          `/etablissements/${encodeURIComponent(etablissement_actif.id)}/utilisateurs/${encodeURIComponent(id_utilisateur)}/`,
          { method: 'PATCH', body: { id_role } }
        )
          .then((utilisateur_api) => {
            definir_etat((precedent) => ({
              ...precedent,
              utilisateurs: precedent.utilisateurs.map((utilisateur) =>
                utilisateur.id === id_utilisateur ? utilisateur_api : utilisateur
              ),
            }));
            ajouter_toast({
              titre: `Rôle mis à jour : ${ROLES[id_role].libelle_court}`,
              variante: 'success',
            });
          })
          .catch((erreur: unknown) => {
            ajouter_toast({
              titre: 'Rôle non modifié',
              description: erreur instanceof Error ? erreur.message : 'Modification refusée.',
              variante: 'error',
            });
          });
        return;
      }
      definir_etat((precedent) => ({
        ...precedent,
        utilisateurs: precedent.utilisateurs.map((u) => {
          if (u.id !== id_utilisateur) return u;
          const possede_affiliation = u.affiliations.some(
            (a) => a.id_etablissement === etablissement_actif.id
          );
          return {
            ...u,
            affiliations: possede_affiliation
              ? u.affiliations.map((a) =>
                  a.id_etablissement === etablissement_actif.id ? { ...a, id_role } : a
                )
              : [
                  ...u.affiliations,
                  {
                    id_etablissement: etablissement_actif.id,
                    id_role,
                    fonction_locale: ROLES[id_role].libelle,
                  },
                ],
          };
        }),
      }));
      ajouter_toast({
        titre: `Rôle mis à jour : ${ROLES[id_role].libelle_court}`,
        variante: 'success',
      });
    },
    [etablissement_actif.id, ajouter_toast]
  );

  const basculer_actif_utilisateur = useCallback(
    (id_utilisateur: string) => {
      if (id_utilisateur === utilisateur_actif.id) {
        ajouter_toast({
          titre: 'Action impossible',
          description: 'Vous ne pouvez pas suspendre votre propre compte actif.',
          variante: 'warning',
        });
        return;
      }
      if (SOURCE_API) {
        const utilisateur_cible = etat.utilisateurs.find(
          (utilisateur) => utilisateur.id === id_utilisateur
        );
        if (!utilisateur_cible) return;
        const est_actif = utilisateur_cible.est_actif === false;
        void requeteApi<CompteUtilisateur>(
          `/etablissements/${encodeURIComponent(etablissement_actif.id)}/utilisateurs/${encodeURIComponent(id_utilisateur)}/`,
          { method: 'PATCH', body: { est_actif } }
        )
          .then((utilisateur_api) => {
            definir_etat((precedent) => ({
              ...precedent,
              utilisateurs: precedent.utilisateurs.map((utilisateur) =>
                utilisateur.id === id_utilisateur ? utilisateur_api : utilisateur
              ),
            }));
            ajouter_toast({ titre: 'Statut du compte modifié', variante: 'info' });
          })
          .catch((erreur: unknown) => {
            ajouter_toast({
              titre: 'Statut du compte non modifié',
              description: erreur instanceof Error ? erreur.message : 'Action refusée.',
              variante: 'error',
            });
          });
        return;
      }
      definir_etat((precedent) => ({
        ...precedent,
        utilisateurs: precedent.utilisateurs.map((u) =>
          u.id === id_utilisateur ? { ...u, est_actif: u.est_actif === false ? true : false } : u
        ),
      }));
      ajouter_toast({ titre: 'Statut du compte modifié', variante: 'info' });
    },
    [utilisateur_actif.id, ajouter_toast]
  );

  const basculer_2fa_utilisateur = useCallback(
    (id_utilisateur: string) => {
      if (SOURCE_API) {
        const utilisateur_cible = etat.utilisateurs.find(
          (utilisateur) => utilisateur.id === id_utilisateur
        );
        if (!utilisateur_cible) return;
        const double_facteur_actif = !utilisateur_cible.double_facteur_actif;
        void requeteApi<CompteUtilisateur>(
          `/etablissements/${encodeURIComponent(etablissement_actif.id)}/utilisateurs/${encodeURIComponent(id_utilisateur)}/`,
          { method: 'PATCH', body: { double_facteur_actif } }
        )
          .then((utilisateur_api) => {
            definir_etat((precedent) => ({
              ...precedent,
              utilisateurs: precedent.utilisateurs.map((utilisateur) =>
                utilisateur.id === id_utilisateur ? utilisateur_api : utilisateur
              ),
            }));
            ajouter_toast({ titre: 'Politique 2FA mise à jour', variante: 'success' });
          })
          .catch((erreur: unknown) => {
            ajouter_toast({
              titre: 'Politique 2FA non modifiée',
              description: erreur instanceof Error ? erreur.message : 'Action refusée.',
              variante: 'error',
            });
          });
        return;
      }
      definir_etat((precedent) => ({
        ...precedent,
        utilisateurs: precedent.utilisateurs.map((u) =>
          u.id === id_utilisateur
            ? { ...u, double_facteur_actif: !u.double_facteur_actif }
            : u
        ),
      }));
      ajouter_toast({ titre: 'Politique 2FA mise à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const reinitialiser_mot_de_passe_utilisateur = useCallback(
    (
      id_utilisateur: string,
      nouveau_mot_de_passe: string,
      options?: { doit_changer_mot_de_passe?: boolean }
    ): boolean => {
      const politique = valider_politique_mot_de_passe(nouveau_mot_de_passe);
      if (!politique.valide) {
        ajouter_toast({
          titre: 'Mot de passe non conforme',
          description: politique.message,
          variante: 'warning',
        });
        return false;
      }
      if (SOURCE_API) {
        void requeteApi<CompteUtilisateur>(
          `/etablissements/${encodeURIComponent(etablissement_actif.id)}/utilisateurs/${encodeURIComponent(id_utilisateur)}/`,
          {
            method: 'PATCH',
            body: {
              mot_de_passe: nouveau_mot_de_passe.trim(),
              doit_changer_mot_de_passe:
                options?.doit_changer_mot_de_passe ?? false,
              tentatives_connexion_echouees: 0,
              verrouille_jusqua: null,
            },
          }
        )
          .then((utilisateur_api) => {
            definir_etat((precedent) => ({
              ...precedent,
              utilisateurs: precedent.utilisateurs.map((utilisateur) =>
                utilisateur.id === id_utilisateur ? utilisateur_api : utilisateur
              ),
            }));
            ajouter_toast({
              titre: 'Mot de passe réinitialisé',
              description: utilisateur_api.doit_changer_mot_de_passe
                ? 'L’utilisateur devra définir un nouveau mot de passe à sa prochaine connexion.'
                : 'Le nouveau mot de passe est actif immédiatement.',
              variante: 'success',
            });
          })
          .catch((erreur: unknown) => {
            ajouter_toast({
              titre: 'Mot de passe non réinitialisé',
              description: erreur instanceof Error ? erreur.message : 'Action refusée.',
              variante: 'error',
            });
          });
        return true;
      }
      const aujourdhui = new Date().toISOString().slice(0, 10);
      const utilisateur_cible = etat.utilisateurs.find((u) => u.id === id_utilisateur);
      definir_etat((precedent) => ({
        ...precedent,
        utilisateurs: precedent.utilisateurs.map((u) =>
          u.id === id_utilisateur
            ? {
                ...u,
                mot_de_passe_demo: nouveau_mot_de_passe.trim(),
                mot_de_passe_mis_a_jour_le: aujourdhui,
                doit_changer_mot_de_passe:
                  options?.doit_changer_mot_de_passe ?? u.doit_changer_mot_de_passe ?? false,
                tentatives_connexion_echouees: 0,
                verrouille_jusqua: undefined,
              }
            : u
        ),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: options?.doit_changer_mot_de_passe
          ? 'Réinitialisation mot de passe (changement exigé)'
          : 'Réinitialisation mot de passe utilisateur',
        cible: utilisateur_cible?.courriel ?? id_utilisateur,
        categorie: 'AUTH',
      });
      ajouter_toast({
        titre: 'Mot de passe réinitialisé',
        description: options?.doit_changer_mot_de_passe
          ? 'L’utilisateur devra définir un nouveau mot de passe à sa prochaine connexion.'
          : 'Le nouveau mot de passe est actif immédiatement.',
        variante: 'success',
      });
      return true;
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      etat.utilisateurs,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const deverrouiller_compte_utilisateur = useCallback(
    (id_utilisateur: string) => {
      const utilisateur_cible = etat.utilisateurs.find((u) => u.id === id_utilisateur);
      if (SOURCE_API) {
        void requeteApi<CompteUtilisateur>(
          `/etablissements/${encodeURIComponent(etablissement_actif.id)}/utilisateurs/${encodeURIComponent(id_utilisateur)}/`,
          {
            method: 'PATCH',
            body: {
              tentatives_connexion_echouees: 0,
              verrouille_jusqua: null,
            },
          }
        )
          .then((utilisateur_api) => {
            definir_etat((precedent) => ({
              ...precedent,
              utilisateurs: precedent.utilisateurs.map((utilisateur) =>
                utilisateur.id === id_utilisateur ? utilisateur_api : utilisateur
              ),
            }));
            ajouter_toast({
              titre: 'Compte déverrouillé',
              description: `${utilisateur_api.nom_complet} peut se reconnecter immédiatement.`,
              variante: 'success',
            });
          })
          .catch((erreur: unknown) => {
            ajouter_toast({
              titre: 'Compte non déverrouillé',
              description: erreur instanceof Error ? erreur.message : 'Action refusée.',
              variante: 'error',
            });
          });
        return;
      }
      definir_etat((precedent) => ({
        ...precedent,
        utilisateurs: precedent.utilisateurs.map((u) =>
          u.id === id_utilisateur
            ? { ...u, tentatives_connexion_echouees: 0, verrouille_jusqua: undefined }
            : u
        ),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Déblocage manuel de compte verrouillé',
        cible: utilisateur_cible?.courriel ?? id_utilisateur,
        categorie: 'AUTH',
      });
      ajouter_toast({
        titre: 'Compte déverrouillé',
        description: `${utilisateur_cible?.nom_complet ?? 'Utilisateur'} peut se reconnecter immédiatement.`,
        variante: 'success',
      });
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      etat.utilisateurs,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const importer_donnees_lot = useCallback(
    (saisie: {
      cible: LotImportation['cible'];
      nom_fichier: string;
      apprenants?: Apprenant[];
      notes?: Omit<NoteEvaluation, 'id' | 'id_etablissement'>[];
      paiements?: {
        id_apprenant: string;
        montant_htg: number;
        mode_paiement: PaiementEnregistre['mode_paiement'];
        libelle: string;
      }[];
      unites?: UniteAcademique[];
    }) => {
      let nombre = 0;
      const maintenant = new Date();
      const completer = (n: number) => String(n).padStart(2, '0');
      const horodatage = `${maintenant.getFullYear()}-${completer(
        maintenant.getMonth() + 1
      )}-${completer(maintenant.getDate())} ${completer(maintenant.getHours())}:${completer(
        maintenant.getMinutes()
      )}`;

      definir_etat((precedent) => {
        let apprenants_suivants = precedent.apprenants;
        let notes_suivantes = precedent.notes;
        let paiements_suivants = precedent.paiements;
        let unites_suivantes = precedent.unites;

        if (saisie.cible === 'APPRENANTS' && saisie.apprenants?.length) {
          nombre = saisie.apprenants.length;
          apprenants_suivants = [...saisie.apprenants, ...precedent.apprenants];
        } else if (saisie.cible === 'NOTES' && saisie.notes?.length) {
          nombre = saisie.notes.length;
          const notes_horodatees: NoteEvaluation[] = saisie.notes.map((n, index) => ({
            ...n,
            id: `gr-imp-${Date.now()}-${index}`,
            id_etablissement: etablissement_actif.id,
          }));
          notes_suivantes = [...notes_horodatees, ...precedent.notes];
        } else if (saisie.cible === 'PAIEMENTS' && saisie.paiements?.length) {
          nombre = saisie.paiements.length;
          const aujourdhui = maintenant.toISOString().slice(0, 10);
          const paiements_horodates: PaiementEnregistre[] = saisie.paiements.map((p, index) => ({
            id: `pay-imp-${Date.now()}-${index}`,
            id_etablissement: etablissement_actif.id,
            numero_recu: `REC-${etablissement_actif.code}-IMP-${String(1000 + index)}`,
            id_apprenant: p.id_apprenant,
            montant_htg: p.montant_htg,
            mode_paiement: p.mode_paiement,
            libelle: p.libelle,
            paye_le: aujourdhui,
            encaisse_par: `${utilisateur_actif.nom_complet} (Import CSV)`,
            statut: 'VALIDE',
          }));
          paiements_suivants = [...paiements_horodates, ...precedent.paiements];
          apprenants_suivants = precedent.apprenants.map((a) => {
            const ajoute = saisie.paiements!
              .filter((p) => p.id_apprenant === a.id)
              .reduce((somme, p) => somme + p.montant_htg, 0);
            if (!ajoute) return a;
            const nouveau_paye = a.total_paye_htg + ajoute;
            const statut_paiement: Apprenant['statut_paiement'] =
              nouveau_paye >= a.total_du_htg
                ? 'A_JOUR'
                : nouveau_paye >= a.total_du_htg * 0.4
                  ? 'PARTIEL'
                  : 'EN_RETARD';
            return { ...a, total_paye_htg: nouveau_paye, statut_paiement };
          });
        } else if (saisie.cible === 'UNITES' && saisie.unites?.length) {
          nombre = saisie.unites.length;
          unites_suivantes = [...precedent.unites, ...saisie.unites];
        }

        const journal: LotImportation = {
          id: `imp-${Date.now()}`,
          id_etablissement: etablissement_actif.id,
          cible: saisie.cible,
          nom_fichier: saisie.nom_fichier,
          lignes_importees: nombre,
          importe_le: horodatage,
          importe_par: utilisateur_actif.nom_complet,
        };

        return {
          ...precedent,
          apprenants: apprenants_suivants,
          notes: notes_suivantes,
          paiements: paiements_suivants,
          unites: unites_suivantes,
          journaux_importations: [journal, ...precedent.journaux_importations],
        };
      });

      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Importation CSV [${saisie.cible}]`,
        cible: `${saisie.nom_fichier} (${nombre} lignes)`,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: `Import ${saisie.cible} réussi`,
        description: `${nombre} ligne(s) intégrée(s) depuis ${saisie.nom_fichier}.`,
        variante: 'success',
      });
    },
    [
      etablissement_actif.id,
      etablissement_actif.code,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const attribuer_badge_apprenant = useCallback(
    (
      attribution: Omit<
        AttributionBadge,
        'id' | 'id_etablissement' | 'attribue_le' | 'attribue_par'
      >
    ) => {
      const entree: AttributionBadge = {
        ...attribution,
        id: `bdg-${Date.now()}`,
        id_etablissement: etablissement_actif.id,
        attribue_le: new Date().toISOString().slice(0, 10),
        attribue_par: utilisateur_actif.nom_complet,
      };
      definir_etat((precedent) => ({
        ...precedent,
        badges_attribues: [entree, ...precedent.badges_attribues],
      }));
      ajouter_toast({ titre: `Badge attribué : ${attribution.titre_badge}`, variante: 'success' });
    },
    [etablissement_actif.id, utilisateur_actif.nom_complet, ajouter_toast]
  );

  const journaliser_scan_badge = useCallback(
    (id_apprenant: string, resultat: 'AUTORISE' | 'ALERTE_SOLDE' | 'SUSPENDU') => {
      const apprenant = etat.apprenants.find((item) => item.id === id_apprenant);
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Contrôle d’accès QR (${resultat})`,
        cible: apprenant
          ? `${apprenant.matricule} · ${apprenant.prenom} ${apprenant.nom}`
          : id_apprenant,
        categorie: 'DOCUMENT',
      });
    },
    [
      etat.apprenants,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
    ]
  );

  const creer_fil_discussion = useCallback(
    (saisie: {
      sujet: string;
      nom_interlocuteur: string;
      role_interlocuteur: string;
      categorie: FilDiscussionDirecte['categorie'];
      message_initial: string;
    }): string => {
      const id = `thr-${Date.now()}`;
      const libelle_heure = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const fil: FilDiscussionDirecte = {
        id,
        id_etablissement: etablissement_actif.id,
        sujet: saisie.sujet.trim(),
        nom_interlocuteur: saisie.nom_interlocuteur.trim(),
        role_interlocuteur: saisie.role_interlocuteur.trim(),
        categorie: saisie.categorie,
        messages_non_lus: 0,
        mis_a_jour_le: `Aujourd’hui ${libelle_heure}`,
        messages: [
          {
            id: `m-${Date.now()}`,
            nom_expediteur: utilisateur_actif.nom_complet,
            role_expediteur: ROLES[id_role_actif].libelle_court,
            contenu: saisie.message_initial.trim(),
            envoye_le: `Aujourd’hui ${libelle_heure}`,
            est_de_moi: true,
          },
        ],
      };
      definir_etat((precedent) => ({
        ...precedent,
        fils_discussion: [fil, ...precedent.fils_discussion],
      }));
      ajouter_toast({ titre: 'Nouvelle discussion ouverte', variante: 'success' });
      return id;
    },
    [etablissement_actif.id, utilisateur_actif.nom_complet, id_role_actif, ajouter_toast]
  );

  const envoyer_message_direct = useCallback(
    (id_fil: string, contenu: string) => {
      if (!contenu.trim()) return;
      const libelle_heure = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      definir_etat((precedent) => ({
        ...precedent,
        fils_discussion: precedent.fils_discussion.map((f) =>
          f.id === id_fil
            ? {
                ...f,
                messages_non_lus: 0,
                mis_a_jour_le: `Aujourd’hui ${libelle_heure}`,
                messages: [
                  ...f.messages,
                  {
                    id: `m-${Date.now()}`,
                    nom_expediteur: utilisateur_actif.nom_complet,
                    role_expediteur: ROLES[id_role_actif].libelle_court,
                    contenu: contenu.trim(),
                    envoye_le: `Aujourd’hui ${libelle_heure}`,
                    est_de_moi: true,
                  },
                ],
              }
            : f
        ),
      }));
    },
    [utilisateur_actif.nom_complet, id_role_actif]
  );

  const marquer_fil_lu = useCallback((id_fil: string) => {
    definir_etat((precedent) => ({
      ...precedent,
      fils_discussion: precedent.fils_discussion.map((f) =>
        f.id === id_fil ? { ...f, messages_non_lus: 0 } : f
      ),
    }));
  }, []);

  const mettre_a_jour_profil_utilisateur = useCallback(
    (
      modifications: Partial<
        Pick<
          CompteUtilisateur,
          | 'nom_complet'
          | 'courriel'
          | 'telephone'
          | 'url_avatar'
          | 'initiales_avatar'
          | 'biographie'
          | 'poste'
          | 'departement'
          | 'ville'
          | 'pays'
          | 'url_linkedin'
          | 'langue_preferee'
          | 'preferences_notifications'
          | 'double_facteur_actif'
        >
      >
    ) => {
      const appliquer_modifications = (
        modifications_effectives: typeof modifications
      ) => {
        const initiales_suivantes =
          modifications_effectives.nom_complet !== undefined
            ? modifications_effectives.nom_complet
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((m) => m[0]?.toUpperCase() ?? '')
                .join('') || utilisateur_actif.initiales_avatar
            : modifications_effectives.initiales_avatar ?? utilisateur_actif.initiales_avatar;

        definir_etat((precedent) => ({
          ...precedent,
          utilisateurs: precedent.utilisateurs.map((u) =>
            u.id === utilisateur_actif.id
              ? {
                  ...u,
                  ...modifications_effectives,
                  initiales_avatar: initiales_suivantes,
                }
              : u
          ),
        }));

        ajouter_entree_audit({
          id_etablissement: etablissement_actif.id,
          nom_acteur:
            modifications_effectives.nom_complet?.trim() || utilisateur_actif.nom_complet,
          role_acteur: ROLES[id_role_actif].libelle,
          action:
            Object.prototype.hasOwnProperty.call(modifications_effectives, 'url_avatar')
              ? 'Mise à jour photo de profil'
              : 'Mise à jour du profil personnel',
          cible: utilisateur_actif.courriel,
          categorie: 'AUTH',
        });

        ajouter_toast({
          titre: 'Profil mis à jour',
          description: 'Vos informations personnelles ont été enregistrées.',
          variante: 'success',
        });
      };

      if (
        SOURCE_API &&
        Object.prototype.hasOwnProperty.call(modifications, 'url_avatar')
      ) {
        void requeteApi<ProfilApi>('/auth/profile/', {
          method: 'PATCH',
          body: { url_avatar: modifications.url_avatar ?? null },
        })
          .then((profil) =>
            appliquer_modifications({
              ...modifications,
              url_avatar: profil.url_avatar ?? undefined,
            })
          )
          .catch((erreur: unknown) => {
            ajouter_toast({
              titre: 'Photo non enregistrée',
              description:
                erreur instanceof Error
                  ? erreur.message
                  : 'Le serveur n’a pas pu enregistrer la photo de profil.',
              variante: 'error',
            });
          });
        return;
      }

      appliquer_modifications(modifications);
    },
    [
      utilisateur_actif.id,
      utilisateur_actif.initiales_avatar,
      utilisateur_actif.nom_complet,
      utilisateur_actif.courriel,
      etablissement_actif.id,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const modifier_mon_mot_de_passe = useCallback(
    (mot_de_passe_actuel: string, nouveau_mot_de_passe: string): boolean => {
      if (mot_de_passe_actuel !== utilisateur_actif.mot_de_passe_demo) {
        ajouter_toast({
          titre: 'Mot de passe actuel incorrect',
          description: 'Veuillez vérifier votre mot de passe actuel.',
          variante: 'error',
        });
        return false;
      }
      if (nouveau_mot_de_passe.trim() === mot_de_passe_actuel) {
        ajouter_toast({
          titre: 'Mot de passe identique',
          description: 'Le nouveau mot de passe doit être différent de l’actuel.',
          variante: 'warning',
        });
        return false;
      }
      const politique = valider_politique_mot_de_passe(nouveau_mot_de_passe);
      if (!politique.valide) {
        ajouter_toast({
          titre: 'Politique de sécurité',
          description: politique.message,
          variante: 'warning',
        });
        return false;
      }
      const aujourdhui = new Date().toISOString().slice(0, 10);
      definir_etat((precedent) => ({
        ...precedent,
        utilisateurs: precedent.utilisateurs.map((u) =>
          u.id === utilisateur_actif.id
            ? {
                ...u,
                mot_de_passe_demo: nouveau_mot_de_passe.trim(),
                mot_de_passe_mis_a_jour_le: aujourdhui,
                doit_changer_mot_de_passe: false,
              }
            : u
        ),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Changement de mot de passe personnel',
        cible: utilisateur_actif.courriel,
        categorie: 'AUTH',
      });
      ajouter_toast({
        titre: 'Mot de passe modifié',
        description: 'Votre nouveau mot de passe est actif immédiatement.',
        variante: 'success',
      });
      return true;
    },
    [
      utilisateur_actif.id,
      utilisateur_actif.mot_de_passe_demo,
      utilisateur_actif.nom_complet,
      utilisateur_actif.courriel,
      etablissement_actif.id,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const finaliser_changement_mot_de_passe_obligatoire = useCallback(
    (nouveau_mot_de_passe: string): { ok: boolean; erreur?: string } => {
      if (nouveau_mot_de_passe.trim() === utilisateur_actif.mot_de_passe_demo) {
        return {
          ok: false,
          erreur: 'Choisissez un nouveau mot de passe différent du mot de passe temporaire.',
        };
      }
      const politique = valider_politique_mot_de_passe(nouveau_mot_de_passe);
      if (!politique.valide) {
        return { ok: false, erreur: politique.message };
      }
      const aujourdhui = new Date().toISOString().slice(0, 10);
      definir_etat((precedent) => ({
        ...precedent,
        utilisateurs: precedent.utilisateurs.map((u) =>
          u.id === utilisateur_actif.id
            ? {
                ...u,
                mot_de_passe_demo: nouveau_mot_de_passe.trim(),
                mot_de_passe_mis_a_jour_le: aujourdhui,
                doit_changer_mot_de_passe: false,
              }
            : u
        ),
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Validation du mot de passe personnel obligatoire',
        cible: utilisateur_actif.courriel,
        categorie: 'AUTH',
      });
      ajouter_toast({
        titre: 'Sécurité confirmée',
        description: 'Votre mot de passe personnel a été enregistré.',
        variante: 'success',
      });
      return { ok: true };
    },
    [
      utilisateur_actif.id,
      utilisateur_actif.mot_de_passe_demo,
      utilisateur_actif.nom_complet,
      utilisateur_actif.courriel,
      etablissement_actif.id,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const mettre_a_jour_configuration_plateforme = useCallback(
    (modifications: Partial<ConfigurationPlateforme>) => {
      const appliquer_modifications = (
        modifications_effectives: Partial<ConfigurationPlateforme>
      ) => {
        definir_etat((precedent) => ({
          ...precedent,
          configuration_plateforme: {
            ...precedent.configuration_plateforme,
            ...modifications_effectives,
          },
        }));
        ajouter_entree_audit({
          id_etablissement: etablissement_actif.id,
          nom_acteur: utilisateur_actif.nom_complet,
          role_acteur: ROLES[id_role_actif].libelle,
          action: 'Mise à jour configuration marque blanche plateforme',
          cible:
            modifications_effectives.nom_plateforme ??
            etat.configuration_plateforme.nom_plateforme,
          categorie: 'CONFIG',
        });
        ajouter_toast({
          titre: 'Configuration plateforme enregistrée',
          description: 'Identité, logo, slogan et coordonnées mis à jour partout.',
          variante: 'success',
        });
      };

      if (
        SOURCE_API &&
        Object.prototype.hasOwnProperty.call(modifications, 'url_logo')
      ) {
        void requeteApi<{ url_logo: string }>('/plateforme/configuration/', {
          method: 'PATCH',
          body: { url_logo: modifications.url_logo ?? null },
        })
          .then((configuration) =>
            appliquer_modifications({
              ...modifications,
              url_logo: configuration.url_logo || undefined,
            })
          )
          .catch((erreur: unknown) => {
            ajouter_toast({
              titre: 'Logo non enregistré',
              description:
                erreur instanceof Error
                  ? erreur.message
                  : 'Le serveur n’a pas pu enregistrer le logo de la plateforme.',
              variante: 'error',
            });
          });
        return;
      }

      appliquer_modifications(modifications);
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      etat.configuration_plateforme.nom_plateforme,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const reinitialiser_configuration_plateforme = useCallback(() => {
    definir_etat((precedent) => ({
      ...precedent,
      configuration_plateforme: CONFIGURATION_PLATEFORME_DEFAUT,
    }));
    ajouter_toast({
      titre: 'Configuration plateforme réinitialisée',
      variante: 'info',
    });
  }, [ajouter_toast]);

  const ajouter_unite_academique = useCallback(
    (unite: Omit<UniteAcademique, 'id' | 'id_etablissement'>): UniteAcademique => {
      const creee: UniteAcademique = {
        ...unite,
        id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        unites: [...precedent.unites, creee],
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Création unité / programme',
        cible: `${creee.code} — ${creee.nom}`,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: `${creee.nom} ajoutée`,
        description: 'Unité pédagogique et grille tarifaire enregistrées.',
        variante: 'success',
      });
      return creee;
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const modifier_unite_academique = useCallback(
    (id_unite: string, modifications: Partial<UniteAcademique>) => {
      definir_etat((precedent) => ({
        ...precedent,
        unites: precedent.unites.map((u) =>
          u.id === id_unite ? { ...u, ...modifications } : u
        ),
      }));
      ajouter_toast({ titre: 'Unité pédagogique mise à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const supprimer_unite_academique = useCallback(
    (id_unite: string): boolean => {
      const inscrits = etat.apprenants.filter(
        (a) => a.id_etablissement === etablissement_actif.id && a.id_unite === id_unite
      ).length;
      if (inscrits > 0) {
        ajouter_toast({
          titre: 'Suppression impossible',
          description: `${inscrits} apprenant(s) sont encore rattachés à cette unité.`,
          variante: 'warning',
        });
        return false;
      }
      definir_etat((precedent) => ({
        ...precedent,
        unites: precedent.unites.filter((u) => u.id !== id_unite),
        elements: precedent.elements.filter((el) => el.id_unite !== id_unite),
        emplois_du_temps: precedent.emplois_du_temps.filter((c) => c.id_unite !== id_unite),
      }));
      ajouter_toast({ titre: 'Unité pédagogique supprimée', variante: 'info' });
      return true;
    },
    [etat.apprenants, etablissement_actif.id, ajouter_toast]
  );

  const dupliquer_unite_academique = useCallback(
    (id_unite: string): UniteAcademique | null => {
      const source = etat.unites.find(
        (u) => u.id === id_unite && u.id_etablissement === etablissement_actif.id
      );
      if (!source) return null;
      const codes_existants = new Set(
        etat.unites
          .filter((u) => u.id_etablissement === etablissement_actif.id)
          .map((u) => u.code)
      );
      let index = 2;
      let code_candidat = `${source.code}-BIS`;
      while (codes_existants.has(code_candidat)) {
        code_candidat = `${source.code}-${index}`;
        index += 1;
      }
      const dupliquee: UniteAcademique = {
        ...source,
        id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        code: code_candidat,
        nom: `${source.nom} (Copie)`,
      };
      definir_etat((precedent) => ({
        ...precedent,
        unites: [...precedent.unites, dupliquee],
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Duplication unité (${source.code} → ${dupliquee.code})`,
        cible: dupliquee.nom,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: `${dupliquee.nom} créée`,
        description: `Duplication de ${source.code} effectuée.`,
        variante: 'success',
      });
      return dupliquee;
    },
    [
      etat.unites,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const deployer_pack_cycle = useCallback(
    (
      titre_pack: string,
      unites_pack: (Omit<UniteAcademique, 'id' | 'id_etablissement'> & {
        elements_initiaux?: Omit<ElementPedagogique, 'id' | 'id_etablissement' | 'id_unite'>[];
      })[]
    ): number => {
      const codes_existants = new Set(
        etat.unites
          .filter((u) => u.id_etablissement === etablissement_actif.id)
          .map((u) => u.code.toUpperCase())
      );
      const unites_creees: UniteAcademique[] = [];
      const elements_crees: ElementPedagogique[] = [];
      const base_temps = Date.now();

      unites_pack.forEach((pu, u_idx) => {
        if (codes_existants.has(pu.code.toUpperCase())) return;
        const id_unite = `unit-${base_temps}-${u_idx}-${Math.random().toString(36).slice(2, 5)}`;
        const { elements_initiaux, ...donnees_unite } = pu;
        unites_creees.push({
          ...donnees_unite,
          id: id_unite,
          id_etablissement: etablissement_actif.id,
        });
        if (elements_initiaux && elements_initiaux.length > 0) {
          elements_initiaux.forEach((ei, i_idx) => {
            elements_crees.push({
              ...ei,
              id: `item-${base_temps}-${u_idx}-${i_idx}-${Math.random().toString(36).slice(2, 4)}`,
              id_etablissement: etablissement_actif.id,
              id_unite,
            });
          });
        }
      });

      if (unites_creees.length === 0) {
        ajouter_toast({
          titre: 'Cycle déjà présent',
          description: 'Toutes les unités de ce pack existent déjà dans cet établissement.',
          variante: 'info',
        });
        return 0;
      }

      definir_etat((precedent) => ({
        ...precedent,
        unites: [...precedent.unites, ...unites_creees],
        elements: [...precedent.elements, ...elements_crees],
      }));

      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Déploiement pack « ${titre_pack} »`,
        cible: `${unites_creees.length} unité(s), ${elements_crees.length} élément(s)`,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: `Pack déployé : ${titre_pack}`,
        description: `${unites_creees.length} unité(s) et ${elements_crees.length} matière(s)/UE ajoutées.`,
        variante: 'success',
      });
      return unites_creees.length;
    },
    [
      etat.unites,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const creer_demande_conge = useCallback(
    (demande: Omit<DemandeConge, 'id' | 'id_etablissement' | 'statut' | 'demande_le'>) => {
      const entree: DemandeConge = {
        ...demande,
        id: `lv-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
        id_etablissement: etablissement_actif.id,
        statut: 'EN_ATTENTE',
        demande_le: new Date().toISOString().slice(0, 10),
      };
      definir_etat((precedent) => ({
        ...precedent,
        demandes_conge: [entree, ...precedent.demandes_conge],
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Demande de congé (${demande.type_conge})`,
        cible: `${demande.nom_personnel} (${demande.date_debut} → ${demande.date_fin})`,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: 'Demande de congé enregistrée',
        description: `${demande.nom_personnel} · ${demande.type_conge}`,
        variante: 'success',
      });
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const mettre_a_jour_statut_conge = useCallback(
    (id_conge: string, statut: 'APPROUVE' | 'REFUSE') => {
      const cible = etat.demandes_conge.find((c) => c.id === id_conge);
      definir_etat((precedent) => ({
        ...precedent,
        demandes_conge: precedent.demandes_conge.map((c) =>
          c.id === id_conge ? { ...c, statut, traite_par: utilisateur_actif.nom_complet } : c
        ),
      }));
      if (cible) {
        ajouter_entree_audit({
          id_etablissement: etablissement_actif.id,
          nom_acteur: utilisateur_actif.nom_complet,
          role_acteur: ROLES[id_role_actif].libelle,
          action: statut === 'APPROUVE' ? 'Congé RH approuvé' : 'Congé RH refusé',
          cible: `${cible.nom_personnel} (${cible.date_debut})`,
          categorie: 'CONFIG',
        });
      }
      ajouter_toast({
        titre: statut === 'APPROUVE' ? 'Demande approuvée' : 'Demande refusée',
        variante: statut === 'APPROUVE' ? 'success' : 'warning',
      });
    },
    [
      etat.demandes_conge,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const modifier_demande_conge = useCallback(
    (id_conge: string, modifications: Partial<DemandeConge>) => {
      definir_etat((precedent) => ({
        ...precedent,
        demandes_conge: precedent.demandes_conge.map((c) =>
          c.id === id_conge ? { ...c, ...modifications } : c
        ),
      }));
      ajouter_toast({ titre: 'Demande de congé mise à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const supprimer_demande_conge = useCallback(
    (id_conge: string) => {
      definir_etat((precedent) => ({
        ...precedent,
        demandes_conge: precedent.demandes_conge.filter((c) => c.id !== id_conge),
      }));
      ajouter_toast({ titre: 'Demande de congé supprimée', variante: 'info' });
    },
    [ajouter_toast]
  );

  const ajouter_element_pedagogique = useCallback(
    (element: Omit<ElementPedagogique, 'id' | 'id_etablissement'>): ElementPedagogique => {
      const cree: ElementPedagogique = {
        ...element,
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        elements: [...precedent.elements, cree],
        enseignants: cree.id_enseignant
          ? precedent.enseignants.map((t) =>
              t.id === cree.id_enseignant
                ? {
                    ...t,
                    ids_unites_assignees: Array.from(
                      new Set([...t.ids_unites_assignees, cree.id_unite])
                    ),
                    ids_elements_assignes: Array.from(
                      new Set([...(t.ids_elements_assignes ?? []), cree.id])
                    ),
                  }
                : t
            )
          : precedent.enseignants,
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Ajout contenu pédagogique',
        cible: `${cree.code} — ${cree.nom}`,
        categorie: 'PEDAGOGIE',
      });
      ajouter_toast({
        titre: `${cree.nom} ajoutée`,
        variante: 'success',
      });
      return cree;
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const modifier_element_pedagogique = useCallback(
    (id_element: string, modifications: Partial<ElementPedagogique>) => {
      definir_etat((precedent) => ({
        ...precedent,
        elements: precedent.elements.map((el) =>
          el.id === id_element ? { ...el, ...modifications } : el
        ),
      }));
      ajouter_toast({ titre: 'Matière / module mis à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const supprimer_element_pedagogique = useCallback(
    (id_element: string): boolean => {
      definir_etat((precedent) => ({
        ...precedent,
        elements: precedent.elements.filter((el) => el.id !== id_element),
        emplois_du_temps: precedent.emplois_du_temps.filter((c) => c.id_element !== id_element),
        enseignants: precedent.enseignants.map((t) => ({
          ...t,
          ids_elements_assignes: (t.ids_elements_assignes ?? []).filter((id) => id !== id_element),
        })),
      }));
      ajouter_toast({ titre: 'Matière / module supprimé', variante: 'info' });
      return true;
    },
    [ajouter_toast]
  );

  const ajouter_personnel_enseignant = useCallback(
    (enseignant: Omit<PersonnelEnseignant, 'id' | 'id_etablissement'>): PersonnelEnseignant => {
      const cree: PersonnelEnseignant = {
        ...enseignant,
        id: `tch-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        id_etablissement: etablissement_actif.id,
      };
      definir_etat((precedent) => ({
        ...precedent,
        enseignants: [...precedent.enseignants, cree],
      }));
      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: 'Ajout intervenant / enseignant',
        cible: `${cree.code} — ${cree.nom_complet}`,
        categorie: 'CONFIG',
      });
      ajouter_toast({
        titre: `${cree.nom_complet} ajouté`,
        variante: 'success',
      });
      return cree;
    },
    [
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  const modifier_personnel_enseignant = useCallback(
    (id_enseignant: string, modifications: Partial<PersonnelEnseignant>) => {
      definir_etat((precedent) => ({
        ...precedent,
        enseignants: precedent.enseignants.map((t) =>
          t.id === id_enseignant ? { ...t, ...modifications } : t
        ),
      }));
      ajouter_toast({ titre: 'Fiche enseignant mise à jour', variante: 'success' });
    },
    [ajouter_toast]
  );

  const supprimer_personnel_enseignant = useCallback(
    (id_enseignant: string): boolean => {
      definir_etat((precedent) => ({
        ...precedent,
        enseignants: precedent.enseignants.filter((t) => t.id !== id_enseignant),
        elements: precedent.elements.map((el) =>
          el.id_enseignant === id_enseignant ? { ...el, id_enseignant: '' } : el
        ),
      }));
      ajouter_toast({ titre: 'Enseignant supprimé', variante: 'info' });
      return true;
    },
    [ajouter_toast]
  );

  const affecter_enseignant_pedagogie = useCallback(
    (id_enseignant: string, ids_unites: string[], ids_elements: string[]) => {
      const ens = etat.enseignants.find((t) => t.id === id_enseignant);
      if (!ens) return;
      const set_elements = new Set(ids_elements);
      const unites_derivees = new Set(ids_unites);
      etat.elements.forEach((el) => {
        if (set_elements.has(el.id)) unites_derivees.add(el.id_unite);
      });
      const unites_finales = Array.from(unites_derivees);

      definir_etat((precedent) => ({
        ...precedent,
        enseignants: precedent.enseignants.map((t) => {
          if (t.id === id_enseignant) {
            return {
              ...t,
              ids_unites_assignees: unites_finales,
              ids_elements_assignes: ids_elements,
            };
          }
          // Retirer les éléments réassignés à cet enseignant de la liste explicite des autres enseignants
          if (t.ids_elements_assignes?.some((eid) => set_elements.has(eid))) {
            return {
              ...t,
              ids_elements_assignes: t.ids_elements_assignes.filter((eid) => !set_elements.has(eid)),
            };
          }
          return t;
        }),
        elements: precedent.elements.map((el) => {
          if (el.id_etablissement !== etablissement_actif.id) return el;
          if (set_elements.has(el.id)) {
            return { ...el, id_enseignant };
          }
          if (el.id_enseignant === id_enseignant && !set_elements.has(el.id)) {
            return { ...el, id_enseignant: '' };
          }
          return el;
        }),
      }));

      ajouter_entree_audit({
        id_etablissement: etablissement_actif.id,
        nom_acteur: utilisateur_actif.nom_complet,
        role_acteur: ROLES[id_role_actif].libelle,
        action: `Affectation pédagogique (${ids_elements.length} matière(s), ${unites_finales.length} unité(s))`,
        cible: ens.nom_complet,
        categorie: 'PEDAGOGIE',
      });
      ajouter_toast({
        titre: `Affectations enregistrées pour ${ens.nom_complet}`,
        description: `${ids_elements.length} matière(s)/module(s) et ${unites_finales.length} unité(s) attribué(e)s.`,
        variante: 'success',
      });
    },
    [
      etat.enseignants,
      etat.elements,
      etablissement_actif.id,
      utilisateur_actif.nom_complet,
      id_role_actif,
      ajouter_entree_audit,
      ajouter_toast,
    ]
  );

  // Vues strictement filtrées par etablissement_actif.id (isolation multi-établissements)
  const unites_etablissement = useMemo(
    () => etat.unites.filter((u) => u.id_etablissement === etablissement_actif.id),
    [etat.unites, etablissement_actif.id]
  );
  const elements_etablissement = useMemo(
    () => etat.elements.filter((e) => e.id_etablissement === etablissement_actif.id),
    [etat.elements, etablissement_actif.id]
  );
  const enseignants_etablissement = useMemo(
    () => etat.enseignants.filter((t) => t.id_etablissement === etablissement_actif.id),
    [etat.enseignants, etablissement_actif.id]
  );
  const apprenants_etablissement = useMemo(
    () => etat.apprenants.filter((a) => a.id_etablissement === etablissement_actif.id),
    [etat.apprenants, etablissement_actif.id]
  );
  const inscriptions_etablissement = useMemo(
    () => etat.inscriptions.filter((i) => i.id_etablissement === etablissement_actif.id),
    [etat.inscriptions, etablissement_actif.id]
  );
  const paiements_etablissement = useMemo(
    () => etat.paiements.filter((p) => p.id_etablissement === etablissement_actif.id),
    [etat.paiements, etablissement_actif.id]
  );
  const notes_etablissement = useMemo(
    () => etat.notes.filter((n) => n.id_etablissement === etablissement_actif.id),
    [etat.notes, etablissement_actif.id]
  );
  const presences_etablissement = useMemo(
    () => etat.presences.filter((p) => p.id_etablissement === etablissement_actif.id),
    [etat.presences, etablissement_actif.id]
  );
  const emplois_du_temps_etablissement = useMemo(
    () => etat.emplois_du_temps.filter((c) => c.id_etablissement === etablissement_actif.id),
    [etat.emplois_du_temps, etablissement_actif.id]
  );
  const evenements_calendrier_etablissement = useMemo(
    () => etat.evenements_calendrier.filter((ev) => ev.id_etablissement === etablissement_actif.id),
    [etat.evenements_calendrier, etablissement_actif.id]
  );
  const documents_etablissement = useMemo(
    () => etat.documents.filter((d) => d.id_etablissement === etablissement_actif.id),
    [etat.documents, etablissement_actif.id]
  );
  const partenaires_etablissement = useMemo(
    () => etat.partenaires.filter((p) => p.id_etablissement === etablissement_actif.id),
    [etat.partenaires, etablissement_actif.id]
  );
  const depenses_etablissement = useMemo(
    () => etat.depenses.filter((d) => d.id_etablissement === etablissement_actif.id),
    [etat.depenses, etablissement_actif.id]
  );
  const paie_etablissement = useMemo(
    () => etat.paie.filter((p) => p.id_etablissement === etablissement_actif.id),
    [etat.paie, etablissement_actif.id]
  );
  const communications_etablissement = useMemo(
    () => etat.communications.filter((c) => c.id_etablissement === etablissement_actif.id),
    [etat.communications, etablissement_actif.id]
  );
  const cahiers_textes_etablissement = useMemo(
    () => etat.cahiers_textes.filter((t) => t.id_etablissement === etablissement_actif.id),
    [etat.cahiers_textes, etablissement_actif.id]
  );
  const soutenances_etablissement = useMemo(
    () => etat.soutenances.filter((s) => s.id_etablissement === etablissement_actif.id),
    [etat.soutenances, etablissement_actif.id]
  );
  const livres_bibliotheque_etablissement = useMemo(
    () => etat.livres_bibliotheque.filter((b) => b.id_etablissement === etablissement_actif.id),
    [etat.livres_bibliotheque, etablissement_actif.id]
  );
  const emprunts_bibliotheque_etablissement = useMemo(
    () => etat.emprunts_bibliotheque.filter((l) => l.id_etablissement === etablissement_actif.id),
    [etat.emprunts_bibliotheque, etablissement_actif.id]
  );
  const infirmerie_etablissement = useMemo(
    () => etat.visites_infirmerie.filter((v) => v.id_etablissement === etablissement_actif.id),
    [etat.visites_infirmerie, etablissement_actif.id]
  );
  const discipline_etablissement = useMemo(
    () => etat.incidents_discipline.filter((d) => d.id_etablissement === etablissement_actif.id),
    [etat.incidents_discipline, etablissement_actif.id]
  );
  const abonnements_etablissement = useMemo(
    () => etat.abonnements.filter((s) => s.id_etablissement === etablissement_actif.id),
    [etat.abonnements, etablissement_actif.id]
  );
  const inventaire_etablissement = useMemo(
    () => etat.inventaire.filter((i) => i.id_etablissement === etablissement_actif.id),
    [etat.inventaire, etablissement_actif.id]
  );
  const prets_materiels_etablissement = useMemo(
    () => etat.prets_materiels.filter((p) => p.id_etablissement === etablissement_actif.id),
    [etat.prets_materiels, etablissement_actif.id]
  );
  const anciens_etablissement = useMemo(
    () => etat.anciens.filter((a) => a.id_etablissement === etablissement_actif.id),
    [etat.anciens, etablissement_actif.id]
  );
  const ressources_lms_etablissement = useMemo(
    () => etat.ressources_lms.filter((r) => r.id_etablissement === etablissement_actif.id),
    [etat.ressources_lms, etablissement_actif.id]
  );
  const devoirs_lms_etablissement = useMemo(
    () => etat.devoirs_lms.filter((a) => a.id_etablissement === etablissement_actif.id),
    [etat.devoirs_lms, etablissement_actif.id]
  );
  const remises_devoirs_etablissement = useMemo(
    () => etat.remises_devoirs_lms.filter((r) => r.id_etablissement === etablissement_actif.id),
    [etat.remises_devoirs_lms, etablissement_actif.id]
  );
  const utilisateurs_etablissement = useMemo(
    () =>
      etat.utilisateurs.filter((u) =>
        u.est_super_admin_plateforme
          ? utilisateur_actif.est_super_admin_plateforme
          : u.affiliations.some((a) => a.id_etablissement === etablissement_actif.id)
      ),
    [etat.utilisateurs, etablissement_actif.id, utilisateur_actif.est_super_admin_plateforme]
  );
  const actualites_etablissement = useMemo(
    () => etat.articles_actualites.filter((n) => n.id_etablissement === etablissement_actif.id),
    [etat.articles_actualites, etablissement_actif.id]
  );
  const consentements_rgpd_etablissement = useMemo(
    () => etat.consentements_rgpd.filter((c) => c.id_etablissement === etablissement_actif.id),
    [etat.consentements_rgpd, etablissement_actif.id]
  );
  const demandes_rgpd_etablissement = useMemo(
    () => etat.demandes_rgpd.filter((r) => r.id_etablissement === etablissement_actif.id),
    [etat.demandes_rgpd, etablissement_actif.id]
  );
  const fils_discussion_etablissement = useMemo(
    () => etat.fils_discussion.filter((t) => t.id_etablissement === etablissement_actif.id),
    [etat.fils_discussion, etablissement_actif.id]
  );
  const badges_etablissement = useMemo(
    () => etat.badges_attribues.filter((b) => b.id_etablissement === etablissement_actif.id),
    [etat.badges_attribues, etablissement_actif.id]
  );
  const journaux_import_etablissement = useMemo(
    () => etat.journaux_importations.filter((l) => l.id_etablissement === etablissement_actif.id),
    [etat.journaux_importations, etablissement_actif.id]
  );
  const demandes_conge_etablissement = useMemo(
    () => etat.demandes_conge.filter((l) => l.id_etablissement === etablissement_actif.id),
    [etat.demandes_conge, etablissement_actif.id]
  );
  const journaux_audit_etablissement = useMemo(
    () => etat.journaux_audit.filter((a) => a.id_etablissement === etablissement_actif.id),
    [etat.journaux_audit, etablissement_actif.id]
  );
  const file_hors_ligne_etablissement = useMemo(
    () => etat.file_hors_ligne.filter((q) => q.id_etablissement === etablissement_actif.id),
    [etat.file_hors_ligne, etablissement_actif.id]
  );
  const notifications_etablissement = useMemo(
    () => notifications.filter((n) => n.id_etablissement === etablissement_actif.id),
    [notifications, etablissement_actif.id]
  );

  const valeur: ValeurContexteErp = {
    configuration_plateforme: etat.configuration_plateforme,
    mode_affichage,
    definir_mode_affichage,
    est_authentifie,
    etablissements: etat.etablissements,
    etablissements_accessibles,
    utilisateurs: etat.utilisateurs,
    etablissement_actif,
    terminologie,
    utilisateur_actif,
    id_role_actif,
    devise_active,
    langue_active,
    definir_langue_active,
    theme,
    barre_laterale_reduite,
    route_active,
    id_apprenant_selectionne,
    ecran_connexion_ouvert,
    palette_commandes_ouverte,
    modale_nouvel_etablissement_ouverte,
    offre_saas_creation_selectionnee,
    hors_ligne_simule,
    navigateur_en_ligne,
    notifications_toast,
    notifications: notifications_etablissement,
    unites_etablissement,
    elements_etablissement,
    enseignants_etablissement,
    apprenants_etablissement,
    inscriptions_etablissement,
    paiements_etablissement,
    notes_etablissement,
    presences_etablissement,
    emplois_du_temps_etablissement,
    evenements_calendrier_etablissement,
    documents_etablissement,
    partenaires_etablissement,
    depenses_etablissement,
    paie_etablissement,
    communications_etablissement,
    cahiers_textes_etablissement,
    soutenances_etablissement,
    livres_bibliotheque_etablissement,
    emprunts_bibliotheque_etablissement,
    infirmerie_etablissement,
    discipline_etablissement,
    abonnements_etablissement,
    inventaire_etablissement,
    prets_materiels_etablissement,
    anciens_etablissement,
    ressources_lms_etablissement,
    devoirs_lms_etablissement,
    remises_devoirs_etablissement,
    utilisateurs_etablissement,
    actualites_etablissement,
    consentements_rgpd_etablissement,
    demandes_rgpd_etablissement,
    fils_discussion_etablissement,
    badges_etablissement,
    journaux_import_etablissement,
    demandes_conge_etablissement,
    tous_les_apprenants: etat.apprenants,
    tous_les_paiements: etat.paiements,
    tous_les_documents: etat.documents,
    journaux_audit: journaux_audit_etablissement,
    file_hors_ligne: file_hors_ligne_etablissement,
    changer_etablissement,
    mettre_a_jour_etablissement,
    basculer_statut_etablissement,
    creer_etablissement_complet,
    supprimer_etablissement,
    connecter_utilisateur,
    connecter_avec_google,
    authentifier_par_identifiants,
    authentifier_par_identifiants_api,
    demander_reinitialisation_mot_de_passe,
    confirmer_reinitialisation_mot_de_passe,
    deconnecter,
    simuler_role_etablissement,
    definir_route_active,
    ouvrir_dossier_apprenant,
    fermer_dossier_apprenant,
    definir_devise_active,
    basculer_theme,
    definir_barre_laterale_reduite,
    definir_ecran_connexion_ouvert,
    definir_palette_commandes_ouverte,
    definir_modale_nouvel_etablissement_ouverte,
    definir_offre_saas_creation_selectionnee,
    definir_hors_ligne_simule,
    obtenir_permissions_role,
    basculer_permission_role,
    a_permission,
    ajouter_unite_academique,
    modifier_unite_academique,
    supprimer_unite_academique,
    dupliquer_unite_academique,
    deployer_pack_cycle,
    ajouter_element_pedagogique,
    modifier_element_pedagogique,
    supprimer_element_pedagogique,
    ajouter_personnel_enseignant,
    modifier_personnel_enseignant,
    supprimer_personnel_enseignant,
    affecter_enseignant_pedagogie,
    inscrire_apprenant,
    reinscrire_apprenant,
    modifier_inscription,
    annuler_inscription,
    archiver_inscription,
    supprimer_inscription,
    inscrire_apprenants_lot,
    mettre_a_jour_apprenant,
    encaisser_paiement,
    annuler_paiement,
    enregistrer_note,
    modifier_note,
    supprimer_note,
    basculer_verrouillage_notes_element,
    enregistrer_presences_lot,
    synchroniser_file_hors_ligne,
    ajouter_creneau_emploi_du_temps,
    modifier_creneau_emploi_du_temps,
    supprimer_creneau_emploi_du_temps,
    ajouter_evenement_calendrier,
    modifier_evenement_calendrier,
    supprimer_evenement_calendrier,
    ajouter_entree_cahier_textes,
    modifier_entree_cahier_textes,
    supprimer_entree_cahier_textes,
    attribuer_stage,
    ajouter_partenaire_stage,
    modifier_partenaire_stage,
    supprimer_partenaire_stage,
    ajouter_soutenance,
    mettre_a_jour_soutenance,
    supprimer_soutenance,
    enregistrer_depense,
    modifier_depense,
    supprimer_depense,
    creer_bulletin_paie,
    modifier_bulletin_paie,
    supprimer_bulletin_paie,
    marquer_paie_payee,
    creer_demande_conge,
    modifier_demande_conge,
    supprimer_demande_conge,
    mettre_a_jour_statut_conge,
    emettre_document_officiel,
    envoyer_communication,
    ajouter_livre_bibliotheque,
    mettre_a_jour_livre_bibliotheque,
    supprimer_livre_bibliotheque,
    emprunter_livre,
    retourner_livre,
    prolonger_emprunt_livre,
    ajouter_article_inventaire,
    mettre_a_jour_article_inventaire,
    supprimer_article_inventaire,
    preter_materiel,
    retourner_materiel,
    ajouter_visite_infirmerie,
    supprimer_visite_infirmerie,
    ajouter_incident_discipline,
    supprimer_incident_discipline,
    ajouter_ancien_etudiant,
    modifier_ancien_etudiant,
    supprimer_ancien_etudiant,
    supprimer_abonnement_service,
    basculer_abonnement_service,
    ajouter_ressource_lms,
    ajouter_devoir_lms,
    basculer_statut_devoir_lms,
    deposer_travail_devoir_lms,
    annuler_remise_devoir_lms,
    evaluer_remise_devoir_lms,
    ajouter_commentaire_devoir_lms,
    soumettre_devoir_lms,
    promouvoir_annee_academique,
    reinitialiser_donnees_demo,
    ajouter_article_actualite,
    modifier_article_actualite,
    basculer_epingle_actualite,
    supprimer_article_actualite,
    mettre_a_jour_consentement_rgpd,
    creer_demande_rgpd,
    traiter_demande_rgpd,
    anonymiser_apprenant_rgpd,
    creer_utilisateur_etablissement,
    modifier_utilisateur_etablissement,
    supprimer_utilisateur_etablissement,
    mettre_a_jour_role_utilisateur,
    basculer_actif_utilisateur,
    basculer_2fa_utilisateur,
    reinitialiser_mot_de_passe_utilisateur,
    deverrouiller_compte_utilisateur,
    importer_donnees_lot,
    attribuer_badge_apprenant,
    journaliser_scan_badge,
    creer_fil_discussion,
    envoyer_message_direct,
    marquer_fil_lu,
    mettre_a_jour_profil_utilisateur,
    modifier_mon_mot_de_passe,
    finaliser_changement_mot_de_passe_obligatoire,
    mettre_a_jour_configuration_plateforme,
    reinitialiser_configuration_plateforme,
    ajouter_toast,
    fermer_toast,
    marquer_toutes_notifications_lues,
    ajouter_entree_audit,
  };

  return <ContexteErp.Provider value={valeur}>{children}</ContexteErp.Provider>;
};

export function utiliserErp(): ValeurContexteErp {
  const contexte = useContext(ContexteErp);
  if (!contexte) throw new Error('utiliserErp doit être utilisé dans un FournisseurErp');
  return contexte;
}
