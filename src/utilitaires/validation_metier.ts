import { INDICATIFS_INTERNATIONAUX, PROFILS_PAYS } from '../configuration/regions_devises';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  Apprenant,
  CodePays,
  ConfigurationEtablissement,
  InscriptionApprenant,
  PaiementEnregistre,
  UniteAcademique,
} from '../modeles/erp';

export function valider_courriel(courriel: string): boolean {
  const propre = (courriel || '').trim();
  if (!propre || propre.length > 180) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(propre);
}

export function valider_fuseau_iana(fuseau: string): boolean {
  const propre = (fuseau || '').trim();
  if (!propre) return false;
  if (propre.toUpperCase() === 'UTC') return true;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: propre });
    return true;
  } catch {
    return false;
  }
}

export function obtenir_modes_paiement_pays(
  code_pays: CodePays
): PaiementEnregistre['mode_paiement'][] {
  const profil = PROFILS_PAYS[code_pays] ?? PROFILS_PAYS.INTL;
  const preferes = profil.modes_paiement_preferes as PaiementEnregistre['mode_paiement'][];
  const universels: PaiementEnregistre['mode_paiement'][] = [
    'Carte bancaire (Stripe/Visa)',
    'Virement bancaire (SEPA/SWIFT)',
    'Mobile Money (Orange/Wave/M-Pesa)',
    'Chèque',
    'Espèces',
  ];
  const specifiques_haiti: PaiementEnregistre['mode_paiement'][] =
    code_pays === 'HT' ? ['MonCash', 'NatCash'] : [];
  return Array.from(new Set([...preferes, ...specifiques_haiti, ...universels]));
}

export interface ResultatValidationTelephone {
  valide: boolean;
  erreur?: string;
  indicatif: string;
  numero_local_chiffres: string;
  numero_normalise: string;
  longueurs_autorisees: number[];
}

export function obtenir_indicatif_verrouille(
  code_pays: CodePays,
  indicatif_intl_choisi?: string
): string {
  if (code_pays !== 'INTL') {
    return PROFILS_PAYS[code_pays].indicatif_telephonique;
  }
  const match = INDICATIFS_INTERNATIONAUX.find((i) => i.indicatif === indicatif_intl_choisi);
  return match ? match.indicatif : INDICATIFS_INTERNATIONAUX[0].indicatif;
}

export function extraire_indicatif_et_local(
  telephone_complet: string,
  code_pays: CodePays
): { indicatif: string; local: string } {
  const propre = (telephone_complet || '').trim();
  if (code_pays !== 'INTL') {
    const indicatif = PROFILS_PAYS[code_pays].indicatif_telephonique;
    if (propre.startsWith(indicatif)) {
      return { indicatif, local: propre.slice(indicatif.length).trim() };
    }
    const chiffres_ind = indicatif.replace(/\D/g, '');
    const chiffres = propre.replace(/\D/g, '');
    if (chiffres.startsWith(chiffres_ind)) {
      return { indicatif, local: chiffres.slice(chiffres_ind.length) };
    }
    return { indicatif, local: propre };
  }
  const match_intl = INDICATIFS_INTERNATIONAUX.find((item) => propre.startsWith(item.indicatif));
  if (match_intl) {
    return {
      indicatif: match_intl.indicatif,
      local: propre.slice(match_intl.indicatif.length).trim(),
    };
  }
  return { indicatif: INDICATIFS_INTERNATIONAUX[0].indicatif, local: propre };
}

export function formater_numero_local(chiffres: string): string {
  const brut = chiffres.replace(/\D/g, '');
  if (brut.length <= 4) return brut;
  if (brut.length === 8) return `${brut.slice(0, 4)} ${brut.slice(4)}`;
  if (brut.length === 9) return `${brut.slice(0, 1)} ${brut.slice(1, 3)} ${brut.slice(3, 5)} ${brut.slice(5, 7)} ${brut.slice(7)}`;
  if (brut.length === 10) return `${brut.slice(0, 3)} ${brut.slice(3, 6)} ${brut.slice(6)}`;
  return brut.replace(/(.{3})/g, '$1 ').trim();
}

