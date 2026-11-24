// Modèles et types fondamentaux de l'ERP éducatif SaaS multi-établissements

export type TypeEtablissement = 'PRO' | 'SCOLAIRE' | 'UNIVERSITE';
export type CouleurAccentEtablissement =
  | 'blue'
  | 'teal'
  | 'violet'
  | 'orange'
  | 'red'
  | 'navy';

export const PALETTES_COULEUR_ETABLISSEMENT: {
  valeur: CouleurAccentEtablissement;
  libelle: string;
  hex: string;
}[] = [
  { valeur: 'blue', libelle: 'Bleu', hex: '#2563eb' },
  { valeur: 'teal', libelle: 'Turquoise', hex: '#0f9f8f' },
  { valeur: 'violet', libelle: 'Violet', hex: '#7c3aed' },
  { valeur: 'orange', libelle: 'Orange', hex: '#ea580c' },
  { valeur: 'red', libelle: 'Rouge', hex: '#dc2626' },
  { valeur: 'navy', libelle: 'Bleu nuit', hex: '#1e3a8a' },
];

export type CodeDevise = string;

export type CodePays = string;

export type IdentifiantRole =
  | 'SUPER_ADMIN'
  | 'DIRECTEUR'
  | 'ADMIN_ETAB'
  | 'SCOLARITE'
  | 'ECONOME'
  | 'DIR_ETUDES'
  | 'ENSEIGNANT'
  | 'RESP_STAGES'
  | 'SERVICES_ANNEXES'
  | 'PARENT'
  | 'APPRENANT'
  | 'AUDITEUR';

export type IdentifiantPermission =
  | 'tableau_de_bord:voir'
  | 'admissions:voir'
  | 'admissions:gerer'
  | 'apprenants:voir'
  | 'apprenants:gerer'
  | 'pedagogie:voir'
  | 'pedagogie:noter'
  | 'pedagogie:appel'
  | 'pedagogie:verrouiller'
  | 'campus_numerique:voir'
  | 'emplois_du_temps:voir'
  | 'emplois_du_temps:gerer'
  | 'stages:voir'
  | 'stages:gerer'
  | 'finances:voir'
  | 'finances:encaisser'
  | 'finances:gerer'
  | 'rh:voir'
  | 'rh:gerer'
  | 'documents:voir'
  | 'documents:emettre'
  | 'communication:voir'
  | 'communication:envoyer'
  | 'services:voir'
  | 'services:gerer'
  | 'bibliotheque_materiels:voir'
  | 'bibliotheque_materiels:gerer'
  | 'rapports:voir'
  | 'parametres:voir'
  | 'parametres:gerer'
  | 'roles:gerer'
  | 'audit:voir'
  | 'plateforme:gerer'
  | 'portail:parent'
  | 'portail:apprenant'
  | 'portail:enseignant'
  | 'actualites:voir'
  | 'actualites:gerer'
  | 'rgpd:gerer'
  | 'comptes:gerer'
  | 'importations:gerer'
  | 'badges:voir'
  | 'badges:gerer'
  | 'messagerie:utiliser'
  | 'profil:voir';

export type IdentifiantRoute =
  | 'tableau_de_bord'
  | 'apprenants'
  | 'structure'
  | 'terminologie'
  | 'roles_audit'
  | 'comptes'
  | 'admissions'
  | 'pedagogie'
  | 'emplois_du_temps'
  | 'stages'
  | 'badges'
  | 'finances'
  | 'ressources_humaines'
  | 'documents'
  | 'communication'
  | 'messagerie'
  | 'actualites'
  | 'services'
  | 'bibliotheque_materiels'
  | 'importations'
  | 'rgpd'
  | 'rapports'
  | 'parametres'
  | 'portail_parent'
  | 'portail_apprenant'
  | 'portail_enseignant'
  | 'campus_numerique'
  | 'plateforme'
  | 'profil';

export interface CompteBancaire {
  id: string;
  nom_banque: string;
  numero_compte: string;
  devise: CodeDevise;
  titulaire: string;
  par_defaut: boolean;
  actif: boolean;
}

export interface EcheancePaiement {
  id: string;
  libelle: string;
  date_echeance: string;
  montant_du_htg: number;
  montant_paye_htg: number;
  statut: 'PAYEE' | 'PARTIELLE' | 'A_PAYER' | 'EN_RETARD';
}

