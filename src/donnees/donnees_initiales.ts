import {
  Apprenant,
  CompteUtilisateur,
  ConfigurationEtablissement,
  CreneauEmploiDuTemps,
  DocumentOfficielEmis,
  ElementPedagogique,
  EntreeJournalAudit,
  NoteEvaluation,
  NotificationSysteme,
  PaiementEnregistre,
  PartenaireStage,
  PersonnelEnseignant,
  PresenceEnregistree,
  UniteAcademique,
} from '../modeles/erp';

export const ETABLISSEMENTS_INITIAUX: ConfigurationEtablissement[] = [
  {
    id: 't-pro-epm',
    code: 'EPM',
    nom: 'École Professionnelle Méthodiste',
    nom_court: 'ÉP Méthodiste',
    type: 'PRO',
    code_pays: 'HT',
    nom_pays: 'Haïti',
    fuseau_horaire: 'America/Port-au-Prince (UTC-5)',
    autorite_tutelle: 'MENFP / INFP',
    ville: 'Delmas, Port-au-Prince',
    adresse: 'Delmas 33, Rue Charbonnière #18, Port-au-Prince',
    telephone: '+509 2813-4510',
    courriel: 'direction@epmethodiste.edu.ht',
    site_web: 'www.epmethodiste.edu.ht',
    annee_academique: '2026–2027',
    libelle_periode_courante: 'Session Octobre 2026',
    devise_defaut: 'HTG',
    taux_change_usd: 132,
    format_matricule: 'EPM-26-{SEQ}',
    echelle_notation: 100,
    note_passage: 70,
    couleur_accent: 'orange',
    devise_etablissement: 'Savoir-faire, Rigueur et Autonomie',
    titre_direction: 'Directeur du centre',
    nom_direction: 'Jean-Robert Pierre',
    code_sceau: 'SCEAU-EPM-HT-01',
    services_actifs: {
      bibliotheque: true,
      cantine: false,
      transport: false,
      infirmerie: true,
      anciens: true,
    },
    offre_saas: 'Croissance',
    bloquer_documents_si_impaye: true,
  },
  {
    id: 't-sco-lauriers',
    code: 'ICL',
    nom: 'Institution Classique Les Lauriers',
    nom_court: 'Les Lauriers',
    type: 'SCOLAIRE',
    code_pays: 'HT',
    nom_pays: 'Haïti',
    fuseau_horaire: 'America/Port-au-Prince (UTC-5)',
    autorite_tutelle: 'MENFP (Haïti)',
    ville: 'Pétion-Ville',
    adresse: 'Rue Panaméricaine #42, Pétion-Ville',
    telephone: '+509 2940-8821',
    courriel: 'secretariat@leslauriers.edu.ht',
    site_web: 'www.leslauriers.edu.ht',
    annee_academique: '2026–2027',
    libelle_periode_courante: '1er Trimestre (Oct–Déc)',
    devise_defaut: 'HTG',
    taux_change_usd: 132,
    format_matricule: 'ICL-26-{SEQ}',
    echelle_notation: 10,
    note_passage: 5,
    couleur_accent: 'blue',
    devise_etablissement: 'Excellence, Discipline et Citoyenneté',
    titre_direction: 'Directrice générale',
    nom_direction: 'Mireille Toussaint-Félix',
    code_sceau: 'SCEAU-ICL-HT-02',
    services_actifs: {
      bibliotheque: true,
      cantine: true,
      transport: true,
      infirmerie: true,
      anciens: true,
    },
    offre_saas: 'Institutionnel',
    bloquer_documents_si_impaye: true,
  },
  {
    id: 't-uni-iut',
    code: 'IUT',
    nom: 'Institut Universitaire de Technologie',
    nom_court: 'IUT Haïti',
    type: 'UNIVERSITE',
    code_pays: 'HT',
    nom_pays: 'Haïti',
    fuseau_horaire: 'America/Port-au-Prince (UTC-5)',
    autorite_tutelle: 'MENFP / DESRS',
    ville: 'Turgeau, Port-au-Prince',
    adresse: 'Avenue Jean-Paul II #105, Turgeau, Port-au-Prince',
    telephone: '+509 2224-7600',
    courriel: 'rectorat@iut-haiti.edu.ht',
    site_web: 'www.iut-haiti.edu.ht',
    annee_academique: '2026–2027',
    libelle_periode_courante: 'Semestre 1 (Automne)',
    devise_defaut: 'HTG',
    taux_change_usd: 132,
    format_matricule: 'IUT-26-{SEQ}',
    echelle_notation: 20,
    note_passage: 10,
    couleur_accent: 'violet',
    devise_etablissement: 'Innovation, Recherche et Leadership',
    titre_direction: 'Recteur',
    nom_direction: 'Dr. Ernst-Hérold Bélizaire',
    code_sceau: 'SCEAU-IUT-HT-03',
    services_actifs: {
      bibliotheque: true,
      cantine: true,
      transport: false,
      infirmerie: true,
      anciens: true,
    },
    offre_saas: 'Institutionnel',
    bloquer_documents_si_impaye: true,
  },
  {
    id: 't-uni-ispd',
    code: 'ISPD',
    nom: 'Institut Supérieur Polytechnique de Dakar',
    nom_court: 'ISPD Dakar',
    type: 'UNIVERSITE',
    code_pays: 'SN',
    nom_pays: 'Sénégal',
    fuseau_horaire: 'Africa/Dakar (UTC+0)',
    autorite_tutelle: 'MESRI / CAMES (LMD)',
    ville: 'Plateau, Dakar',
    adresse: 'Boulevard de la République #28, Dakar, Sénégal',
    telephone: '+221 33 821 44 10',
    courriel: 'rectorat@ispd-dakar.sn',
    site_web: 'www.ispd-dakar.sn',
    annee_academique: '2026–2027',
    libelle_periode_courante: 'Semestre 1 (LMD)',
    devise_defaut: 'XOF',
    taux_change_usd: 132,
    format_matricule: 'ISPD-26-{SEQ}',
    echelle_notation: 20,
    note_passage: 10,
    couleur_accent: 'violet',
    devise_etablissement: 'Savoir, Innovation & Rayonnement Africain',
    titre_direction: 'Directeur Général',
    nom_direction: 'Pr. Cheikh Tidiane Ndiaye',
    code_sceau: 'SCEAU-ISPD-SN-04',
    services_actifs: {
      bibliotheque: true,
      cantine: true,
      transport: false,
      infirmerie: true,
      anciens: true,
    },
    offre_saas: 'Institutionnel',
    bloquer_documents_si_impaye: true,
  },
  {
    id: 't-sco-horizon',
    code: 'LHI',
    nom: 'Lycée International Horizon',
    nom_court: 'Horizon Paris',
    type: 'SCOLAIRE',
    code_pays: 'FR',
    nom_pays: 'France',
    fuseau_horaire: 'Europe/Paris (UTC+1)',
    autorite_tutelle: 'Ministère Éducation Nationale / IB',
    ville: 'Paris 15e',
    adresse: '14 Rue de Vaugirard, 75015 Paris, France',
    telephone: '+33 1 45 78 90 12',
    courriel: 'direction@lycee-horizon.fr',
    site_web: 'www.lycee-horizon.fr',
    annee_academique: '2026–2027',
    libelle_periode_courante: '1er Trimestre (Sept–Déc)',
    devise_defaut: 'EUR',
    taux_change_usd: 132,
    format_matricule: 'LHI-26-{SEQ}',
    echelle_notation: 20,
    note_passage: 10,
    couleur_accent: 'blue',
    devise_etablissement: 'Ouverture Mondiale, Rigueur & Humanisme',
    titre_direction: 'Proviseure',
    nom_direction: 'Mme Claire Delacroix',
    code_sceau: 'SCEAU-LHI-FR-05',
    services_actifs: {
      bibliotheque: true,
      cantine: true,
      transport: true,
      infirmerie: true,
      anciens: true,
    },
    offre_saas: 'Institutionnel',
    bloquer_documents_si_impaye: true,
  },
];

