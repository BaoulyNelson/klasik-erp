import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  FolderGit2,
  HelpCircle,
  Laptop,
  Link2,
  Lock,
  MessageSquare,
  Paperclip,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  Trash2,
  Upload,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { Modale } from '../../composants/interface/Modale';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { utiliserErp } from '../../contexte/ContexteErp';
import {
  CritereGrilleDevoir,
  DevoirLms,
  PieceJointeDevoirLms,
  RemiseDevoirLms,
  RessourcePedagogiqueLms,
  StatutRemiseDevoir,
  TypeDevoirLms,
} from '../../modeles/erp';
import { formater_date_fr } from '../../services/service_donnees';
import {
  enregistrer_fichier_local,
  formater_taille_fichier,
  obtenir_url_apercu_fichier_local,
  telecharger_fichier_local,
} from '../../services/service_fichiers_locaux';

interface ElementDevoirApprenant {
  id_apprenant: string;
  nom_complet: string;
  matricule: string;
  remise?: RemiseDevoirLms;
  statut: StatutRemiseDevoir;
}

const LIBELLES_STATUT_REMISE: Record<StatutRemiseDevoir, string> = {
  ASSIGNE: 'Attribué',
  REMIS: 'Remis',
  RENDU_EN_RETARD: 'Rendu en retard',
  EVALUE: 'Noté & rendu',
  A_REVOIR: 'À revoir',
};

function obtenir_icone_type_devoir(type_devoir?: TypeDevoirLms) {
  switch (type_devoir) {
    case 'Projet':
      return FolderGit2;
    case 'Questionnaire':
      return ClipboardList;
    case 'Question':
      return HelpCircle;
    default:
      return FileText;
  }
}