export interface DemandeConge {
  id: string;
  id_etablissement: string;
  nom_personnel: string;
  libelle_role: string;
  type_conge:
    | 'Congé annuel'
    | 'Congé maladie'
    | 'Permission exceptionnelle'
    | 'Maternité / Paternité'
    | 'Formation continue';
  date_debut: string;
  date_fin: string;
  motif: string;
  statut: 'EN_ATTENTE' | 'APPROUVE' | 'REFUSE';
  demande_le: string;
  traite_par?: string;
}

export interface ConfigurationEtablissement {
  id: string;
  code: string;
  nom: string;
  nom_court: string;
  type: TypeEtablissement;
  code_pays: CodePays;
  nom_pays: string;
  fuseau_horaire: string;
  autorite_tutelle: string;
  ville: string;
  adresse: string;
  telephone: string;
  courriel: string;
  site_web?: string;
  annee_academique: string;
  libelle_periode_courante: string;
  devise_defaut: CodeDevise;
  taux_change_usd: number; // 1 USD = X HTG (base pivot interne)
  format_matricule: string; // ex: "EPM-{ANNEE}-{SEQ}"
  echelle_notation: 10 | 20 | 100;
  note_passage: number;
  couleur_accent: CouleurAccentEtablissement;
  devise_etablissement: string;
  url_logo?: string;
  titre_direction: string;
  nom_direction: string;
  code_sceau: string;
  services_actifs: {
    bibliotheque: boolean;
    cantine: boolean;
    transport: boolean;
    infirmerie: boolean;
    anciens: boolean;
  };
  offre_saas: 'Gratuit' | 'Essentiel' | 'Croissance' | 'Institutionnel';
  statut_abonnement_saas?: 'GRATUIT' | 'ESSAI_14J' | 'PAYE' | 'EN_ATTENTE_PAIEMENT';
  date_fin_essai_saas?: string;
  reference_paiement_saas?: string;
  bloquer_documents_si_impaye: boolean;
  statut?: 'ACTIF' | 'SUSPENDU';
  comptes_bancaires?: CompteBancaire[];
  proprietaire_nom?: string;
  proprietaire_courriel?: string;
  proprietaire_telephone?: string;
  administrateurs_affilies?: {
    nom: string;
    courriel: string;
    role: 'DIRECTEUR' | 'ADMIN_ETAB';
  }[];
  cree_le?: string;
  nombre_apprenants?: number;
  nombre_apprenants_total?: number;
  historique_forfaits_saas?: HistoriqueAbonnementSaas[];
}

export interface HistoriqueAbonnementSaas {
  id: number;
  offre_saas: ConfigurationEtablissement['offre_saas'];
  statut_abonnement_saas: ConfigurationEtablissement['statut_abonnement_saas'] | '';
  date_fin_essai_saas: string;
  reference_paiement_saas: string;
  cree_le: string;
  modifie_par: string;
}

export interface AffiliationEtablissement {
  id_etablissement: string;
  id_role: IdentifiantRole;
  fonction_locale: string;
}

export interface PreferencesNotificationsUtilisateur {
  courriel: boolean;
  sms_whatsapp: boolean;
  resume_hebdomadaire: boolean;
  alertes_securite: boolean;
}

export interface CompteUtilisateur {
  id: string;
  nom_complet: string;
  courriel: string;
  telephone: string;
  mot_de_passe_demo: string; // Affiché uniquement sur l'écran de connexion démo
  initiales_avatar: string;
  url_avatar?: string;
  biographie?: string;
  poste?: string;
  departement?: string;
  ville?: string;
  pays?: string;
  url_linkedin?: string;
  langue_preferee?: 'Français' | 'Créole haïtien' | 'English' | 'Español';
  preferences_notifications?: PreferencesNotificationsUtilisateur;
  est_super_admin_plateforme?: boolean;
  est_actif?: boolean;
  a_mot_de_passe?: boolean;
  double_facteur_actif?: boolean;
  doit_changer_mot_de_passe?: boolean;
  mot_de_passe_mis_a_jour_le?: string;
  tentatives_connexion_echouees?: number;
  verrouille_jusqua?: string;
  affiliations: AffiliationEtablissement[];
  ids_apprenants_lies?: string[]; // Pour les comptes Parents ou Apprenants
}

export interface DefinitionRole {
  id: IdentifiantRole;
  libelle: string;
  libelle_court: string;
  description: string;
  types_applicables: TypeEtablissement[] | 'TOUS';
  permissions_defaut: IdentifiantPermission[];
}