export const UNITES_INITIALES: UniteAcademique[] = [
  // PRO
  {
    id: 'u-pro-clim',
    id_etablissement: 't-pro-epm',
    code: 'CLIM-01',
    nom: 'Climatisation & Froid Industriel',
    categorie: 'Filière courte (3 mois)',
    niveau_ou_duree: '3 mois · 180h',
    indication_horaire: 'Lun–Jeu 14h00–17h00',
    capacite: 25,
    frais_inscription_htg: 1000,
    frais_scolarite_htg: 25000,
    repartition_facturation: '1 000 HTG inscription + 3 tranches (10 000 / 8 000 / 7 000 HTG)',
    responsable_nom: 'Ing. Mackenson Joseph',
  },
  {
    id: 'u-pro-elec',
    id_etablissement: 't-pro-epm',
    code: 'ELEC-02',
    nom: 'Électricité Bâtiment & Solaire',
    categorie: 'Filière technique (4 mois)',
    niveau_ou_duree: '4 mois · 240h',
    indication_horaire: 'Mar–Ven 08h30–12h00',
    capacite: 30,
    frais_inscription_htg: 1000,
    frais_scolarite_htg: 25000,
    repartition_facturation: '1 000 HTG inscription + 3 tranches (10 000 / 8 000 / 7 000 HTG)',
    responsable_nom: 'Ing. Patrick Désir',
  },
  {
    id: 'u-pro-cosm',
    id_etablissement: 't-pro-epm',
    code: 'COSM-03',
    nom: 'Cosmétologie & Esthétique',
    categorie: 'Filière moyenne (6 mois)',
    niveau_ou_duree: '6 mois · 320h',
    indication_horaire: 'Lun–Ven 09h00–12h30',
    capacite: 24,
    frais_inscription_htg: 1000,
    frais_scolarite_htg: 25000,
    repartition_facturation: '1 000 HTG inscription + 3 tranches (10 000 / 8 000 / 7 000 HTG)',
    responsable_nom: 'Mme Nadège Augustin',
  },
  {
    id: 'u-pro-info',
    id_etablissement: 't-pro-epm',
    code: 'INFO-04',
    nom: 'Informatique Bureautique & Réseau',
    categorie: 'Filière moyenne (6 mois)',
    niveau_ou_duree: '6 mois · 280h',
    indication_horaire: 'Sam & Dim 08h00–14h00',
    capacite: 28,
    frais_inscription_htg: 1000,
    frais_scolarite_htg: 25000,
    repartition_facturation: '1 000 HTG inscription + 3 tranches',
    responsable_nom: 'M. Stevenson Charles',
  },

  // SCOLAIRE
  {
    id: 'u-sco-6af',
    id_etablissement: 't-sco-lauriers',
    code: '6AF-A',
    nom: '6ème Année Fondamentale',
    categorie: 'Fondamental 2ème cycle',
    niveau_ou_duree: '6ème AF (Certificat)',
    indication_horaire: 'Lun–Ven 07h30–13h00',
    capacite: 36,
    frais_inscription_htg: 5000,
    frais_scolarite_htg: 45000,
    repartition_facturation: '5 000 HTG inscription + 3 versements de 15 000 HTG',
    responsable_nom: 'Mme Rose-Carmelle Étienne',
  },
  {
    id: 'u-sco-9af',
    id_etablissement: 't-sco-lauriers',
    code: '9AF-A',
    nom: '9ème Année Fondamentale',
    categorie: 'Fondamental 3ème cycle (Examen d’État)',
    niveau_ou_duree: '9ème AF',
    indication_horaire: 'Lun–Ven 07h30–14h00',
    capacite: 38,
    frais_inscription_htg: 5000,
    frais_scolarite_htg: 45000,
    repartition_facturation: '5 000 HTG inscription + 3 versements de 15 000 HTG',
    responsable_nom: 'M. Frantzky Moïse',
  },
  {
    id: 'u-sco-ns1',
    id_etablissement: 't-sco-lauriers',
    code: 'NS1-S',
    nom: 'Nouveau Secondaire 1 (NS1)',
    categorie: 'Secondaire rénové',
    niveau_ou_duree: 'NS1',
    indication_horaire: 'Lun–Ven 07h30–14h30',
    capacite: 40,
    frais_inscription_htg: 6000,
    frais_scolarite_htg: 45000,
    repartition_facturation: '6 000 HTG inscription + 3 versements de 15 000 HTG',
    responsable_nom: 'M. Jean-Claude Valéry',
  },
  {
    id: 'u-sco-ns4',
    id_etablissement: 't-sco-lauriers',
    code: 'NS4-SVT',
    nom: 'Nouveau Secondaire 4 (NS4 — Bac)',
    categorie: 'Secondaire (Examen d’État)',
    niveau_ou_duree: 'NS4 Terminale',
    indication_horaire: 'Lun–Sam 07h30–14h30',
    capacite: 35,
    frais_inscription_htg: 6000,
    frais_scolarite_htg: 45000,
    repartition_facturation: '6 000 HTG inscription + 3 versements + frais examen',
    responsable_nom: 'Prof. Wilfrid Saint-Jean',
  },

  // UNIVERSITE
  {
    id: 'u-uni-info-l1',
    id_etablissement: 't-uni-iut',
    code: 'FAC-INFO-L1',
    nom: 'Sciences Informatiques — Licence 1',
    categorie: 'Faculté des Sciences & Technologies',
    niveau_ou_duree: 'L1 · 60 crédits/an',
    indication_horaire: 'Vacation Matin / Soir',
    capacite: 45,
    frais_inscription_htg: 3500,
    frais_scolarite_htg: 35000,
    repartition_facturation: '3 500 HTG admission + 35 000 HTG / semestre (ou 1 200 HTG/crédit)',
    responsable_nom: 'Dr. Carl-Henri Dorsainvil',
  },
  {
    id: 'u-uni-info-l3',
    id_etablissement: 't-uni-iut',
    code: 'FAC-INFO-L3',
    nom: 'Sciences Informatiques — Licence 3',
    categorie: 'Faculté des Sciences & Technologies',
    niveau_ou_duree: 'L3 · Fin de cycle (180 ECTS)',
    indication_horaire: 'Lun–Sam 16h00–20h00',
    capacite: 35,
    frais_inscription_htg: 3500,
    frais_scolarite_htg: 35000,
    repartition_facturation: '35 000 HTG / semestre + frais de soutenance',
    responsable_nom: 'Dr. Carl-Henri Dorsainvil',
  },
  {
    id: 'u-uni-adm-l2',
    id_etablissement: 't-uni-iut',
    code: 'FAC-ADM-L2',
    nom: 'Administration des Affaires — Licence 2',
    categorie: 'Faculté des Sciences Économiques & Gestion',
    niveau_ou_duree: 'L2 · 120 crédits cumulés',
    indication_horaire: 'Lun–Ven 08h00–13h00',
    capacite: 50,
    frais_inscription_htg: 3500,
    frais_scolarite_htg: 35000,
    repartition_facturation: '3 500 HTG réinscription + 35 000 HTG / semestre',
    responsable_nom: 'Prof. Fabiola Raymond',
  },
  {
    id: 'u-uni-adm-m1',
    id_etablissement: 't-uni-iut',
    code: 'FAC-ADM-M1',
    nom: 'Administration des Affaires — Master 1',
    categorie: 'École des Hautes Études Commerciales',
    niveau_ou_duree: 'M1 · 60 crédits/an',
    indication_horaire: 'Ven 17h00–21h00 & Sam 08h00–16h00',
    capacite: 25,
    frais_inscription_htg: 5000,
    frais_scolarite_htg: 48000,
    repartition_facturation: '48 000 HTG / semestre (exécutif)',
    responsable_nom: 'Prof. Fabiola Raymond',
  },
  // ISPD Dakar
  {
    id: 'u-ispd-gl-l1',
    id_etablissement: 't-uni-ispd',
    code: 'GL-L1',
    nom: 'Génie Logiciel & IA — Licence 1',
    categorie: 'École d’Ingénierie Numérique',
    niveau_ou_duree: 'L1 · 60 crédits CAMES/ECTS',
    indication_horaire: 'Lun–Ven 08h30–16h30',
    capacite: 45,
    frais_inscription_htg: 32700,
    frais_scolarite_htg: 163500,
    repartition_facturation: 'Inscription + 3 mensualités ou paiement annuel (FCFA)',
    responsable_nom: 'Dr. Aminata Fall',
  },
  {
    id: 'u-ispd-fin-m2',
    id_etablissement: 't-uni-ispd',
    code: 'FIN-M2',
    nom: 'Finance & Audit International — Master 2',
    categorie: 'Business School Dakar',
    niveau_ou_duree: 'M2 · 120 crédits Master',
    indication_horaire: 'Jeu–Sam 14h00–20h00',
    capacite: 30,
    frais_inscription_htg: 43600,
    frais_scolarite_htg: 261600,
    repartition_facturation: '2 tranches semestrielles (FCFA / EUR)',
    responsable_nom: 'Pr. Cheikh Tidiane Ndiaye',
  },
  // Lycée Horizon International
  {
    id: 'u-lhi-2nde',
    id_etablissement: 't-sco-horizon',
    code: '2NDE-IB',
    nom: 'Seconde Internationale (OIB)',
    categorie: 'Lycée Général & International',
    niveau_ou_duree: 'Annuel · Section Bilingue',
    indication_horaire: 'Lun–Ven 08h30–16h30',
    capacite: 30,
    frais_inscription_htg: 71500,
    frais_scolarite_htg: 643500,
    repartition_facturation: '500 € frais d’inscription + 3 versements trimestriels (4 500 €)',
    responsable_nom: 'M. Thomas Lefèvre',
  },
  {
    id: 'u-lhi-term',
    id_etablissement: 't-sco-horizon',
    code: 'TERM-SN',
    nom: 'Terminale Sciences & Numérique',
    categorie: 'Lycée Général & International',
    niveau_ou_duree: 'Annuel · Prépa Bac / IB',
    indication_horaire: 'Lun–Ven 08h30–17h00',
    capacite: 28,
    frais_inscription_htg: 71500,
    frais_scolarite_htg: 715000,
    repartition_facturation: '500 € inscription + 3 versements trimestriels (5 000 €)',
    responsable_nom: 'Mme Claire Delacroix',
  },
];

