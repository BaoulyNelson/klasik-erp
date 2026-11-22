import { CodeDevise, CodePays } from '../modeles/erp';

export interface MetadonneesDevise {
  code: CodeDevise;
  symbole: string;
  libelle: string;
  decimales: number;
  /** Équivalent en unité pivot interne */
  pivot_htg_par_unite: number;
}

export const CATALOGUE_DEVISES: Record<CodeDevise, MetadonneesDevise> = {
  USD: {
    code: 'USD',
    symbole: 'USD',
    libelle: 'Dollar américain (USD)',
    decimales: 2,
    pivot_htg_par_unite: 132,
  },
  EUR: {
    code: 'EUR',
    symbole: '€',
    libelle: 'Euro (EUR)',
    decimales: 2,
    pivot_htg_par_unite: 143,
  },
  CAD: {
    code: 'CAD',
    symbole: '$ CA',
    libelle: 'Dollar canadien (CAD)',
    decimales: 2,
    pivot_htg_par_unite: 95,
  },
  GBP: {
    code: 'GBP',
    symbole: '£',
    libelle: 'Livre sterling (GBP)',
    decimales: 2,
    pivot_htg_par_unite: 168,
  },
  CHF: {
    code: 'CHF',
    symbole: 'CHF',
    libelle: 'Franc suisse (CHF)',
    decimales: 2,
    pivot_htg_par_unite: 150,
  },
  XOF: {
    code: 'XOF',
    symbole: 'FCFA',
    libelle: 'Franc CFA UEMOA (XOF)',
    decimales: 0,
    pivot_htg_par_unite: 0.218,
  },
  XAF: {
    code: 'XAF',
    symbole: 'FCFA',
    libelle: 'Franc CFA CEMAC (XAF)',
    decimales: 0,
    pivot_htg_par_unite: 0.218,
  },
  MAD: {
    code: 'MAD',
    symbole: 'DH',
    libelle: 'Dirham marocain (MAD)',
    decimales: 2,
    pivot_htg_par_unite: 13.3,
  },
  BRL: {
    code: 'BRL',
    symbole: 'R$',
    libelle: 'Real brésilien (BRL)',
    decimales: 2,
    pivot_htg_par_unite: 23.5,
  },
  HTG: {
    code: 'HTG',
    symbole: 'HTG',
    libelle: 'Gourde haïtienne (HTG)',
    decimales: 0,
    pivot_htg_par_unite: 1,
  },
};

export interface JourFerie {
  date: string;
  libelle: string;
}

export interface ValidationTelephonePays {
  longueurs_locales: number[];
  exemple_local: string;
  format_masque: string;
}

export interface ProfilPays {
  code: CodePays;
  nom: string;
  indicatif_telephonique: string;
  validation_telephone: ValidationTelephonePays;
  ville_defaut: string;
  fuseau_horaire: string;
  devise_defaut: CodeDevise;
  autorite_tutelle: string;
  echelle_notation_defaut: 10 | 20 | 100;
  note_passage_defaut: number;
  modes_paiement_preferes: string[];
  jours_feries: JourFerie[];
}

export const INDICATIFS_INTERNATIONAUX: { indicatif: string; pays: string; longueurs: number[] }[] = [
  { indicatif: '+216', pays: 'Tunisie (+216)', longueurs: [8] },
  { indicatif: '+213', pays: 'Algérie (+213)', longueurs: [9] },
  { indicatif: '+243', pays: 'RD Congo (+243)', longueurs: [9] },
  { indicatif: '+229', pays: 'Bénin (+229)', longueurs: [8, 10] },
  { indicatif: '+228', pays: 'Togo (+228)', longueurs: [8] },
  { indicatif: '+226', pays: 'Burkina Faso (+226)', longueurs: [8] },
  { indicatif: '+223', pays: 'Mali (+223)', longueurs: [8] },
  { indicatif: '+261', pays: 'Madagascar (+261)', longueurs: [9] },
  { indicatif: '+241', pays: 'Gabon (+241)', longueurs: [7, 8] },
  { indicatif: '+242', pays: 'Congo (+242)', longueurs: [9] },
  { indicatif: '+39', pays: 'Italie (+39)', longueurs: [9, 10] },
  { indicatif: '+351', pays: 'Portugal (+351)', longueurs: [9] },
  { indicatif: '+31', pays: 'Pays-Bas (+31)', longueurs: [9] },
  { indicatif: '+352', pays: 'Luxembourg (+352)', longueurs: [8, 9] },
  { indicatif: '+52', pays: 'Mexique (+52)', longueurs: [10] },
  { indicatif: '+57', pays: 'Colombie (+57)', longueurs: [10] },
  { indicatif: '+81', pays: 'Japon (+81)', longueurs: [9, 10] },
  { indicatif: '+61', pays: 'Australie (+61)', longueurs: [9] },
  { indicatif: '+971', pays: 'Émirats arabes unis (+971)', longueurs: [9] },
];