export interface UniteAcademique {
  id: string;
  id_etablissement: string;
  code: string;
  nom: string;
  categorie: string; // ex: "Filière courte", "Secondaire", "Faculté Sciences & Tech"
  niveau_ou_duree: string; // ex: "6 mois", "NS4", "L1–L3"
  indication_horaire?: string; // ex: "Lun–Jeu 14h–17h"
  capacite: number;
  frais_scolarite_htg: number;
  frais_inscription_htg: number;
  repartition_facturation: string;
  responsable_nom: string;
}

export interface ElementPedagogique {
  id: string;
  id_etablissement: string;
  id_unite: string;
  code: string;
  nom: string;
  nature: 'MODULE_PRATIQUE' | 'MODULE_THEORIQUE' | 'MATIERE' | 'UE';
  coefficient_ou_credits: number; // Coefficient (Scolaire), Crédits ECTS (Univ), Heures/Poids (Pro)
  volume_horaire_total: number;
  id_enseignant: string;
  libelle_periode: string;
}

export interface ContactTuteur {
  nom_complet: string;
  lien_parente: 'Père' | 'Mère' | 'Tuteur' | 'Tutrice' | 'Conjoint(e)' | 'Proche / Urgence';
  telephone: string;
  est_contact_urgence: boolean;
  retrait_autorise: boolean;
}

export interface Apprenant {
  id: string;
  id_etablissement: string;
  matricule: string;
  prenom: string;
  nom: string;
  sexe: 'F' | 'M';
  date_naissance: string;
  lieu_naissance: string;
  telephone: string;
  courriel?: string;
  adresse: string;
  id_unite: string;
  libelle_niveau: string; // ex: "Session Octobre", "9ème AF", "L2 - S1"
  date_inscription: string;
  indice_etape: 1 | 2 | 3 | 4 | 5; // Index dans la chronologie du type d'établissement
  statut: 'ACTIF' | 'EN_STAGE' | 'DIPLOME' | 'SUSPENDU' | 'REDOUBLANT';
  total_du_htg: number;
  total_paye_htg: number;
  statut_paiement: 'A_JOUR' | 'PARTIEL' | 'EN_RETARD';
  moyenne_generale: number; // Sur l'échelle de l'établissement
  taux_assiduite: number; // %
  credits_acquis?: number; // Université uniquement
  credits_requis?: number; // Université uniquement
  pourcentage_bourse?: number;
  nationalite?: string;
  mobilite_internationale?: boolean;
  reference_visa_passeport?: string;
  tuteurs?: ContactTuteur[]; // Parents, tuteurs ou contacts d'urgence (tous établissements)
  entreprise_stage?: string; // Pro / Université
  dossier_complet: boolean;
  pieces_manquantes?: string[];
  echeancier?: EcheancePaiement[];
}

export interface PersonnelEnseignant {
  id: string;
  id_etablissement: string;
  code: string;
  nom_complet: string;
  specialite: string;
  type_contrat: 'CDI / Temps plein' | 'Vacation horaire' | 'Contractuel';
  telephone: string;
  courriel: string;
  ids_unites_assignees: string[];
  ids_elements_assignes?: string[];
  heures_mensuelles: number;
  taux_horaire_ou_mensuel_htg: number;
}

export interface PaiementEnregistre {
  id: string;
  id_etablissement: string;
  numero_recu: string;
  id_apprenant: string;
  montant_htg: number;
  mode_paiement:
    | 'Espèces'
    | 'MonCash'
    | 'NatCash'
    | 'Mobile Money (Orange/Wave/M-Pesa)'
    | 'Carte bancaire (Stripe/Visa)'
    | 'Virement bancaire (SEPA/SWIFT)'
    | 'Chèque';
  code_reference?: string;
  libelle_compte_bancaire?: string;
  libelle: string;
  paye_le: string;
  encaisse_par: string;
  statut: 'VALIDE' | 'ANNULE';
}

export interface NoteEvaluation {
  id: string;
  id_etablissement: string;
  id_apprenant: string;
  id_element: string;
  libelle_periode: string;
  type_evaluation: 'Devoir' | 'Contrôle' | 'Examen' | 'Pratique' | 'Rattrapage';
  note: number;
  note_maximale: number;
  verrouillee: boolean;
  enregistree_le: string;
}

export interface PresenceEnregistree {
  id: string;
  id_etablissement: string;
  id_apprenant: string;
  date: string;
  statut: 'PRESENT' | 'ABSENT' | 'RETARD' | 'EXCUSE';
  id_unite: string;
  observation?: string;
}