export function valider_telephone_pays(
  code_pays: CodePays,
  saisie: string,
  indicatif_intl_choisi?: string
): ResultatValidationTelephone {
  const profil = PROFILS_PAYS[code_pays] ?? PROFILS_PAYS.INTL;
  const indicatif_attendu =
    code_pays === 'INTL'
      ? obtenir_indicatif_verrouille(code_pays, indicatif_intl_choisi)
      : profil.indicatif_telephonique;
  const longueurs_autorisees = profil.validation_telephone.longueurs_locales;
  const brut = (saisie || '').trim();
  if (!brut) {
    return {
      valide: false,
      erreur: `Le numéro de téléphone est obligatoire (${profil.nom} : ${indicatif_attendu}).`,
      indicatif: indicatif_attendu,
      numero_local_chiffres: '',
      numero_normalise: indicatif_attendu,
      longueurs_autorisees,
    };
  }
  if (brut.startsWith('00')) {
    return {
      valide: false,
      erreur: `Ne saisissez pas de préfixe « 00 » : l'indicatif ${indicatif_attendu} est géré automatiquement.`,
      indicatif: indicatif_attendu,
      numero_local_chiffres: '',
      numero_normalise: brut,
      longueurs_autorisees,
    };
  }
  const numero_parse = parsePhoneNumberFromString(
    brut.startsWith('+') ? brut : `${indicatif_attendu}${brut.replace(/\D/g, '')}`,
    code_pays as Parameters<typeof parsePhoneNumberFromString>[1]
  );
  if (!numero_parse || !numero_parse.isPossible()) {
    return {
      valide: false,
      erreur: `Format de téléphone invalide pour ${profil.nom} (${indicatif_attendu}).`,
      indicatif: indicatif_attendu,
      numero_local_chiffres: brut.replace(/\D/g, ''),
      numero_normalise: numero_parse?.formatInternational() ?? brut,
      longueurs_autorisees,
    };
  }
  if (numero_parse.country && numero_parse.country !== code_pays) {
    return {
      valide: false,
      erreur: `Indicatif incohérent : pour ${profil.nom}, l'indicatif est verrouillé sur ${indicatif_attendu}.`,
      indicatif: indicatif_attendu,
      numero_local_chiffres: '',
      numero_normalise: numero_parse.formatInternational(),
      longueurs_autorisees,
    };
  }
  return {
    valide: true,
    indicatif: indicatif_attendu,
    numero_local_chiffres: numero_parse.nationalNumber.toString(),
    numero_normalise: numero_parse.formatInternational(),
    longueurs_autorisees,
  };
}

export function calculer_bulletin_paie(
  salaire_base_htg: number,
  primes_htg: number,
  retenues_htg: number
): {
  valide: boolean;
  erreur?: string;
  salaire_base_htg: number;
  primes_htg: number;
  montant_brut_htg: number;
  retenues_htg: number;
  montant_net_htg: number;
} {
  const base = Number.isFinite(salaire_base_htg) ? Math.max(0, salaire_base_htg) : 0;
  const primes = Number.isFinite(primes_htg) ? Math.max(0, primes_htg) : 0;
  const retenues = Number.isFinite(retenues_htg) ? Math.max(0, retenues_htg) : 0;
  const brut = Math.round((base + primes) * 100) / 100;
  if (brut <= 0) {
    return {
      valide: false,
      erreur: 'Le salaire de base ou le montant brut doit être supérieur à 0.',
      salaire_base_htg: base,
      primes_htg: primes,
      montant_brut_htg: brut,
      retenues_htg: retenues,
      montant_net_htg: 0,
    };
  }
  if (retenues > brut) {
    return {
      valide: false,
      erreur: 'Les retenues ne peuvent pas dépasser le salaire brut.',
      salaire_base_htg: base,
      primes_htg: primes,
      montant_brut_htg: brut,
      retenues_htg: retenues,
      montant_net_htg: 0,
    };
  }
  return {
    valide: true,
    salaire_base_htg: base,
    primes_htg: primes,
    montant_brut_htg: brut,
    retenues_htg: retenues,
    montant_net_htg: Math.round((brut - retenues) * 100) / 100,
  };
}

export function construire_inscriptions_initiales(
  apprenants: Apprenant[],
  unites: UniteAcademique[],
  etablissements: ConfigurationEtablissement[]
): InscriptionApprenant[] {
  return apprenants.map((a, idx) => {
    const etab = etablissements.find((e) => e.id === a.id_etablissement);
    const unite = unites.find((u) => u.id === a.id_unite);
    const bourse = a.pourcentage_bourse ?? 0;
    const brut_unite = unite
      ? unite.frais_inscription_htg + unite.frais_scolarite_htg
      : a.total_du_htg;
    const net = a.total_du_htg;
    return {
      id: `ins-init-${a.id}`,
      id_etablissement: a.id_etablissement,
      id_apprenant: a.id,
      numero_inscription: `INS-${etab?.code ?? 'ETB'}-2026-${String(idx + 1).padStart(4, '0')}`,
      annee_academique: etab?.annee_academique ?? '2026-2027',
      libelle_periode: etab?.libelle_periode_courante ?? 'Session Principale',
      id_unite: a.id_unite,
      libelle_niveau: a.libelle_niveau,
      type_inscription: 'NOUVELLE',
      date_inscription: a.date_inscription,
      statut_inscription: 'VALIDEE',
      montant_brut_htg: brut_unite > 0 ? brut_unite : net,
      pourcentage_bourse: bourse,
      montant_net_htg: net,
      pieces_fournies: a.dossier_complet
        ? ['Acte de naissance / Pièce ID', 'Relevé / Diplôme antérieur', 'Photo d’identité']
        : ['Pièce d’identité'],
      cree_le: a.date_inscription,
    };
  });
}