export const PROFILS_PAYS: Record<CodePays, ProfilPays> = {
  FR: {
    code: 'FR',
    nom: 'France',
    indicatif_telephonique: '+33',
    validation_telephone: { longueurs_locales: [9], exemple_local: '6 12 34 56 78', format_masque: '9 chiffres sans le 0 initial' },
    ville_defaut: 'Paris',
    fuseau_horaire: 'Europe/Paris (UTC+1)',
    devise_defaut: 'EUR',
    autorite_tutelle: 'Ministère Éducation Nationale / MESR / France Compétences',
    echelle_notation_defaut: 20,
    note_passage_defaut: 10,
    modes_paiement_preferes: [
      'Carte bancaire (Stripe/Visa)',
      'Virement bancaire (SEPA/SWIFT)',
      'Chèque',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'Jour de l’An' },
      { date: '1er mai', libelle: 'Fête du Travail' },
      { date: '8 mai', libelle: 'Victoire 1945' },
      { date: '14 juillet', libelle: 'Fête Nationale' },
      { date: '1er novembre', libelle: 'Toussaint' },
      { date: '11 novembre', libelle: 'Armistice 1918' },
    ],
  },
  CA: {
    code: 'CA',
    nom: 'Canada / Québec',
    indicatif_telephonique: '+1',
    validation_telephone: { longueurs_locales: [10], exemple_local: '514 555 0190', format_masque: '10 chiffres (indicatif régional + numéro)' },
    ville_defaut: 'Montréal',
    fuseau_horaire: 'America/Toronto (UTC-5)',
    devise_defaut: 'CAD',
    autorite_tutelle: 'MEQ / MES (Ministère de l’Éducation)',
    echelle_notation_defaut: 100,
    note_passage_defaut: 60,
    modes_paiement_preferes: [
      'Carte bancaire (Stripe/Visa)',
      'Virement bancaire (SEPA/SWIFT)',
      'Chèque',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'Jour de l’An' },
      { date: 'Lundi avant le 25 mai', libelle: 'Journée nationale des Patriotes' },
      { date: '24 juin', libelle: 'Fête nationale du Québec' },
      { date: '1er juillet', libelle: 'Fête du Canada' },
      { date: '1er lundi de sept.', libelle: 'Fête du Travail' },
      { date: '2e lundi d’oct.', libelle: 'Action de grâce' },
    ],
  },
  US: {
    code: 'US',
    nom: 'États-Unis',
    indicatif_telephonique: '+1',
    validation_telephone: { longueurs_locales: [10], exemple_local: '212 555 0140', format_masque: '10 chiffres (area code + 7 digits)' },
    ville_defaut: 'New York',
    fuseau_horaire: 'America/New_York (UTC-5)',
    devise_defaut: 'USD',
    autorite_tutelle: 'US Dept. of Education / IB / AACSB',
    echelle_notation_defaut: 100,
    note_passage_defaut: 70,
    modes_paiement_preferes: [
      'Carte bancaire (Stripe/Visa)',
      'Virement bancaire (SEPA/SWIFT)',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'New Year’s Day' },
      { date: '3e lundi de janv.', libelle: 'Martin Luther King Jr. Day' },
      { date: 'Dernier lundi de mai', libelle: 'Memorial Day' },
      { date: '4 juillet', libelle: 'Independence Day' },
      { date: '4e jeudi de nov.', libelle: 'Thanksgiving' },
    ],
  },
  GB: {
    code: 'GB',
    nom: 'Royaume-Uni',
    indicatif_telephonique: '+44',
    validation_telephone: { longueurs_locales: [10], exemple_local: '7700 900123', format_masque: '10 chiffres sans le 0 initial' },
    ville_defaut: 'Londres',
    fuseau_horaire: 'Europe/London (UTC+0)',
    devise_defaut: 'GBP',
    autorite_tutelle: 'DfE / Office for Students (OfS)',
    echelle_notation_defaut: 100,
    note_passage_defaut: 50,
    modes_paiement_preferes: [
      'Carte bancaire (Stripe/Visa)',
      'Virement bancaire (SEPA/SWIFT)',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'New Year’s Day' },
      { date: '1er lundi de mai', libelle: 'Early May Bank Holiday' },
      { date: 'Dernier lundi d’août', libelle: 'Summer Bank Holiday' },
      { date: '25 décembre', libelle: 'Christmas Day' },
    ],
  },
  BE: {
    code: 'BE',
    nom: 'Belgique',
    indicatif_telephonique: '+32',
    validation_telephone: { longueurs_locales: [8, 9], exemple_local: '470 12 34 56', format_masque: '8 ou 9 chiffres sans le 0 initial' },
    ville_defaut: 'Bruxelles',
    fuseau_horaire: 'Europe/Brussels (UTC+1)',
    devise_defaut: 'EUR',
    autorite_tutelle: 'Fédération Wallonie-Bruxelles / ARES / Vlaams Ministerie',
    echelle_notation_defaut: 20,
    note_passage_defaut: 10,
    modes_paiement_preferes: [
      'Virement bancaire (SEPA/SWIFT)',
      'Carte bancaire (Stripe/Visa)',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'Nouvel An' },
      { date: '1er mai', libelle: 'Fête du Travail' },
      { date: '21 juillet', libelle: 'Fête nationale belge' },
      { date: '15 août', libelle: 'Assomption' },
      { date: '11 novembre', libelle: 'Armistice' },
    ],
  },
  CH: {
    code: 'CH',
    nom: 'Suisse',
    indicatif_telephonique: '+41',
    validation_telephone: { longueurs_locales: [9], exemple_local: '79 123 45 67', format_masque: '9 chiffres sans le 0 initial' },
    ville_defaut: 'Genève',
    fuseau_horaire: 'Europe/Zurich (UTC+1)',
    devise_defaut: 'CHF',
    autorite_tutelle: 'CDIP / SEFRI',
    echelle_notation_defaut: 10,
    note_passage_defaut: 6,
    modes_paiement_preferes: [
      'Virement bancaire (SEPA/SWIFT)',
      'Carte bancaire (Stripe/Visa)',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'Nouvel An' },
      { date: '1er août', libelle: 'Fête nationale suisse' },
      { date: '25 décembre', libelle: 'Noël' },
    ],
  },
  ES: {
    code: 'ES',
    nom: 'Espagne',
    indicatif_telephonique: '+34',
    validation_telephone: { longueurs_locales: [9], exemple_local: '612 34 56 78', format_masque: '9 chiffres' },
    ville_defaut: 'Madrid',
    fuseau_horaire: 'Europe/Madrid (UTC+1)',
    devise_defaut: 'EUR',
    autorite_tutelle: 'Ministerio de Educación / ANECA',
    echelle_notation_defaut: 10,
    note_passage_defaut: 5,
    modes_paiement_preferes: [
      'Carte bancaire (Stripe/Visa)',
      'Virement bancaire (SEPA/SWIFT)',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'Año Nuevo' },
      { date: '1er mai', libelle: 'Día del Trabajador' },
      { date: '12 octobre', libelle: 'Fiesta Nacional de España' },
      { date: '6 décembre', libelle: 'Día de la Constitución' },
    ],
  },
  DE: {
    code: 'DE',
    nom: 'Allemagne',
    indicatif_telephonique: '+49',
    validation_telephone: { longueurs_locales: [10, 11], exemple_local: '151 12345678', format_masque: '10 ou 11 chiffres sans le 0 initial' },
    ville_defaut: 'Berlin',
    fuseau_horaire: 'Europe/Berlin (UTC+1)',
    devise_defaut: 'EUR',
    autorite_tutelle: 'KMK / BMBF',
    echelle_notation_defaut: 100,
    note_passage_defaut: 50,
    modes_paiement_preferes: [
      'Virement bancaire (SEPA/SWIFT)',
      'Carte bancaire (Stripe/Visa)',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'Neujahr' },
      { date: '1er mai', libelle: 'Tag der Arbeit' },
      { date: '3 octobre', libelle: 'Tag der Deutschen Einheit' },
      { date: '25 décembre', libelle: 'Weihnachtstag' },
    ],
  },
  SN: {
    code: 'SN',
    nom: 'Sénégal',
    indicatif_telephonique: '+221',
    validation_telephone: { longueurs_locales: [9], exemple_local: '77 123 45 67', format_masque: '9 chiffres (ex: 77 / 33 ...)' },
    ville_defaut: 'Dakar',
    fuseau_horaire: 'Africa/Dakar (UTC+0)',
    devise_defaut: 'XOF',
    autorite_tutelle: 'MEN / MESRI / CAMES',
    echelle_notation_defaut: 20,
    note_passage_defaut: 10,
    modes_paiement_preferes: [
      'Mobile Money (Orange/Wave/M-Pesa)',
      'Virement bancaire (SEPA/SWIFT)',
      'Espèces',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'Jour de l’An' },
      { date: '4 avril', libelle: 'Fête de l’Indépendance du Sénégal' },
      { date: '1er mai', libelle: 'Fête du Travail' },
      { date: '15 août', libelle: 'Assomption' },
      { date: 'Variable (Lunaire)', libelle: 'Korité (Aïd el-Fitr) & Tabaski' },
    ],
  },
  CI: {
    code: 'CI',
    nom: 'Côte d’Ivoire',
    indicatif_telephonique: '+225',
    validation_telephone: { longueurs_locales: [10], exemple_local: '07 12 34 56 78', format_masque: '10 chiffres (numérotation à 10 chiffres)' },
    ville_defaut: 'Abidjan',
    fuseau_horaire: 'Africa/Abidjan (UTC+0)',
    devise_defaut: 'XOF',
    autorite_tutelle: 'MENA / MESRS / CAMES',
    echelle_notation_defaut: 20,
    note_passage_defaut: 10,
    modes_paiement_preferes: [
      'Mobile Money (Orange/Wave/M-Pesa)',
      'Virement bancaire (SEPA/SWIFT)',
      'Espèces',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'Jour de l’An' },
      { date: '1er mai', libelle: 'Fête du Travail' },
      { date: '7 août', libelle: 'Fête de l’Indépendance' },
      { date: '15 novembre', libelle: 'Journée Nationale de la Paix' },
    ],
  },
  CM: {
    code: 'CM',
    nom: 'Cameroun',
    indicatif_telephonique: '+237',
    validation_telephone: { longueurs_locales: [9], exemple_local: '677 12 34 56', format_masque: '9 chiffres' },
    ville_defaut: 'Yaoundé',
    fuseau_horaire: 'Africa/Douala (UTC+1)',
    devise_defaut: 'XAF',
    autorite_tutelle: 'MINESEC / MINESUP / CAMES',
    echelle_notation_defaut: 20,
    note_passage_defaut: 10,
    modes_paiement_preferes: [
      'Mobile Money (Orange/Wave/M-Pesa)',
      'Virement bancaire (SEPA/SWIFT)',
      'Espèces',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'Jour de l’An' },
      { date: '11 février', libelle: 'Fête de la Jeunesse' },
      { date: '1er mai', libelle: 'Fête du Travail' },
      { date: '20 mai', libelle: 'Fête Nationale' },
    ],
  },
  MA: {
    code: 'MA',
    nom: 'Maroc',
    indicatif_telephonique: '+212',
    validation_telephone: { longueurs_locales: [9], exemple_local: '612 34 56 78', format_masque: '9 chiffres sans le 0 initial' },
    ville_defaut: 'Casablanca',
    fuseau_horaire: 'Africa/Casablanca (UTC+1)',
    devise_defaut: 'MAD',
    autorite_tutelle: 'MENPS / MESRSI / OFPPT',
    echelle_notation_defaut: 20,
    note_passage_defaut: 10,
    modes_paiement_preferes: [
      'Carte bancaire (Stripe/Visa)',
      'Virement bancaire (SEPA/SWIFT)',
      'Chèque',
      'Espèces',
    ],
    jours_feries: [
      { date: '11 janvier', libelle: 'Manifeste de l’Indépendance' },
      { date: '1er mai', libelle: 'Fête du Travail' },
      { date: '30 juillet', libelle: 'Fête du Trône' },
      { date: '20 août', libelle: 'Révolution du Roi et du Peuple' },
      { date: '6 novembre', libelle: 'Marche Verte' },
      { date: '18 novembre', libelle: 'Fête de l’Indépendance' },
    ],
  },
  BR: {
    code: 'BR',
    nom: 'Brésil',
    indicatif_telephonique: '+55',
    validation_telephone: { longueurs_locales: [10, 11], exemple_local: '11 98765 4321', format_masque: '10 ou 11 chiffres (DDD + numéro)' },
    ville_defaut: 'São Paulo',
    fuseau_horaire: 'America/Sao_Paulo (UTC-3)',
    devise_defaut: 'BRL',
    autorite_tutelle: 'MEC (Ministério da Educação)',
    echelle_notation_defaut: 10,
    note_passage_defaut: 6,
    modes_paiement_preferes: [
      'Carte bancaire (Stripe/Visa)',
      'Virement bancaire (SEPA/SWIFT)',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'Confraternização Universal' },
      { date: '1er mai', libelle: 'Dia do Trabalho' },
      { date: '7 septembre', libelle: 'Independência do Brasil' },
      { date: '15 novembre', libelle: 'Proclamação da República' },
    ],
  },
  HT: {
    code: 'HT',
    nom: 'Haïti',
    indicatif_telephonique: '+509',
    validation_telephone: { longueurs_locales: [8], exemple_local: '3712 4567', format_masque: '8 chiffres exactement' },
    ville_defaut: 'Port-au-Prince',
    fuseau_horaire: 'America/Port-au-Prince (UTC-5)',
    devise_defaut: 'HTG',
    autorite_tutelle: 'MENFP / INFP',
    echelle_notation_defaut: 10,
    note_passage_defaut: 5,
    modes_paiement_preferes: [
      'MonCash',
      'NatCash',
      'Espèces',
      'Virement bancaire (SEPA/SWIFT)',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'Jour de l’Indépendance d’Haïti' },
      { date: '2 janvier', libelle: 'Jour des Aïeux' },
      { date: '1er mai', libelle: 'Fête de l’Agriculture et du Travail' },
      { date: '18 mai', libelle: 'Fête du Drapeau et de l’Université (Arcahaie)' },
      { date: '17 octobre', libelle: 'Anniversaire de la mort de Dessalines' },
      { date: '18 novembre', libelle: 'Bataille de Vertières' },
    ],
  },
  INTL: {
    code: 'INTL',
    nom: 'Autre pays (Monde / International)',
    indicatif_telephonique: '+216',
    validation_telephone: { longueurs_locales: [7, 8, 9, 10, 11, 12], exemple_local: '20 123 456', format_masque: '7 à 12 chiffres locaux (max 15 chiffres E.164)' },
    ville_defaut: 'Campus International',
    fuseau_horaire: 'UTC',
    devise_defaut: 'USD',
    autorite_tutelle: 'Autorité nationale / IB / ISO 21001',
    echelle_notation_defaut: 100,
    note_passage_defaut: 60,
    modes_paiement_preferes: [
      'Carte bancaire (Stripe/Visa)',
      'Virement bancaire (SEPA/SWIFT)',
      'Mobile Money (Orange/Wave/M-Pesa)',
      'Espèces',
    ],
    jours_feries: [
      { date: '1er janvier', libelle: 'Nouvel An international' },
      { date: '1er mai', libelle: 'Journée internationale des travailleurs' },
      { date: '5 octobre', libelle: 'Journée mondiale des enseignants (UNESCO)' },
    ],
  },
};

export const TOUTES_LES_DEVISES: CodeDevise[] = [
  'USD',
  'EUR',
  'CAD',
  'GBP',
  'CHF',
  'XOF',
  'XAF',
  'MAD',
  'BRL',
  'HTG',
];

export const TOUS_LES_PAYS: CodePays[] = [
  'FR',
  'CA',
  'US',
  'GB',
  'BE',
  'CH',
  'ES',
  'DE',
  'SN',
  'CI',
  'CM',
  'MA',
  'BR',
  'HT',
  'INTL',
];
