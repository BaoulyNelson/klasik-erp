import { TypeEtablissement } from '../modeles/erp';

/**
 * Dictionnaire centralisé d'adaptation contextuelle.
 * Aucun libellé métier dépendant du type d'établissement ne doit être codé en dur.
 */
export interface DictionnaireTerminologie {
  type_etablissement: TypeEtablissement;
  badge_type_libelle: string;
  libelle_type_complet: string;
  apprenant_singulier: string;
  apprenant_pluriel: string;
  apprenant_defini: string; // ex: "l'apprenant", "l'élève", "l'étudiant"
  enseignant_singulier: string;
  enseignant_pluriel: string;
  unite_singulier: string;
  unite_pluriel: string;
  libelle_categorie_unite: string;
  contenu_singulier: string;
  contenu_pluriel: string;
  libelle_poids_contenu: string; // ex: "Heures", "Coefficient", "Crédits ECTS"
  periode_singulier: string;
  periode_pluriel: string;
  libelle_evaluation: string;
  libelle_issue_parcours: string;
  documents_officiels: string[];
  libelle_modele_facturation: string;
  pieces_admission_requises: string[];
  etape_tuteurs_active: boolean;
  module_stages_actif: boolean;
  suivi_credits_actif: boolean;
  conseil_classe_actif: boolean;
  etapes_parcours: {
    etape: 1 | 2 | 3 | 4 | 5;
    libelle: string;
    libelle_court: string;
    description: string;
  }[];
  libelles_indicateurs: {
    apprenants_actifs: string;
    metrique_academique_principale: string;
    metrique_specifique_mise_en_avant: string;
  };
}