export const ENSEIGNANTS_INITIAUX: PersonnelEnseignant[] = [
  {
    id: 'st-pro-1',
    id_etablissement: 't-pro-epm',
    code: 'FRM-01',
    nom_complet: 'Ing. Mackenson Joseph',
    specialite: 'Froid commercial & Climatisation Split/VRF',
    type_contrat: 'CDI / Temps plein',
    telephone: '+509 3712-4410',
    courriel: 'm.joseph@epmethodiste.edu.ht',
    ids_unites_assignees: ['u-pro-clim'],
    heures_mensuelles: 72,
    taux_horaire_ou_mensuel_htg: 42000,
  },
  {
    id: 'st-pro-2',
    id_etablissement: 't-pro-epm',
    code: 'FRM-02',
    nom_complet: 'Ing. Patrick Désir',
    specialite: 'Installations électriques & Systèmes photovoltaïques',
    type_contrat: 'CDI / Temps plein',
    telephone: '+509 3618-9021',
    courriel: 'p.desir@epmethodiste.edu.ht',
    ids_unites_assignees: ['u-pro-elec'],
    heures_mensuelles: 80,
    taux_horaire_ou_mensuel_htg: 45000,
  },
  {
    id: 'st-pro-3',
    id_etablissement: 't-pro-epm',
    code: 'FRM-03',
    nom_complet: 'Mme Nadège Augustin',
    specialite: 'Soins esthétiques, coiffure & cosmétologie',
    type_contrat: 'CDI / Temps plein',
    telephone: '+509 4820-1134',
    courriel: 'n.augustin@epmethodiste.edu.ht',
    ids_unites_assignees: ['u-pro-cosm'],
    heures_mensuelles: 84,
    taux_horaire_ou_mensuel_htg: 38000,
  },
  {
    id: 'st-pro-4',
    id_etablissement: 't-pro-epm',
    code: 'FRM-04',
    nom_complet: 'M. Stevenson Charles',
    specialite: 'Bureautique avancée & Maintenance PC',
    type_contrat: 'Vacation horaire',
    telephone: '+509 3490-5501',
    courriel: 's.charles@epmethodiste.edu.ht',
    ids_unites_assignees: ['u-pro-info'],
    heures_mensuelles: 48,
    taux_horaire_ou_mensuel_htg: 650,
  },
  // SCOLAIRE
  {
    id: 'st-sco-1',
    id_etablissement: 't-sco-lauriers',
    code: 'PRF-01',
    nom_complet: 'Prof. Wilfrid Saint-Jean',
    specialite: 'Mathématiques & Analyse (NS1–NS4)',
    type_contrat: 'CDI / Temps plein',
    telephone: '+509 3755-2019',
    courriel: 'w.saintjean@leslauriers.edu.ht',
    ids_unites_assignees: ['u-sco-ns1', 'u-sco-ns4'],
    heures_mensuelles: 96,
    taux_horaire_ou_mensuel_htg: 52000,
  },
  {
    id: 'st-sco-2',
    id_etablissement: 't-sco-lauriers',
    code: 'PRF-02',
    nom_complet: 'M. Frantzky Moïse',
    specialite: 'Physique-Chimie',
    type_contrat: 'CDI / Temps plein',
    telephone: '+509 3812-6674',
    courriel: 'f.moise@leslauriers.edu.ht',
    ids_unites_assignees: ['u-sco-9af', 'u-sco-ns4'],
    heures_mensuelles: 88,
    taux_horaire_ou_mensuel_htg: 48000,
  },
  {
    id: 'st-sco-3',
    id_etablissement: 't-sco-lauriers',
    code: 'PRF-03',
    nom_complet: 'Mme Rose-Carmelle Étienne',
    specialite: 'Littérature française & Créole haïtien',
    type_contrat: 'CDI / Temps plein',
    telephone: '+509 4419-7310',
    courriel: 'rc.etienne@leslauriers.edu.ht',
    ids_unites_assignees: ['u-sco-6af', 'u-sco-9af'],
    heures_mensuelles: 92,
    taux_horaire_ou_mensuel_htg: 44000,
  },
  {
    id: 'st-sco-4',
    id_etablissement: 't-sco-lauriers',
    code: 'PRF-04',
    nom_complet: 'M. Jean-Claude Valéry',
    specialite: 'Histoire d’Haïti & Géographie',
    type_contrat: 'Contractuel',
    telephone: '+509 3104-8912',
    courriel: 'jc.valery@leslauriers.edu.ht',
    ids_unites_assignees: ['u-sco-ns1', 'u-sco-ns4'],
    heures_mensuelles: 76,
    taux_horaire_ou_mensuel_htg: 41000,
  },
  // UNIVERSITE
  {
    id: 'st-uni-1',
    id_etablissement: 't-uni-iut',
    code: 'ENS-01',
    nom_complet: 'Dr. Carl-Henri Dorsainvil',
    specialite: 'Architecture logicielle & Bases de données',
    type_contrat: 'CDI / Temps plein',
    telephone: '+509 3701-9910',
    courriel: 'ch.dorsainvil@iut-haiti.edu.ht',
    ids_unites_assignees: ['u-uni-info-l1', 'u-uni-info-l3'],
    heures_mensuelles: 64,
    taux_horaire_ou_mensuel_htg: 85000,
  },
  {
    id: 'st-uni-2',
    id_etablissement: 't-uni-iut',
    code: 'ENS-02',
    nom_complet: 'Prof. Fabiola Raymond',
    specialite: 'Finance d’entreprise & Stratégie',
    type_contrat: 'CDI / Temps plein',
    telephone: '+509 3882-1145',
    courriel: 'f.raymond@iut-haiti.edu.ht',
    ids_unites_assignees: ['u-uni-adm-l2', 'u-uni-adm-m1'],
    heures_mensuelles: 60,
    taux_horaire_ou_mensuel_htg: 80000,
  },
  {
    id: 'st-uni-3',
    id_etablissement: 't-uni-iut',
    code: 'ENS-03',
    nom_complet: 'M. Jean-Robert Pierre',
    specialite: 'Réseaux, Énergie solaire & Systèmes embarqués',
    type_contrat: 'Vacation horaire',
    telephone: '+509 3700-1122',
    courriel: 'jr.pierre@iut-haiti.edu.ht',
    ids_unites_assignees: ['u-uni-info-l1', 'u-uni-info-l3'],
    heures_mensuelles: 32,
    taux_horaire_ou_mensuel_htg: 1500,
  },
  // ISPD Dakar
  {
    id: 'st-ispd-1',
    id_etablissement: 't-uni-ispd',
    code: 'ENS-SN1',
    nom_complet: 'Dr. Aminata Fall',
    specialite: 'Intelligence Artificielle & Génie Logiciel',
    type_contrat: 'CDI / Temps plein',
    telephone: '+221 77 540 12 88',
    courriel: 'a.fall@ispd-dakar.sn',
    ids_unites_assignees: ['u-ispd-gl-l1'],
    heures_mensuelles: 70,
    taux_horaire_ou_mensuel_htg: 152600,
  },
  {
    id: 'st-ispd-2',
    id_etablissement: 't-uni-ispd',
    code: 'ENS-SN2',
    nom_complet: 'Pr. Moussa Diop',
    specialite: 'Audit IFRS, Contrôle & Finance OHADA',
    type_contrat: 'CDI / Temps plein',
    telephone: '+221 77 612 90 14',
    courriel: 'm.diop@ispd-dakar.sn',
    ids_unites_assignees: ['u-ispd-fin-m2'],
    heures_mensuelles: 64,
    taux_horaire_ou_mensuel_htg: 163500,
  },
  // Lycée Horizon Paris
  {
    id: 'st-lhi-1',
    id_etablissement: 't-sco-horizon',
    code: 'PRF-FR1',
    nom_complet: 'M. Thomas Lefèvre',
    specialite: 'Mathématiques & NSI (Numérique et Sciences Informatiques)',
    type_contrat: 'CDI / Temps plein',
    telephone: '+33 6 12 45 89 30',
    courriel: 't.lefevre@lycee-horizon.fr',
    ids_unites_assignees: ['u-lhi-2nde', 'u-lhi-term'],
    heures_mensuelles: 80,
    taux_horaire_ou_mensuel_htg: 457600,
  },
  {
    id: 'st-lhi-2',
    id_etablissement: 't-sco-horizon',
    code: 'PRF-FR2',
    nom_complet: 'Mme Sofia Benali',
    specialite: 'Physique-Chimie & Sciences IB',
    type_contrat: 'CDI / Temps plein',
    telephone: '+33 6 58 22 14 09',
    courriel: 's.benali@lycee-horizon.fr',
    ids_unites_assignees: ['u-lhi-2nde', 'u-lhi-term'],
    heures_mensuelles: 76,
    taux_horaire_ou_mensuel_htg: 429000,
  },
];

