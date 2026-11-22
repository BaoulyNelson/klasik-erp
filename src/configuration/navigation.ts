import {
  IdentifiantPermission,
  IdentifiantRoute,
  TypeEtablissement,
} from '../modeles/erp';
import { obtenir_terminologie } from './terminologie';

export interface ElementNavigation {
  id: IdentifiantRoute;
  libelle: string;
  groupe: 'SOCLE' | 'SCOLARITE_PEDAGOGIE' | 'GESTION' | 'PORTAILS';
  permission_requise: IdentifiantPermission;
  types_autorises: TypeEtablissement[] | 'TOUS';
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  nom_icone:
    | 'TableauDeBord'
    | 'Utilisateurs'
    | 'Couches'
    | 'Langues'
    | 'BouclierValidation'
    | 'AjoutUtilisateur'
    | 'ChapeauDiplome'
    | 'Calendrier'
    | 'Mallette'
    | 'Portefeuille'
    | 'PaieBadge'
    | 'DocumentTexte'
    | 'BulleMessage'
    | 'Colis'
    | 'GraphiqueBarres'
    | 'Parametres'
    | 'CoeurPartenaire'
    | 'ValidationUtilisateur'
    | 'LivreOuvert'
    | 'OrdinateurPortable'
    | 'Globe'
    | 'JournalActualites'
    | 'Discussion'
    | 'CarteIdentite'
    | 'ImportFichier'
    | 'GestionUtilisateur'
    | 'Bouclier'
    | 'CercleUtilisateur'
    | 'Bibliotheque';
}