export interface CreneauEmploiDuTemps {
  id: string;
  id_etablissement: string;
  id_unite: string;
  id_element: string;
  id_enseignant: string;
  salle: string;
  jour_semaine: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';
  heure_debut: string;
  heure_fin: string;
}

export interface DocumentOfficielEmis {
  id: string;
  id_etablissement: string;
  numero_document: string;
  id_apprenant: string;
  type_document: string;
  emis_le: string;
  emis_par: string;
  empreinte_verification: string;
}

export interface PartenaireStage {
  id: string;
  id_etablissement: string;
  nom_entreprise: string;
  secteur: string;
  ville: string;
  nom_tuteur: string;
  telephone: string;
  places_disponibles: number;
  stagiaires_actifs: number;
}

export interface EntreeJournalAudit {
  id: string;
  id_etablissement: string;
  nom_acteur: string;
  role_acteur: string;
  action: string;
  cible: string;
  categorie: 'AUTH' | 'ADMISSION' | 'FINANCE' | 'PEDAGOGIE' | 'RBAC' | 'CONFIG' | 'DOCUMENT';
  horodatage: string;
}

export interface NotificationSysteme {
  id: string;
  id_etablissement: string;
  titre: string;
  description: string;
  severite: 'info' | 'warning' | 'danger' | 'success';
  cree_le: string;
  lue: boolean;
  route_cible?: IdentifiantRoute;
}

export interface MessageToast {
  id: string;
  titre: string;
  description?: string;
  variante: 'success' | 'info' | 'warning' | 'error';
}

export interface DepenseEnregistree {
  id: string;
  id_etablissement: string;
  categorie: 'Fournitures' | 'Énergie / Génératrice' | 'Maintenance' | 'Loyer & Eau' | 'Équipement' | 'Autre';
  description: string;
  fournisseur: string;
  montant_htg: number;
  payee_le: string;
  enregistree_par: string;
}

export interface BulletinPaie {
  id: string;
  id_etablissement: string;
  id_personnel: string;
  nom_personnel: string;
  libelle_role: string;
  libelle_mois: string;
  heures_travaillees: number;
  salaire_base_htg?: number;
  primes_htg?: number;
  motif_primes?: string;
  montant_brut_htg: number;
  retenues_htg: number;
  motif_retenues?: string;
  montant_net_htg: number;
  statut: 'PAYE' | 'EN_ATTENTE';
  mode_paiement?: string;
  observations?: string;
  paye_le?: string;
  cree_le?: string;
}

export type TypeEvenementCalendrier =
  | 'ANNEE_LIMITE'
  | 'PERIODE'
  | 'EXAMEN'
  | 'CONGE'
  | 'FERIE'
  | 'EVENEMENT'
  | 'ECHEANCE';

export interface EvenementCalendrierAcademique {
  id: string;
  id_etablissement: string;
  type: TypeEvenementCalendrier;
  titre: string;
  date_debut: string;
  date_fin?: string;
  concerne_unites?: string;
  description?: string;
}

export type StatutInscription = 'VALIDEE' | 'ANNULEE' | 'ARCHIVEE';

export interface InscriptionApprenant {
  id: string;
  id_etablissement: string;
  id_apprenant: string;
  numero_inscription: string;
  annee_academique: string;
  libelle_periode: string;
  id_unite: string;
  libelle_niveau: string;
  type_inscription: 'NOUVELLE' | 'REINSCRIPTION';
  date_inscription: string;
  statut_inscription: StatutInscription;
  montant_brut_htg: number;
  pourcentage_bourse: number;
  montant_net_htg: number;
  pieces_fournies: string[];
  option_cantine?: boolean;
  option_transport?: boolean;
  motif_statut?: string;
  observations?: string;
  cree_le: string;
  modifie_le?: string;
}

export interface MessageCommunication {
  id: string;
  id_etablissement: string;
  titre: string;
  contenu: string;
  canal: 'Interne' | 'SMS' | 'WhatsApp' | 'Courriel';
  audience: string;
  envoye_le: string;
  envoye_par: string;
  nombre_destinataires: number;
}

export interface EntreeCahierTextes {
  id: string;
  id_etablissement: string;
  id_unite: string;
  id_element: string;
  nom_enseignant: string;
  date: string;
  sujet: string;
  devoir_donne?: string;
}

export interface SoutenanceMemoire {
  id: string;
  id_etablissement: string;
  id_apprenant: string;
  titre: string;
  nom_directeur_memoire: string;
  membres_jury: string;
  date_soutenance: string;
  note?: number;
  statut: 'PLANIFIEE' | 'SOUTENUE' | 'AJOURNEE';
}