export const ELEMENTS_PEDAGOGIQUES_INITIAUX: ElementPedagogique[] = [
  // PRO
  { id: 'pi-pro-1', id_etablissement: 't-pro-epm', id_unite: 'u-pro-clim', code: 'MOD-CL01', nom: 'Thermodynamique appliquée & Fluides frigorigènes', nature: 'MODULE_THEORIQUE', coefficient_ou_credits: 60, volume_horaire_total: 60, id_enseignant: 'st-pro-1', libelle_periode: 'Session Octobre 2026' },
  { id: 'pi-pro-2', id_etablissement: 't-pro-epm', id_unite: 'u-pro-clim', code: 'MOD-CL02', nom: 'Installation & Dépannage Climatiseurs Split / Inverter', nature: 'MODULE_PRATIQUE', coefficient_ou_credits: 120, volume_horaire_total: 120, id_enseignant: 'st-pro-1', libelle_periode: 'Session Octobre 2026' },
  { id: 'pi-pro-3', id_etablissement: 't-pro-epm', id_unite: 'u-pro-elec', code: 'MOD-EL01', nom: 'Schémas électriques & Normes de sécurité bâtiment', nature: 'MODULE_THEORIQUE', coefficient_ou_credits: 80, volume_horaire_total: 80, id_enseignant: 'st-pro-2', libelle_periode: 'Session Octobre 2026' },
  { id: 'pi-pro-4', id_etablissement: 't-pro-epm', id_unite: 'u-pro-elec', code: 'MOD-EL02', nom: 'Câblage résidentiel, Onduleurs & Panneaux solaires', nature: 'MODULE_PRATIQUE', coefficient_ou_credits: 160, volume_horaire_total: 160, id_enseignant: 'st-pro-2', libelle_periode: 'Session Octobre 2026' },
  { id: 'pi-pro-5', id_etablissement: 't-pro-epm', id_unite: 'u-pro-cosm', code: 'MOD-CS01', nom: 'Dermatologie de base, Hygiène & Colorimétrie', nature: 'MODULE_THEORIQUE', coefficient_ou_credits: 100, volume_horaire_total: 100, id_enseignant: 'st-pro-3', libelle_periode: 'Session Octobre 2026' },
  { id: 'pi-pro-6', id_etablissement: 't-pro-epm', id_unite: 'u-pro-cosm', code: 'MOD-CS02', nom: 'Atelier Coiffure, Onglerie & Soins du visage', nature: 'MODULE_PRATIQUE', coefficient_ou_credits: 220, volume_horaire_total: 220, id_enseignant: 'st-pro-3', libelle_periode: 'Session Octobre 2026' },
  { id: 'pi-pro-7', id_etablissement: 't-pro-epm', id_unite: 'u-pro-info', code: 'MOD-IN01', nom: 'Suite Bureautique (Word, Excel, PowerPoint) & Cloud', nature: 'MODULE_PRATIQUE', coefficient_ou_credits: 180, volume_horaire_total: 180, id_enseignant: 'st-pro-4', libelle_periode: 'Session Octobre 2026' },

  // SCOLAIRE
  { id: 'pi-sco-1', id_etablissement: 't-sco-lauriers', id_unite: 'u-sco-ns4', code: 'MAT-MATH', nom: 'Mathématiques', nature: 'MATIERE', coefficient_ou_credits: 5, volume_horaire_total: 180, id_enseignant: 'st-sco-1', libelle_periode: '1er Trimestre' },
  { id: 'pi-sco-2', id_etablissement: 't-sco-lauriers', id_unite: 'u-sco-ns4', code: 'MAT-PHYS', nom: 'Physique & Chimie', nature: 'MATIERE', coefficient_ou_credits: 4, volume_horaire_total: 140, id_enseignant: 'st-sco-2', libelle_periode: '1er Trimestre' },
  { id: 'pi-sco-3', id_etablissement: 't-sco-lauriers', id_unite: 'u-sco-ns4', code: 'MAT-LITT', nom: 'Littérature & Philosophie', nature: 'MATIERE', coefficient_ou_credits: 3, volume_horaire_total: 120, id_enseignant: 'st-sco-3', libelle_periode: '1er Trimestre' },
  { id: 'pi-sco-4', id_etablissement: 't-sco-lauriers', id_unite: 'u-sco-ns4', code: 'MAT-HIST', nom: 'Histoire-Géographie', nature: 'MATIERE', coefficient_ou_credits: 2, volume_horaire_total: 90, id_enseignant: 'st-sco-4', libelle_periode: '1er Trimestre' },
  { id: 'pi-sco-5', id_etablissement: 't-sco-lauriers', id_unite: 'u-sco-9af', code: 'MAT-9MATH', nom: 'Mathématiques 9ème AF', nature: 'MATIERE', coefficient_ou_credits: 4, volume_horaire_total: 160, id_enseignant: 'st-sco-1', libelle_periode: '1er Trimestre' },
  { id: 'pi-sco-6', id_etablissement: 't-sco-lauriers', id_unite: 'u-sco-9af', code: 'MAT-9FR', nom: 'Français & Rédaction', nature: 'MATIERE', coefficient_ou_credits: 4, volume_horaire_total: 150, id_enseignant: 'st-sco-3', libelle_periode: '1er Trimestre' },
  { id: 'pi-sco-7', id_etablissement: 't-sco-lauriers', id_unite: 'u-sco-6af', code: 'MAT-6FR', nom: 'Français & Communication', nature: 'MATIERE', coefficient_ou_credits: 3, volume_horaire_total: 140, id_enseignant: 'st-sco-3', libelle_periode: '1er Trimestre' },

  // UNIVERSITE
  { id: 'pi-uni-1', id_etablissement: 't-uni-iut', id_unite: 'u-uni-info-l1', code: 'UE-INF101', nom: 'Algorithmique & Programmation structurée', nature: 'UE', coefficient_ou_credits: 6, volume_horaire_total: 60, id_enseignant: 'st-uni-1', libelle_periode: 'Semestre 1' },
  { id: 'pi-uni-2', id_etablissement: 't-uni-iut', id_unite: 'u-uni-info-l1', code: 'UE-INF102', nom: 'Architecture des ordinateurs & Réseaux', nature: 'UE', coefficient_ou_credits: 5, volume_horaire_total: 45, id_enseignant: 'st-uni-3', libelle_periode: 'Semestre 1' },
  { id: 'pi-uni-3', id_etablissement: 't-uni-iut', id_unite: 'u-uni-info-l3', code: 'UE-INF301', nom: 'Génie Logiciel & Bases de données avancées', nature: 'UE', coefficient_ou_credits: 6, volume_horaire_total: 60, id_enseignant: 'st-uni-1', libelle_periode: 'Semestre 1' },
  { id: 'pi-uni-4', id_etablissement: 't-uni-iut', id_unite: 'u-uni-info-l3', code: 'UE-INF305', nom: 'Projet tuteuré & Préparation mémoire', nature: 'UE', coefficient_ou_credits: 8, volume_horaire_total: 90, id_enseignant: 'st-uni-1', libelle_periode: 'Semestre 2' },
  { id: 'pi-uni-5', id_etablissement: 't-uni-iut', id_unite: 'u-uni-adm-l2', code: 'UE-ADM201', nom: 'Comptabilité analytique & Contrôle de gestion', nature: 'UE', coefficient_ou_credits: 5, volume_horaire_total: 50, id_enseignant: 'st-uni-2', libelle_periode: 'Semestre 1' },
  { id: 'pi-uni-6', id_etablissement: 't-uni-iut', id_unite: 'u-uni-adm-m1', code: 'UE-ADM401', nom: 'Finance corporative & Marchés émergents', nature: 'UE', coefficient_ou_credits: 6, volume_horaire_total: 48, id_enseignant: 'st-uni-2', libelle_periode: 'Semestre 1' },

  // ISPD Dakar
  { id: 'pi-ispd-1', id_etablissement: 't-uni-ispd', id_unite: 'u-ispd-gl-l1', code: 'UE-IA101', nom: 'Algorithmique, Python & Fondements IA', nature: 'UE', coefficient_ou_credits: 6, volume_horaire_total: 60, id_enseignant: 'st-ispd-1', libelle_periode: 'Semestre 1 (LMD)' },
  { id: 'pi-ispd-2', id_etablissement: 't-uni-ispd', id_unite: 'u-ispd-fin-m2', code: 'UE-FIN501', nom: 'Audit International IFRS & Risques Bancaires', nature: 'UE', coefficient_ou_credits: 6, volume_horaire_total: 54, id_enseignant: 'st-ispd-2', libelle_periode: 'Semestre 1 (LMD)' },

  // Lycée Horizon Paris
  { id: 'pi-lhi-1', id_etablissement: 't-sco-horizon', id_unite: 'u-lhi-term', code: 'MAT-NSI', nom: 'Spécialité Numérique & Sciences Informatiques', nature: 'MATIERE', coefficient_ou_credits: 8, volume_horaire_total: 180, id_enseignant: 'st-lhi-1', libelle_periode: '1er Trimestre (Sept–Déc)' },
  { id: 'pi-lhi-2', id_etablissement: 't-sco-horizon', id_unite: 'u-lhi-2nde', code: 'MAT-PHY', nom: 'Physique-Chimie (Parcours International)', nature: 'MATIERE', coefficient_ou_credits: 6, volume_horaire_total: 140, id_enseignant: 'st-lhi-2', libelle_periode: '1er Trimestre (Sept–Déc)' },
];

const PRENOMS_HT_F = [
  'Widline', 'Darline', 'Mirlène', 'Sherly', 'Nadège', 'Fabienne', 'Chrystelle',
  'Kettia', 'Lovenskyne', 'Stéphanie', 'Jocelyne', 'Islande', 'Marjorie', 'Yolène',
];
const PRENOMS_HT_M = [
  'Woodson', 'Kervens', 'Peterson', 'Jean-Marc', 'Roody', 'Schneider', 'Davidson',
  'Wensley', 'Junior', 'Emmanuel', 'Carl-Édouard', 'Samuel', 'Marc-Antoine', 'Réginald',
];
const NOMS_HT = [
  'Jean-Baptiste', 'Pierre-Louis', 'Joseph', 'Toussaint', 'Désir', 'Moïse', 'François',
  'Charles', 'Augustin', 'Saint-Fleur', 'Célestin', 'Bélizaire', 'Etienne', 'Clermont',
  'Thermidor', 'Lamour', 'Voltaire', 'Dorsainvil', 'Bien-Aimé', 'Casimir',
];
const COMMUNES_HT = [
  'Delmas 40B', 'Pétion-Ville, Morne Calvaire', 'Tabarre 27', 'Carrefour, Lamentin 52',
  'Turgeau, Port-au-Prince', 'Croix-des-Bouquets', 'Canapé-Vert', 'Delmas 75',
  'Christ-Roi', 'Nazon, Port-au-Prince', 'Frères, Pétion-Ville', 'Kenscoff',
];
const ENTREPRISES_STAGE_PRO = [
  'ClimService Haïti S.A.', 'Sogebank Services Techniques', 'Énergie Solaire Caraïbes',
  'Salon Éclat Pétion-Ville', 'Atelier Froid Delmas', 'DigiTech Bureautique',
];
const ENTREPRISES_STAGE_UNI = [
  'Natcom S.A. (DSI)', 'Unibank — Direction Innovation', 'Solutions Logiciel Ayiti',
  'Cabinet Bélizaire & Associés', 'BRH — Études Économiques', 'Digicel Haïti',
];

const PRENOMS_SN_F = ['Awa', 'Fatou', 'Mariama', 'Khady', 'Ndeye', 'Aïssatou', 'Oumou', 'Sokhna'];
const PRENOMS_SN_M = ['Mamadou', 'Ousmane', 'Ibrahima', 'Cheikh', 'Abdoulaye', 'Pape', 'Modou', 'Samba'];
const NOMS_SN = ['Ndiaye', 'Diop', 'Fall', 'Sow', 'Ba', 'Sarr', 'Gueye', 'Faye', 'Cissé', 'Kane'];
const COMMUNES_SN = ['Plateau, Dakar', 'Almadies, Dakar', 'Mermoz Sacré-Cœur', 'Yoff Virage', 'Liberté 6'];
const NATIONALITES_SN = ['Sénégalaise', 'Sénégalaise', 'Ivoirienne', 'Malienne', 'Guinéenne', 'Haïtienne'];

const PRENOMS_FR_F = ['Camille', 'Léa', 'Inès', 'Manon', 'Chloé', 'Clara', 'Sarah', 'Nora'];
const PRENOMS_FR_M = ['Lucas', 'Hugo', 'Théo', 'Adam', 'Gabriel', 'Raphaël', 'Yanis', 'Noah'];
const NOMS_FR = ['Martin', 'Bernard', 'Moreau', 'Laurent', 'Benali', 'Dupont', 'Lefèvre', 'Roux', 'Petit', 'Garcia'];
const COMMUNES_FR = ['Paris 15e', 'Paris 14e', 'Boulogne-Billancourt', 'Issy-les-Moulineaux', 'Neuilly-sur-Seine'];
const NATIONALITES_FR = ['Française', 'Française', 'Canadienne', 'Marocaine', 'Suisse', 'Haïtienne'];