export const DICTIONNAIRES_TERMINOLOGIE: Record<TypeEtablissement, DictionnaireTerminologie> = {
  PRO: {
    type_etablissement: 'PRO',
    badge_type_libelle: 'PRO',
    libelle_type_complet: 'École Professionnelle & Technique',
    apprenant_singulier: 'Apprenant',
    apprenant_pluriel: 'Apprenants',
    apprenant_defini: "l'apprenant",
    enseignant_singulier: 'Formateur',
    enseignant_pluriel: 'Formateurs',
    unite_singulier: 'Filière / Métier',
    unite_pluriel: 'Filières & Métiers',
    libelle_categorie_unite: 'Type de formation',
    contenu_singulier: 'Module',
    contenu_pluriel: 'Modules pratiques & théoriques',
    libelle_poids_contenu: 'Volume horaire',
    periode_singulier: 'Session',
    periode_pluriel: 'Sessions (3 à 6 mois)',
    libelle_evaluation: 'Notes de modules & évaluation de stage',
    libelle_issue_parcours: 'Certification & Insertion professionnelle',
    documents_officiels: [
      'Certificat de fin d’études',
      'Attestation de réussite',
      'Attestation de stage',
      'Badge stagiaire QR',
    ],
    libelle_modele_facturation: 'Frais d’inscription + 3 tranches par session',
    pieces_admission_requises: [
      'Acte de naissance ou Carte électorale (CIN)',
      'Preuve de dernière classe fréquentée',
      '2 photos d’identité récentes',
    ],
    etape_tuteurs_active: false,
    module_stages_actif: true,
    suivi_credits_actif: false,
    conseil_classe_actif: false,
    etapes_parcours: [
      { etape: 1, libelle: 'Inscrit', libelle_court: 'Inscrit', description: 'Dossier administratif et 1ère tranche validés' },
      { etape: 2, libelle: 'En formation', libelle_court: 'Formation', description: 'Cours théoriques et ateliers pratiques' },
      { etape: 3, libelle: 'En stage', libelle_court: 'Stage', description: 'Immersion en entreprise partenaire' },
      { etape: 4, libelle: 'Éligible graduation', libelle_court: 'Éligible', description: 'Notes, stage et solde conformes' },
      { etape: 5, libelle: 'Certifié / Alumni', libelle_court: 'Certifié', description: 'Certificat officiel remis' },
    ],
    libelles_indicateurs: {
      apprenants_actifs: 'Apprenants actifs',
      metrique_academique_principale: 'Moyenne modules',
      metrique_specifique_mise_en_avant: 'Placement en stage',
    },
  },
  SCOLAIRE: {
    type_etablissement: 'SCOLAIRE',
    badge_type_libelle: 'SCOLAIRE',
    libelle_type_complet: 'Établissement Scolaire (Fondamental & Secondaire)',
    apprenant_singulier: 'Élève',
    apprenant_pluriel: 'Élèves',
    apprenant_defini: "l'élève",
    enseignant_singulier: 'Professeur',
    enseignant_pluriel: 'Professeurs & Maîtres',
    unite_singulier: 'Classe / Niveau',
    unite_pluriel: 'Classes & Niveaux',
    libelle_categorie_unite: 'Cycle scolaire',
    contenu_singulier: 'Matière',
    contenu_pluriel: 'Matières & Coefficients',
    libelle_poids_contenu: 'Coefficient',
    periode_singulier: 'Trimestre',
    periode_pluriel: 'Trimestres (Contrôles 1 à 4)',
    libelle_evaluation: 'Bulletins périodiques & Examens d’État',
    libelle_issue_parcours: 'Passage de classe, Redoublement ou Examens d’État',
    documents_officiels: [
      'Bulletin périodique',
      'Certificat de scolarité',
      'Attestation de passage',
      'Carnet de correspondance',
    ],
    libelle_modele_facturation: 'Inscription + 3 versements trimestriels + options (cantine/transport)',
    pieces_admission_requises: [
      'Acte de naissance officiel',
      'Carnet scolaire précédent',
      'Certificat de santé et carnet vaccinal',
      'Photo d’identité',
    ],
    etape_tuteurs_active: true,
    module_stages_actif: false,
    suivi_credits_actif: false,
    conseil_classe_actif: true,
    etapes_parcours: [
      { etape: 1, libelle: 'Inscrit', libelle_court: 'Inscrit', description: 'Tuteurs enregistrés et inscription validée' },
      { etape: 2, libelle: 'Trimestre 1', libelle_court: 'Trim. 1', description: 'Évaluations et bulletin du 1er trimestre' },
      { etape: 3, libelle: 'Trimestre 2', libelle_court: 'Trim. 2', description: 'Suivi mi-année et conseil intermédiaire' },
      { etape: 4, libelle: 'Trimestre 3', libelle_court: 'Trim. 3', description: 'Synthèse annuelle ou Examens d’État' },
      { etape: 5, libelle: 'Admis en classe supérieure', libelle_court: 'Admis', description: 'Décision finale du conseil de classe' },
    ],
    libelles_indicateurs: {
      apprenants_actifs: 'Élèves inscrits',
      metrique_academique_principale: 'Moyenne générale',
      metrique_specifique_mise_en_avant: 'Taux de réussite',
    },
  },
  UNIVERSITE: {
    type_etablissement: 'UNIVERSITE',
    badge_type_libelle: 'UNIVERSITÉ',
    libelle_type_complet: 'Université & Institut Supérieur (LMD)',
    apprenant_singulier: 'Étudiant',
    apprenant_pluriel: 'Étudiants',
    apprenant_defini: "l'étudiant",
    enseignant_singulier: 'Enseignant-chercheur',
    enseignant_pluriel: 'Enseignants-chercheurs & Chargés de cours',
    unite_singulier: 'Faculté / Parcours',
    unite_pluriel: 'Facultés & Parcours',
    libelle_categorie_unite: 'Faculté / Département',
    contenu_singulier: 'Unité d’Enseignement (UE)',
    contenu_pluriel: 'Unités d’Enseignement (UE) & Crédits ECTS',
    libelle_poids_contenu: 'Crédits ECTS',
    periode_singulier: 'Semestre',
    periode_pluriel: 'Semestres (S1, S2)',
    libelle_evaluation: 'Contrôle continu, Examens & Rattrapages',
    libelle_issue_parcours: 'Mémoire, Soutenance & Diplôme',
    documents_officiels: [
      'Relevé de notes officiel (Transcript)',
      'Attestation de fréquentation',
      'Attestation de réussite',
      'Diplôme universitaire',
    ],
    libelle_modele_facturation: 'Admission + frais par semestre ou au prorata des crédits ECTS',
    pieces_admission_requises: [
      'Diplôme de fin d’études secondaires (Bac II / NS4)',
      'Relevés de notes officiels',
      'Acte de naissance',
      'Carte d’Identification Nationale (CIN / NIF)',
      'Photo d’identité',
    ],
    etape_tuteurs_active: false,
    module_stages_actif: true,
    suivi_credits_actif: true,
    conseil_classe_actif: false,
    etapes_parcours: [
      { etape: 1, libelle: 'Admis', libelle_court: 'Admis', description: 'Inscription pédagogique aux UE validée' },
      { etape: 2, libelle: 'Semestre impair', libelle_court: 'Sem. 1', description: 'Contrôle continu et examens S1' },
      { etape: 3, libelle: 'Semestre pair', libelle_court: 'Sem. 2', description: 'Validation des crédits ECTS et rattrapages' },
      { etape: 4, libelle: 'Mémoire / Stage', libelle_court: 'Mémoire', description: 'Encadrement recherche ou stage de fin d’études' },
      { etape: 5, libelle: 'Soutenance & Diplômé', libelle_court: 'Diplômé', description: 'Procès-verbal de jury et grade conféré' },
    ],
    libelles_indicateurs: {
      apprenants_actifs: 'Étudiants actifs',
      metrique_academique_principale: 'Crédits validés',
      metrique_specifique_mise_en_avant: 'Soutenances planifiées',
    },
  },
};

export function obtenir_terminologie(type: TypeEtablissement): DictionnaireTerminologie {
  return DICTIONNAIRES_TERMINOLOGIE[type];
}
