import { CATALOGUE_DEVISES } from '../configuration/regions_devises';
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
  Apprenant,
  CodeDevise,
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

/**
 * Couche d'accès aux données (Data Access Layer).
 * Toutes les requêtes filtrent strictement par `id_etablissement` afin de reproduire
 * l'isolation multi-établissements d'une base PostgreSQL (RLS / `WHERE id_etablissement = $1`).
 */
export const service_donnees = {
  obtenir_etablissements(): ConfigurationEtablissement[] {
    return ETABLISSEMENTS_INITIAUX;
  },

  obtenir_etablissement_par_id(id_etablissement: string): ConfigurationEtablissement {
    return (
      ETABLISSEMENTS_INITIAUX.find((e) => e.id === id_etablissement) ?? ETABLISSEMENTS_INITIAUX[0]
    );
  },

  obtenir_utilisateurs(): CompteUtilisateur[] {
    return UTILISATEURS_INITIAUX;
  },

  obtenir_utilisateurs_par_etablissement(id_etablissement: string): CompteUtilisateur[] {
    return UTILISATEURS_INITIAUX.filter((u) =>
      u.affiliations.some((a) => a.id_etablissement === id_etablissement)
    );
  },

  obtenir_unites_par_etablissement(id_etablissement: string): UniteAcademique[] {
    return UNITES_INITIALES.filter((u) => u.id_etablissement === id_etablissement);
  },

  obtenir_elements_par_etablissement(id_etablissement: string): ElementPedagogique[] {
    return ELEMENTS_PEDAGOGIQUES_INITIAUX.filter((e) => e.id_etablissement === id_etablissement);
  },

  obtenir_apprenants_par_etablissement(id_etablissement: string): Apprenant[] {
    return APPRENANTS_INITIAUX.filter((a) => a.id_etablissement === id_etablissement);
  },

  obtenir_enseignants_par_etablissement(id_etablissement: string): PersonnelEnseignant[] {
    return ENSEIGNANTS_INITIAUX.filter((e) => e.id_etablissement === id_etablissement);
  },

  obtenir_paiements_par_etablissement(id_etablissement: string): PaiementEnregistre[] {
    return PAIEMENTS_INITIAUX.filter((p) => p.id_etablissement === id_etablissement);
  },

  obtenir_notes_par_etablissement(id_etablissement: string): NoteEvaluation[] {
    return NOTES_INITIALES.filter((n) => n.id_etablissement === id_etablissement);
  },

  obtenir_presences_par_etablissement(id_etablissement: string): PresenceEnregistree[] {
    return PRESENCES_INITIALES.filter((p) => p.id_etablissement === id_etablissement);
  },

  obtenir_emplois_du_temps_par_etablissement(id_etablissement: string): CreneauEmploiDuTemps[] {
    return EMPLOIS_DU_TEMPS_INITIAUX.filter((c) => c.id_etablissement === id_etablissement);
  },

  obtenir_documents_par_etablissement(id_etablissement: string): DocumentOfficielEmis[] {
    return DOCUMENTS_INITIAUX.filter((d) => d.id_etablissement === id_etablissement);
  },

  obtenir_partenaires_par_etablissement(id_etablissement: string): PartenaireStage[] {
    return PARTENAIRES_INITIAUX.filter((p) => p.id_etablissement === id_etablissement);
  },

  obtenir_journaux_audit_par_etablissement(id_etablissement: string): EntreeJournalAudit[] {
    return JOURNAUX_AUDIT_INITIAUX.filter((j) => j.id_etablissement === id_etablissement);
  },

  obtenir_notifications_par_etablissement(id_etablissement: string): NotificationSysteme[] {
    return NOTIFICATIONS_INITIALES.filter((n) => n.id_etablissement === id_etablissement);
  },
};

export function obtenir_facteur_pivot_devise(
  devise: CodeDevise,
  taux_change_usd = 132
): number {
  const metadonnees = CATALOGUE_DEVISES[devise] ?? CATALOGUE_DEVISES.USD;
  if (devise === 'USD') {
    return taux_change_usd > 0 ? taux_change_usd : 132;
  }
  return metadonnees.pivot_htg_par_unite;
}