function generer_apprenants_etablissement(
  id_etablissement: string,
  prefixe: string,
  ids_unites: string[],
  libelles_niveaux: string[],
  total_du: number,
  echelle: 10 | 20 | 100,
  mode: 'PRO' | 'SCOLAIRE' | 'UNIVERSITE',
  region: 'HT' | 'SN' | 'FR' = 'HT',
  nombre = 28
): Apprenant[] {
  const liste: Apprenant[] = [];
  for (let i = 0; i < nombre; i++) {
    const est_feminin = i % 2 === 0;
    const prenom =
      region === 'SN'
        ? est_feminin
          ? PRENOMS_SN_F[i % PRENOMS_SN_F.length]
          : PRENOMS_SN_M[i % PRENOMS_SN_M.length]
        : region === 'FR'
          ? est_feminin
            ? PRENOMS_FR_F[i % PRENOMS_FR_F.length]
            : PRENOMS_FR_M[i % PRENOMS_FR_M.length]
          : est_feminin
            ? PRENOMS_HT_F[i % PRENOMS_HT_F.length]
            : PRENOMS_HT_M[i % PRENOMS_HT_M.length];

    const nom =
      region === 'SN'
        ? NOMS_SN[(i * 3 + prefixe.length) % NOMS_SN.length]
        : region === 'FR'
          ? NOMS_FR[(i * 3 + prefixe.length) % NOMS_FR.length]
          : NOMS_HT[(i * 3 + prefixe.length) % NOMS_HT.length];

    const id_unite = ids_unites[i % ids_unites.length];
    const sequence = String(i + 1).padStart(3, '0');
    const indice_etape = ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5;

    let total_paye_htg = total_du;
    let statut_paiement: Apprenant['statut_paiement'] = 'A_JOUR';
    if (i % 4 === 1) {
      total_paye_htg = Math.round(total_du * 0.6);
      statut_paiement = 'PARTIEL';
    } else if (i % 5 === 2) {
      total_paye_htg = Math.round(total_du * 0.25);
      statut_paiement = 'EN_RETARD';
    }

    const ratio_brut = 0.52 + ((i * 7) % 44) / 100;
    const moyenne_generale =
      echelle === 10
        ? Number((ratio_brut * 10).toFixed(2))
        : echelle === 20
          ? Number((ratio_brut * 20).toFixed(2))
          : Math.round(ratio_brut * 100);

    const taux_assiduite = 76 + ((i * 5) % 24);
    const dossier_complet = i % 6 !== 3;

    const statut: Apprenant['statut'] =
      indice_etape === 5
        ? 'DIPLOME'
        : mode === 'PRO' && indice_etape === 3
          ? 'EN_STAGE'
          : i === 26 && mode === 'SCOLAIRE'
            ? 'REDOUBLANT'
            : 'ACTIF';

    const annee_naissance =
      mode === 'SCOLAIRE' ? 2008 + (i % 7) : mode === 'PRO' ? 1998 + (i % 9) : 2001 + (i % 6);
    const telephone =
      region === 'SN'
        ? `+221 77 ${310 + i} ${10 + i} ${20 + i}`
        : region === 'FR'
          ? `+33 6 ${12 + i} ${40 + i} ${21 + i} ${11 + i}`
          : `+509 ${3100 + i * 17}-${String(1000 + i * 137).slice(0, 4)}`;

    const nationalite =
      region === 'SN'
        ? NATIONALITES_SN[i % NATIONALITES_SN.length]
        : region === 'FR'
          ? NATIONALITES_FR[i % NATIONALITES_FR.length]
          : 'Haïtienne';

    const est_international =
      (region === 'SN' && nationalite !== 'Sénégalaise') ||
      (region === 'FR' && nationalite !== 'Française') ||
      (region === 'HT' && i === 4);

    const apprenant: Apprenant = {
      id: `lrn-${prefixe.toLowerCase()}-${sequence}`,
      id_etablissement,
      matricule: `${prefixe}-26-${sequence}`,
      prenom,
      nom,
      sexe: est_feminin ? 'F' : 'M',
      date_naissance: `${annee_naissance}-${String((i % 12) + 1).padStart(2, '0')}-${String(((i * 3) % 27) + 1).padStart(2, '0')}`,
      lieu_naissance:
        region === 'SN'
          ? 'Dakar'
          : region === 'FR'
            ? 'Paris'
            : i % 3 === 0
              ? 'Cap-Haïtien'
              : i % 3 === 1
                ? 'Port-au-Prince'
                : 'Jacmel',
      telephone,
      courriel: `${prenom.toLowerCase().replace(/[^a-z]/g, '')}.${nom.toLowerCase().replace(/[^a-z]/g, '')}@campus.org`,
      adresse:
        region === 'SN'
          ? COMMUNES_SN[i % COMMUNES_SN.length]
          : region === 'FR'
            ? COMMUNES_FR[i % COMMUNES_FR.length]
            : COMMUNES_HT[i % COMMUNES_HT.length],
      id_unite,
      libelle_niveau: libelles_niveaux[i % libelles_niveaux.length],
      date_inscription: `2026-09-${String((i % 20) + 5).padStart(2, '0')}`,
      indice_etape,
      statut,
      total_du_htg: total_du,
      total_paye_htg,
      statut_paiement,
      moyenne_generale,
      taux_assiduite,
      nationalite,
      mobilite_internationale: est_international,
      reference_visa_passeport: est_international ? `PP-${region}-${202600 + i}` : undefined,
      pourcentage_bourse: i % 7 === 0 ? 25 : 0,
      dossier_complet,
      pieces_manquantes: dossier_complet
        ? []
        : mode === 'SCOLAIRE'
          ? ['Certificat de santé']
          : mode === 'PRO'
            ? ['Photo d’identité']
            : ['Relevé de notes officiel'],
    };

    if (mode === 'SCOLAIRE') {
      apprenant.tuteurs = [
        {
          nom_complet: `${i % 2 === 0 ? 'Claire' : 'Marc'} ${nom}`,
          lien_parente: i % 2 === 0 ? 'Mère' : 'Père',
          telephone: region === 'FR' ? `+33 6 20 11 ${10 + i} ${20 + i}` : `+509 37${20 + i}-${String(4100 + i * 19).slice(0, 4)}`,
          est_contact_urgence: true,
          retrait_autorise: true,
        },
        {
          nom_complet: `Luc ${nom}`,
          lien_parente: 'Tuteur',
          telephone: region === 'FR' ? `+33 6 44 22 ${10 + i} ${30 + i}` : `+509 44${10 + i}-${String(2200 + i * 23).slice(0, 4)}`,
          est_contact_urgence: false,
          retrait_autorise: true,
        },
      ];
    }

    if (mode === 'PRO' && indice_etape >= 3) {
      apprenant.entreprise_stage = ENTREPRISES_STAGE_PRO[i % ENTREPRISES_STAGE_PRO.length];
    }

    if (mode === 'UNIVERSITE') {
      apprenant.credits_requis = id_unite.includes('l1') ? 60 : id_unite.includes('l2') ? 120 : id_unite.includes('l3') ? 180 : 60;
      apprenant.credits_acquis = Math.min(
        apprenant.credits_requis,
        Math.round((apprenant.credits_requis * (indice_etape * 18)) / 100)
      );
      if (indice_etape >= 4) {
        apprenant.entreprise_stage =
          region === 'SN'
            ? 'Sonatel / Orange Digital Center Dakar'
            : ENTREPRISES_STAGE_UNI[i % ENTREPRISES_STAGE_UNI.length];
      }
    }

    liste.push(apprenant);
  }
  return liste;
}

export const APPRENANTS_INITIAUX: Apprenant[] = [
  ...generer_apprenants_etablissement(
    't-pro-epm',
    'EPM',
    ['u-pro-clim', 'u-pro-elec', 'u-pro-cosm', 'u-pro-info'],
    ['Session Octobre 2026', 'Session Juin 2026', 'Session Octobre 2026', 'Session Octobre 2026'],
    26000,
    100,
    'PRO',
    'HT',
    28
  ),
  ...generer_apprenants_etablissement(
    't-sco-lauriers',
    'ICL',
    ['u-sco-6af', 'u-sco-9af', 'u-sco-ns1', 'u-sco-ns4'],
    ['6ème AF', '9ème AF', 'NS1', 'NS4'],
    50000,
    10,
    'SCOLAIRE',
    'HT',
    28
  ),
  ...generer_apprenants_etablissement(
    't-uni-iut',
    'IUT',
    ['u-uni-info-l1', 'u-uni-info-l3', 'u-uni-adm-l2', 'u-uni-adm-m1'],
    ['L1 · S1', 'L3 · S5', 'L2 · S3', 'M1 · S1'],
    38500,
    20,
    'UNIVERSITE',
    'HT',
    28
  ),
  ...generer_apprenants_etablissement(
    't-uni-ispd',
    'ISPD',
    ['u-ispd-gl-l1', 'u-ispd-fin-m2'],
    ['L1 · S1 (LMD)', 'M2 · S3 (LMD)'],
    196200,
    20,
    'UNIVERSITE',
    'SN',
    12
  ),
  ...generer_apprenants_etablissement(
    't-sco-horizon',
    'LHI',
    ['u-lhi-2nde', 'u-lhi-term'],
    ['Seconde OIB', 'Terminale SN'],
    715000,
    20,
    'SCOLAIRE',
    'FR',
    12
  ),
];