export interface LivreBibliotheque {
  id: string;
  id_etablissement: string;
  isbn: string;
  titre: string;
  auteur: string;
  categorie: string;
  exemplaires_totaux: number;
  exemplaires_disponibles: number;
  cote_rayonnage?: string;
  emplacement?: string;
  editeur?: string;
  annee_edition?: string;
  type_support?: 'Ouvrage papier' | 'Manuel technique' | 'Revue / Périodique' | 'Ouvrage numérique';
  resume?: string;
}

export interface EmpruntBibliotheque {
  id: string;
  id_etablissement: string;
  id_livre: string;
  id_apprenant: string;
  emprunte_le: string;
  retour_prevu_le: string;
  retourne_le?: string;
  etat_retour?: 'Bon état' | 'Abîmé' | 'Perdu';
  prolongation_compteur?: number;
  remarque?: string;
}

export interface VisiteInfirmerie {
  id: string;
  id_etablissement: string;
  id_apprenant: string;
  date: string;
  motif: string;
  soin_apporte: string;
  note_allergies?: string;
  nom_infirmier: string;
}

export interface IncidentDiscipline {
  id: string;
  id_etablissement: string;
  id_apprenant: string;
  date: string;
  gravite: 'Mineur' | 'Moyen' | 'Grave';
  description: string;
  sanction: string;
  parent_notifie: boolean;
}

export interface AbonnementService {
  id: string;
  id_etablissement: string;
  id_apprenant: string;
  type_service: 'Cantine' | 'Transport' | 'Uniforme & Fournitures';
  tarif_mensuel_ou_annuel_htg: number;
  actif: boolean;
  ligne_ou_formule: string;
}

export type CategorieMateriel =
  | 'Atelier'
  | 'Laboratoire'
  | 'Informatique'
  | 'Mobilier'
  | 'Uniformes'
  | 'Audiovisuel'
  | 'Sécurité & EPI';

export type EtatMateriel = 'Neuf' | 'Bon état' | 'À réparer' | 'Hors service';

export interface ArticleInventaire {
  id: string;
  id_etablissement: string;
  code: string;
  nom: string;
  categorie: CategorieMateriel;
  quantite: number;
  quantite_disponible?: number;
  seuil_alerte?: number;
  etat: EtatMateriel;
  emplacement: string;
  numero_serie?: string;
  date_verification?: string;
  notes_maintenance?: string;
}

export interface PretMateriel {
  id: string;
  id_etablissement: string;
  id_article: string;
  quantite: number;
  type_emprunteur: 'Apprenant' | 'Enseignant' | 'Salle / Atelier';
  id_apprenant?: string;
  id_enseignant?: string;
  emprunteur_nom: string;
  remis_le: string;
  retour_prevu_le: string;
  retourne_le?: string;
  etat_retour?: EtatMateriel;
  remarque?: string;
}

export interface FicheAncienEtudiant {
  id: string;
  id_etablissement: string;
  nom_complet: string;
  promotion: string;
  nom_unite: string;
  poste_actuel: string;
  employeur: string;
  ville: string;
  telephone: string;
}

export interface ElementSynchroHorsLigne {
  id: string;
  id_etablissement: string;
  type_action: 'PRESENCE' | 'NOTE';
  resume: string;
  charge_utile: unknown;
  cree_le: string;
}

export interface RessourcePedagogiqueLms {
  id: string;
  id_etablissement: string;
  id_unite: string;
  id_element: string;
  titre: string;
  type_ressource: 'Cours PDF' | 'Vidéo / Replay' | 'Lien Visio' | 'Support TP / Quiz';
  url_ou_code: string;
  id_fichier_local?: string;
  nom_fichier?: string;
  taille_octets?: number;
  type_mime?: string;
  publie_le: string;
  nom_auteur: string;
}

export type TypeDevoirLms = 'Devoir' | 'Questionnaire' | 'Question' | 'Projet';

export interface PieceJointeDevoirLms {
  id: string;
  titre: string;
  type: 'Document' | 'Lien' | 'Vidéo' | 'Dépôt';
  url: string;
  id_fichier_local?: string;
  nom_fichier?: string;
  taille_octets?: number;
  type_mime?: string;
  mode_classroom?: 'CONSULTATION' | 'COPIE_PAR_APPRENANT';
}

export interface CritereGrilleDevoir {
  id: string;
  titre: string;
  description: string;
  points_max: number;
}

