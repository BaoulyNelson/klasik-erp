import { TypeEtablissement } from '../modeles/erp';

export interface UniteModeleCycle {
  suffixe_code: string;
  nom: string;
  niveau_ou_duree: string;
  capacite: number;
  frais_inscription_htg: number;
  frais_scolarite_htg: number;
  indication_horaire: string;
  elements_initiaux: { code: string; nom: string; poids: number; heures: number }[];
}

export interface ModeleCycle {
  id: string;
  type_etablissement: TypeEtablissement;
  titre: string;
  sous_titre: string;
  badge: string;
  unites: UniteModeleCycle[];
}

export const MODELES_CYCLES: ModeleCycle[] = [
  // SCOLAIRE
  {
    id: 'sc-prescolaire',
    type_etablissement: 'SCOLAIRE',
    titre: 'Cycle Préscolaire (PS · MS · GS)',
    sous_titre: '3 sections complètes de la maternelle avec matières d’éveil',
    badge: '3 classes',
    unites: [
      {
        suffixe_code: 'MAT-PS',
        nom: 'Petite Section (PS)',
        niveau_ou_duree: 'Préscolaire',
        capacite: 25,
        frais_inscription_htg: 5000,
        frais_scolarite_htg: 32000,
        indication_horaire: 'Lun–Ven 08h–12h30',
        elements_initiaux: [
          { code: 'EV-PS', nom: 'Éveil & Psychomotricité', poids: 2, heures: 60 },
          { code: 'LAN-PS', nom: 'Langage & Comptines', poids: 2, heures: 60 },
        ],
      },
      {
        suffixe_code: 'MAT-MS',
        nom: 'Moyenne Section (MS)',
        niveau_ou_duree: 'Préscolaire',
        capacite: 28,
        frais_inscription_htg: 5000,
        frais_scolarite_htg: 34000,
        indication_horaire: 'Lun–Ven 08h–13h',
        elements_initiaux: [
          { code: 'GRAPH-MS', nom: 'Graphisme & Pré-lecture', poids: 2, heures: 70 },
          { code: 'NUM-MS', nom: 'Découverte des Nombres', poids: 2, heures: 60 },
        ],
      },
      {
        suffixe_code: 'MAT-GS',
        nom: 'Grande Section (GS)',
        niveau_ou_duree: 'Préscolaire',
        capacite: 30,
        frais_inscription_htg: 5500,
        frais_scolarite_htg: 36000,
        indication_horaire: 'Lun–Ven 08h–13h30',
        elements_initiaux: [
          { code: 'LEC-GS', nom: 'Initiation Lecture & Écriture', poids: 3, heures: 90 },
          { code: 'CALC-GS', nom: 'Logique & Calcul', poids: 2, heures: 70 },
        ],
      },
    ],
  },
  {
    id: 'sc-fondamental-1',
    type_etablissement: 'SCOLAIRE',
    titre: 'Cycle Primaire / Fondamental (1ère à 5ème année)',
    sous_titre: '5 niveaux primaires structurés (compatible systèmes nationaux et internationaux)',
    badge: '5 classes',
    unites: [
      {
        suffixe_code: '1AF',
        nom: '1ère Année Fondamentale',
        niveau_ou_duree: '1er Cycle',
        capacite: 35,
        frais_inscription_htg: 6000,
        frais_scolarite_htg: 38000,
        indication_horaire: 'Lun–Ven 07h45–13h30',
        elements_initiaux: [
          { code: 'FR-1AF', nom: 'Français & Lecture', poids: 4, heures: 120 },
          { code: 'MATH-1AF', nom: 'Mathématiques', poids: 4, heures: 110 },
        ],
      },
      {
        suffixe_code: '2AF',
        nom: '2ème Année Fondamentale',
        niveau_ou_duree: '1er Cycle',
        capacite: 35,
        frais_inscription_htg: 6000,
        frais_scolarite_htg: 38000,
        indication_horaire: 'Lun–Ven 07h45–13h30',
        elements_initiaux: [
          { code: 'FR-2AF', nom: 'Français', poids: 4, heures: 120 },
          { code: 'MATH-2AF', nom: 'Mathématiques', poids: 4, heures: 110 },
        ],
      },
      {
        suffixe_code: '3AF',
        nom: '3ème Année Fondamentale',
        niveau_ou_duree: '1er Cycle',
        capacite: 35,
        frais_inscription_htg: 6000,
        frais_scolarite_htg: 40000,
        indication_horaire: 'Lun–Ven 07h45–14h',
        elements_initiaux: [
          { code: 'FR-3AF', nom: 'Français', poids: 4, heures: 120 },
          { code: 'MATH-3AF', nom: 'Mathématiques', poids: 4, heures: 110 },
        ],
      },
      {
        suffixe_code: '4AF',
        nom: '4ème Année Fondamentale',
        niveau_ou_duree: '1er Cycle',
        capacite: 36,
        frais_inscription_htg: 6500,
        frais_scolarite_htg: 42000,
        indication_horaire: 'Lun–Ven 07h45–14h',
        elements_initiaux: [
          { code: 'FR-4AF', nom: 'Français', poids: 4, heures: 120 },
          { code: 'SC-4AF', nom: 'Sciences Expérimentales', poids: 3, heures: 80 },
        ],
      },
      {
        suffixe_code: '5AF',
        nom: '5ème Année Fondamentale',
        niveau_ou_duree: '2ème Cycle',
        capacite: 36,
        frais_inscription_htg: 6500,
        frais_scolarite_htg: 44000,
        indication_horaire: 'Lun–Ven 07h45–14h',
        elements_initiaux: [
          { code: 'FR-5AF', nom: 'Français & Rédaction', poids: 4, heures: 120 },
          { code: 'MATH-5AF', nom: 'Mathématiques', poids: 4, heures: 110 },
        ],
      },
    ],
  },
  {
    id: 'sc-nouveau-secondaire',
    type_etablissement: 'SCOLAIRE',
    titre: 'Secondaire Supérieur (4 niveaux · Baccalauréat)',
    sous_titre: 'Cycle complet vers l’examen final / Baccalauréat (NS1–NS4 ou équivalent)',
    badge: '4 classes',
    unites: [
      {
        suffixe_code: 'NS1',
        nom: 'Nouveau Secondaire 1 (NS1)',
        niveau_ou_duree: 'Secondaire',
        capacite: 40,
        frais_inscription_htg: 7500,
        frais_scolarite_htg: 52000,
        indication_horaire: 'Lun–Ven 07h30–14h30',
        elements_initiaux: [
          { code: 'MATH-NS1', nom: 'Mathématiques Générales', poids: 5, heures: 120 },
          { code: 'PHY-NS1', nom: 'Physique-Chimie', poids: 4, heures: 90 },
        ],
      },
      {
        suffixe_code: 'NS2',
        nom: 'Nouveau Secondaire 2 (NS2)',
        niveau_ou_duree: 'Secondaire',
        capacite: 40,
        frais_inscription_htg: 7500,
        frais_scolarite_htg: 54000,
        indication_horaire: 'Lun–Ven 07h30–14h30',
        elements_initiaux: [
          { code: 'MATH-NS2', nom: 'Analyse & Algèbre', poids: 5, heures: 120 },
          { code: 'FR-NS2', nom: 'Littérature Française', poids: 4, heures: 95 },
        ],
      },
      {
        suffixe_code: 'NS3',
        nom: 'Nouveau Secondaire 3 (NS3)',
        niveau_ou_duree: 'Secondaire',
        capacite: 38,
        frais_inscription_htg: 8000,
        frais_scolarite_htg: 56000,
        indication_horaire: 'Lun–Ven 07h30–14h30',
        elements_initiaux: [
          { code: 'SVT-NS3', nom: 'Biologie & Géologie', poids: 4, heures: 95 },
          { code: 'ANG-NS3', nom: 'Anglais Avancé', poids: 3, heures: 80 },
        ],
      },
      {
        suffixe_code: 'NS4',
        nom: 'Nouveau Secondaire 4 (NS4 / Philo)',
        niveau_ou_duree: 'Examen d’État',
        capacite: 38,
        frais_inscription_htg: 9000,
        frais_scolarite_htg: 62000,
        indication_horaire: 'Lun–Sam 07h30–14h30',
        elements_initiaux: [
          { code: 'PHILO-NS4', nom: 'Philosophie', poids: 5, heures: 110 },
          { code: 'MATH-NS4', nom: 'Mathématiques Bac', poids: 6, heures: 130 },
        ],
      },
    ],
  },
  {
    id: 'sc-francophone-college-lycee',
    type_etablissement: 'SCOLAIRE',
    titre: 'Collège & Lycée Francophone (6ème → Terminale)',
    sous_titre: 'Architecture 6e, 3e Brevet, Seconde, Première et Terminale',
    badge: '5 classes',
    unites: [
      {
        suffixe_code: '6EME',
        nom: 'Classe de 6ème',
        niveau_ou_duree: 'Collège',
        capacite: 30,
        frais_inscription_htg: 8000,
        frais_scolarite_htg: 55000,
        indication_horaire: 'Lun–Ven 08h–15h',
        elements_initiaux: [{ code: 'FR-6E', nom: 'Français', poids: 4, heures: 110 }],
      },
      {
        suffixe_code: '3EME',
        nom: 'Classe de 3ème (Brevet)',
        niveau_ou_duree: 'Collège',
        capacite: 30,
        frais_inscription_htg: 8500,
        frais_scolarite_htg: 58000,
        indication_horaire: 'Lun–Ven 08h–15h30',
        elements_initiaux: [{ code: 'MATH-3E', nom: 'Mathématiques Brevet', poids: 4, heures: 115 }],
      },
      {
        suffixe_code: '2NDE',
        nom: 'Seconde Générale',
        niveau_ou_duree: 'Lycée',
        capacite: 32,
        frais_inscription_htg: 9000,
        frais_scolarite_htg: 64000,
        indication_horaire: 'Lun–Ven 08h–16h',
        elements_initiaux: [{ code: 'SES-2NDE', nom: 'Sciences Économiques & Sociales', poids: 4, heures: 90 }],
      },
      {
        suffixe_code: '1ERE',
        nom: 'Première (Spécialités)',
        niveau_ou_duree: 'Lycée',
        capacite: 32,
        frais_inscription_htg: 9500,
        frais_scolarite_htg: 68000,
        indication_horaire: 'Lun–Ven 08h–16h',
        elements_initiaux: [{ code: 'HGG-1ERE', nom: 'Histoire-Géographie & Géopolitique', poids: 4, heures: 100 }],
      },
      {
        suffixe_code: 'TERM',
        nom: 'Terminale (Baccalauréat)',
        niveau_ou_duree: 'Lycée',
        capacite: 32,
        frais_inscription_htg: 10000,
        frais_scolarite_htg: 72000,
        indication_horaire: 'Lun–Sam 08h–16h',
        elements_initiaux: [{ code: 'PHILO-TERM', nom: 'Philosophie Terminale', poids: 5, heures: 110 }],
      },
    ],
  },

  // UNIVERSITE
  {
    id: 'uni-licence-lmd',
    type_etablissement: 'UNIVERSITE',
    titre: 'Parcours Licence LMD (L1 · L2 · L3)',
    sous_titre: '3 niveaux semestriels avec crédits ECTS (180 crédits)',
    badge: '3 promos',
    unites: [
      {
        suffixe_code: 'L1',
        nom: 'Licence 1 — Tronc Commun',
        niveau_ou_duree: '60 ECTS · Semestriel',
        capacite: 120,
        frais_inscription_htg: 12000,
        frais_scolarite_htg: 85000,
        indication_horaire: 'Lun–Ven 08h–17h',
        elements_initiaux: [
          { code: 'UE-101', nom: 'Méthodologie Universitaire', poids: 6, heures: 45 },
          { code: 'UE-102', nom: 'Fondamentaux Disciplinaires I', poids: 8, heures: 60 },
        ],
      },
      {
        suffixe_code: 'L2',
        nom: 'Licence 2 — Approfondissement',
        niveau_ou_duree: '60 ECTS · Semestriel',
        capacite: 100,
        frais_inscription_htg: 12000,
        frais_scolarite_htg: 92000,
        indication_horaire: 'Lun–Ven 08h–17h',
        elements_initiaux: [
          { code: 'UE-201', nom: 'Analyse & Systèmes Appliqués', poids: 8, heures: 60 },
          { code: 'UE-202', nom: 'Projet Tutoré', poids: 6, heures: 45 },
        ],
      },
      {
        suffixe_code: 'L3',
        nom: 'Licence 3 — Spécialisation & Mémoire',
        niveau_ou_duree: '60 ECTS · Semestriel',
        capacite: 85,
        frais_inscription_htg: 14000,
        frais_scolarite_htg: 98000,
        indication_horaire: 'Lun–Sam 08h–18h',
        elements_initiaux: [
          { code: 'UE-301', nom: 'Séminaire de Recherche & Mémoire', poids: 10, heures: 75 },
          { code: 'UE-302', nom: 'Stage Professionnel Encadré', poids: 12, heures: 120 },
        ],
      },
    ],
  },
  {
    id: 'uni-master-lmd',
    type_etablissement: 'UNIVERSITE',
    titre: 'Cycle Master Recherche & Pro (M1 · M2)',
    sous_titre: '2 années post-licence avec soutenance de mémoire',
    badge: '2 promos',
    unites: [
      {
        suffixe_code: 'M1',
        nom: 'Master 1 — Ingénierie & Gouvernance',
        niveau_ou_duree: '60 ECTS · Semestriel',
        capacite: 50,
        frais_inscription_htg: 18000,
        frais_scolarite_htg: 135000,
        indication_horaire: 'Soir & Sam',
        elements_initiaux: [{ code: 'UE-M401', nom: 'Épistémologie & Méthodes Quantitatives', poids: 8, heures: 50 }],
      },
      {
        suffixe_code: 'M2',
        nom: 'Master 2 — Expertise & Thèse Professionnelle',
        niveau_ou_duree: '60 ECTS · Semestriel',
        capacite: 45,
        frais_inscription_htg: 20000,
        frais_scolarite_htg: 150000,
        indication_horaire: 'Soir & Sam',
        elements_initiaux: [{ code: 'UE-M501', nom: 'Mémoire de Fin d’Études & Jury', poids: 18, heures: 140 }],
      },
    ],
  },

  // PRO
  {
    id: 'pro-metiers-tech',
    type_etablissement: 'PRO',
    titre: 'Pack Filières Techniques & Numériques',
    sous_titre: '3 cohortes pratiques orientées métier et insertion rapide',
    badge: '3 filières',
    unites: [
      {
        suffixe_code: 'DEV-WEB',
        nom: 'Développement Web & Mobile Fullstack',
        niveau_ou_duree: '6 mois',
        capacite: 25,
        frais_inscription_htg: 4500,
        frais_scolarite_htg: 38000,
        indication_horaire: 'Lun–Jeu 14h–18h',
        elements_initiaux: [
          { code: 'MOD-JS', nom: 'Frontend React & TypeScript', poids: 6, heures: 80 },
          { code: 'MOD-API', nom: 'Backend API & Bases de données', poids: 6, heures: 75 },
        ],
      },
      {
        suffixe_code: 'SOL-PV',
        nom: 'Énergie Solaire Photovoltaïque & Électricité',
        niveau_ou_duree: '6 mois',
        capacite: 24,
        frais_inscription_htg: 4500,
        frais_scolarite_htg: 36000,
        indication_horaire: 'Lun–Ven 08h30–12h30',
        elements_initiaux: [
          { code: 'MOD-PV1', nom: 'Dimensionnement & Câblage Solaire', poids: 6, heures: 90 },
          { code: 'MOD-SEC', nom: 'Sécurité Électrique Normée', poids: 4, heures: 45 },
        ],
      },
      {
        suffixe_code: 'GEST-COMPTA',
        nom: 'Comptabilité Informatisée & Paie',
        niveau_ou_duree: '5 mois',
        capacite: 30,
        frais_inscription_htg: 4000,
        frais_scolarite_htg: 32000,
        indication_horaire: 'Mar–Ven 16h–19h',
        elements_initiaux: [
          { code: 'MOD-CPT', nom: 'Comptabilité Générale & États Financiers', poids: 5, heures: 70 },
        ],
      },
    ],
  },
];