export const PAIEMENTS_INITIAUX: PaiementEnregistre[] = [
  {
    id: 'pay-1',
    id_etablissement: 't-pro-epm',
    numero_recu: 'REC-EPM-2026-0142',
    id_apprenant: 'lrn-epm-001',
    montant_htg: 26000,
    mode_paiement: 'MonCash',
    code_reference: 'MC-8841209',
    libelle: 'Inscription + Solde complet Session Octobre',
    paye_le: '2026-10-08',
    encaisse_par: 'Roseline Ambroise',
    statut: 'VALIDE',
  },
  {
    id: 'pay-2',
    id_etablissement: 't-pro-epm',
    numero_recu: 'REC-EPM-2026-0143',
    id_apprenant: 'lrn-epm-002',
    montant_htg: 15600,
    mode_paiement: 'Espèces',
    libelle: 'Inscription + 1ère et 2ème tranches',
    paye_le: '2026-10-12',
    encaisse_par: 'Roseline Ambroise',
    statut: 'VALIDE',
  },
  {
    id: 'pay-3',
    id_etablissement: 't-sco-lauriers',
    numero_recu: 'REC-ICL-2026-0891',
    id_apprenant: 'lrn-icl-001',
    montant_htg: 50000,
    mode_paiement: 'Virement bancaire (SEPA/SWIFT)',
    code_reference: 'SOGE-442190',
    libelle: 'Scolarité annuelle complète + inscription',
    paye_le: '2026-09-18',
    encaisse_par: 'Marie-Ange Jean-Baptiste',
    statut: 'VALIDE',
  },
  {
    id: 'pay-4',
    id_etablissement: 't-sco-lauriers',
    numero_recu: 'REC-ICL-2026-0892',
    id_apprenant: 'lrn-icl-002',
    montant_htg: 30000,
    mode_paiement: 'NatCash',
    code_reference: 'NC-771294',
    libelle: 'Inscription + Versement Trimestre 1 & 2',
    paye_le: '2026-10-04',
    encaisse_par: 'Marie-Ange Jean-Baptiste',
    statut: 'VALIDE',
  },
  {
    id: 'pay-5',
    id_etablissement: 't-uni-iut',
    numero_recu: 'REC-IUT-2026-0411',
    id_apprenant: 'lrn-iut-001',
    montant_htg: 38500,
    mode_paiement: 'Virement bancaire (SEPA/SWIFT)',
    code_reference: 'UNI-992014',
    libelle: 'Admission + Frais Semestre 1',
    paye_le: '2026-09-25',
    encaisse_par: 'Gérald Métellus',
    statut: 'VALIDE',
  },
  {
    id: 'pay-6',
    id_etablissement: 't-uni-ispd',
    numero_recu: 'REC-ISPD-2026-0091',
    id_apprenant: 'lrn-ispd-001',
    montant_htg: 130800,
    mode_paiement: 'Mobile Money (Orange/Wave/M-Pesa)',
    code_reference: 'WAVE-SN-882910',
    libelle: 'Scolarité L1 Génie Logiciel (1ère tranche)',
    paye_le: '2026-10-12',
    encaisse_par: 'Aïssatou Mbaye',
    statut: 'VALIDE',
  },
  {
    id: 'pay-7',
    id_etablissement: 't-sco-horizon',
    numero_recu: 'REC-LHI-2026-0210',
    id_apprenant: 'lrn-lhi-001',
    montant_htg: 286000,
    mode_paiement: 'Carte bancaire (Stripe/Visa)',
    code_reference: 'ch_3QStripeFR8821',
    libelle: 'Frais de scolarité T1 + Inscription',
    paye_le: '2026-09-10',
    encaisse_par: 'Service Comptable Paris',
    statut: 'VALIDE',
  },
];

export const NOTES_INITIALES: NoteEvaluation[] = [
  { id: 'gr-1', id_etablissement: 't-pro-epm', id_apprenant: 'lrn-epm-001', id_element: 'pi-pro-1', libelle_periode: 'Session Octobre 2026', type_evaluation: 'Contrôle', note: 86, note_maximale: 100, verrouillee: false, enregistree_le: '2026-11-02' },
  { id: 'gr-2', id_etablissement: 't-pro-epm', id_apprenant: 'lrn-epm-001', id_element: 'pi-pro-2', libelle_periode: 'Session Octobre 2026', type_evaluation: 'Pratique', note: 91, note_maximale: 100, verrouillee: false, enregistree_le: '2026-11-10' },
  { id: 'gr-3', id_etablissement: 't-sco-lauriers', id_apprenant: 'lrn-icl-004', id_element: 'pi-sco-1', libelle_periode: '1er Trimestre', type_evaluation: 'Contrôle', note: 8.5, note_maximale: 10, verrouillee: false, enregistree_le: '2026-11-05' },
  { id: 'gr-4', id_etablissement: 't-uni-iut', id_apprenant: 'lrn-iut-001', id_element: 'pi-uni-1', libelle_periode: 'Semestre 1', type_evaluation: 'Examen', note: 15.5, note_maximale: 20, verrouillee: true, enregistree_le: '2026-11-08' },
  { id: 'gr-5', id_etablissement: 't-uni-ispd', id_apprenant: 'lrn-ispd-001', id_element: 'pi-ispd-1', libelle_periode: 'Semestre 1 (LMD)', type_evaluation: 'Contrôle', note: 16.5, note_maximale: 20, verrouillee: false, enregistree_le: '2026-11-12' },
  { id: 'gr-6', id_etablissement: 't-sco-horizon', id_apprenant: 'lrn-lhi-001', id_element: 'pi-lhi-1', libelle_periode: '1er Trimestre (Sept–Déc)', type_evaluation: 'Devoir', note: 17, note_maximale: 20, verrouillee: false, enregistree_le: '2026-11-11' },
];

export const PRESENCES_INITIALES: PresenceEnregistree[] = [
  { id: 'att-1', id_etablissement: 't-pro-epm', id_apprenant: 'lrn-epm-001', date: '2026-11-14', statut: 'PRESENT', id_unite: 'u-pro-clim' },
  { id: 'att-2', id_etablissement: 't-pro-epm', id_apprenant: 'lrn-epm-003', date: '2026-11-14', statut: 'ABSENT', id_unite: 'u-pro-cosm', observation: 'Non justifié' },
  { id: 'att-3', id_etablissement: 't-sco-lauriers', id_apprenant: 'lrn-icl-002', date: '2026-11-15', statut: 'RETARD', id_unite: 'u-sco-9af', observation: 'Arrivée 15 min après appel' },
  { id: 'att-4', id_etablissement: 't-uni-iut', id_apprenant: 'lrn-iut-002', date: '2026-11-15', statut: 'PRESENT', id_unite: 'u-uni-info-l3' },
  { id: 'att-5', id_etablissement: 't-uni-ispd', id_apprenant: 'lrn-ispd-001', date: '2026-11-15', statut: 'PRESENT', id_unite: 'u-ispd-gl-l1' },
  { id: 'att-6', id_etablissement: 't-sco-horizon', id_apprenant: 'lrn-lhi-001', date: '2026-11-15', statut: 'PRESENT', id_unite: 'u-lhi-2nde' },
];