export function convertir_pivot_vers_devise(
  montant_pivot_htg: number,
  devise: CodeDevise,
  taux_change_usd = 132
): number {
  const facteur = obtenir_facteur_pivot_devise(devise, taux_change_usd);
  const metadonnees = CATALOGUE_DEVISES[devise] ?? CATALOGUE_DEVISES.USD;
  const brut = montant_pivot_htg / facteur;
  if (metadonnees.decimales === 0) return Math.round(brut);
  return Number(brut.toFixed(metadonnees.decimales));
}

export function convertir_devise_vers_pivot(
  montant_dans_devise: number,
  devise: CodeDevise,
  taux_change_usd = 132
): number {
  const facteur = obtenir_facteur_pivot_devise(devise, taux_change_usd);
  return Math.round(montant_dans_devise * facteur);
}

export function formater_montant(
  montant_pivot_htg: number,
  devise: CodeDevise,
  taux_change_usd = 132,
  locale = 'fr-FR'
): string {
  const metadonnees = CATALOGUE_DEVISES[devise] ?? CATALOGUE_DEVISES.USD;
  const facteur = obtenir_facteur_pivot_devise(devise, taux_change_usd);
  const montant_converti = montant_pivot_htg / facteur;

  if (metadonnees.decimales === 0) {
    return `${Math.round(montant_converti).toLocaleString(locale)} ${metadonnees.symbole}`;
  }

  return `${montant_converti.toLocaleString(locale, {
    minimumFractionDigits: metadonnees.decimales,
    maximumFractionDigits: metadonnees.decimales,
  })} ${metadonnees.symbole}`;
}

export function formater_date_fr(date_iso: string, locale = 'fr-FR'): string {
  const morceaux = date_iso.split('-');
  if (morceaux.length !== 3) return date_iso;
  const date = new Date(Number(morceaux[0]), Number(morceaux[1]) - 1, Number(morceaux[2]));
  if (Number.isNaN(date.getTime())) return date_iso;
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function calculer_indicateurs_etablissement(id_etablissement: string) {
  const apprenants = service_donnees.obtenir_apprenants_par_etablissement(id_etablissement);
  const unites = service_donnees.obtenir_unites_par_etablissement(id_etablissement);
  const enseignants = service_donnees.obtenir_enseignants_par_etablissement(id_etablissement);
  const elements = service_donnees.obtenir_elements_par_etablissement(id_etablissement);

  const total_du = apprenants.reduce((somme, a) => somme + a.total_du_htg, 0);
  const total_paye = apprenants.reduce((somme, a) => somme + a.total_paye_htg, 0);
  const taux_recouvrement = total_du > 0 ? Math.round((total_paye / total_du) * 100) : 0;
  const nombre_en_retard = apprenants.filter((a) => a.statut_paiement === 'EN_RETARD').length;
  const nombre_dossiers_incomplets = apprenants.filter((a) => !a.dossier_complet).length;
  const assiduite_moyenne =
    apprenants.length > 0
      ? Math.round(apprenants.reduce((somme, a) => somme + a.taux_assiduite, 0) / apprenants.length)
      : 0;
  const note_moyenne =
    apprenants.length > 0
      ? Number(
          (apprenants.reduce((somme, a) => somme + a.moyenne_generale, 0) / apprenants.length).toFixed(1)
        )
      : 0;

  return {
    nombre_apprenants: apprenants.length,
    nombre_unites: unites.length,
    nombre_enseignants: enseignants.length,
    nombre_elements: elements.length,
    total_du_htg: total_du,
    total_paye_htg: total_paye,
    reste_a_payer_htg: total_du - total_paye,
    taux_recouvrement,
    nombre_en_retard,
    nombre_dossiers_incomplets,
    assiduite_moyenne,
    note_moyenne,
  };
}