export function obtenir_elements_navigation(type: TypeEtablissement): ElementNavigation[] {
  const term = obtenir_terminologie(type);

  const elements: ElementNavigation[] = [
    // Groupe SOCLE
    {
      id: 'tableau_de_bord',
      libelle: 'Tableau de bord',
      groupe: 'SOCLE',
      permission_requise: 'tableau_de_bord:voir',
      types_autorises: 'TOUS',
      phase: 1,
      nom_icone: 'TableauDeBord',
    },
    {
      id: 'apprenants',
      libelle: term.apprenant_pluriel,
      groupe: 'SOCLE',
      permission_requise: 'apprenants:voir',
      types_autorises: 'TOUS',
      phase: 1,
      nom_icone: 'Utilisateurs',
    },
    {
      id: 'structure',
      libelle: term.unite_pluriel,
      groupe: 'SOCLE',
      permission_requise: 'parametres:voir',
      types_autorises: 'TOUS',
      phase: 1,
      nom_icone: 'Couches',
    },
    {
      id: 'terminologie',
      libelle: 'Moteur contextuel',
      groupe: 'SOCLE',
      permission_requise: 'parametres:voir',
      types_autorises: 'TOUS',
      phase: 1,
      nom_icone: 'Langues',
    },
    {
      id: 'roles_audit',
      libelle: 'Rôles & Audit',
      groupe: 'SOCLE',
      permission_requise: 'roles:gerer',
      types_autorises: 'TOUS',
      phase: 1,
      nom_icone: 'BouclierValidation',
    },
    {
      id: 'comptes',
      libelle: 'Comptes & Sécurité 2FA',
      groupe: 'SOCLE',
      permission_requise: 'comptes:gerer',
      types_autorises: 'TOUS',
      phase: 1,
      nom_icone: 'GestionUtilisateur',
    },
    {
      id: 'rgpd',
      libelle: 'Conformité RGPD',
      groupe: 'SOCLE',
      permission_requise: 'rgpd:gerer',
      types_autorises: 'TOUS',
      phase: 6,
      nom_icone: 'Bouclier',
    },
    {
      id: 'profil',
      libelle: 'Mon profil',
      groupe: 'SOCLE',
      permission_requise: 'profil:voir',
      types_autorises: 'TOUS',
      phase: 1,
      nom_icone: 'CercleUtilisateur',
    },

    // Groupe SCOLARITE & PEDAGOGIE
    {
      id: 'admissions',
      libelle: 'Admissions & Inscriptions',
      groupe: 'SCOLARITE_PEDAGOGIE',
      permission_requise: 'admissions:voir',
      types_autorises: 'TOUS',
      phase: 2,
      nom_icone: 'AjoutUtilisateur',
    },
    {
      id: 'pedagogie',
      libelle:
        type === 'PRO'
          ? 'Modules & Notes'
          : type === 'SCOLAIRE'
            ? 'Notes, Bulletins & Appel'
            : 'UE, Crédits & Notes',
      groupe: 'SCOLARITE_PEDAGOGIE',
      permission_requise: 'pedagogie:voir',
      types_autorises: 'TOUS',
      phase: 3,
      nom_icone: 'ChapeauDiplome',
    },
    {
      id: 'emplois_du_temps',
      libelle: 'Emplois du temps',
      groupe: 'SCOLARITE_PEDAGOGIE',
      permission_requise: 'emplois_du_temps:voir',
      types_autorises: 'TOUS',
      phase: 3,
      nom_icone: 'Calendrier',
    },
    {
      id: 'stages',
      libelle: type === 'UNIVERSITE' ? 'Stages & Mémoires' : 'Stages & Placement',
      groupe: 'SCOLARITE_PEDAGOGIE',
      permission_requise: 'stages:voir',
      types_autorises: ['PRO', 'UNIVERSITE'],
      phase: 3,
      nom_icone: 'Mallette',
    },
    {
      id: 'campus_numerique',
      libelle: 'Campus Numérique & LMS',
      groupe: 'SCOLARITE_PEDAGOGIE',
      permission_requise: 'campus_numerique:voir',
      types_autorises: 'TOUS',
      phase: 3,
      nom_icone: 'OrdinateurPortable',
    },
    {
      id: 'badges',
      libelle: 'Cartes & Badges QR',
      groupe: 'SCOLARITE_PEDAGOGIE',
      permission_requise: 'badges:voir',
      types_autorises: 'TOUS',
      phase: 5,
      nom_icone: 'CarteIdentite',
    },

    // Groupe GESTION & SERVICES
    {
      id: 'finances',
      libelle: 'Finances & Caisse',
      groupe: 'GESTION',
      permission_requise: 'finances:voir',
      types_autorises: 'TOUS',
      phase: 4,
      nom_icone: 'Portefeuille',
    },
    {
      id: 'ressources_humaines',
      libelle: `RH & Paie (${term.enseignant_pluriel.split(' ')[0]})`,
      groupe: 'GESTION',
      permission_requise: 'rh:voir',
      types_autorises: 'TOUS',
      phase: 4,
      nom_icone: 'PaieBadge',
    },
    {
      id: 'documents',
      libelle: 'Documents officiels',
      groupe: 'GESTION',
      permission_requise: 'documents:voir',
      types_autorises: 'TOUS',
      phase: 5,
      nom_icone: 'DocumentTexte',
    },
    {
      id: 'communication',
      libelle: 'Diffusions & Annonces',
      groupe: 'GESTION',
      permission_requise: 'communication:voir',
      types_autorises: 'TOUS',
      phase: 5,
      nom_icone: 'BulleMessage',
    },
    {
      id: 'messagerie',
      libelle: 'Messagerie directe',
      groupe: 'GESTION',
      permission_requise: 'messagerie:utiliser',
      types_autorises: 'TOUS',
      phase: 5,
      nom_icone: 'Discussion',
    },
    {
      id: 'actualites',
      libelle: 'Actualités & Événements',
      groupe: 'GESTION',
      permission_requise: 'actualites:voir',
      types_autorises: 'TOUS',
      phase: 5,
      nom_icone: 'JournalActualites',
    },
    {
      id: 'bibliotheque_materiels',
      libelle: 'Bibliothèque & Matériels',
      groupe: 'GESTION',
      permission_requise: 'bibliotheque_materiels:voir',
      types_autorises: 'TOUS',
      phase: 6,
      nom_icone: 'Bibliotheque',
    },
    {
      id: 'services',
      libelle: 'Services annexes',
      groupe: 'GESTION',
      permission_requise: 'services:voir',
      types_autorises: 'TOUS',
      phase: 6,
      nom_icone: 'Colis',
    },
    {
      id: 'rapports',
      libelle: 'Rapports & Autorités',
      groupe: 'GESTION',
      permission_requise: 'rapports:voir',
      types_autorises: 'TOUS',
      phase: 6,
      nom_icone: 'GraphiqueBarres',
    },
    {
      id: 'importations',
      libelle: 'Centre d’importation',
      groupe: 'GESTION',
      permission_requise: 'importations:gerer',
      types_autorises: 'TOUS',
      phase: 6,
      nom_icone: 'ImportFichier',
    },
    {
      id: 'parametres',
      libelle: 'Paramètres établissement',
      groupe: 'GESTION',
      permission_requise: 'parametres:voir',
      types_autorises: 'TOUS',
      phase: 6,
      nom_icone: 'Parametres',
    },
    {
      id: 'plateforme',
      libelle: 'Console SaaS Multi-Pays',
      groupe: 'GESTION',
      permission_requise: 'plateforme:gerer',
      types_autorises: 'TOUS',
      phase: 6,
      nom_icone: 'Globe',
    },

    // Groupe PORTAILS
    {
      id: 'portail_parent',
      libelle: 'Portail Parent / Tuteur',
      groupe: 'PORTAILS',
      permission_requise: 'portail:parent',
      types_autorises: ['SCOLAIRE'],
      phase: 5,
      nom_icone: 'CoeurPartenaire',
    },
    {
      id: 'portail_apprenant',
      libelle: `Portail ${term.apprenant_singulier}`,
      groupe: 'PORTAILS',
      permission_requise: 'portail:apprenant',
      types_autorises: 'TOUS',
      phase: 5,
      nom_icone: 'ValidationUtilisateur',
    },
    {
      id: 'portail_enseignant',
      libelle: `Portail ${term.enseignant_singulier}`,
      groupe: 'PORTAILS',
      permission_requise: 'portail:enseignant',
      types_autorises: 'TOUS',
      phase: 5,
      nom_icone: 'LivreOuvert',
    },
  ];

  return elements.filter(
    (element) => element.types_autorises === 'TOUS' || element.types_autorises.includes(type)
  );
}

export const LIBELLES_GROUPES_NAVIGATION: Record<ElementNavigation['groupe'], string> = {
  SOCLE: 'Socle & Référentiel',
  SCOLARITE_PEDAGOGIE: 'Scolarité & Pédagogie',
  GESTION: 'Finances, RH & Administration',
  PORTAILS: 'Portails dédiés',
};