export const EMPLOIS_DU_TEMPS_INITIAUX: CreneauEmploiDuTemps[] = [
  // École Professionnelle Méthodiste (PRO)
  { id: 'sch-1', id_etablissement: 't-pro-epm', id_unite: 'u-pro-clim', id_element: 'pi-pro-2', id_enseignant: 'st-pro-1', salle: 'Atelier Froid A', jour_semaine: 'Lundi', heure_debut: '14:00', heure_fin: '17:00' },
  { id: 'sch-epm-2', id_etablissement: 't-pro-epm', id_unite: 'u-pro-clim', id_element: 'pi-pro-1', id_enseignant: 'st-pro-1', salle: 'Salle Théorie Delmas 101', jour_semaine: 'Mardi', heure_debut: '14:00', heure_fin: '16:30' },
  { id: 'sch-epm-3', id_etablissement: 't-pro-epm', id_unite: 'u-pro-clim', id_element: 'pi-pro-2', id_enseignant: 'st-pro-1', salle: 'Atelier Froid A', jour_semaine: 'Jeudi', heure_debut: '14:00', heure_fin: '17:00' },
  { id: 'sch-2', id_etablissement: 't-pro-epm', id_unite: 'u-pro-elec', id_element: 'pi-pro-4', id_enseignant: 'st-pro-2', salle: 'Labo Énergie B', jour_semaine: 'Mardi', heure_debut: '08:30', heure_fin: '12:00' },
  { id: 'sch-epm-5', id_etablissement: 't-pro-epm', id_unite: 'u-pro-elec', id_element: 'pi-pro-3', id_enseignant: 'st-pro-2', salle: 'Salle Théorie Delmas 101', jour_semaine: 'Mercredi', heure_debut: '08:30', heure_fin: '11:30' },
  { id: 'sch-epm-6', id_etablissement: 't-pro-epm', id_unite: 'u-pro-cosm', id_element: 'pi-pro-6', id_enseignant: 'st-pro-3', salle: 'Atelier Cosmétologie C', jour_semaine: 'Vendredi', heure_debut: '09:00', heure_fin: '12:30' },
  { id: 'sch-epm-7', id_etablissement: 't-pro-epm', id_unite: 'u-pro-info', id_element: 'pi-pro-7', id_enseignant: 'st-pro-4', salle: 'Salle Info 01', jour_semaine: 'Samedi', heure_debut: '08:00', heure_fin: '12:00' },

  // Institution Classique Les Lauriers (SCOLAIRE)
  { id: 'sch-3', id_etablissement: 't-sco-lauriers', id_unite: 'u-sco-ns4', id_element: 'pi-sco-1', id_enseignant: 'st-sco-1', salle: 'Salle NS4-1', jour_semaine: 'Lundi', heure_debut: '08:00', heure_fin: '10:00' },
  { id: 'sch-icl-2', id_etablissement: 't-sco-lauriers', id_unite: 'u-sco-ns4', id_element: 'pi-sco-2', id_enseignant: 'st-sco-2', salle: 'Laboratoire SVT / Chimie', jour_semaine: 'Mardi', heure_debut: '10:15', heure_fin: '12:15' },
  { id: 'sch-icl-3', id_etablissement: 't-sco-lauriers', id_unite: 'u-sco-ns4', id_element: 'pi-sco-3', id_enseignant: 'st-sco-3', salle: 'Salle NS4-1', jour_semaine: 'Mercredi', heure_debut: '08:00', heure_fin: '10:00' },
  { id: 'sch-icl-4', id_etablissement: 't-sco-lauriers', id_unite: 'u-sco-ns4', id_element: 'pi-sco-4', id_enseignant: 'st-sco-4', salle: 'Salle Histoire B2', jour_semaine: 'Jeudi', heure_debut: '10:15', heure_fin: '12:15' },
  { id: 'sch-icl-5', id_etablissement: 't-sco-lauriers', id_unite: 'u-sco-9af', id_element: 'pi-sco-5', id_enseignant: 'st-sco-1', salle: 'Salle 9AF-A', jour_semaine: 'Vendredi', heure_debut: '08:00', heure_fin: '10:00' },

  // IUT Haïti (UNIVERSITE)
  { id: 'sch-4', id_etablissement: 't-uni-iut', id_unite: 'u-uni-info-l1', id_element: 'pi-uni-1', id_enseignant: 'st-uni-1', salle: 'Amphi Turgeau', jour_semaine: 'Lundi', heure_debut: '09:00', heure_fin: '12:00' },
  { id: 'sch-iut-2', id_etablissement: 't-uni-iut', id_unite: 'u-uni-info-l1', id_element: 'pi-uni-2', id_enseignant: 'st-uni-3', salle: 'Labo Réseaux S2', jour_semaine: 'Mercredi', heure_debut: '09:00', heure_fin: '12:00' },
  { id: 'sch-iut-3', id_etablissement: 't-uni-iut', id_unite: 'u-uni-info-l3', id_element: 'pi-uni-3', id_enseignant: 'st-uni-1', salle: 'Salle Machine Turgeau', jour_semaine: 'Jeudi', heure_debut: '16:00', heure_fin: '19:00' },
  { id: 'sch-iut-4', id_etablissement: 't-uni-iut', id_unite: 'u-uni-adm-l2', id_element: 'pi-uni-5', id_enseignant: 'st-uni-2', salle: 'Salle Gestion 201', jour_semaine: 'Mardi', heure_debut: '08:30', heure_fin: '11:30' },
  { id: 'sch-iut-5', id_etablissement: 't-uni-iut', id_unite: 'u-uni-adm-m1', id_element: 'pi-uni-6', id_enseignant: 'st-uni-2', salle: 'Salle Exécutif M1', jour_semaine: 'Samedi', heure_debut: '09:00', heure_fin: '13:00' },

  // ISPD Dakar (UNIVERSITE)
  { id: 'sch-5', id_etablissement: 't-uni-ispd', id_unite: 'u-ispd-gl-l1', id_element: 'pi-ispd-1', id_enseignant: 'st-ispd-1', salle: 'Labo IA — Dakar', jour_semaine: 'Lundi', heure_debut: '09:00', heure_fin: '12:00' },
  { id: 'sch-ispd-2', id_etablissement: 't-uni-ispd', id_unite: 'u-ispd-gl-l1', id_element: 'pi-ispd-1', id_enseignant: 'st-ispd-1', salle: 'Amphi Cheikh Anta Diop', jour_semaine: 'Mercredi', heure_debut: '14:00', heure_fin: '17:00' },
  { id: 'sch-ispd-3', id_etablissement: 't-uni-ispd', id_unite: 'u-ispd-fin-m2', id_element: 'pi-ispd-2', id_enseignant: 'st-ispd-2', salle: 'Salle Audit Plateau', jour_semaine: 'Jeudi', heure_debut: '16:00', heure_fin: '19:00' },

  // Lycée International Horizon Paris (SCOLAIRE)
  { id: 'sch-6', id_etablissement: 't-sco-horizon', id_unite: 'u-lhi-term', id_element: 'pi-lhi-1', id_enseignant: 'st-lhi-1', salle: 'Salle Eiffel 204', jour_semaine: 'Mardi', heure_debut: '10:00', heure_fin: '12:00' },
  { id: 'sch-lhi-2', id_etablissement: 't-sco-horizon', id_unite: 'u-lhi-term', id_element: 'pi-lhi-1', id_enseignant: 'st-lhi-1', salle: 'Salle NSI 204', jour_semaine: 'Jeudi', heure_debut: '14:00', heure_fin: '16:00' },
  { id: 'sch-lhi-3', id_etablissement: 't-sco-horizon', id_unite: 'u-lhi-2nde', id_element: 'pi-lhi-2', id_enseignant: 'st-lhi-2', salle: 'Labo Physique-Chimie', jour_semaine: 'Vendredi', heure_debut: '09:00', heure_fin: '11:00' },
];

export const DOCUMENTS_INITIAUX: DocumentOfficielEmis[] = [
  { id: 'doc-1', id_etablissement: 't-pro-epm', numero_document: 'CERT-EPM-2026-0088', id_apprenant: 'lrn-epm-005', type_document: 'Certificat de fin d’études', emis_le: '2026-10-30', emis_par: 'Jean-Robert Pierre', empreinte_verification: 'HT-EPM-98A4F2' },
  { id: 'doc-2', id_etablissement: 't-sco-lauriers', numero_document: 'SCOL-ICL-2026-0312', id_apprenant: 'lrn-icl-001', type_document: 'Certificat de scolarité', emis_le: '2026-10-15', emis_par: 'Mireille Toussaint-Félix', empreinte_verification: 'HT-ICL-44C1D9' },
  { id: 'doc-3', id_etablissement: 't-uni-iut', numero_document: 'TRAN-IUT-2026-0194', id_apprenant: 'lrn-iut-005', type_document: 'Relevé de notes officiel', emis_le: '2026-11-04', emis_par: 'Dr. Ernst-Hérold Bélizaire', empreinte_verification: 'HT-IUT-72E0B5' },
  { id: 'doc-4', id_etablissement: 't-uni-ispd', numero_document: 'TRAN-ISPD-2026-0041', id_apprenant: 'lrn-ispd-001', type_document: 'Relevé de notes officiel', emis_le: '2026-11-10', emis_par: 'Pr. Cheikh Tidiane Ndiaye', empreinte_verification: 'SN-ISPD-31F8C2' },
  { id: 'doc-5', id_etablissement: 't-sco-horizon', numero_document: 'SCOL-LHI-2026-0102', id_apprenant: 'lrn-lhi-001', type_document: 'Certificat de scolarité', emis_le: '2026-10-18', emis_par: 'Mme Claire Delacroix', empreinte_verification: 'FR-LHI-66B9A1' },
];

export const PARTENAIRES_INITIAUX: PartenaireStage[] = [
  { id: 'part-1', id_etablissement: 't-pro-epm', nom_entreprise: 'ClimService Haïti S.A.', secteur: 'Climatisation & CVC', ville: 'Delmas 48', nom_tuteur: 'Ing. Rodrigue Michel', telephone: '+509 3711-0944', places_disponibles: 6, stagiaires_actifs: 4 },
  { id: 'part-2', id_etablissement: 't-pro-epm', nom_entreprise: 'Énergie Solaire Caraïbes', secteur: 'Photovoltaïque & Onduleurs', ville: 'Tabarre', nom_tuteur: 'Ing. Yves-Laurent Paul', telephone: '+509 3844-2190', places_disponibles: 5, stagiaires_actifs: 3 },
  { id: 'part-3', id_etablissement: 't-uni-iut', nom_entreprise: 'Solutions Logiciel Ayiti', secteur: 'Développement & Cloud', ville: 'Pétion-Ville', nom_tuteur: 'Mme Vanessa Chéry', telephone: '+509 2941-5520', places_disponibles: 8, stagiaires_actifs: 5 },
  { id: 'part-4', id_etablissement: 't-uni-ispd', nom_entreprise: 'Orange Digital Center Dakar', secteur: 'Cloud, IA & Télécoms', ville: 'Dakar, Sénégal', nom_tuteur: 'M. Ibrahima Sarr', telephone: '+221 77 500 22 10', places_disponibles: 10, stagiaires_actifs: 4 },
];

export const JOURNAUX_AUDIT_INITIAUX: EntreeJournalAudit[] = [
  {
    id: 'aud-1',
    id_etablissement: 't-pro-epm',
    nom_acteur: 'Jean-Robert Pierre',
    role_acteur: 'Directeur du centre',
    action: 'Validation de la maquette de session Octobre 2026',
    cible: 'Filière Climatisation & Froid',
    categorie: 'CONFIG',
    horodatage: '2026-11-17 09:42',
  },
  {
    id: 'aud-2',
    id_etablissement: 't-pro-epm',
    nom_acteur: 'Roseline Ambroise',
    role_acteur: 'Économe / Caissier',
    action: 'Encaissement MonCash (26 000 HTG)',
    cible: 'EPM-26-001 · Widline Jean-Baptiste',
    categorie: 'FINANCE',
    horodatage: '2026-11-17 08:15',
  },
  {
    id: 'aud-3',
    id_etablissement: 't-sco-lauriers',
    nom_acteur: 'Mireille Toussaint-Félix',
    role_acteur: 'Directrice générale',
    action: 'Émission de certificat de scolarité',
    cible: 'ICL-26-001 · Widline Jean-Baptiste',
    categorie: 'DOCUMENT',
    horodatage: '2026-11-16 15:30',
  },
  {
    id: 'aud-4',
    id_etablissement: 't-uni-iut',
    nom_acteur: 'Dr. Carl-Henri Dorsainvil',
    role_acteur: 'Directeur des études',
    action: 'Verrouillage des notes UE-INF101',
    cible: 'Sciences Informatiques L1',
    categorie: 'PEDAGOGIE',
    horodatage: '2026-11-16 11:10',
  },
];

