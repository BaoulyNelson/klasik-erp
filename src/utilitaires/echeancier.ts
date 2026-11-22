import { CodePays, CompteBancaire, EcheancePaiement } from '../modeles/erp';

export function construire_echeancier_defaut(
  total_du_htg: number,
  total_paye_htg: number,
  date_inscription?: string,
  frais_inscription_htg?: number
): EcheancePaiement[] {
  const date_base = date_inscription
    ? new Date(`${date_inscription}T12:00:00`)
    : new Date('2026-09-01T12:00:00');
  const ajouter_jours = (jours: number) => {
    const d = new Date(date_base.getTime() + jours * 86400000);
    return d.toISOString().slice(0, 10);
  };

  const total = Math.max(0, Math.round(total_du_htg));
  const part_inscription =
    frais_inscription_htg && frais_inscription_htg > 0 && frais_inscription_htg < total * 0.45
      ? Math.round(frais_inscription_htg)
      : Math.round(total * 0.25);

  const reste = Math.max(0, total - part_inscription);
  const tranche_1 = Math.round(reste * 0.4);
  const tranche_2 = Math.round(reste * 0.35);
  const tranche_3 = Math.max(0, reste - tranche_1 - tranche_2);

  const tranches_brutes = [
    { id: 'inst-0', libelle: 'Inscription & Dossier', date_echeance: ajouter_jours(0), montant_du_htg: part_inscription },
    { id: 'inst-1', libelle: '1ère Tranche (Scolarité)', date_echeance: ajouter_jours(30), montant_du_htg: tranche_1 },
    { id: 'inst-2', libelle: '2ème Tranche (Mi-session)', date_echeance: ajouter_jours(90), montant_du_htg: tranche_2 },
    { id: 'inst-3', libelle: '3ème Tranche (Solde final)', date_echeance: ajouter_jours(150), montant_du_htg: tranche_3 },
  ].filter((tranche) => tranche.montant_du_htg > 0);

  return recalculer_repartition_echeancier(tranches_brutes, total_paye_htg);
}

export function recalculer_repartition_echeancier(
  tranches: { id: string; libelle: string; date_echeance: string; montant_du_htg: number }[],
  total_paye_htg: number
): EcheancePaiement[] {
  let solde_disponible = Math.max(0, Math.round(total_paye_htg));
  const date_jour = new Date().toISOString().slice(0, 10);

  return tranches.map((tranche) => {
    const montant_affecte = Math.min(tranche.montant_du_htg, solde_disponible);
    solde_disponible = Math.max(0, solde_disponible - montant_affecte);
    const est_payee = montant_affecte >= tranche.montant_du_htg;
    const est_en_retard = !est_payee && tranche.date_echeance < date_jour;
    const statut: EcheancePaiement['statut'] = est_payee
      ? 'PAYEE'
      : est_en_retard
        ? 'EN_RETARD'
        : montant_affecte > 0
          ? 'PARTIELLE'
          : 'A_PAYER';

    return {
      id: tranche.id,
      libelle: tranche.libelle,
      date_echeance: tranche.date_echeance,
      montant_du_htg: tranche.montant_du_htg,
      montant_paye_htg: montant_affecte,
      statut,
    };
  });
}

export function calculer_jours_retard_echeance(date_echeance: string): number {
  const aujourdhui = new Date();
  const echeance = new Date(`${date_echeance}T23:59:59`);
  const diff_ms = aujourdhui.getTime() - echeance.getTime();
  return diff_ms > 0 ? Math.floor(diff_ms / 86400000) : 0;
}

export function obtenir_comptes_bancaires_defaut_pays(
  code_pays: CodePays,
  nom_court: string,
  devise_defaut: CompteBancaire['devise']
): CompteBancaire[] {
  const banques_par_pays: Record<CodePays, string> = {
    FR: 'BNP Paribas — IBAN FR76',
    CA: 'Banque Nationale du Canada',
    US: 'JPMorgan Chase — Checking / ACH',
    GB: 'Barclays UK — Sort Code & IBAN',
    BE: 'KBC / BNP Paribas Fortis — IBAN BE',
    CH: 'UBS / PostFinance — IBAN CH',
    ES: 'Banco Santander — IBAN ES',
    DE: 'Deutsche Bank — IBAN DE',
    SN: 'CBAO Attijariwafa — Compte UEMOA',
    CI: 'Société Générale Côte d’Ivoire',
    CM: 'Afriland First Bank — CEMAC',
    MA: 'Attijariwafa Bank — RIB',
    BR: 'Banco do Brasil / Itaú — PIX',
    HT: 'Sogebank — Compte Courant',
    INTL: 'Compte Bancaire International (SWIFT / IBAN)',
  };

  const banque_principale = banques_par_pays[code_pays] ?? 'Compte Bancaire Principal';
  const numero_exemple =
    code_pays === 'FR' || code_pays === 'BE' || code_pays === 'ES' || code_pays === 'DE'
      ? `${code_pays}76 3000 4000 1234 5678`
      : code_pays === 'CH'
        ? 'CH93 0076 2011 6238 5295 7'
        : 'INTL-001-482910';

  return [
    {
      id: 'ba-cash-main',
      nom_banque: `Caisse Principale (${nom_court})`,
      numero_compte: 'CAISSE-01',
      devise: devise_defaut,
      titulaire: nom_court,
      par_defaut: true,
      actif: true,
    },
    {
      id: 'ba-bank-main',
      nom_banque: banque_principale,
      numero_compte: numero_exemple,
      devise: devise_defaut,
      titulaire: nom_court,
      par_defaut: false,
      actif: true,
    },
  ];
}
