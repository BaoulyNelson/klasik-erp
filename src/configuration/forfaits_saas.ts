import { ConfigurationEtablissement } from '../modeles/erp';

export type OffreSaas = ConfigurationEtablissement['offre_saas'];
export type StatutAbonnementSaas = NonNullable<
  ConfigurationEtablissement['statut_abonnement_saas']
>;

export interface DefinitionForfaitSaas {
  nom: OffreSaas;
  prix_mensuel_usd: number;
  libelle_prix: string;
  quota_apprenants: number | null;
  libelle_quota: string;
  badge?: string;
  recommande: boolean;
  description: string;
  sous_titre_court: string;
  inclus: string[];
}

export const CATALOGUE_FORFAITS_SAAS: DefinitionForfaitSaas[] = [
  {
    nom: 'Gratuit',
    prix_mensuel_usd: 0,
    libelle_prix: '0 $',
    quota_apprenants: 30,
    libelle_quota: 'Jusqu’à 30 apprenants',
    badge: 'Sans carte requise',
    recommande: false,
    description:
      'Pour démarrer librement sans engagement, tester la plateforme et gérer une petite cohorte.',
    sous_titre_court: '0 $/mois · Jusqu’à 30 apprenants',
    inclus: [
      'Tableau de bord, annuaire & Dossier 360°',
      'Notes, assiduité & bulletins de base',
      '100% isolé, passage aux offres pro à tout moment',
    ],
  },
  {
    nom: 'Essentiel',
    prix_mensuel_usd: 79,
    libelle_prix: '79 $',
    quota_apprenants: 300,
    libelle_quota: 'Jusqu’à 300 apprenants',
    recommande: false,
    description: 'Pour centres de formation et petites écoles (jusqu’à 300 apprenants).',
    sous_titre_court: '79 $/mois · Jusqu’à 300 apprenants',
    inclus: [
      'Tout Gratuit + Admissions complètes & cartes QR',
      'Assiduité hors-ligne, bulletins & relevés officiels',
      'Caisse, reçus QR & relances de scolarité',
    ],
  },
  {
    nom: 'Croissance',
    prix_mensuel_usd: 199,
    libelle_prix: '199 $',
    quota_apprenants: 2000,
    libelle_quota: 'Jusqu’à 2 000 apprenants',
    badge: 'Recommandé',
    recommande: true,
    description: 'Pour établissements scolaires complets et centres techniques multi-filières.',
    sous_titre_court: '199 $/mois · LMS, portails & multi-devises',
    inclus: [
      'Tout Essentiel + Portails Parents & Enseignants',
      'Campus Numérique (LMS), bibliothèque & stages',
      'Multi-devises & paiements Mobile Money / Stripe',
    ],
  },
  {
    nom: 'Institutionnel',
    prix_mensuel_usd: 449,
    libelle_prix: '449 $',
    quota_apprenants: null,
    libelle_quota: 'Apprenants illimités',
    recommande: false,
    description: 'Pour universités LMD, lycées internationaux et réseaux multi-campus.',
    sous_titre_court: '449 $/mois · LMD, multi-campus & tutelles',
    inclus: [
      'Crédits ECTS, GPA 4.0 & jurys de soutenance',
      'Mobilité internationale (visas) & Anciens',
      'Gestion des offres, abonnements et rapports de tutelle (MENFP, CAMES, IB)',
    ],
  },
];

export const TARIFS_MENSUELS_USD_SAAS: Record<OffreSaas, number> = {
  Gratuit: 0,
  Essentiel: 79,
  Croissance: 199,
  Institutionnel: 449,
};

export function obtenir_definition_forfait(offre: OffreSaas): DefinitionForfaitSaas {
  return (
    CATALOGUE_FORFAITS_SAAS.find((f) => f.nom === offre) ?? CATALOGUE_FORFAITS_SAAS[0]
  );
}

export function resoudre_statut_abonnement_saas(
  etablissement: Pick<ConfigurationEtablissement, 'offre_saas' | 'statut_abonnement_saas'>
): StatutAbonnementSaas {
  if (etablissement.offre_saas === 'Gratuit') return 'GRATUIT';
  return etablissement.statut_abonnement_saas ?? 'PAYE';
}

export function formater_statut_abonnement_saas(
  statut: StatutAbonnementSaas
): { libelle: string; classe_badge: string } {
  switch (statut) {
    case 'GRATUIT':
      return {
        libelle: 'Forfait Gratuit (0 $/mois)',
        classe_badge:
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
    case 'ESSAI_14J':
      return {
        libelle: 'Essai gratuit 14 j (non payé)',
        classe_badge:
          'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800',
      };
    case 'EN_ATTENTE_PAIEMENT':
      return {
        libelle: 'Paiement en attente',
        classe_badge:
          'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
      };
    case 'PAYE':
    default:
      return {
        libelle: 'Abonnement réglé & actif',
        classe_badge:
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };
  }
}