export const NOTIFICATIONS_INITIALES: NotificationSysteme[] = [
  {
    id: 'notif-1',
    id_etablissement: 't-pro-epm',
    titre: '6 tranches en retard détectées',
    description: 'Des apprenants ont dépassé l’échéance du 10 novembre.',
    severite: 'warning',
    cree_le: 'Il y a 25 min',
    lue: false,
    route_cible: 'apprenants',
  },
  {
    id: 'notif-2',
    id_etablissement: 't-pro-epm',
    titre: '4 dossiers incomplets à vérifier',
    description: 'Pièces d’identité manquantes pour la session d’octobre.',
    severite: 'info',
    cree_le: 'Il y a 2 h',
    lue: false,
    route_cible: 'apprenants',
  },
  {
    id: 'notif-3',
    id_etablissement: 't-sco-lauriers',
    titre: 'Conseil de classe Trimestre 1',
    description: 'Préparation des bulletins de 9ème AF et NS4 prévue le 12 décembre.',
    severite: 'info',
    cree_le: 'Aujourd’hui',
    lue: false,
    route_cible: 'pedagogie',
  },
  {
    id: 'notif-4',
    id_etablissement: 't-uni-iut',
    titre: 'Soutenances L3 Info',
    description: '5 mémoires déposés en attente de constitution de jury.',
    severite: 'success',
    cree_le: 'Hier',
    lue: false,
    route_cible: 'stages',
  },
  {
    id: 'notif-5',
    id_etablissement: 't-uni-ispd',
    titre: 'Validation accréditation CAMES',
    description: 'Dossier Master Finance & Audit prêt pour export annuel.',
    severite: 'info',
    cree_le: 'Aujourd’hui',
    lue: false,
    route_cible: 'rapports',
  },
  {
    id: 'notif-6',
    id_etablissement: 't-sco-horizon',
    titre: 'Échange international OIB',
    description: '3 dossiers de mobilité internationale en cours de validation.',
    severite: 'success',
    cree_le: 'Aujourd’hui',
    lue: false,
    route_cible: 'apprenants',
  },
];

const UTILISATEURS_DEMO: CompteUtilisateur[] = [
  {
    id: 'usr-super',
    nom_complet: 'Tabitha Semaître',
    courriel: 'superadmin@klasik-erp.org',
    telephone: '+509 3700-0001',
    mot_de_passe_demo: '',
    initiales_avatar: 'TS',
    est_super_admin_plateforme: true,
    affiliations: [],
  },
  {
    id: 'usr-dir-multi',
    nom_complet: 'Jean-Robert Pierre',
    courriel: 'jr.pierre@epmethodiste.edu.ht',
    telephone: '+509 3700-1122',
    mot_de_passe_demo: '',
    initiales_avatar: 'JP',
    affiliations: [
      { id_etablissement: 't-pro-epm', id_role: 'DIRECTEUR', fonction_locale: 'Directeur du centre' },
      { id_etablissement: 't-uni-iut', id_role: 'ENSEIGNANT', fonction_locale: 'Chargé de cours (Réseaux)' },
    ],
  },
  {
    id: 'usr-dir-sco',
    nom_complet: 'Mireille Toussaint-Félix',
    courriel: 'direction@leslauriers.edu.ht',
    telephone: '+509 3810-2200',
    mot_de_passe_demo: '',
    initiales_avatar: 'MT',
    affiliations: [
      { id_etablissement: 't-sco-lauriers', id_role: 'DIRECTEUR', fonction_locale: 'Directrice générale' },
    ],
  },
  {
    id: 'usr-rect-uni',
    nom_complet: 'Dr. Ernst-Hérold Bélizaire',
    courriel: 'recteur@iut-haiti.edu.ht',
    telephone: '+509 3701-5500',
    mot_de_passe_demo: '',
    initiales_avatar: 'EB',
    affiliations: [
      { id_etablissement: 't-uni-iut', id_role: 'DIRECTEUR', fonction_locale: 'Recteur de l’IUT' },
    ],
  },
  {
    id: 'usr-admin',
    nom_complet: 'Réginald Casimir',
    courriel: 'admin@epmethodiste.edu.ht',
    telephone: '+509 3622-7741',
    mot_de_passe_demo: '',
    initiales_avatar: 'RC',
    affiliations: [
      { id_etablissement: 't-pro-epm', id_role: 'ADMIN_ETAB', fonction_locale: 'Administrateur SI' },
      { id_etablissement: 't-sco-lauriers', id_role: 'ADMIN_ETAB', fonction_locale: 'Administrateur SI' },
      { id_etablissement: 't-uni-iut', id_role: 'ADMIN_ETAB', fonction_locale: 'Administrateur SI' },
    ],
  },
  {
    id: 'usr-scolarite',
    nom_complet: 'Kettia Thermidor',
    courriel: 'scolarite@leslauriers.edu.ht',
    telephone: '+509 4412-3309',
    mot_de_passe_demo: '',
    initiales_avatar: 'KT',
    affiliations: [
      { id_etablissement: 't-sco-lauriers', id_role: 'SCOLARITE', fonction_locale: 'Secrétaire académique' },
      { id_etablissement: 't-pro-epm', id_role: 'SCOLARITE', fonction_locale: 'Agente d’inscription' },
      { id_etablissement: 't-uni-iut', id_role: 'SCOLARITE', fonction_locale: 'Registraire adjointe' },
    ],
  },
  {
    id: 'usr-econome-multi',
    nom_complet: 'Marie-Ange Jean-Baptiste',
    courriel: 'economat@leslauriers.edu.ht',
    telephone: '+509 3744-9012',
    mot_de_passe_demo: '',
    initiales_avatar: 'MJ',
    affiliations: [
      { id_etablissement: 't-sco-lauriers', id_role: 'ECONOME', fonction_locale: 'Économe principale' },
      { id_etablissement: 't-pro-epm', id_role: 'AUDITEUR', fonction_locale: 'Auditrice financière' },
      { id_etablissement: 't-uni-iut', id_role: 'ECONOME', fonction_locale: 'Comptable' },
    ],
  },
  {
    id: 'usr-diretudes',
    nom_complet: 'Dr. Carl-Henri Dorsainvil',
    courriel: 'etudes@iut-haiti.edu.ht',
    telephone: '+509 3701-9910',
    mot_de_passe_demo: '',
    initiales_avatar: 'CD',
    affiliations: [
      { id_etablissement: 't-uni-iut', id_role: 'DIR_ETUDES', fonction_locale: 'Vice-recteur académique' },
      { id_etablissement: 't-sco-lauriers', id_role: 'DIR_ETUDES', fonction_locale: 'Directeur des études' },
      { id_etablissement: 't-pro-epm', id_role: 'DIR_ETUDES', fonction_locale: 'Responsable pédagogique' },
    ],
  },
  {
    id: 'usr-enseignant',
    nom_complet: 'Prof. Wilfrid Saint-Jean',
    courriel: 'w.saintjean@leslauriers.edu.ht',
    telephone: '+509 3755-2019',
    mot_de_passe_demo: '',
    initiales_avatar: 'WS',
    affiliations: [
      { id_etablissement: 't-sco-lauriers', id_role: 'ENSEIGNANT', fonction_locale: 'Professeur de Mathématiques' },
      { id_etablissement: 't-pro-epm', id_role: 'ENSEIGNANT', fonction_locale: 'Formateur électricité' },
    ],
  },
  {
    id: 'usr-stages',
    nom_complet: 'Nadège Augustin',
    courriel: 'stages@epmethodiste.edu.ht',
    telephone: '+509 4820-1134',
    mot_de_passe_demo: '',
    initiales_avatar: 'NA',
    affiliations: [
      { id_etablissement: 't-pro-epm', id_role: 'RESP_STAGES', fonction_locale: 'Responsable des stages' },
      { id_etablissement: 't-uni-iut', id_role: 'RESP_STAGES', fonction_locale: 'Coordinatrice stages & insertion' },
    ],
  },
  {
    id: 'usr-services',
    nom_complet: 'Yolène Clermont',
    courriel: 'services@leslauriers.edu.ht',
    telephone: '+509 3402-6611',
    mot_de_passe_demo: '',
    initiales_avatar: 'YC',
    affiliations: [
      { id_etablissement: 't-sco-lauriers', id_role: 'SERVICES_ANNEXES', fonction_locale: 'Bibliothécaire & Infirmerie' },
      { id_etablissement: 't-uni-iut', id_role: 'SERVICES_ANNEXES', fonction_locale: 'Bibliothécaire en chef' },
      { id_etablissement: 't-pro-epm', id_role: 'SERVICES_ANNEXES', fonction_locale: 'Infirmerie' },
    ],
  },
  {
    id: 'usr-parent',
    nom_complet: 'Marie-Claire Jean-Baptiste',
    courriel: 'parent.jeanbaptiste@exemple.ht',
    telephone: '+509 3720-4100',
    mot_de_passe_demo: '',
    initiales_avatar: 'MC',
    affiliations: [
      { id_etablissement: 't-sco-lauriers', id_role: 'PARENT', fonction_locale: 'Parent d’élève (2 enfants)' },
    ],
    ids_apprenants_lies: ['lrn-icl-001', 'lrn-icl-005'],
  },
  {
    id: 'usr-apprenant',
    nom_complet: 'Widline Jean-Baptiste',
    courriel: 'widline.jb@exemple.ht',
    telephone: '+509 3100-1000',
    mot_de_passe_demo: '',
    initiales_avatar: 'WJ',
    affiliations: [
      { id_etablissement: 't-pro-epm', id_role: 'APPRENANT', fonction_locale: 'Apprenante (Climatisation)' },
      { id_etablissement: 't-uni-iut', id_role: 'APPRENANT', fonction_locale: 'Étudiante L1 Informatique' },
    ],
    ids_apprenants_lies: ['lrn-epm-001', 'lrn-iut-001'],
  },
  {
    id: 'usr-auditeur',
    nom_complet: 'Me Frantz Lamour',
    courriel: 'audit@klasik.ht',
    telephone: '+509 3901-8840',
    mot_de_passe_demo: '',
    initiales_avatar: 'FL',
    affiliations: [
      { id_etablissement: 't-pro-epm', id_role: 'AUDITEUR', fonction_locale: 'Auditeur externe' },
      { id_etablissement: 't-sco-lauriers', id_role: 'AUDITEUR', fonction_locale: 'Auditeur externe' },
      { id_etablissement: 't-uni-iut', id_role: 'AUDITEUR', fonction_locale: 'Auditeur externe' },
    ],
  },
];

export const UTILISATEURS_INITIAUX: CompteUtilisateur[] = import.meta.env.DEV
  ? UTILISATEURS_DEMO
  : [];