export const VueCampusNumerique: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    utilisateur_actif,
    id_role_actif,
    unites_etablissement,
    elements_etablissement,
    apprenants_etablissement,
    ressources_lms_etablissement,
    devoirs_lms_etablissement,
    remises_devoirs_etablissement,
    ajouter_ressource_lms,
    ajouter_devoir_lms,
    basculer_statut_devoir_lms,
    deposer_travail_devoir_lms,
    annuler_remise_devoir_lms,
    evaluer_remise_devoir_lms,
    ajouter_commentaire_devoir_lms,
    a_permission,
    ajouter_toast,
  } = utiliserErp();

  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const est_super_admin = id_role_actif === 'SUPER_ADMIN';
  const peut_gerer = a_permission('pedagogie:noter') && !est_super_admin;
  const est_vue_apprenant = id_role_actif === 'APPRENANT';
  const aujourdhui_iso = new Date().toISOString().slice(0, 10);

  const [onglet, definir_onglet] = useState<'devoirs' | 'ressources'>('devoirs');
  const [mode_navigation_devoirs, definir_mode_navigation_devoirs] = useState<
    'themes' | 'a_faire' | 'calendrier'
  >('themes');
  const [filtre_a_faire, definir_filtre_a_faire] = useState<
    'A_RENDRE' | 'EN_RETARD' | 'TERMINES'
  >('A_RENDRE');
  const [sous_onglet_devoir, definir_sous_onglet_devoir] = useState<'consignes' | 'copies'>(
    'consignes'
  );

  // Filtres
  const [filtre_unite, definir_filtre_unite] = useState('TOUTES');
  const [filtre_theme, definir_filtre_theme] = useState('TOUS');
  const [filtre_statut_devoir, definir_filtre_statut_devoir] = useState<
    'TOUS' | DevoirLms['statut']
  >('TOUS');
  const [recherche_devoir, definir_recherche_devoir] = useState('');

  // Sélection devoir & apprenant pour correction
  const [id_devoir_selectionne, definir_id_devoir_selectionne] = useState<string>(
    devoirs_lms_etablissement[0]?.id ?? ''
  );
  const [filtre_statut_copie, definir_filtre_statut_copie] = useState<
    'TOUS' | 'A_CORRIGER' | 'EVALUE' | 'ASSIGNE'
  >('TOUS');
  const [id_apprenant_copie, definir_id_apprenant_copie] = useState<string>('');

  // Formulaire création devoir (style Google Classroom avec upload multiple + liens)
  const [panneau_creation_ouvert, definir_panneau_creation_ouvert] = useState(false);
  const [titre_devoir, definir_titre_devoir] = useState('');
  const [type_devoir_formulaire, definir_type_devoir_formulaire] =
    useState<TypeDevoirLms>('Devoir');
  const [theme_devoir_formulaire, definir_theme_devoir_formulaire] = useState('');
  const [consignes_formulaire, definir_consignes_formulaire] = useState('');
  const [id_element_devoir, definir_id_element_devoir] = useState(
    elements_etablissement[0]?.id ?? ''
  );
  const [date_limite_devoir, definir_date_limite_devoir] = useState('2026-12-12');
  const [points_max_devoir, definir_points_max_devoir] = useState<number>(
    etablissement_actif.echelle_notation
  );
  const [pieces_jointes_formulaire, definir_pieces_jointes_formulaire] = useState<
    PieceJointeDevoirLms[]
  >([]);
  const [titre_lien_formulaire, definir_titre_lien_formulaire] = useState('');
  const [type_lien_formulaire, definir_type_lien_formulaire] =
    useState<PieceJointeDevoirLms['type']>('Lien');
  const [url_lien_formulaire, definir_url_lien_formulaire] = useState('');
  const [televersement_en_cours_devoir, definir_televersement_en_cours_devoir] = useState(false);
  const ref_input_fichiers_devoir = useRef<HTMLInputElement | null>(null);

  const [criteres_formulaire, definir_criteres_formulaire] = useState<CritereGrilleDevoir[]>([
    {
      id: 'crit-nouv-1',
      titre: 'Maîtrise des notions & exactitude',
      description: 'Pertinence de la démarche et justesse des résultats',
      points_max: Math.round(etablissement_actif.echelle_notation * 0.6),
    },
    {
      id: 'crit-nouv-2',
      titre: 'Qualité de la rédaction & présentation',
      description: 'Clarté de la structure, schémas ou justificatifs',
      points_max:
        etablissement_actif.echelle_notation -
        Math.round(etablissement_actif.echelle_notation * 0.6),
    },
  ]);

  // Formulaire dépôt élève / étudiant ("Votre devoir" façon Google Classroom)
  const [pieces_remise_brouillon, definir_pieces_remise_brouillon] = useState<
    PieceJointeDevoirLms[]
  >([]);
  const [lien_remise_apprenant, definir_lien_remise_apprenant] = useState('');
  const [titre_lien_remise, definir_titre_lien_remise] = useState('');
  const [commentaire_remise_apprenant, definir_commentaire_remise_apprenant] = useState('');
  const [televersement_en_cours_apprenant, definir_televersement_en_cours_apprenant] =
    useState(false);
  const ref_input_fichiers_apprenant = useRef<HTMLInputElement | null>(null);
  const [id_apprenant_simule_manuel, definir_id_apprenant_simule_manuel] = useState('');

  // Formulaire correction enseignant ("Travaux des apprenants")
  const [notes_criteres_saisie, definir_notes_criteres_saisie] = useState<Record<string, number>>(
    {}
  );
  const [note_totale_saisie, definir_note_totale_saisie] = useState<string>('');
  const [commentaire_enseignant_saisie, definir_commentaire_enseignant_saisie] = useState('');
  const [synchroniser_bulletin_saisie, definir_synchroniser_bulletin_saisie] = useState(true);

  // Commentaire de cours
  const [nouveau_commentaire_cours, definir_nouveau_commentaire_cours] = useState('');

  // Formulaire ressource de cours (fichier local OU lien externe)
  const [titre_ressource, definir_titre_ressource] = useState('');
  const [type_ressource, definir_type_ressource] =
    useState<RessourcePedagogiqueLms['type_ressource']>('Cours PDF');
  const [id_element_ressource, definir_id_element_ressource] = useState(
    elements_etablissement[0]?.id ?? ''
  );
  const [mode_source_ressource, definir_mode_source_ressource] = useState<'fichier' | 'lien'>(
    'fichier'
  );
  const [url_ressource, definir_url_ressource] = useState('');
  const [fichier_ressource_televerse, definir_fichier_ressource_televerse] = useState<{
    id_fichier_local: string;
    nom_fichier: string;
    taille_octets: number;
    type_mime: string;
  } | null>(null);
  const ref_input_fichier_ressource = useRef<HTMLInputElement | null>(null);

  // Modale d'aperçu de fichier téléversé (PDF / image / texte)
  const [apercu_fichier, definir_apercu_fichier] = useState<{
    id_fichier_local: string;
    url: string;
    type_mime: string;
    nom_fichier: string;
  } | null>(null);

  const fermer_apercu_fichier = () => {
    if (apercu_fichier?.url) {
      URL.revokeObjectURL(apercu_fichier.url);
    }
    definir_apercu_fichier(null);
  };

  const ouvrir_apercu_ou_telecharger = async (
    id_fichier_local?: string,
    nom_fichier?: string
  ) => {
    if (!id_fichier_local) {
      ajouter_toast({
        titre: 'Fichier non disponible en local',
        description: 'Ce support correspond à une référence de démonstration.',
        variante: 'info',
      });
      return;
    }
    const res = await obtenir_url_apercu_fichier_local(id_fichier_local);
    if (!res) {
      ajouter_toast({
        titre: 'Fichier introuvable dans le navigateur',
        description:
          'Le fichier binaire n’a pas été retrouvé dans le stockage local de ce navigateur.',
        variante: 'warning',
      });
      return;
    }
    definir_apercu_fichier({
      id_fichier_local,
      url: res.url,
      type_mime: res.type_mime,
      nom_fichier: nom_fichier || res.nom_fichier,
    });
  };

  const declencher_telechargement = async (id_fichier_local?: string, nom_fichier?: string) => {
    if (!id_fichier_local) return;
    const ok = await telecharger_fichier_local(id_fichier_local, nom_fichier);
    if (!ok) {
      ajouter_toast({
        titre: 'Téléchargement indisponible',
        description: 'Ce fichier n’est pas présent dans le stockage local du navigateur.',
        variante: 'warning',
      });
    }
  };

  // Réinitialisation cohérente lors d'un changement d'établissement
  useEffect(() => {
    definir_filtre_unite('TOUTES');
    definir_filtre_theme('TOUS');
    definir_id_element_devoir(elements_etablissement[0]?.id ?? '');
    definir_id_element_ressource(elements_etablissement[0]?.id ?? '');
    definir_points_max_devoir(etablissement_actif.echelle_notation);
    definir_id_devoir_selectionne(devoirs_lms_etablissement[0]?.id ?? '');
    definir_id_apprenant_simule_manuel('');
    definir_pieces_remise_brouillon([]);
  }, [
    etablissement_actif.id,
    etablissement_actif.echelle_notation,
    elements_etablissement,
    devoirs_lms_etablissement,
  ]);

  const themes_disponibles = useMemo(() => {
    const ensemble = new Set<string>();
    devoirs_lms_etablissement.forEach((d) => {
      if (d.theme_ou_chapitre?.trim()) ensemble.add(d.theme_ou_chapitre.trim());
    });
    return Array.from(ensemble);
  }, [devoirs_lms_etablissement]);

  // Résoudre l'apprenant actif pour la vue "Votre devoir" et filtres Classroom
  const apprenant_connecte = useMemo(() => {
    if (id_apprenant_simule_manuel) {
      const trouve_manuel = apprenants_etablissement.find(
        (a) => a.id === id_apprenant_simule_manuel
      );
      if (trouve_manuel) return trouve_manuel;
    }
    if (utilisateur_actif.ids_apprenants_lies?.length) {
      const lie = apprenants_etablissement.find((a) =>
        utilisateur_actif.ids_apprenants_lies?.includes(a.id)
      );
      if (lie) return lie;
    }
    const par_courriel = apprenants_etablissement.find(
      (a) => (a.courriel ?? '').toLowerCase() === utilisateur_actif.courriel.toLowerCase()
    );
    if (par_courriel) return par_courriel;
    return apprenants_etablissement[0] ?? null;
  }, [
    id_apprenant_simule_manuel,
    apprenants_etablissement,
    utilisateur_actif.ids_apprenants_lies,
    utilisateur_actif.courriel,
  ]);

  const devoirs_filtres = useMemo(() => {
    const q = recherche_devoir.trim().toLowerCase();
    return devoirs_lms_etablissement.filter((d) => {
      if (est_vue_apprenant && d.statut === 'BROUILLON') return false;
      if (filtre_unite !== 'TOUTES' && d.id_unite !== filtre_unite) return false;
      if (filtre_theme !== 'TOUS' && (d.theme_ou_chapitre || 'Général') !== filtre_theme) {
        return false;
      }
      if (filtre_statut_devoir !== 'TOUS' && d.statut !== filtre_statut_devoir) return false;
      if (q && !`${d.titre} ${d.consignes ?? ''} ${d.theme_ou_chapitre ?? ''}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [
    devoirs_lms_etablissement,
    est_vue_apprenant,
    filtre_unite,
    filtre_theme,
    filtre_statut_devoir,
    recherche_devoir,
  ]);

  // Groupement par Thème / Chapitre façon Google Classroom
  const devoirs_groupes_par_theme = useMemo(() => {
    const groupes = new Map<string, DevoirLms[]>();
    devoirs_filtres.forEach((devoir) => {
      const cle = devoir.theme_ou_chapitre?.trim() || 'Sans thème';
      const liste = groupes.get(cle) ?? [];
      liste.push(devoir);
      groupes.set(cle, liste);
    });
    return Array.from(groupes.entries());
  }, [devoirs_filtres]);

  // Données "À faire" pour l'apprenant (ou vue globale pour l'enseignant)
  const devoirs_a_faire = useMemo(() => {
    return devoirs_filtres
      .map((devoir) => {
        const remise = apprenant_connecte
          ? remises_devoirs_etablissement.find(
              (r) => r.id_devoir === devoir.id && r.id_apprenant === apprenant_connecte.id
            )
          : undefined;
        const statut_remise: StatutRemiseDevoir = remise?.statut ?? 'ASSIGNE';
        const est_termine = statut_remise === 'REMIS' || statut_remise === 'EVALUE';
        const est_en_retard =
          statut_remise === 'RENDU_EN_RETARD' ||
          (!est_termine && devoir.statut === 'OUVERT' && aujourdhui_iso > devoir.date_limite);
        return { devoir, remise, statut_remise, est_termine, est_en_retard };
      })
      .sort((a, b) => a.devoir.date_limite.localeCompare(b.devoir.date_limite));
  }, [devoirs_filtres, apprenant_connecte, remises_devoirs_etablissement, aujourdhui_iso]);

  const compteurs_a_faire = useMemo(() => {
    const a_rendre = devoirs_a_faire.filter((x) => !x.est_termine && !x.est_en_retard).length;
    const en_retard = devoirs_a_faire.filter((x) => x.est_en_retard).length;
    const termines = devoirs_a_faire.filter((x) => x.est_termine).length;
    return { a_rendre, en_retard, termines };
  }, [devoirs_a_faire]);

  const devoirs_a_faire_filtres = useMemo(() => {
    if (filtre_a_faire === 'A_RENDRE') {
      return devoirs_a_faire.filter((x) => !x.est_termine && !x.est_en_retard);
    }
    if (filtre_a_faire === 'EN_RETARD') {
      return devoirs_a_faire.filter((x) => x.est_en_retard);
    }
    return devoirs_a_faire.filter((x) => x.est_termine);
  }, [devoirs_a_faire, filtre_a_faire]);

  // Calendrier des échéances groupé par date limite
  const calendrier_echeances = useMemo(() => {
    const par_date = new Map<string, typeof devoirs_a_faire>();
    devoirs_a_faire.forEach((item) => {
      const liste = par_date.get(item.devoir.date_limite) ?? [];
      liste.push(item);
      par_date.set(item.devoir.date_limite, liste);
    });
    return Array.from(par_date.entries()).sort(([d1], [d2]) => d1.localeCompare(d2));
  }, [devoirs_a_faire]);

  const devoir_actif = useMemo(
    () =>
      devoirs_filtres.find((d) => d.id === id_devoir_selectionne) ??
      devoirs_filtres[0] ??
      null,
    [devoirs_filtres, id_devoir_selectionne]
  );

  const ressources_filtrees = ressources_lms_etablissement.filter(
    (r) => filtre_unite === 'TOUTES' || r.id_unite === filtre_unite
  );

  // Calcul des remises réelles pour le devoir sélectionné
  const copies_devoir_actif: ElementDevoirApprenant[] = useMemo(() => {
    if (!devoir_actif) return [];
    const apprenants_unite = apprenants_etablissement.filter(
      (a) => a.id_unite === devoir_actif.id_unite
    );
    const remises_du_devoir = remises_devoirs_etablissement.filter(
      (r) => r.id_devoir === devoir_actif.id
    );

    const carte = new Map<string, ElementDevoirApprenant>();
    apprenants_unite.forEach((apprenant) => {
      const remise = remises_du_devoir.find((r) => r.id_apprenant === apprenant.id);
      carte.set(apprenant.id, {
        id_apprenant: apprenant.id,
        nom_complet: `${apprenant.prenom} ${apprenant.nom}`,
        matricule: apprenant.matricule,
        remise,
        statut: remise?.statut ?? 'ASSIGNE',
      });
    });

    remises_du_devoir.forEach((remise) => {
      if (!carte.has(remise.id_apprenant)) {
        const app = apprenants_etablissement.find((a) => a.id === remise.id_apprenant);
        if (app) {
          carte.set(app.id, {
            id_apprenant: app.id,
            nom_complet: `${app.prenom} ${app.nom}`,
            matricule: app.matricule,
            remise,
            statut: remise.statut,
          });
        }
      }
    });

    return Array.from(carte.values());
  }, [devoir_actif, apprenants_etablissement, remises_devoirs_etablissement]);

  const compteurs_devoir_actif = useMemo(() => {
    const remis = copies_devoir_actif.filter(
      (c) => c.statut === 'REMIS' || c.statut === 'RENDU_EN_RETARD'
    ).length;
    const evalues = copies_devoir_actif.filter((c) => c.statut === 'EVALUE').length;
    const a_revoir = copies_devoir_actif.filter((c) => c.statut === 'A_REVOIR').length;
    const assignes = copies_devoir_actif.filter((c) => c.statut === 'ASSIGNE').length;
    return { remis, evalues, a_revoir, assignes, total: copies_devoir_actif.length };
  }, [copies_devoir_actif]);

  const copies_filtrees = useMemo(() => {
    return copies_devoir_actif.filter((c) => {
      if (filtre_statut_copie === 'A_CORRIGER') {
        return c.statut === 'REMIS' || c.statut === 'RENDU_EN_RETARD' || c.statut === 'A_REVOIR';
      }
      if (filtre_statut_copie === 'EVALUE') return c.statut === 'EVALUE';
      if (filtre_statut_copie === 'ASSIGNE') return c.statut === 'ASSIGNE';
      return true;
    });
  }, [copies_devoir_actif, filtre_statut_copie]);

  const copie_selectionnee = useMemo(
    () =>
      copies_filtrees.find((c) => c.id_apprenant === id_apprenant_copie) ??
      copies_filtrees[0] ??
      null,
    [copies_filtrees, id_apprenant_copie]
  );

  // Synchroniser les champs de correction lorsqu'on change de copie sélectionnée
  useEffect(() => {
    if (!copie_selectionnee || !devoir_actif) return;
    const remise = copie_selectionnee.remise;
    const criteres_init: Record<string, number> = {};
    (devoir_actif.criteres_grille ?? []).forEach((crit) => {
      criteres_init[crit.id] = remise?.points_par_critere?.[crit.id] ?? 0;
    });
    definir_notes_criteres_saisie(criteres_init);
    definir_note_totale_saisie(
      remise?.note_attribuee !== undefined ? String(remise.note_attribuee) : ''
    );
    definir_commentaire_enseignant_saisie(remise?.commentaire_enseignant ?? '');
    definir_synchroniser_bulletin_saisie(remise?.synchronise_bulletin ?? true);
  }, [copie_selectionnee?.id_apprenant, copie_selectionnee?.remise?.evalue_le, devoir_actif?.id]);

  const ma_remise = useMemo(() => {
    if (!devoir_actif || !apprenant_connecte) return undefined;
    return remises_devoirs_etablissement.find(
      (r) => r.id_devoir === devoir_actif.id && r.id_apprenant === apprenant_connecte.id
    );
  }, [devoir_actif, apprenant_connecte, remises_devoirs_etablissement]);

  // Indicateurs synthétiques globaux
  const total_copies_a_corriger = useMemo(
    () =>
      remises_devoirs_etablissement.filter(
        (r) => r.statut === 'REMIS' || r.statut === 'RENDU_EN_RETARD'
      ).length,
    [remises_devoirs_etablissement]
  );
  const total_copies_remises_ou_notees = useMemo(
    () => remises_devoirs_etablissement.filter((r) => r.statut !== 'ASSIGNE').length,
    [remises_devoirs_etablissement]
  );

  // Téléversement réel de fichiers côté Enseignant (création de devoir)
  const gerer_ajout_fichiers_devoir = async (fichiers: FileList | null) => {
    if (!fichiers || fichiers.length === 0) return;
    definir_televersement_en_cours_devoir(true);
    const ajouts: PieceJointeDevoirLms[] = [];
    for (const fichier of Array.from(fichiers)) {
      const res = await enregistrer_fichier_local(fichier, etablissement_actif.id);
      if (!res.ok || !res.id_fichier_local) {
        ajouter_toast({
          titre: 'Fichier refusé',
          description: res.erreur ?? 'Impossible de stocker ce fichier.',
          variante: 'error',
        });
        continue;
      }
      ajouts.push({
        id: `pj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        titre: res.nom_fichier || fichier.name,
        type: 'Document',
        url: `#fichier-local/${res.id_fichier_local}`,
        id_fichier_local: res.id_fichier_local,
        nom_fichier: res.nom_fichier,
        taille_octets: res.taille_octets,
        type_mime: res.type_mime,
        mode_classroom: 'CONSULTATION',
      });
    }
    if (ajouts.length > 0) {
      definir_pieces_jointes_formulaire((prec) => [...prec, ...ajouts]);
    }
    definir_televersement_en_cours_devoir(false);
    if (ref_input_fichiers_devoir.current) {
      ref_input_fichiers_devoir.current.value = '';
    }
  };

  const gerer_ajout_lien_devoir = () => {
    if (!url_lien_formulaire.trim()) return;
    definir_pieces_jointes_formulaire((prec) => [
      ...prec,
      {
        id: `pj-lien-${Date.now()}`,
        titre: titre_lien_formulaire.trim() || url_lien_formulaire.trim(),
        type: type_lien_formulaire,
        url: url_lien_formulaire.trim(),
        mode_classroom: 'CONSULTATION',
      },
    ]);
    definir_titre_lien_formulaire('');
    definir_url_lien_formulaire('');
  };

  // Téléversement réel de fichiers côté Apprenant ("Votre devoir")
  const gerer_ajout_fichiers_apprenant = async (fichiers: FileList | null) => {
    if (!fichiers || fichiers.length === 0) return;
    definir_televersement_en_cours_apprenant(true);
    const ajouts: PieceJointeDevoirLms[] = [];
    for (const fichier of Array.from(fichiers)) {
      const res = await enregistrer_fichier_local(fichier, etablissement_actif.id);
      if (!res.ok || !res.id_fichier_local) {
        ajouter_toast({
          titre: 'Fichier refusé',
          description: res.erreur ?? 'Impossible de stocker ce fichier.',
          variante: 'error',
        });
        continue;
      }
      ajouts.push({
        id: `rem-pj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        titre: res.nom_fichier || fichier.name,
        type: 'Dépôt',
        url: `#fichier-local/${res.id_fichier_local}`,
        id_fichier_local: res.id_fichier_local,
        nom_fichier: res.nom_fichier,
        taille_octets: res.taille_octets,
        type_mime: res.type_mime,
      });
    }
    if (ajouts.length > 0) {
      definir_pieces_remise_brouillon((prec) => [...prec, ...ajouts]);
    }
    definir_televersement_en_cours_apprenant(false);
    if (ref_input_fichiers_apprenant.current) {
      ref_input_fichiers_apprenant.current.value = '';
    }
  };

  const gerer_ajout_lien_apprenant = () => {
    if (!lien_remise_apprenant.trim()) return;
    definir_pieces_remise_brouillon((prec) => [
      ...prec,
      {
        id: `rem-lien-${Date.now()}`,
        titre: titre_lien_remise.trim() || lien_remise_apprenant.trim(),
        type: 'Lien',
        url: lien_remise_apprenant.trim(),
      },
    ]);
    definir_lien_remise_apprenant('');
    definir_titre_lien_remise('');
  };

  const gerer_televersement_fichier_ressource = async (fichiers: FileList | null) => {
    const fichier = fichiers?.[0];
    if (!fichier) return;
    const res = await enregistrer_fichier_local(fichier, etablissement_actif.id);
    if (!res.ok || !res.id_fichier_local) {
      ajouter_toast({
        titre: 'Fichier refusé',
        description: res.erreur ?? 'Impossible de stocker ce fichier.',
        variante: 'error',
      });
      return;
    }
    definir_fichier_ressource_televerse({
      id_fichier_local: res.id_fichier_local,
      nom_fichier: res.nom_fichier || fichier.name,
      taille_octets: res.taille_octets ?? fichier.size,
      type_mime: res.type_mime || 'application/octet-stream',
    });
    if (!titre_ressource.trim()) {
      definir_titre_ressource(fichier.name.replace(/\.[^.]+$/, ''));
    }
  };

  const gerer_publication_ressource = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!titre_ressource.trim() || !peut_gerer) return;
    if (mode_source_ressource === 'fichier' && !fichier_ressource_televerse) {
      ajouter_toast({
        titre: 'Fichier requis',
        description: 'Importez un document depuis votre appareil ou passez sur « Lien externe ».',
        variante: 'warning',
      });
      return;
    }
    const element =
      elements_etablissement.find((el) => el.id === id_element_ressource) ??
      elements_etablissement[0];
    if (!element) return;
    ajouter_ressource_lms({
      id_unite: element.id_unite,
      id_element: element.id,
      titre: titre_ressource.trim(),
      type_ressource,
      url_ou_code:
        mode_source_ressource === 'fichier' && fichier_ressource_televerse
          ? `#fichier-local/${fichier_ressource_televerse.id_fichier_local}`
          : url_ressource.trim() || 'https://campus.klasik-erp.org',
      id_fichier_local:
        mode_source_ressource === 'fichier'
          ? fichier_ressource_televerse?.id_fichier_local
          : undefined,
      nom_fichier:
        mode_source_ressource === 'fichier'
          ? fichier_ressource_televerse?.nom_fichier
          : undefined,
      taille_octets:
        mode_source_ressource === 'fichier'
          ? fichier_ressource_televerse?.taille_octets
          : undefined,
      type_mime:
        mode_source_ressource === 'fichier' ? fichier_ressource_televerse?.type_mime : undefined,
      nom_auteur: utilisateur_actif.nom_complet,
    });
    definir_titre_ressource('');
    definir_url_ressource('');
    definir_fichier_ressource_televerse(null);
    if (ref_input_fichier_ressource.current) ref_input_fichier_ressource.current.value = '';
  };

  const gerer_creation_devoir = (statut_cible: 'OUVERT' | 'BROUILLON') => {
    if (!titre_devoir.trim() || !peut_gerer) return;
    const element =
      elements_etablissement.find((el) => el.id === id_element_devoir) ??
      elements_etablissement[0];
    if (!element) return;

    const pieces_finales: PieceJointeDevoirLms[] = [...pieces_jointes_formulaire];
    if (url_lien_formulaire.trim()) {
      pieces_finales.push({
        id: `pj-lien-${Date.now()}`,
        titre: titre_lien_formulaire.trim() || url_lien_formulaire.trim(),
        type: type_lien_formulaire,
        url: url_lien_formulaire.trim(),
        mode_classroom: 'CONSULTATION',
      });
    }

    const criteres_valides = criteres_formulaire.filter((c) => c.titre.trim().length > 0);
    ajouter_devoir_lms({
      id_unite: element.id_unite,
      id_element: element.id,
      titre: titre_devoir.trim(),
      type_devoir: type_devoir_formulaire,
      theme_ou_chapitre: theme_devoir_formulaire.trim() || 'Général',
      consignes: consignes_formulaire.trim(),
      date_limite: date_limite_devoir,
      points_max: Math.max(1, points_max_devoir),
      statut: statut_cible,
      pieces_jointes: pieces_finales,
      criteres_grille: criteres_valides,
    });
    definir_titre_devoir('');
    definir_consignes_formulaire('');
    definir_pieces_jointes_formulaire([]);
    definir_titre_lien_formulaire('');
    definir_url_lien_formulaire('');
    definir_panneau_creation_ouvert(false);
  };

  const gerer_depot_apprenant = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!devoir_actif || !apprenant_connecte || est_super_admin) return;
    const pieces_a_remettre = [...pieces_remise_brouillon];
    if (lien_remise_apprenant.trim()) {
      pieces_a_remettre.push({
        id: `rem-lien-${Date.now()}`,
        titre: titre_lien_remise.trim() || lien_remise_apprenant.trim(),
        type: 'Lien',
        url: lien_remise_apprenant.trim(),
      });
    }
    if (pieces_a_remettre.length === 0 && !commentaire_remise_apprenant.trim()) {
      ajouter_toast({
        titre: 'Aucune pièce jointe',
        description: 'Importez au moins un fichier ou ajoutez un lien avant de rendre votre devoir.',
        variante: 'warning',
      });
      return;
    }

    deposer_travail_devoir_lms({
      id_devoir: devoir_actif.id,
      id_apprenant: apprenant_connecte.id,
      pieces_remises: pieces_a_remettre,
      commentaire_apprenant: commentaire_remise_apprenant.trim() || undefined,
    });
    definir_pieces_remise_brouillon([]);
    definir_lien_remise_apprenant('');
    definir_titre_lien_remise('');
    definir_commentaire_remise_apprenant('');
  };

  const gerer_modification_critere_note = (id_critere: string, valeur: number, max_crit: number) => {
    const valeur_bornee = Math.max(0, Math.min(max_crit, Number.isNaN(valeur) ? 0 : valeur));
    const maj = { ...notes_criteres_saisie, [id_critere]: valeur_bornee };
    definir_notes_criteres_saisie(maj);
    const somme = Object.values(maj).reduce((acc, v) => acc + v, 0);
    definir_note_totale_saisie(String(Number(somme.toFixed(2))));
  };

  const gerer_rendre_copie_enseignant = (statut_final: 'EVALUE' | 'A_REVOIR') => {
    if (!devoir_actif || !copie_selectionnee || !peut_gerer) return;
    const note_num = Number(note_totale_saisie);
    const note_finale = Number.isNaN(note_num) ? 0 : note_num;
    evaluer_remise_devoir_lms({
      id_devoir: devoir_actif.id,
      id_apprenant: copie_selectionnee.id_apprenant,
      note_attribuee: note_finale,
      points_par_critere:
        (devoir_actif.criteres_grille?.length ?? 0) > 0 ? notes_criteres_saisie : undefined,
      commentaire_enseignant: commentaire_enseignant_saisie,
      statut: statut_final,
      synchroniser_bulletin: statut_final === 'EVALUE' && synchroniser_bulletin_saisie,
    });
  };

  const gerer_envoi_commentaire_cours = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!devoir_actif || !nouveau_commentaire_cours.trim() || est_super_admin) return;
    ajouter_commentaire_devoir_lms(devoir_actif.id, nouveau_commentaire_cours);
    definir_nouveau_commentaire_cours('');
  };

  const obtenir_compteurs_devoir = (devoir: DevoirLms) => {
    const remises = remises_devoirs_etablissement.filter((r) => r.id_devoir === devoir.id);
    const apprenants_u = apprenants_etablissement.filter((a) => a.id_unite === devoir.id_unite);
    const total = Math.max(apprenants_u.length, devoir.total_attendu, remises.length);
    if (remises.length === 0) {
      return {
        remis: devoir.nombre_rendus,
        notes: 0,
        assignes: Math.max(0, total - devoir.nombre_rendus),
      };
    }
    const notes = remises.filter((r) => r.statut === 'EVALUE').length;
    const remis = remises.filter(
      (r) => r.statut === 'REMIS' || r.statut === 'RENDU_EN_RETARD' || r.statut === 'A_REVOIR'
    ).length;
    const assignes = Math.max(0, total - notes - remis);
    return { remis, notes, assignes };
  };

  // Liste des pièces livrées par l'apprenant actif (multi-fichiers ou champ historique)
  const pieces_livrees_ma_remise: PieceJointeDevoirLms[] = useMemo(() => {
    if (!ma_remise) return [];
    if (ma_remise.pieces_remises && ma_remise.pieces_remises.length > 0) {
      return ma_remise.pieces_remises;
    }
    if (ma_remise.nom_fichier || ma_remise.lien_ou_fichier || ma_remise.id_fichier_local) {
      return [
        {
          id: `legacy-${ma_remise.id}`,
          titre: ma_remise.nom_fichier || ma_remise.lien_ou_fichier || 'Travail remis',
          type: ma_remise.id_fichier_local ? 'Dépôt' : 'Lien',
          url: ma_remise.lien_ou_fichier || '',
          id_fichier_local: ma_remise.id_fichier_local,
          nom_fichier: ma_remise.nom_fichier,
          taille_octets: ma_remise.taille_octets,
          type_mime: ma_remise.type_mime,
        },
      ];
    }
    return [];
  }, [ma_remise]);

  return (
    <div className="space-y-5">
      {/* En-tête & navigation principale */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Campus Numérique · Travaux, Devoirs & Supports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Espace de cours {etablissement_actif.nom_court} · Travaux par thème, liste À faire,
            calendrier des échéances et dépôt de fichiers
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => definir_onglet('devoirs')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${
              onglet === 'devoirs'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Travaux & Devoirs ({devoirs_lms_etablissement.length})</span>
          </button>
          <button
            type="button"
            onClick={() => definir_onglet('ressources')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${
              onglet === 'ressources'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Supports de cours ({ressources_lms_etablissement.length})</span>
          </button>
        </div>
      </div>

      {/* Bannière de séparation des privilèges pour SUPER_ADMIN */}
      {est_super_admin && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">
                Supervision plateforme en lecture seule (Séparation SaaS / Pédagogie)
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                Le Super-administrateur consulte l’activité LMS sans créer de devoirs, remettre de
                copies ni noter les apprenants.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Indicateurs synthétiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Carte>
          <div className="text-xs text-slate-500 dark:text-slate-400">Travaux ouverts</div>
          <div className="text-2xl font-display font-bold font-mono tabular-nums mt-1 text-slate-900 dark:text-slate-100">
            {devoirs_lms_etablissement.filter((d) => d.statut === 'OUVERT').length}
          </div>
        </Carte>
        <Carte>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {est_vue_apprenant ? 'À rendre (en cours)' : 'Copies à corriger'}
          </div>
          <div className="text-2xl font-display font-bold font-mono tabular-nums mt-1 text-amber-600 dark:text-amber-400">
            {est_vue_apprenant
              ? compteurs_a_faire.a_rendre + compteurs_a_faire.en_retard
              : total_copies_a_corriger}
          </div>
        </Carte>
        <Carte>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {est_vue_apprenant ? 'Travaux terminés' : 'Remises enregistrées'}
          </div>
          <div className="text-2xl font-display font-bold font-mono tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
            {est_vue_apprenant ? compteurs_a_faire.termines : total_copies_remises_ou_notees}
          </div>
        </Carte>
        <Carte>
          <div className="text-xs text-slate-500 dark:text-slate-400">Supports en ligne</div>
          <div className="text-2xl font-display font-bold font-mono tabular-nums mt-1 text-slate-900 dark:text-slate-100">
            {ressources_lms_etablissement.length}
          </div>
        </Carte>
      </div>

      {/* Barre de navigation Classroom (Travaux par thème · À faire · Calendrier) + Filtres */}
      <Carte rembourrage="petit" className="space-y-3">
        {onglet === 'devoirs' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => definir_mode_navigation_devoirs('themes')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  mode_navigation_devoirs === 'themes'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Travaux par thème</span>
              </button>
              <button
                type="button"
                onClick={() => definir_mode_navigation_devoirs('a_faire')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  mode_navigation_devoirs === 'a_faire'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  À faire (
                  <span className="font-mono tabular-nums">
                    {compteurs_a_faire.a_rendre + compteurs_a_faire.en_retard}
                  </span>
                  )
                </span>
              </button>
              <button
                type="button"
                onClick={() => definir_mode_navigation_devoirs('calendrier')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  mode_navigation_devoirs === 'calendrier'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Calendrier des échéances</span>
              </button>
            </div>

            {peut_gerer && (
              <Bouton
                variante="principal"
                taille="sm"
                classe_accent={theme_etab.bouton_principal}
                onClick={() => definir_panneau_creation_ouvert((p) => !p)}
              >
                <Plus className="w-4 h-4" />
                <span>{panneau_creation_ouvert ? 'Fermer le formulaire' : 'Créer un devoir'}</span>
              </Bouton>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <select
              value={filtre_unite}
              onChange={(e) => definir_filtre_unite(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="TOUTES">Toutes les {terminologie.unite_pluriel.toLowerCase()}</option>
              {unites_etablissement.map((unite) => (
                <option key={unite.id} value={unite.id}>
                  {unite.nom}
                </option>
              ))}
            </select>

            {onglet === 'devoirs' && (
              <>
                <select
                  value={filtre_theme}
                  onChange={(e) => definir_filtre_theme(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="TOUS">Tous les thèmes / chapitres</option>
                  {themes_disponibles.map((th) => (
                    <option key={th} value={th}>
                      {th}
                    </option>
                  ))}
                </select>

                <select
                  value={filtre_statut_devoir}
                  onChange={(e) =>
                    definir_filtre_statut_devoir(e.target.value as 'TOUS' | DevoirLms['statut'])
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="TOUS">Tous statuts</option>
                  <option value="OUVERT">Ouverts</option>
                  <option value="CLOTURE">Clôturés</option>
                  {!est_vue_apprenant && <option value="BROUILLON">Brouillons</option>}
                </select>

                <input
                  type="search"
                  value={recherche_devoir}
                  onChange={(e) => definir_recherche_devoir(e.target.value)}
                  placeholder="Rechercher un devoir..."
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 w-48"
                />
              </>
            )}
          </div>

          {est_vue_apprenant && apprenant_connecte && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Dossier suivi :{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {apprenant_connecte.prenom} {apprenant_connecte.nom}
              </strong>{' '}
              (<span className="font-mono">{apprenant_connecte.matricule}</span>)
            </div>
          )}
        </div>
      </Carte>

      {/* Formulaire de création d'un devoir (Google Classroom avec upload de fichiers + liens) */}
      {onglet === 'devoirs' && peut_gerer && panneau_creation_ouvert && (
        <Carte className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                Nouveau travail / devoir Classroom
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Importez des fichiers (PDF, DOCX, images, supports), joignez des liens et configurez
                la grille d’évaluation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
            <div className="md:col-span-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Type de travail</label>
                  <select
                    value={type_devoir_formulaire}
                    onChange={(e) =>
                      definir_type_devoir_formulaire(e.target.value as TypeDevoirLms)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Devoir">Devoir</option>
                    <option value="Projet">Projet</option>
                    <option value="Questionnaire">Questionnaire</option>
                    <option value="Question">Question</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    {terminologie.contenu_singulier} *
                  </label>
                  <select
                    value={id_element_devoir}
                    onChange={(e) => definir_id_element_devoir(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {elements_etablissement.map((el) => (
                      <option key={el.id} value={el.id}>
                        {el.code} — {el.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Titre du devoir *</label>
                <input
                  type="text"
                  value={titre_devoir}
                  onChange={(e) => definir_titre_devoir(e.target.value)}
                  placeholder="Ex : Étude de cas — Régulation PID ou Analyse de texte"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Thème / Chapitre</label>
                <input
                  type="text"
                  value={theme_devoir_formulaire}
                  onChange={(e) => definir_theme_devoir_formulaire(e.target.value)}
                  list="themes-classroom-liste"
                  placeholder="Ex : Chapitre 4 · Fonctions & Dérivées"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <datalist id="themes-classroom-liste">
                  {themes_disponibles.map((th) => (
                    <option key={th} value={th} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-semibold mb-1">Consignes détaillées</label>
                <textarea
                  rows={4}
                  value={consignes_formulaire}
                  onChange={(e) => definir_consignes_formulaire(e.target.value)}
                  placeholder="Précisez les attendus, le format de remise et les ressources autorisées..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="md:col-span-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Date limite</label>
                  <input
                    type="date"
                    value={date_limite_devoir}
                    onChange={(e) => definir_date_limite_devoir(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Barème (points max)</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={points_max_devoir}
                    onChange={(e) => definir_points_max_devoir(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              {/* Pièces jointes multiples (Upload réel de fichiers + liens) */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2.5 bg-slate-50/70 dark:bg-slate-900/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span>Joindre des fichiers ou liens ({pieces_jointes_formulaire.length})</span>
                  </span>
                  <div>
                    <input
                      ref={ref_input_fichiers_devoir}
                      type="file"
                      multiple
                      onChange={(e) => void gerer_ajout_fichiers_devoir(e.target.files)}
                      className="hidden"
                      id="upload-fichiers-devoir-enseignant"
                    />
                    <label
                      htmlFor="upload-fichiers-devoir-enseignant"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {televersement_en_cours_devoir
                          ? 'Importation...'
                          : 'Importer un fichier (PDF, DOCX, Image...)'}
                      </span>
                    </label>
                  </div>
                </div>

                {pieces_jointes_formulaire.length > 0 && (
                  <div className="space-y-1.5">
                    {pieces_jointes_formulaire.map((pj) => (
                      <div
                        key={pj.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {pj.titre}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {pj.id_fichier_local
                              ? `Fichier importé · ${formater_taille_fichier(pj.taille_octets)}`
                              : `${pj.type} · ${pj.url}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            value={pj.mode_classroom ?? 'CONSULTATION'}
                            onChange={(e) =>
                              definir_pieces_jointes_formulaire((prec) =>
                                prec.map((item) =>
                                  item.id === pj.id
                                    ? {
                                        ...item,
                                        mode_classroom: e.target.value as
                                          | 'CONSULTATION'
                                          | 'COPIE_PAR_APPRENANT',
                                      }
                                    : item
                                )
                              )
                            }
                            className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                          >
                            <option value="CONSULTATION">Les élèves peuvent consulter</option>
                            <option value="COPIE_PAR_APPRENANT">Faire une copie par élève</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              definir_pieces_jointes_formulaire((prec) =>
                                prec.filter((item) => item.id !== pj.id)
                              )
                            }
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Retirer cette pièce jointe"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-12 gap-1.5 pt-1 border-t border-slate-200/70 dark:border-slate-800">
                  <input
                    type="text"
                    value={titre_lien_formulaire}
                    onChange={(e) => definir_titre_lien_formulaire(e.target.value)}
                    placeholder="Titre du lien (ex. Vidéo cours)"
                    className="col-span-4 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <select
                    value={type_lien_formulaire}
                    onChange={(e) =>
                      definir_type_lien_formulaire(e.target.value as PieceJointeDevoirLms['type'])
                    }
                    className="col-span-2 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Lien">Lien</option>
                    <option value="Vidéo">Vidéo</option>
                    <option value="Document">Document</option>
                  </select>
                  <input
                    type="url"
                    value={url_lien_formulaire}
                    onChange={(e) => definir_url_lien_formulaire(e.target.value)}
                    placeholder="https://..."
                    className="col-span-4 px-2 py-1 font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={gerer_ajout_lien_devoir}
                    disabled={!url_lien_formulaire.trim()}
                    className="col-span-2 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-semibold text-indigo-600 dark:text-indigo-400 disabled:opacity-40 cursor-pointer"
                  >
                    + Lien
                  </button>
                </div>
              </div>

              {/* Grille d'évaluation */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2 bg-slate-50/70 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-slate-400" />
                    <span>Grille d’évaluation ({criteres_formulaire.length} critères)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      definir_criteres_formulaire((prec) => [
                        ...prec,
                        {
                          id: `crit-${Date.now()}`,
                          titre: '',
                          description: '',
                          points_max: 5,
                        },
                      ])
                    }
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    + Ajouter critère
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {criteres_formulaire.map((crit, index) => (
                    <div key={crit.id} className="grid grid-cols-12 gap-1.5 items-center">
                      <input
                        type="text"
                        value={crit.titre}
                        onChange={(e) =>
                          definir_criteres_formulaire((prec) =>
                            prec.map((c, idx) =>
                              idx === index ? { ...c, titre: e.target.value } : c
                            )
                          )
                        }
                        placeholder="Critère"
                        className="col-span-5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                      <input
                        type="text"
                        value={crit.description}
                        onChange={(e) =>
                          definir_criteres_formulaire((prec) =>
                            prec.map((c, idx) =>
                              idx === index ? { ...c, description: e.target.value } : c
                            )
                          )
                        }
                        placeholder="Description"
                        className="col-span-4 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                      <input
                        type="number"
                        min={1}
                        value={crit.points_max}
                        onChange={(e) =>
                          definir_criteres_formulaire((prec) =>
                            prec.map((c, idx) =>
                              idx === index ? { ...c, points_max: Number(e.target.value) } : c
                            )
                          )
                        }
                        className="col-span-2 px-2 py-1 font-mono text-right rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          definir_criteres_formulaire((prec) =>
                            prec.filter((_, idx) => idx !== index)
                          )
                        }
                        className="col-span-1 text-slate-400 hover:text-red-600 flex justify-center cursor-pointer"
                        title="Supprimer le critère"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              disabled={!titre_devoir.trim()}
              onClick={() => gerer_creation_devoir('BROUILLON')}
            >
              Enregistrer en brouillon
            </Bouton>
            <Bouton
              type="button"
              variante="principal"
              taille="sm"
              classe_accent={theme_etab.bouton_principal}
              disabled={!titre_devoir.trim()}
              onClick={() => gerer_creation_devoir('OUVERT')}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Publier le devoir</span>
            </Bouton>
          </div>
        </Carte>
      )}

      {/* Onglet 1 : Travaux & Devoirs (3 modes Classroom à gauche + détail à droite) */}
      {onglet === 'devoirs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Colonne gauche : Travaux par thème OU À faire OU Calendrier des échéances */}
          <Carte rembourrage="aucun" className="lg:col-span-5 overflow-hidden">
            {mode_navigation_devoirs === 'themes' && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Travaux par thème ({devoirs_filtres.length})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                    {themes_disponibles.length} thème(s)
                  </span>
                </div>

                {devoirs_groupes_par_theme.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Aucun devoir ne correspond aux filtres sélectionnés.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {devoirs_groupes_par_theme.map(([nom_theme, liste_devoirs]) => (
                      <div key={nom_theme}>
                        <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-900/60 text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-300 flex items-center justify-between">
                          <span className="truncate">{nom_theme}</span>
                          <span className="font-mono text-slate-400 tabular-nums">
                            {liste_devoirs.length}
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                          {liste_devoirs.map((devoir) => {
                            const element = elements_etablissement.find(
                              (el) => el.id === devoir.id_element
                            );
                            const unite = unites_etablissement.find((u) => u.id === devoir.id_unite);
                            const est_selectionne = devoir_actif?.id === devoir.id;
                            const compteurs = obtenir_compteurs_devoir(devoir);
                            const IconeType = obtenir_icone_type_devoir(devoir.type_devoir);

                            return (
                              <button
                                key={devoir.id}
                                type="button"
                                onClick={() => {
                                  definir_id_devoir_selectionne(devoir.id);
                                  definir_id_apprenant_copie('');
                                }}
                                className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                                  est_selectionne
                                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div
                                    className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                      est_selectionne
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    <IconeType className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                        {devoir.titre}
                                      </span>
                                      {devoir.statut === 'CLOTURE' ? (
                                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      ) : devoir.statut === 'BROUILLON' ? (
                                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                      ) : null}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                      {element?.code ?? ''} · {unite?.nom ?? ''} · Échéance{' '}
                                      <span className="font-mono tabular-nums">
                                        {formater_date_fr(devoir.date_limite)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono tabular-nums">
                                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        {compteurs.remis} remis
                                      </span>
                                      <span className="text-slate-400">·</span>
                                      <span className="text-slate-600 dark:text-slate-300">
                                        {compteurs.assignes} attribué(s)
                                      </span>
                                      <span className="text-slate-400">·</span>
                                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                        {compteurs.notes} noté(s)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {mode_navigation_devoirs === 'a_faire' && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Liste À faire (Classroom)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {devoirs_a_faire.length} devoir(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => definir_filtre_a_faire('A_RENDRE')}
                      className={`py-1.5 px-2 rounded-md font-medium cursor-pointer transition-colors ${
                        filtre_a_faire === 'A_RENDRE'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      À rendre ({compteurs_a_faire.a_rendre})
                    </button>
                    <button
                      type="button"
                      onClick={() => definir_filtre_a_faire('EN_RETARD')}
                      className={`py-1.5 px-2 rounded-md font-medium cursor-pointer transition-colors ${
                        filtre_a_faire === 'EN_RETARD'
                          ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      En retard ({compteurs_a_faire.en_retard})
                    </button>
                    <button
                      type="button"
                      onClick={() => definir_filtre_a_faire('TERMINES')}
                      className={`py-1.5 px-2 rounded-md font-medium cursor-pointer transition-colors ${
                        filtre_a_faire === 'TERMINES'
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Terminés ({compteurs_a_faire.termines})
                    </button>
                  </div>
                </div>

                {devoirs_a_faire_filtres.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Aucun travail dans cette catégorie.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {devoirs_a_faire_filtres.map(({ devoir, remise, statut_remise, est_en_retard }) => {
                      const element = elements_etablissement.find(
                        (el) => el.id === devoir.id_element
                      );
                      const est_selectionne = devoir_actif?.id === devoir.id;
                      const IconeType = obtenir_icone_type_devoir(devoir.type_devoir);
                      return (
                        <button
                          key={devoir.id}
                          type="button"
                          onClick={() => definir_id_devoir_selectionne(devoir.id)}
                          className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                            est_selectionne
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <IconeType className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {devoir.titre}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {element?.nom ?? ''} · {devoir.theme_ou_chapitre ?? 'Général'}
                                </div>
                                <div
                                  className={`text-[11px] font-mono tabular-nums mt-1 ${
                                    est_en_retard
                                      ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  Échéance : {formater_date_fr(devoir.date_limite)}
                                </div>
                              </div>
                            </div>
                            <span className="font-mono tabular-nums text-[11px] font-semibold shrink-0 text-indigo-600 dark:text-indigo-400">
                              {statut_remise === 'EVALUE' && remise?.note_attribuee !== undefined
                                ? `${remise.note_attribuee}/${devoir.points_max}`
                                : LIBELLES_STATUT_REMISE[statut_remise]}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {mode_navigation_devoirs === 'calendrier' && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Calendrier des échéances
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                    {calendrier_echeances.length} date(s)
                  </span>
                </div>
                {calendrier_echeances.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Aucune échéance planifiée pour les filtres actuels.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {calendrier_echeances.map(([date_iso, items]) => (
                      <div key={date_iso}>
                        <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between text-[11px]">
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <CalendarClock className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{formater_date_fr(date_iso)}</span>
                          </span>
                          <span className="text-slate-400 font-mono tabular-nums">
                            {date_iso < aujourdhui_iso
                              ? 'Passée'
                              : date_iso === aujourdhui_iso
                                ? 'Aujourd’hui'
                                : 'À venir'}
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                          {items.map(({ devoir, remise, statut_remise }) => {
                            const est_selectionne = devoir_actif?.id === devoir.id;
                            const element = elements_etablissement.find(
                              (el) => el.id === devoir.id_element
                            );
                            return (
                              <button
                                key={devoir.id}
                                type="button"
                                onClick={() => definir_id_devoir_selectionne(devoir.id)}
                                className={`w-full text-left px-4 py-3 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                  est_selectionne
                                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {devoir.titre}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {element?.code ?? ''} · {devoir.theme_ou_chapitre ?? 'Général'}
                                  </div>
                                </div>
                                <span className="font-mono tabular-nums text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                                  {statut_remise === 'EVALUE' && remise?.note_attribuee !== undefined
                                    ? `${remise.note_attribuee}/${devoir.points_max}`
                                    : LIBELLES_STATUT_REMISE[statut_remise]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Carte>

          {/* Espace détaillé du devoir sélectionné */}
          <Carte className="lg:col-span-7 space-y-4">
            {!devoir_actif ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Sélectionnez un devoir dans la liste pour afficher les consignes, la grille
                d’évaluation et les remises.
              </div>
            ) : (
              <>
                {/* En-tête devoir */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <span>{devoir_actif.type_devoir ?? 'Devoir'}</span>
                      <span>·</span>
                      <span>{devoir_actif.theme_ou_chapitre ?? 'Général'}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">/{devoir_actif.points_max} pts</span>
                      <span>·</span>
                      <span
                        className={
                          devoir_actif.statut === 'OUVERT'
                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                            : devoir_actif.statut === 'BROUILLON'
                              ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : 'text-slate-500 font-semibold'
                        }
                      >
                        {devoir_actif.statut === 'OUVERT'
                          ? 'Ouvert'
                          : devoir_actif.statut === 'BROUILLON'
                            ? 'Brouillon'
                            : 'Clôturé'}
                      </span>
                    </div>
                    <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {devoir_actif.titre}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {devoir_actif.cree_par ? `${devoir_actif.cree_par} · ` : ''}
                      Date limite :{' '}
                      <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-slate-300">
                        {formater_date_fr(devoir_actif.date_limite)}
                      </span>
                    </p>
                  </div>

                  {peut_gerer && (
                    <div className="flex items-center gap-2 shrink-0">
                      {devoir_actif.statut !== 'OUVERT' && (
                        <Bouton
                          variante="secondaire"
                          taille="sm"
                          onClick={() => basculer_statut_devoir_lms(devoir_actif.id, 'OUVERT')}
                        >
                          {devoir_actif.statut === 'BROUILLON' ? 'Publier' : 'Rouvrir'}
                        </Bouton>
                      )}
                      {devoir_actif.statut === 'OUVERT' && (
                        <Bouton
                          variante="secondaire"
                          taille="sm"
                          onClick={() => basculer_statut_devoir_lms(devoir_actif.id, 'CLOTURE')}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Clôturer</span>
                        </Bouton>
                      )}
                    </div>
                  )}
                </div>

                {/* Sous-onglets Classroom : Consignes vs Travaux des apprenants */}
                {!est_vue_apprenant && (
                  <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => definir_sous_onglet_devoir('consignes')}
                      className={`pb-2.5 font-semibold border-b-2 transition-colors cursor-pointer ${
                        sous_onglet_devoir === 'consignes'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Consignes & Grille
                    </button>
                    <button
                      type="button"
                      onClick={() => definir_sous_onglet_devoir('copies')}
                      className={`pb-2.5 font-semibold border-b-2 transition-colors cursor-pointer ${
                        sous_onglet_devoir === 'copies'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Travaux des apprenants (
                      <span className="font-mono tabular-nums">
                        {compteurs_devoir_actif.remis + compteurs_devoir_actif.evalues}/
                        {compteurs_devoir_actif.total}
                      </span>
                      )
                    </button>
                  </div>
                )}

                {/* Sous-onglet Consignes & Grille (+ Espace "Votre devoir" pour Apprenant) */}
                {(est_vue_apprenant || sous_onglet_devoir === 'consignes') && (
                  <div className="space-y-4 text-xs">
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        Consignes
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {devoir_actif.consignes?.trim() ||
                          'Aucune consigne textuelle supplémentaire. Référez-vous aux pièces jointes et à la grille d’évaluation.'}
                      </p>
                    </div>

                    {/* Pièces jointes (fichiers importés + liens) */}
                    {devoir_actif.pieces_jointes && devoir_actif.pieces_jointes.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                          Supports joints ({devoir_actif.pieces_jointes.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {devoir_actif.pieces_jointes.map((pj) =>
                            pj.id_fichier_local ? (
                              <div
                                key={pj.id}
                                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
                              >
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                    {pj.titre}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {formater_taille_fichier(pj.taille_octets)} ·{' '}
                                    {pj.mode_classroom === 'COPIE_PAR_APPRENANT'
                                      ? 'Copie individuelle'
                                      : 'Consultation'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void ouvrir_apercu_ou_telecharger(
                                        pj.id_fichier_local,
                                        pj.nom_fichier || pj.titre
                                      )
                                    }
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                                    title="Aperçu"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void declencher_telechargement(
                                        pj.id_fichier_local,
                                        pj.nom_fichier || pj.titre
                                      )
                                    }
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 cursor-pointer"
                                    title="Télécharger"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <a
                                key={pj.id}
                                href={pj.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                    {pj.titre}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {pj.type} ·{' '}
                                    {pj.mode_classroom === 'COPIE_PAR_APPRENANT'
                                      ? 'Copie individuelle'
                                      : 'Consultation'}
                                  </div>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Grille d'évaluation */}
                    {devoir_actif.criteres_grille && devoir_actif.criteres_grille.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-indigo-500" />
                          <span>
                            Grille d’évaluation ({devoir_actif.criteres_grille.length} critères)
                          </span>
                        </h4>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                          {devoir_actif.criteres_grille.map((crit) => (
                            <div
                              key={crit.id}
                              className="px-3 py-2 flex items-start justify-between gap-3"
                            >
                              <div>
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                  {crit.titre}
                                </div>
                                {crit.description && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {crit.description}
                                  </div>
                                )}
                              </div>
                              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums shrink-0">
                                /{crit.points_max} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Espace "Votre devoir" pour Apprenant (Upload multi-fichiers + liens) */}
                    {est_vue_apprenant && apprenant_connecte && (
                      <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/50 pb-2.5">
                          <div>
                            <h4 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                              Votre devoir · {apprenant_connecte.prenom} {apprenant_connecte.nom}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Statut actuel :{' '}
                              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                                {LIBELLES_STATUT_REMISE[ma_remise?.statut ?? 'ASSIGNE']}
                              </span>
                              {ma_remise?.remis_le && (
                                <span className="font-mono ml-2">({ma_remise.remis_le})</span>
                              )}
                            </p>
                          </div>

                          {utilisateur_actif.est_super_admin_plateforme && (
                            <select
                              value={apprenant_connecte.id}
                              onChange={(e) =>
                                definir_id_apprenant_simule_manuel(e.target.value)
                              }
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[11px]"
                            >
                              {apprenants_etablissement
                                .filter((a) => a.id_unite === devoir_actif.id_unite)
                                .map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.prenom} {a.nom} ({a.matricule})
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>

                        {ma_remise?.statut === 'EVALUE' || ma_remise?.statut === 'A_REVOIR' ? (
                          <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                Retour de l’enseignant ({ma_remise.evalue_par ?? 'Correcteur'})
                              </span>
                              {ma_remise.note_attribuee !== undefined && (
                                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  {ma_remise.note_attribuee}/{devoir_actif.points_max}
                                </span>
                              )}
                            </div>
                            {ma_remise.commentaire_enseignant && (
                              <p className="text-slate-600 dark:text-slate-300">
                                {ma_remise.commentaire_enseignant}
                              </p>
                            )}
                          </div>
                        ) : null}

                        {ma_remise?.statut === 'REMIS' ||
                        ma_remise?.statut === 'RENDU_EN_RETARD' ||
                        ma_remise?.statut === 'EVALUE' ? (
                          <div className="space-y-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                            <div className="space-y-1.5">
                              {pieces_livrees_ma_remise.map((piece) => (
                                <div
                                  key={piece.id}
                                  className="flex items-center justify-between gap-2 text-xs py-1"
                                >
                                  <div className="min-w-0 flex items-center gap-1.5">
                                    <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                      {piece.nom_fichier || piece.titre}
                                    </span>
                                    {piece.taille_octets && (
                                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                                        ({formater_taille_fichier(piece.taille_octets)})
                                      </span>
                                    )}
                                  </div>
                                  {piece.id_fichier_local ? (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void ouvrir_apercu_ou_telecharger(
                                            piece.id_fichier_local,
                                            piece.nom_fichier || piece.titre
                                          )
                                        }
                                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                      >
                                        Aperçu
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void declencher_telechargement(
                                            piece.id_fichier_local,
                                            piece.nom_fichier || piece.titre
                                          )
                                        }
                                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                      >
                                        Télécharger
                                      </button>
                                    </div>
                                  ) : piece.url ? (
                                    <a
                                      href={piece.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                                    >
                                      Ouvrir le lien
                                    </a>
                                  ) : null}
                                </div>
                              ))}
                            </div>

                            {ma_remise?.statut !== 'EVALUE' && (
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                <Bouton
                                  type="button"
                                  variante="secondaire"
                                  taille="sm"
                                  onClick={() =>
                                    annuler_remise_devoir_lms(
                                      devoir_actif.id,
                                      apprenant_connecte.id
                                    )
                                  }
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Annuler la remise</span>
                                </Bouton>
                              </div>
                            )}
                          </div>
                        ) : (
                          <form onSubmit={gerer_depot_apprenant} className="space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                Ajouter ou créer ({pieces_remise_brouillon.length} pièce(s))
                              </span>
                              <div>
                                <input
                                  ref={ref_input_fichiers_apprenant}
                                  type="file"
                                  multiple
                                  onChange={(e) =>
                                    void gerer_ajout_fichiers_apprenant(e.target.files)
                                  }
                                  className="hidden"
                                  id="upload-fichiers-remise-apprenant"
                                />
                                <label
                                  htmlFor="upload-fichiers-remise-apprenant"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>
                                    {televersement_en_cours_apprenant
                                      ? 'Importation...'
                                      : 'Importer un fichier depuis mon appareil'}
                                  </span>
                                </label>
                              </div>
                            </div>

                            {pieces_remise_brouillon.length > 0 && (
                              <div className="space-y-1.5">
                                {pieces_remise_brouillon.map((pj) => (
                                  <div
                                    key={pj.id}
                                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                        {pj.nom_fichier || pj.titre}
                                      </div>
                                      <div className="text-[11px] text-slate-400 font-mono">
                                        {pj.id_fichier_local
                                          ? `Prêt à remettre · ${formater_taille_fichier(pj.taille_octets)}`
                                          : pj.url}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        definir_pieces_remise_brouillon((prec) =>
                                          prec.filter((x) => x.id !== pj.id)
                                        )
                                      }
                                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                              <input
                                type="text"
                                value={titre_lien_remise}
                                onChange={(e) => definir_titre_lien_remise(e.target.value)}
                                placeholder="Intitulé lien (optionnel)"
                                className="sm:col-span-4 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                              />
                              <input
                                type="url"
                                value={lien_remise_apprenant}
                                onChange={(e) => definir_lien_remise_apprenant(e.target.value)}
                                placeholder="Ou coller un lien Drive / Git (https://...)"
                                className="sm:col-span-6 px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                              />
                              <button
                                type="button"
                                onClick={gerer_ajout_lien_apprenant}
                                disabled={!lien_remise_apprenant.trim()}
                                className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-semibold text-indigo-600 dark:text-indigo-400 disabled:opacity-40 cursor-pointer"
                              >
                                + Lien
                              </button>
                            </div>

                            <div>
                              <label className="block font-semibold mb-1">
                                Commentaire privé pour l’enseignant
                              </label>
                              <input
                                type="text"
                                value={commentaire_remise_apprenant}
                                onChange={(e) =>
                                  definir_commentaire_remise_apprenant(e.target.value)
                                }
                                placeholder="Précisions sur votre travail..."
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                              />
                            </div>

                            <Bouton
                              type="submit"
                              variante="principal"
                              taille="sm"
                              classe_accent={theme_etab.bouton_principal}
                              disabled={devoir_actif.statut === 'CLOTURE'}
                            >
                              <UploadCloud className="w-4 h-4" />
                              <span>
                                {devoir_actif.statut === 'CLOTURE'
                                  ? 'Devoir clôturé'
                                  : 'Rendre le devoir'}
                              </span>
                            </Bouton>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Flux des commentaires du cours */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Commentaires ajoutés au cours (
                          {devoir_actif.commentaires_classe?.length ?? 0})
                        </span>
                      </h4>
                      {devoir_actif.commentaires_classe &&
                        devoir_actif.commentaires_classe.length > 0 && (
                          <div className="space-y-2">
                            {devoir_actif.commentaires_classe.map((com) => (
                              <div
                                key={com.id}
                                className="rounded-lg bg-slate-50 dark:bg-slate-900/60 px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {com.nom_auteur} ·{' '}
                                    <span className="font-normal text-slate-500">
                                      {com.role_auteur}
                                    </span>
                                  </span>
                                  <span className="font-mono text-slate-400">{com.cree_le}</span>
                                </div>
                                <p className="mt-1 text-slate-700 dark:text-slate-300">
                                  {com.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                      {!est_super_admin && (
                        <form onSubmit={gerer_envoi_commentaire_cours} className="flex gap-2">
                          <input
                            type="text"
                            value={nouveau_commentaire_cours}
                            onChange={(e) => definir_nouveau_commentaire_cours(e.target.value)}
                            placeholder="Ajouter un commentaire pour la classe..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                          />
                          <Bouton
                            type="submit"
                            variante="secondaire"
                            taille="sm"
                            disabled={!nouveau_commentaire_cours.trim()}
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Publier</span>
                          </Bouton>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {/* Sous-onglet Travaux des apprenants (Notation Classroom Enseignant) */}
                {!est_vue_apprenant && sous_onglet_devoir === 'copies' && (
                  <div className="space-y-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {compteurs_devoir_actif.remis} remis
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                          {compteurs_devoir_actif.evalues} noté(s)
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          {compteurs_devoir_actif.a_revoir} à revoir
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">
                          {compteurs_devoir_actif.assignes} attribué(s)
                        </span>
                      </div>

                      <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {(
                          [
                            { id: 'TOUS', libelle: 'Tous' },
                            { id: 'A_CORRIGER', libelle: 'À corriger' },
                            { id: 'EVALUE', libelle: 'Notés' },
                            { id: 'ASSIGNE', libelle: 'Assignés' },
                          ] as const
                        ).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => definir_filtre_statut_copie(f.id)}
                            className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                              filtre_statut_copie === f.id
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {f.libelle}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <div className="md:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
                        {copies_filtrees.length === 0 ? (
                          <div className="p-4 text-center text-slate-500">
                            Aucune copie dans ce filtre.
                          </div>
                        ) : (
                          copies_filtrees.map((copie) => {
                            const selectionnee =
                              copie_selectionnee?.id_apprenant === copie.id_apprenant;
                            return (
                              <button
                                key={copie.id_apprenant}
                                type="button"
                                onClick={() => definir_id_apprenant_copie(copie.id_apprenant)}
                                className={`w-full text-left px-3 py-2.5 transition-colors cursor-pointer ${
                                  selectionnee
                                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {copie.nom_complet}
                                  </span>
                                  {copie.remise?.note_attribuee !== undefined ? (
                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">
                                      {copie.remise.note_attribuee}/{devoir_actif.points_max}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-0.5 text-[11px]">
                                  <span className="font-mono text-slate-400">{copie.matricule}</span>
                                  <span
                                    className={
                                      copie.statut === 'EVALUE'
                                        ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                                        : copie.statut === 'REMIS'
                                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                          : copie.statut === 'RENDU_EN_RETARD' ||
                                              copie.statut === 'A_REVOIR'
                                            ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                            : 'text-slate-400'
                                    }
                                  >
                                    {LIBELLES_STATUT_REMISE[copie.statut]}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* Panneau d'évaluation de la copie sélectionnée */}
                      <div className="md:col-span-7 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/40 dark:bg-slate-900/30">
                        {!copie_selectionnee ? (
                          <div className="py-8 text-center text-slate-500">
                            Sélectionnez un apprenant pour consulter et corriger sa copie.
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                              <div>
                                <div className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                                  {copie_selectionnee.nom_complet}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {copie_selectionnee.matricule} ·{' '}
                                  {LIBELLES_STATUT_REMISE[copie_selectionnee.statut]}
                                  {copie_selectionnee.remise?.remis_le
                                    ? ` · Remis le ${copie_selectionnee.remise.remis_le}`
                                    : ''}
                                </div>
                              </div>
                            </div>

                            {/* Livrables soumis (multi-fichiers ou lien) */}
                            {(() => {
                              const rem = copie_selectionnee.remise;
                              const pieces =
                                rem?.pieces_remises && rem.pieces_remises.length > 0
                                  ? rem.pieces_remises
                                  : rem &&
                                      (rem.nom_fichier ||
                                        rem.lien_ou_fichier ||
                                        rem.id_fichier_local)
                                    ? [
                                        {
                                          id: `legacy-${rem.id}`,
                                          titre:
                                            rem.nom_fichier ||
                                            rem.lien_ou_fichier ||
                                            'Copie remise',
                                          type: (rem.id_fichier_local ? 'Dépôt' : 'Lien') as
                                            | 'Dépôt'
                                            | 'Lien',
                                          url: rem.lien_ou_fichier || '',
                                          id_fichier_local: rem.id_fichier_local,
                                          nom_fichier: rem.nom_fichier,
                                          taille_octets: rem.taille_octets,
                                        },
                                      ]
                                    : [];

                              if (pieces.length === 0) {
                                return (
                                  <div className="rounded-lg bg-white dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 p-2.5 text-[11px] text-slate-500 flex items-center gap-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Aucun fichier remis pour le moment.</span>
                                  </div>
                                );
                              }

                              return (
                                <div className="rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 space-y-2">
                                  {pieces.map((p) => (
                                    <div
                                      key={p.id}
                                      className="flex items-center justify-between gap-2"
                                    >
                                      <div className="min-w-0 flex items-center gap-1.5">
                                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                          {p.nom_fichier || p.titre}
                                        </span>
                                        {p.taille_octets && (
                                          <span className="text-[11px] font-mono text-slate-400 shrink-0">
                                            ({formater_taille_fichier(p.taille_octets)})
                                          </span>
                                        )}
                                      </div>
                                      {p.id_fichier_local ? (
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void ouvrir_apercu_ou_telecharger(
                                                p.id_fichier_local,
                                                p.nom_fichier || p.titre
                                              )
                                            }
                                            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                          >
                                            Aperçu
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void declencher_telechargement(
                                                p.id_fichier_local,
                                                p.nom_fichier || p.titre
                                              )
                                            }
                                            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                          >
                                            Télécharger
                                          </button>
                                        </div>
                                      ) : p.url ? (
                                        <a
                                          href={p.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                                        >
                                          <Link2 className="w-3 h-3 shrink-0" />
                                          <span>Ouvrir le lien</span>
                                        </a>
                                      ) : null}
                                    </div>
                                  ))}
                                  {rem?.commentaire_apprenant && (
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                                      « {rem.commentaire_apprenant} »
                                    </p>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Notation par critères de grille */}
                            {devoir_actif.criteres_grille &&
                              devoir_actif.criteres_grille.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                                    Grille d’évaluation par critères
                                  </div>
                                  {devoir_actif.criteres_grille.map((crit) => (
                                    <div
                                      key={crit.id}
                                      className="flex items-center justify-between gap-2 bg-white dark:bg-slate-950 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800"
                                    >
                                      <span className="truncate text-slate-700 dark:text-slate-300">
                                        {crit.titre}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <input
                                          type="number"
                                          step="0.5"
                                          min={0}
                                          max={crit.points_max}
                                          disabled={!peut_gerer}
                                          value={notes_criteres_saisie[crit.id] ?? 0}
                                          onChange={(e) =>
                                            gerer_modification_critere_note(
                                              crit.id,
                                              Number(e.target.value),
                                              crit.points_max
                                            )
                                          }
                                          className="w-16 px-1.5 py-0.5 font-mono text-right rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-60"
                                        />
                                        <span className="font-mono text-slate-400 tabular-nums">
                                          /{crit.points_max}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                            {/* Note globale & commentaire */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                              <div>
                                <label className="block font-semibold mb-1">
                                  Note totale (/{devoir_actif.points_max})
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min={0}
                                  max={devoir_actif.points_max}
                                  disabled={!peut_gerer}
                                  value={note_totale_saisie}
                                  onChange={(e) => definir_note_totale_saisie(e.target.value)}
                                  placeholder="—"
                                  className="w-full px-2.5 py-1.5 font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
                                />
                              </div>
                              <label className="sm:col-span-2 flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer pb-1.5">
                                <input
                                  type="checkbox"
                                  disabled={!peut_gerer}
                                  checked={synchroniser_bulletin_saisie}
                                  onChange={(e) =>
                                    definir_synchroniser_bulletin_saisie(e.target.checked)
                                  }
                                  className="rounded border-slate-300"
                                />
                                <span>
                                  Reporter la note au relevé officiel (/
                                  {etablissement_actif.echelle_notation})
                                </span>
                              </label>
                            </div>

                            <div>
                              <label className="block font-semibold mb-1">
                                Commentaire privé de correction
                              </label>
                              <textarea
                                rows={2}
                                disabled={!peut_gerer}
                                value={commentaire_enseignant_saisie}
                                onChange={(e) =>
                                  definir_commentaire_enseignant_saisie(e.target.value)
                                }
                                placeholder="Points forts, axes d’amélioration..."
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
                              />
                            </div>

                            {peut_gerer ? (
                              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                                <Bouton
                                  type="button"
                                  variante="secondaire"
                                  taille="sm"
                                  onClick={() => gerer_rendre_copie_enseignant('A_REVOIR')}
                                >
                                  Demander révision
                                </Bouton>
                                <Bouton
                                  type="button"
                                  variante="principal"
                                  taille="sm"
                                  classe_accent={theme_etab.bouton_principal}
                                  disabled={!note_totale_saisie}
                                  onClick={() => gerer_rendre_copie_enseignant('EVALUE')}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Rendre la copie</span>
                                </Bouton>
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-500 italic">
                                Correction désactivée en mode lecture seule ({id_role_actif}).
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </Carte>
        </div>
      )}

      {/* Onglet 2 : Supports de cours (avec véritable upload de fichier enseignant) */}
      {onglet === 'ressources' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {peut_gerer && (
            <Carte className="lg:col-span-4">
              <h3 className="text-sm font-display font-bold mb-3">Publier un support de cours</h3>
              <form onSubmit={gerer_publication_ressource} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">
                    {terminologie.contenu_singulier}
                  </label>
                  <select
                    value={id_element_ressource}
                    onChange={(e) => definir_id_element_ressource(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {elements_etablissement.map((el) => (
                      <option key={el.id} value={el.id}>
                        {el.code} — {el.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Type de contenu</label>
                  <select
                    value={type_ressource}
                    onChange={(e) =>
                      definir_type_ressource(
                        e.target.value as RessourcePedagogiqueLms['type_ressource']
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Cours PDF">Cours PDF</option>
                    <option value="Vidéo / Replay">Vidéo / Replay</option>
                    <option value="Lien Visio">Lien Visio</option>
                    <option value="Support TP / Quiz">Support TP / Quiz</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => definir_mode_source_ressource('fichier')}
                    className={`py-1.5 rounded-md font-medium cursor-pointer ${
                      mode_source_ressource === 'fichier'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Importer un fichier
                  </button>
                  <button
                    type="button"
                    onClick={() => definir_mode_source_ressource('lien')}
                    className={`py-1.5 rounded-md font-medium cursor-pointer ${
                      mode_source_ressource === 'lien'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Lien externe
                  </button>
                </div>

                {mode_source_ressource === 'fichier' ? (
                  <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-3 space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
                    <input
                      ref={ref_input_fichier_ressource}
                      type="file"
                      onChange={(e) => void gerer_televersement_fichier_ressource(e.target.files)}
                      className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:bg-indigo-50 dark:file:bg-indigo-950/50 file:text-indigo-700 dark:file:text-indigo-300 file:font-semibold"
                    />
                    {fichier_ressource_televerse && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Prêt : {fichier_ressource_televerse.nom_fichier} (
                        {formater_taille_fichier(fichier_ressource_televerse.taille_octets)})
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold mb-1">Lien ou code d’accès</label>
                    <input
                      type="url"
                      value={url_ressource}
                      onChange={(e) => definir_url_ressource(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold mb-1">Titre du support *</label>
                  <input
                    type="text"
                    value={titre_ressource}
                    onChange={(e) => definir_titre_ressource(e.target.value)}
                    placeholder="Ex : Chapitre 4 — Équations différentielles"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <Bouton
                  type="submit"
                  variante="principal"
                  taille="sm"
                  classe_accent={theme_etab.bouton_principal}
                >
                  <Plus className="w-4 h-4" />
                  <span>Publier sur le campus</span>
                </Bouton>
              </form>
            </Carte>
          )}

          <Carte className={peut_gerer ? 'lg:col-span-8' : 'lg:col-span-12'}>
            <h3 className="text-sm font-display font-bold mb-3">
              Bibliothèque de cours en ligne ({ressources_filtrees.length})
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {ressources_filtrees.map((ressource) => {
                const element = elements_etablissement.find(
                  (el) => el.id === ressource.id_element
                );
                const unite = unites_etablissement.find((u) => u.id === ressource.id_unite);
                return (
                  <div
                    key={ressource.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                        {ressource.type_ressource === 'Vidéo / Replay' ||
                        ressource.type_ressource === 'Lien Visio' ? (
                          <Video className="w-4 h-4" />
                        ) : ressource.type_ressource === 'Cours PDF' ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <Laptop className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {ressource.titre}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {element?.code ?? ''} · {unite?.nom ?? ''} · {ressource.nom_auteur} ·{' '}
                          <span className="font-mono">{formater_date_fr(ressource.publie_le)}</span>
                          {ressource.taille_octets
                            ? ` · ${formater_taille_fichier(ressource.taille_octets)}`
                            : ''}
                        </div>
                      </div>
                    </div>
                    {ressource.id_fichier_local ? (
                      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                        <Bouton
                          variante="secondaire"
                          taille="sm"
                          onClick={() =>
                            void ouvrir_apercu_ou_telecharger(
                              ressource.id_fichier_local,
                              ressource.nom_fichier || ressource.titre
                            )
                          }
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Aperçu</span>
                        </Bouton>
                        <Bouton
                          variante="secondaire"
                          taille="sm"
                          onClick={() =>
                            void declencher_telechargement(
                              ressource.id_fichier_local,
                              ressource.nom_fichier || ressource.titre
                            )
                          }
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Télécharger</span>
                        </Bouton>
                      </div>
                    ) : (
                      <a
                        href={ressource.url_ou_code}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 self-start sm:self-center"
                      >
                        <span>{ressource.type_ressource}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </Carte>
        </div>
      )}

      {/* Modale d'aperçu intégré des fichiers téléversés */}
      <Modale
        ouverte={Boolean(apercu_fichier)}
        sur_fermeture={fermer_apercu_fichier}
        titre={apercu_fichier?.nom_fichier ?? 'Aperçu du document'}
        sous_titre={apercu_fichier?.type_mime ?? ''}
        classe_largeur_max="max-w-3xl"
        pied_page={
          <div className="flex items-center justify-end gap-2">
            <Bouton variante="fantome" onClick={fermer_apercu_fichier}>
              Fermer
            </Bouton>
            {apercu_fichier && (
              <Bouton
                variante="principal"
                classe_accent={theme_etab.bouton_principal}
                onClick={() =>
                  void declencher_telechargement(
                    apercu_fichier.id_fichier_local,
                    apercu_fichier.nom_fichier
                  )
                }
              >
                <Download className="w-4 h-4" />
                <span>Télécharger</span>
              </Bouton>
            )}
          </div>
        }
      >
        {apercu_fichier && (
          <div className="space-y-3 text-xs">
            {apercu_fichier.type_mime.startsWith('image/') ? (
              <div className="flex justify-center bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <img
                  src={apercu_fichier.url}
                  alt={apercu_fichier.nom_fichier}
                  className="max-h-[65vh] object-contain rounded"
                />
              </div>
            ) : apercu_fichier.type_mime === 'application/pdf' ||
              apercu_fichier.type_mime.startsWith('text/') ? (
              <iframe
                src={apercu_fichier.url}
                title={apercu_fichier.nom_fichier}
                className="w-full h-[65vh] rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
              />
            ) : (
              <div className="py-10 text-center space-y-2 text-slate-600 dark:text-slate-300">
                <FileText className="w-8 h-8 mx-auto text-slate-400" />
                <p className="font-semibold">{apercu_fichier.nom_fichier}</p>
                <p className="text-slate-500">
                  L’aperçu navigateur n’est pas pris en charge pour ce format ({apercu_fichier.type_mime}). Utilisez le bouton Télécharger ci-dessous.
                </p>
              </div>
            )}
          </div>
        )}
      </Modale>
    </div>
  );
};