export interface CommentaireDevoirLms {
  id: string;
  nom_auteur: string;
  role_auteur: string;
  message: string;
  cree_le: string;
}

export interface DevoirLms {
  id: string;
  id_etablissement: string;
  id_unite: string;
  id_element: string;
  titre: string;
  type_devoir?: TypeDevoirLms;
  theme_ou_chapitre?: string;
  consignes?: string;
  publie_le?: string;
  cree_par?: string;
  date_limite: string;
  points_max: number;
  nombre_rendus: number;
  total_attendu: number;
  statut: 'OUVERT' | 'CLOTURE' | 'BROUILLON';
  pieces_jointes?: PieceJointeDevoirLms[];
  criteres_grille?: CritereGrilleDevoir[];
  commentaires_classe?: CommentaireDevoirLms[];
}

export type StatutRemiseDevoir = 'ASSIGNE' | 'REMIS' | 'RENDU_EN_RETARD' | 'EVALUE' | 'A_REVOIR';

export interface RemiseDevoirLms {
  id: string;
  id_etablissement: string;
  id_devoir: string;
  id_apprenant: string;
  statut: StatutRemiseDevoir;
  remis_le?: string;
  lien_ou_fichier?: string;
  nom_fichier?: string;
  id_fichier_local?: string;
  taille_octets?: number;
  type_mime?: string;
  pieces_remises?: PieceJointeDevoirLms[];
  commentaire_apprenant?: string;
  note_attribuee?: number;
  points_par_critere?: Record<string, number>;
  commentaire_enseignant?: string;
  evalue_le?: string;
  evalue_par?: string;
  synchronise_bulletin?: boolean;
}

export interface ArticleActualite {
  id: string;
  id_etablissement: string;
  titre: string;
  categorie: 'Événement' | 'Académique' | 'Vie du campus' | 'Urgent';
  resume: string;
  contenu: string;
  publie_le: string;
  date_evenement?: string;
  lieu?: string;
  nom_auteur: string;
  epingle: boolean;
  audience: 'Tous' | 'Parents' | 'Apprenants' | 'Personnel';
}

export interface ConsentementRgpd {
  id: string;
  id_etablissement: string;
  id_apprenant: string;
  droit_image: boolean;
  traitement_donnees: boolean;
  accord_parental: boolean;
  consentement_sms_whatsapp: boolean;
  mis_a_jour_le: string;
  mis_a_jour_par: string;
}

export interface DemandeRgpd {
  id: string;
  id_etablissement: string;
  id_apprenant: string;
  type_demande: 'EXPORT_DONNEES' | 'RECTIFICATION' | 'EFFACEMENT';
  statut: 'EN_ATTENTE' | 'TRAITEE';
  demandee_le: string;
  traitee_le?: string;
  observations: string;
}

export interface MessageDirect {
  id: string;
  nom_expediteur: string;
  role_expediteur: string;
  contenu: string;
  envoye_le: string;
  est_de_moi?: boolean;
}

export interface FilDiscussionDirecte {
  id: string;
  id_etablissement: string;
  sujet: string;
  nom_interlocuteur: string;
  role_interlocuteur: string;
  categorie: 'Parent / Tuteur' | 'Enseignant' | 'Apprenant' | 'Administration';
  messages_non_lus: number;
  mis_a_jour_le: string;
  messages: MessageDirect[];
}

export interface AttributionBadge {
  id: string;
  id_etablissement: string;
  id_apprenant: string;
  titre_badge: string;
  categorie: 'Excellence' | 'Assiduité' | 'Leadership' | 'Compétence';
  attribue_le: string;
  attribue_par: string;
}

export interface LotImportation {
  id: string;
  id_etablissement: string;
  cible: 'APPRENANTS' | 'NOTES' | 'PAIEMENTS' | 'UNITES';
  nom_fichier: string;
  lignes_importees: number;
  importe_le: string;
  importe_par: string;
}

export interface ConfigurationPlateforme {
  nom_plateforme: string;
  accroche_courte: string;
  slogan: string;
  titre_banniere: string;
  resume_pied_page?: string;
  horaires_support?: string;
  url_logo?: string;
  initiales_logo: string;
  couleur_marque: 'indigo' | 'blue' | 'emerald' | 'amber' | 'violet' | 'slate';
  courriel_support: string;
  telephone_support: string;
  site_web: string;
  adresse_siege: string;
  entite_legale: string;
  autoriser_creation_autonome: boolean;
}
