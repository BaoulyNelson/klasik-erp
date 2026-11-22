import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookMarked,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit3,
  Layers,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { utiliserErp } from '../../contexte/ContexteErp';
import {
  ArticleInventaire,
  CategorieMateriel,
  EmpruntBibliotheque,
  EtatMateriel,
  LivreBibliotheque,
  PretMateriel,
} from '../../modeles/erp';
import { formater_date_fr } from '../../services/service_donnees';

const CATEGORIES_MATERIEL: CategorieMateriel[] = [
  'Atelier',
  'Laboratoire',
  'Informatique',
  'Mobilier',
  'Uniformes',
  'Audiovisuel',
  'Sécurité & EPI',
];

const ETATS_MATERIEL: EtatMateriel[] = ['Neuf', 'Bon état', 'À réparer', 'Hors service'];

const SUPPORTS_LIVRE: NonNullable<LivreBibliotheque['type_support']>[] = [
  'Ouvrage papier',
  'Manuel technique',
  'Revue / Périodique',
  'Ouvrage numérique',
];

function classe_etat_materiel(etat: EtatMateriel): string {
  if (etat === 'Neuf') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/70';
  }
  if (etat === 'Bon état') {
    return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
  }
  if (etat === 'À réparer') {
    return 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/70';
  }
  return 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/70';
}

export const VueBibliothequeMateriels: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    utilisateur_actif,
    id_role_actif,
    a_permission,
    apprenants_etablissement,
    enseignants_etablissement,
    unites_etablissement,
    livres_bibliotheque_etablissement,
    emprunts_bibliotheque_etablissement,
    inventaire_etablissement,
    prets_materiels_etablissement,
    ajouter_livre_bibliotheque,
    mettre_a_jour_livre_bibliotheque,
    supprimer_livre_bibliotheque,
    emprunter_livre,
    retourner_livre,
    prolonger_emprunt_livre,
    ajouter_article_inventaire,
    mettre_a_jour_article_inventaire,
    supprimer_article_inventaire,
    preter_materiel,
    retourner_materiel,
  } = utiliserErp();

  const theme = obtenir_theme_etablissement(etablissement_actif.type);
  const peut_gerer = a_permission('bibliotheque_materiels:gerer') && id_role_actif !== 'SUPER_ADMIN';
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const [onglet_actif, definir_onglet_actif] = useState<'bibliotheque' | 'materiels'>('bibliotheque');

  // Filtres Bibliothèque
  const [recherche_livre, definir_recherche_livre] = useState('');
  const [filtre_categorie_livre, definir_filtre_categorie_livre] = useState('TOUTES');
  const [filtre_dispo_livre, definir_filtre_dispo_livre] = useState<'TOUS' | 'DISPO' | 'EPUISE'>('TOUS');
  const [filtre_emprunts, definir_filtre_emprunts] = useState<'ACTIFS' | 'RETARD' | 'HISTORIQUE'>('ACTIFS');

  // Filtres Matériels
  const [recherche_materiel, definir_recherche_materiel] = useState('');
  const [filtre_categorie_materiel, definir_filtre_categorie_materiel] = useState<string>('TOUTES');
  const [filtre_etat_materiel, definir_filtre_etat_materiel] = useState<string>('TOUS');
  const [seulement_alertes, definir_seulement_alertes] = useState(false);
  const [filtre_prets_materiel, definir_filtre_prets_materiel] = useState<
    'ACTIFS' | 'RETARD' | 'HISTORIQUE'
  >('ACTIFS');

  // Modale ajout / édition livre
  const [modale_livre_ouverte, definir_modale_livre_ouverte] = useState(false);
  const [livre_en_edition, definir_livre_en_edition] = useState<LivreBibliotheque | null>(null);
  const [form_livre, definir_form_livre] = useState({
    isbn: '',
    titre: '',
    auteur: '',
    categorie: '',
    type_support: 'Ouvrage papier' as NonNullable<LivreBibliotheque['type_support']>,
    cote_rayonnage: '',
    emplacement: '',
    editeur: '',
    annee_edition: String(new Date().getFullYear()),
    exemplaires_totaux: 5,
    exemplaires_disponibles: 5,
  });

  // Modale prêt de livre
  const [livre_a_preter, definir_livre_a_preter] = useState<LivreBibliotheque | null>(null);
  const [id_emprunteur_livre, definir_id_emprunteur_livre] = useState(
    apprenants_etablissement[0]?.id ?? ''
  );
  const [date_retour_livre, definir_date_retour_livre] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [remarque_pret_livre, definir_remarque_pret_livre] = useState('');

  // Modale retour de livre
  const [emprunt_a_retourner, definir_emprunt_a_retourner] =
    useState<EmpruntBibliotheque | null>(null);
  const [etat_retour_livre, definir_etat_retour_livre] =
    useState<NonNullable<EmpruntBibliotheque['etat_retour']>>('Bon état');
  const [remarque_retour_livre, definir_remarque_retour_livre] = useState('');

  // Modale ajout / édition matériel
  const [modale_materiel_ouverte, definir_modale_materiel_ouverte] = useState(false);
  const [materiel_en_edition, definir_materiel_en_edition] = useState<ArticleInventaire | null>(
    null
  );
  const [form_materiel, definir_form_materiel] = useState({
    code: '',
    nom: '',
    categorie: 'Atelier' as CategorieMateriel,
    quantite: 1,
    quantite_disponible: 1,
    seuil_alerte: 2,
    etat: 'Neuf' as EtatMateriel,
    emplacement: '',
    numero_serie: '',
    date_verification: aujourdhui,
    notes_maintenance: '',
  });

  const [cible_suppression_livre, definir_cible_suppression_livre] =
    useState<LivreBibliotheque | null>(null);
  const [cible_suppression_materiel, definir_cible_suppression_materiel] =
    useState<ArticleInventaire | null>(null);

  // Modale prêt matériel
  const [materiel_a_preter, definir_materiel_a_preter] = useState<ArticleInventaire | null>(null);
  const [pret_mat_type, definir_pret_mat_type] =
    useState<PretMateriel['type_emprunteur']>('Apprenant');
  const [pret_mat_id_apprenant, definir_pret_mat_id_apprenant] = useState(
    apprenants_etablissement[0]?.id ?? ''
  );
  const [pret_mat_id_enseignant, definir_pret_mat_id_enseignant] = useState(
    enseignants_etablissement[0]?.id ?? ''
  );
  const [pret_mat_salle, definir_pret_mat_salle] = useState('');
  const [pret_mat_quantite, definir_pret_mat_quantite] = useState(1);
  const [pret_mat_retour_prevu, definir_pret_mat_retour_prevu] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [pret_mat_remarque, definir_pret_mat_remarque] = useState('');

  // Modale retour matériel
  const [pret_mat_a_retourner, definir_pret_mat_a_retourner] = useState<PretMateriel | null>(null);
  const [etat_retour_mat, definir_etat_retour_mat] = useState<EtatMateriel>('Bon état');
  const [remarque_retour_mat, definir_remarque_retour_mat] = useState('');

  // Identification éventuelle de l'apprenant connecté
  const apprenant_courant = useMemo(() => {
    if (id_role_actif !== 'APPRENANT') return null;
    return (
      apprenants_etablissement.find(
        (a) => (a.courriel ?? '').toLowerCase() === utilisateur_actif.courriel.toLowerCase()
      ) ?? apprenants_etablissement[0] ?? null
    );
  }, [id_role_actif, apprenants_etablissement, utilisateur_actif.courriel]);

  // Statistiques globales
  const stats = useMemo(() => {
    const total_exemplaires_livres = livres_bibliotheque_etablissement.reduce(
      (acc, l) => acc + l.exemplaires_totaux,
      0
    );
    const dispo_exemplaires_livres = livres_bibliotheque_etablissement.reduce(
      (acc, l) => acc + l.exemplaires_disponibles,
      0
    );
    const emprunts_actifs = emprunts_bibliotheque_etablissement.filter((e) => !e.retourne_le);
    const emprunts_en_retard = emprunts_actifs.filter((e) => e.retour_prevu_le < aujourdhui);

    const total_unites_materiel = inventaire_etablissement.reduce((acc, i) => acc + i.quantite, 0);
    const dispo_unites_materiel = inventaire_etablissement.reduce(
      (acc, i) => acc + (i.quantite_disponible ?? i.quantite),
      0
    );
    const alertes_materiel = inventaire_etablissement.filter((i) => {
      const dispo = i.quantite_disponible ?? i.quantite;
      return (
        i.etat === 'À réparer' ||
        i.etat === 'Hors service' ||
        dispo <= (i.seuil_alerte ?? 2)
      );
    });
    const prets_mat_actifs = prets_materiels_etablissement.filter((p) => !p.retourne_le);
    const prets_mat_retard = prets_mat_actifs.filter((p) => p.retour_prevu_le < aujourdhui);

    return {
      total_exemplaires_livres,
      dispo_exemplaires_livres,
      emprunts_actifs: emprunts_actifs.length,
      emprunts_en_retard: emprunts_en_retard.length,
      total_unites_materiel,
      dispo_unites_materiel,
      alertes_materiel: alertes_materiel.length,
      prets_mat_actifs: prets_mat_actifs.length,
      prets_mat_retard: prets_mat_retard.length,
    };
  }, [
    livres_bibliotheque_etablissement,
    emprunts_bibliotheque_etablissement,
    inventaire_etablissement,
    prets_materiels_etablissement,
    aujourdhui,
  ]);

  const categories_livres = useMemo(
    () => Array.from(new Set(livres_bibliotheque_etablissement.map((l) => l.categorie))).sort(),
    [livres_bibliotheque_etablissement]
  );

  const livres_filtres = useMemo(() => {
    const q = recherche_livre.trim().toLowerCase();
    return livres_bibliotheque_etablissement.filter((livre) => {
      const ok_q =
        !q ||
        livre.titre.toLowerCase().includes(q) ||
        livre.auteur.toLowerCase().includes(q) ||
        livre.isbn.toLowerCase().includes(q) ||
        (livre.cote_rayonnage ?? '').toLowerCase().includes(q);
      const ok_cat =
        filtre_categorie_livre === 'TOUTES' || livre.categorie === filtre_categorie_livre;
      const ok_dispo =
        filtre_dispo_livre === 'TOUS' ||
        (filtre_dispo_livre === 'DISPO' && livre.exemplaires_disponibles > 0) ||
        (filtre_dispo_livre === 'EPUISE' && livre.exemplaires_disponibles === 0);
      return ok_q && ok_cat && ok_dispo;
    });
  }, [
    livres_bibliotheque_etablissement,
    recherche_livre,
    filtre_categorie_livre,
    filtre_dispo_livre,
  ]);

  const emprunts_filtres = useMemo(() => {
    const base =
      id_role_actif === 'APPRENANT' && apprenant_courant
        ? emprunts_bibliotheque_etablissement.filter((e) => e.id_apprenant === apprenant_courant.id)
        : emprunts_bibliotheque_etablissement;
    return base.filter((e) => {
      if (filtre_emprunts === 'HISTORIQUE') return Boolean(e.retourne_le);
      if (filtre_emprunts === 'RETARD') return !e.retourne_le && e.retour_prevu_le < aujourdhui;
      return !e.retourne_le;
    });
  }, [emprunts_bibliotheque_etablissement, filtre_emprunts, aujourdhui, id_role_actif, apprenant_courant]);

  const materiels_filtres = useMemo(() => {
    const q = recherche_materiel.trim().toLowerCase();
    return inventaire_etablissement.filter((item) => {
      const ok_q =
        !q ||
        item.nom.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.emplacement.toLowerCase().includes(q) ||
        (item.numero_serie ?? '').toLowerCase().includes(q);
      const ok_cat =
        filtre_categorie_materiel === 'TOUTES' || item.categorie === filtre_categorie_materiel;
      const ok_etat = filtre_etat_materiel === 'TOUS' || item.etat === filtre_etat_materiel;
      const dispo = item.quantite_disponible ?? item.quantite;
      const est_alerte =
        item.etat === 'À réparer' ||
        item.etat === 'Hors service' ||
        dispo <= (item.seuil_alerte ?? 2);
      const ok_alerte = !seulement_alertes || est_alerte;
      return ok_q && ok_cat && ok_etat && ok_alerte;
    });
  }, [
    inventaire_etablissement,
    recherche_materiel,
    filtre_categorie_materiel,
    filtre_etat_materiel,
    seulement_alertes,
  ]);

  const prets_materiels_filtres = useMemo(() => {
    const base =
      id_role_actif === 'APPRENANT' && apprenant_courant
        ? prets_materiels_etablissement.filter((p) => p.id_apprenant === apprenant_courant.id)
        : prets_materiels_etablissement;
    return base.filter((p) => {
      if (filtre_prets_materiel === 'HISTORIQUE') return Boolean(p.retourne_le);
      if (filtre_prets_materiel === 'RETARD')
        return !p.retourne_le && p.retour_prevu_le < aujourdhui;
      return !p.retourne_le;
    });
  }, [
    prets_materiels_etablissement,
    filtre_prets_materiel,
    aujourdhui,
    id_role_actif,
    apprenant_courant,
  ]);

  const ouvrir_creation_livre = () => {
    definir_livre_en_edition(null);
    definir_form_livre({
      isbn: '',
      titre: '',
      auteur: '',
      categorie: categories_livres[0] ?? 'Général',
      type_support: 'Ouvrage papier',
      cote_rayonnage: '',
      emplacement: 'Bibliothèque centrale',
      editeur: '',
      annee_edition: String(new Date().getFullYear()),
      exemplaires_totaux: 5,
      exemplaires_disponibles: 5,
    });
    definir_modale_livre_ouverte(true);
  };

  const ouvrir_edition_livre = (livre: LivreBibliotheque) => {
    definir_livre_en_edition(livre);
    definir_form_livre({
      isbn: livre.isbn,
      titre: livre.titre,
      auteur: livre.auteur,
      categorie: livre.categorie,
      type_support: livre.type_support ?? 'Ouvrage papier',
      cote_rayonnage: livre.cote_rayonnage ?? '',
      emplacement: livre.emplacement ?? '',
      editeur: livre.editeur ?? '',
      annee_edition: livre.annee_edition ?? '',
      exemplaires_totaux: livre.exemplaires_totaux,
      exemplaires_disponibles: livre.exemplaires_disponibles,
    });
    definir_modale_livre_ouverte(true);
  };

  const valider_formulaire_livre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form_livre.titre.trim() || !form_livre.auteur.trim()) return;
    const charge = {
      isbn: form_livre.isbn.trim() || `978-2-${Math.floor(100000 + Math.random() * 899999)}`,
      titre: form_livre.titre.trim(),
      auteur: form_livre.auteur.trim(),
      categorie: form_livre.categorie.trim() || 'Général',
      type_support: form_livre.type_support,
      cote_rayonnage: form_livre.cote_rayonnage.trim() || undefined,
      emplacement: form_livre.emplacement.trim() || undefined,
      editeur: form_livre.editeur.trim() || undefined,
      annee_edition: form_livre.annee_edition.trim() || undefined,
      exemplaires_totaux: Number(form_livre.exemplaires_totaux) || 1,
      exemplaires_disponibles: Number(form_livre.exemplaires_disponibles) || 0,
    };
    if (livre_en_edition) {
      mettre_a_jour_livre_bibliotheque(livre_en_edition.id, charge);
    } else {
      ajouter_livre_bibliotheque({
        ...charge,
        exemplaires_disponibles: charge.exemplaires_totaux,
      });
    }
    definir_modale_livre_ouverte(false);
  };

  const ouvrir_creation_materiel = () => {
    definir_materiel_en_edition(null);
    definir_form_materiel({
      code: `${etablissement_actif.code}-MAT-${String(inventaire_etablissement.length + 1).padStart(2, '0')}`,
      nom: '',
      categorie: etablissement_actif.type === 'PRO' ? 'Atelier' : 'Informatique',
      quantite: 5,
      quantite_disponible: 5,
      seuil_alerte: 2,
      etat: 'Neuf',
      emplacement: unites_etablissement[0]?.nom ? `Salle ${unites_etablissement[0].code}` : 'Magasin central',
      numero_serie: '',
      date_verification: aujourdhui,
      notes_maintenance: '',
    });
    definir_modale_materiel_ouverte(true);
  };

  const ouvrir_edition_materiel = (article: ArticleInventaire) => {
    definir_materiel_en_edition(article);
    definir_form_materiel({
      code: article.code,
      nom: article.nom,
      categorie: article.categorie,
      quantite: article.quantite,
      quantite_disponible: article.quantite_disponible ?? article.quantite,
      seuil_alerte: article.seuil_alerte ?? 2,
      etat: article.etat,
      emplacement: article.emplacement,
      numero_serie: article.numero_serie ?? '',
      date_verification: article.date_verification ?? aujourdhui,
      notes_maintenance: article.notes_maintenance ?? '',
    });
    definir_modale_materiel_ouverte(true);
  };

  const valider_formulaire_materiel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form_materiel.nom.trim() || !form_materiel.code.trim()) return;
    const charge = {
      code: form_materiel.code.trim().toUpperCase(),
      nom: form_materiel.nom.trim(),
      categorie: form_materiel.categorie,
      quantite: Math.max(0, Number(form_materiel.quantite) || 0),
      quantite_disponible: Math.max(0, Number(form_materiel.quantite_disponible) || 0),
      seuil_alerte: Math.max(0, Number(form_materiel.seuil_alerte) || 0),
      etat: form_materiel.etat,
      emplacement: form_materiel.emplacement.trim() || 'Magasin central',
      numero_serie: form_materiel.numero_serie.trim() || undefined,
      date_verification: form_materiel.date_verification || undefined,
      notes_maintenance: form_materiel.notes_maintenance.trim() || undefined,
    };
    if (materiel_en_edition) {
      mettre_a_jour_article_inventaire(materiel_en_edition.id, charge);
    } else {
      ajouter_article_inventaire({
        ...charge,
        quantite: Math.max(1, charge.quantite),
        quantite_disponible: Math.max(1, charge.quantite),
      });
    }
    definir_modale_materiel_ouverte(false);
  };

  const valider_pret_materiel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materiel_a_preter) return;
    let emprunteur_nom = pret_mat_salle.trim();
    let id_apprenant: string | undefined;
    let id_enseignant: string | undefined;
    if (pret_mat_type === 'Apprenant') {
      const app = apprenants_etablissement.find((a) => a.id === pret_mat_id_apprenant);
      if (!app) return;
      id_apprenant = app.id;
      emprunteur_nom = `${app.prenom} ${app.nom} (${app.matricule})`;
    } else if (pret_mat_type === 'Enseignant') {
      const ens = enseignants_etablissement.find((t) => t.id === pret_mat_id_enseignant);
      if (!ens) return;
      id_enseignant = ens.id;
      emprunteur_nom = ens.nom_complet;
    } else if (!emprunteur_nom) {
      return;
    }
    const ok = preter_materiel({
      id_article: materiel_a_preter.id,
      quantite: Math.max(1, pret_mat_quantite),
      type_emprunteur: pret_mat_type,
      id_apprenant,
      id_enseignant,
      emprunteur_nom,
      remis_le: aujourdhui,
      retour_prevu_le: pret_mat_retour_prevu,
      remarque: pret_mat_remarque.trim() || undefined,
    });
    if (ok) {
      definir_materiel_a_preter(null);
      definir_pret_mat_remarque('');
      definir_pret_mat_quantite(1);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Bibliothèque & Matériels
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Catalogue des ouvrages, suivi des emprunts, parc matériel et maintenance —{' '}
            {etablissement_actif.nom_court}
          </p>
        </div>

        {peut_gerer && (
          <div className="flex flex-wrap items-center gap-2">
            <Bouton
              variante={onglet_actif === 'bibliotheque' ? 'principal' : 'secondaire'}
              taille="sm"
              classe_accent={onglet_actif === 'bibliotheque' ? theme.bouton_principal : undefined}
              onClick={ouvrir_creation_livre}
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un ouvrage</span>
            </Bouton>
            <Bouton
              variante={onglet_actif === 'materiels' ? 'principal' : 'secondaire'}
              taille="sm"
              classe_accent={onglet_actif === 'materiels' ? theme.bouton_principal : undefined}
              onClick={ouvrir_creation_materiel}
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un matériel</span>
            </Bouton>
          </div>
        )}
      </div>

      {/* Bandeau lecture seule pour Super-Admin ou utilisateurs sans droit de gestion */}
      {!peut_gerer && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-4 py-3 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            {id_role_actif === 'SUPER_ADMIN'
              ? 'Mode gouvernance SaaS (lecture seule) : le Super-administrateur supervise le catalogue et l’inventaire sans exécuter les prêts quotidiens.'
              : id_role_actif === 'APPRENANT'
                ? 'Consultation du catalogue des ouvrages et des équipements disponibles. Vos emprunts et prêts en cours s’affichent ci-dessous.'
                : 'Consultation du catalogue bibliothèque et de la disponibilité du parc matériel (droits de modification réservés à la Direction et aux Services).'}
          </div>
        </div>
      )}

      {/* Bandeau indicateurs clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Carte rembourrage="petit">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Catalogue Bibliothèque</span>
            <BookMarked className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {livres_bibliotheque_etablissement.length}
            </span>
            <span className="text-xs text-slate-500">titres</span>
          </div>
          <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {stats.dispo_exemplaires_livres} / {stats.total_exemplaires_livres} exemplaires disponibles
          </div>
        </Carte>

        <Carte rembourrage="petit">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Prêts de livres</span>
            <CalendarClock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {stats.emprunts_actifs}
            </span>
            <span className="text-xs text-slate-500">en cours</span>
          </div>
          <div
            className={`mt-1 text-[11px] font-medium ${
              stats.emprunts_en_retard > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {stats.emprunts_en_retard > 0
              ? `${stats.emprunts_en_retard} retour(s) en retard`
              : 'Aucun retard de restitution'}
          </div>
        </Carte>

        <Carte rembourrage="petit">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Parc Matériels</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {inventaire_etablissement.length}
            </span>
            <span className="text-xs text-slate-500">références</span>
          </div>
          <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {stats.dispo_unites_materiel} / {stats.total_unites_materiel} unités en stock
          </div>
        </Carte>

        <Carte rembourrage="petit">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Affectations & Alertes</span>
            <Wrench className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {stats.prets_mat_actifs}
            </span>
            <span className="text-xs text-slate-500">prêts actifs</span>
          </div>
          <div
            className={`mt-1 text-[11px] font-medium ${
              stats.alertes_materiel > 0 || stats.prets_mat_retard > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {stats.alertes_materiel} alerte(s) stock/maintenance · {stats.prets_mat_retard} retard(s)
          </div>
        </Carte>
      </div>

      {/* Sélecteur d'onglet principal */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => definir_onglet_actif('bibliotheque')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            onglet_actif === 'bibliotheque'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Bibliothèque & Prêts ({livres_bibliotheque_etablissement.length})</span>
        </button>
        <button
          type="button"
          onClick={() => definir_onglet_actif('materiels')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            onglet_actif === 'materiels'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Matériels & Équipements ({inventaire_etablissement.length})</span>
        </button>
      </div>

      {/* ONGLET 1 : BIBLIOTHEQUE */}
      {onglet_actif === 'bibliotheque' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Catalogue des livres */}
          <Carte rembourrage="aucun" className="xl:col-span-7 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Catalogue des ouvrages ({livres_filtres.length})
                </h3>
                {peut_gerer && (
                  <Bouton variante="secondaire" taille="sm" onClick={ouvrir_creation_livre}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nouvel ouvrage</span>
                  </Bouton>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="relative sm:col-span-6">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={recherche_livre}
                    onChange={(e) => definir_recherche_livre(e.target.value)}
                    placeholder="Titre, auteur, ISBN ou cote..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <select
                  value={filtre_categorie_livre}
                  onChange={(e) => definir_filtre_categorie_livre(e.target.value)}
                  className="sm:col-span-3 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="TOUTES">Toutes catégories</option>
                  {categories_livres.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <select
                  value={filtre_dispo_livre}
                  onChange={(e) =>
                    definir_filtre_dispo_livre(e.target.value as 'TOUS' | 'DISPO' | 'EPUISE')
                  }
                  className="sm:col-span-3 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="TOUS">Tous statuts</option>
                  <option value="DISPO">Disponibles</option>
                  <option value="EPUISE">Épuisés (0 disp.)</option>
                </select>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {livres_filtres.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Aucun ouvrage ne correspond aux filtres sélectionnés.
                </div>
              ) : (
                livres_filtres.map((livre) => {
                  const disponible = livre.exemplaires_disponibles > 0;
                  return (
                    <div
                      key={livre.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {livre.cote_rayonnage && (
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {livre.cote_rayonnage}
                            </span>
                          )}
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {livre.titre}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {livre.auteur}
                          </span>
                          <span>·</span>
                          <span>{livre.categorie}</span>
                          {livre.type_support && (
                            <>
                              <span>·</span>
                              <span>{livre.type_support}</span>
                            </>
                          )}
                          <span>·</span>
                          <span className="font-mono text-[11px]">ISBN {livre.isbn}</span>
                        </div>
                        {(livre.emplacement || livre.editeur) && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex flex-wrap items-center gap-x-3">
                            {livre.emplacement && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {livre.emplacement}
                              </span>
                            )}
                            {livre.editeur && (
                              <span>
                                Éd. {livre.editeur}
                                {livre.annee_edition ? ` (${livre.annee_edition})` : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <div
                            className={`text-xs font-mono tabular-nums font-bold ${
                              disponible
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {livre.exemplaires_disponibles} / {livre.exemplaires_totaux}
                          </div>
                          <div className="text-[10px] text-slate-400">disponibles</div>
                        </div>

                        {peut_gerer && (
                          <>
                            <Bouton
                              variante="fantome"
                              taille="sm"
                              title="Modifier la fiche ouvrage"
                              onClick={() => ouvrir_edition_livre(livre)}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Bouton>
                            <Bouton
                              variante="fantome"
                              taille="sm"
                              title="Supprimer l’ouvrage"
                              onClick={() => definir_cible_suppression_livre(livre)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Bouton>
                            <Bouton
                              variante="secondaire"
                              taille="sm"
                              disabled={!disponible || apprenants_etablissement.length === 0}
                              onClick={() => {
                                definir_livre_a_preter(livre);
                                definir_id_emprunteur_livre(apprenants_etablissement[0]?.id ?? '');
                                definir_date_retour_livre(
                                  new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
                                );
                                definir_remarque_pret_livre('');
                              }}
                            >
                              Prêter
                            </Bouton>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Carte>

          {/* Suivi des emprunts et retours */}
          <Carte rembourrage="aucun" className="xl:col-span-5 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {id_role_actif === 'APPRENANT'
                    ? 'Mes emprunts de livres'
                    : 'Circulation & Retours'}
                </h3>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  {emprunts_filtres.length} dossier(s)
                </span>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(
                  [
                    { id: 'ACTIFS', libelle: 'En cours' },
                    { id: 'RETARD', libelle: `En retard (${stats.emprunts_en_retard})` },
                    { id: 'HISTORIQUE', libelle: 'Retournés' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => definir_filtre_emprunts(tab.id)}
                    className={`flex-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      filtre_emprunts === tab.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.libelle}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[540px] overflow-y-auto">
              {emprunts_filtres.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Aucun emprunt dans cette vue.
                </div>
              ) : (
                emprunts_filtres.map((emprunt) => {
                  const livre = livres_bibliotheque_etablissement.find(
                    (b) => b.id === emprunt.id_livre
                  );
                  const apprenant = apprenants_etablissement.find(
                    (a) => a.id === emprunt.id_apprenant
                  );
                  const en_retard = !emprunt.retourne_le && emprunt.retour_prevu_le < aujourdhui;

                  return (
                    <div key={emprunt.id} className="p-3.5 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {livre?.titre ?? emprunt.id_livre}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">
                              {apprenant
                                ? `${apprenant.prenom} ${apprenant.nom} (${apprenant.matricule})`
                                : emprunt.id_apprenant}
                            </span>
                          </div>
                        </div>

                        {emprunt.retourne_le ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/70 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            {emprunt.etat_retour ?? 'Retourné'}
                          </span>
                        ) : en_retard ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/70 shrink-0">
                            <AlertTriangle className="w-3 h-3" />
                            En retard
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shrink-0">
                            <Clock className="w-3 h-3" />
                            En prêt
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        <span>
                          Prêté : {formater_date_fr(emprunt.emprunte_le)} ·{' '}
                          {emprunt.retourne_le
                            ? `Retourné : ${formater_date_fr(emprunt.retourne_le)}`
                            : `Échéance : ${formater_date_fr(emprunt.retour_prevu_le)}`}
                        </span>
                        {(emprunt.prolongation_compteur ?? 0) > 0 && (
                          <span className="text-indigo-600 dark:text-indigo-400">
                            +{emprunt.prolongation_compteur} prolongation(s)
                          </span>
                        )}
                      </div>

                      {emprunt.remarque && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          Note : {emprunt.remarque}
                        </div>
                      )}

                      {!emprunt.retourne_le && peut_gerer && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Bouton
                            variante="fantome"
                            taille="sm"
                            onClick={() => prolonger_emprunt_livre(emprunt.id, 7)}
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            <span>+7 j</span>
                          </Bouton>
                          <Bouton
                            variante="secondaire"
                            taille="sm"
                            onClick={() => {
                              definir_emprunt_a_retourner(emprunt);
                              definir_etat_retour_livre('Bon état');
                              definir_remarque_retour_livre('');
                            }}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Enregistrer retour</span>
                          </Bouton>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Carte>
        </div>
      )}

      {/* ONGLET 2 : MATERIELS & EQUIPEMENTS */}
      {onglet_actif === 'materiels' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Inventaire des matériels */}
          <Carte rembourrage="aucun" className="xl:col-span-7 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Inventaire des matériels & équipements ({materiels_filtres.length})
                </h3>
                {peut_gerer && (
                  <Bouton variante="secondaire" taille="sm" onClick={ouvrir_creation_materiel}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nouvel équipement</span>
                  </Bouton>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="relative sm:col-span-5">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={recherche_materiel}
                    onChange={(e) => definir_recherche_materiel(e.target.value)}
                    placeholder="Code, équipement, salle ou n° série..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <select
                  value={filtre_categorie_materiel}
                  onChange={(e) => definir_filtre_categorie_materiel(e.target.value)}
                  className="sm:col-span-3 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="TOUTES">Toutes catégories</option>
                  {CATEGORIES_MATERIEL.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <select
                  value={filtre_etat_materiel}
                  onChange={(e) => definir_filtre_etat_materiel(e.target.value)}
                  className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="TOUS">Tous états</option>
                  {ETATS_MATERIEL.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => definir_seulement_alertes((p) => !p)}
                  className={`sm:col-span-2 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                    seulement_alertes
                      ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300'
                      : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  Alertes ({stats.alertes_materiel})
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {materiels_filtres.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Aucun matériel ne correspond aux filtres sélectionnés.
                </div>
              ) : (
                materiels_filtres.map((article) => {
                  const dispo = article.quantite_disponible ?? article.quantite;
                  const stock_bas = dispo <= (article.seuil_alerte ?? 2);
                  return (
                    <div
                      key={article.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {article.code}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {article.nom}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${classe_etat_materiel(
                              article.etat
                            )}`}
                          >
                            {article.etat}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {article.categorie}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {article.emplacement}
                          </span>
                          {article.numero_serie && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-[11px]">S/N {article.numero_serie}</span>
                            </>
                          )}
                        </div>

                        {(article.notes_maintenance || article.date_verification) && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {article.date_verification && (
                              <span className="font-mono">
                                Contrôle : {formater_date_fr(article.date_verification)}
                              </span>
                            )}
                            {article.date_verification && article.notes_maintenance && ' · '}
                            {article.notes_maintenance && (
                              <span className="text-amber-700 dark:text-amber-300">
                                {article.notes_maintenance}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <div
                            className={`text-xs font-mono tabular-nums font-bold ${
                              stock_bas
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {dispo} / {article.quantite}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {stock_bas ? 'stock bas' : 'disponibles'}
                          </div>
                        </div>

                        {peut_gerer && (
                          <>
                            <Bouton
                              variante="fantome"
                              taille="sm"
                              title="Modifier stock, état & maintenance"
                              onClick={() => ouvrir_edition_materiel(article)}
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </Bouton>
                            <Bouton
                              variante="fantome"
                              taille="sm"
                              title="Supprimer cet équipement"
                              onClick={() => definir_cible_suppression_materiel(article)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Bouton>
                            <Bouton
                              variante="secondaire"
                              taille="sm"
                              disabled={dispo <= 0 || article.etat === 'Hors service'}
                              onClick={() => {
                                definir_materiel_a_preter(article);
                                definir_pret_mat_type('Apprenant');
                                definir_pret_mat_id_apprenant(apprenants_etablissement[0]?.id ?? '');
                                definir_pret_mat_id_enseignant(enseignants_etablissement[0]?.id ?? '');
                                definir_pret_mat_salle('');
                                definir_pret_mat_quantite(1);
                                definir_pret_mat_retour_prevu(
                                  new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
                                );
                                definir_pret_mat_remarque('');
                              }}
                            >
                              Prêter / Affecter
                            </Bouton>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Carte>

          {/* Suivi des prêts et affectations de matériel */}
          <Carte rembourrage="aucun" className="xl:col-span-5 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {id_role_actif === 'APPRENANT'
                    ? 'Matériels qui me sont prêtés'
                    : 'Prêts & Affectations de matériel'}
                </h3>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  {prets_materiels_filtres.length} dossier(s)
                </span>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(
                  [
                    { id: 'ACTIFS', libelle: 'En cours' },
                    { id: 'RETARD', libelle: `En retard (${stats.prets_mat_retard})` },
                    { id: 'HISTORIQUE', libelle: 'Restitués' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => definir_filtre_prets_materiel(tab.id)}
                    className={`flex-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      filtre_prets_materiel === tab.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.libelle}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[540px] overflow-y-auto">
              {prets_materiels_filtres.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Aucun prêt de matériel dans cette vue.
                </div>
              ) : (
                prets_materiels_filtres.map((pret) => {
                  const article = inventaire_etablissement.find((i) => i.id === pret.id_article);
                  const en_retard = !pret.retourne_le && pret.retour_prevu_le < aujourdhui;
                  return (
                    <div key={pret.id} className="p-3.5 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            <span className="font-mono">{pret.quantite}×</span>{' '}
                            {article?.nom ?? pret.id_article}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {pret.type_emprunteur}
                            </span>{' '}
                            · {pret.emprunteur_nom}
                          </div>
                        </div>

                        {pret.retourne_le ? (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 ${classe_etat_materiel(
                              pret.etat_retour ?? 'Bon état'
                            )}`}
                          >
                            Retourné ({pret.etat_retour ?? 'Bon état'})
                          </span>
                        ) : en_retard ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/70 shrink-0">
                            <AlertTriangle className="w-3 h-3" />
                            En retard
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shrink-0">
                            <Clock className="w-3 h-3" />
                            Affecté
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Remis : {formater_date_fr(pret.remis_le)} ·{' '}
                        {pret.retourne_le
                          ? `Restitué : ${formater_date_fr(pret.retourne_le)}`
                          : `Retour prévu : ${formater_date_fr(pret.retour_prevu_le)}`}
                      </div>

                      {pret.remarque && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          {pret.remarque}
                        </div>
                      )}

                      {!pret.retourne_le && peut_gerer && (
                        <div className="flex justify-end pt-1">
                          <Bouton
                            variante="secondaire"
                            taille="sm"
                            onClick={() => {
                              definir_pret_mat_a_retourner(pret);
                              definir_etat_retour_mat('Bon état');
                              definir_remarque_retour_mat('');
                            }}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Enregistrer restitution</span>
                          </Bouton>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Carte>
        </div>
      )}

      {/* MODALE AJOUT / EDITION LIVRE */}
      {modale_livre_ouverte && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
          onClick={() => definir_modale_livre_ouverte(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
                {livre_en_edition ? 'Modifier la fiche ouvrage' : 'Ajouter un ouvrage au catalogue'}
              </h3>
              <button
                type="button"
                onClick={() => definir_modale_livre_ouverte(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={valider_formulaire_livre} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Titre complet *
                </label>
                <input
                  type="text"
                  required
                  value={form_livre.titre}
                  onChange={(e) => definir_form_livre((p) => ({ ...p, titre: e.target.value }))}
                  placeholder="Ex. Génie Frigorifique & Climatisation..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Auteur(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form_livre.auteur}
                    onChange={(e) => definir_form_livre((p) => ({ ...p, auteur: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ISBN / Référence
                  </label>
                  <input
                    type="text"
                    value={form_livre.isbn}
                    onChange={(e) => definir_form_livre((p) => ({ ...p, isbn: e.target.value }))}
                    placeholder="978-2-..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    value={form_livre.categorie}
                    onChange={(e) =>
                      definir_form_livre((p) => ({ ...p, categorie: e.target.value }))
                    }
                    placeholder="Sciences, Informatique, Technique..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Type de support
                  </label>
                  <select
                    value={form_livre.type_support}
                    onChange={(e) =>
                      definir_form_livre((p) => ({
                        ...p,
                        type_support: e.target.value as NonNullable<
                          LivreBibliotheque['type_support']
                        >,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {SUPPORTS_LIVRE.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cote
                  </label>
                  <input
                    type="text"
                    value={form_livre.cote_rayonnage}
                    onChange={(e) =>
                      definir_form_livre((p) => ({ ...p, cote_rayonnage: e.target.value }))
                    }
                    placeholder="INF-01"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Éditeur
                  </label>
                  <input
                    type="text"
                    value={form_livre.editeur}
                    onChange={(e) =>
                      definir_form_livre((p) => ({ ...p, editeur: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Année
                  </label>
                  <input
                    type="text"
                    value={form_livre.annee_edition}
                    onChange={(e) =>
                      definir_form_livre((p) => ({ ...p, annee_edition: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Exemplaires *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form_livre.exemplaires_totaux}
                    onChange={(e) =>
                      definir_form_livre((p) => ({
                        ...p,
                        exemplaires_totaux: Number(e.target.value) || 1,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emplacement / Rayonnage
                </label>
                <input
                  type="text"
                  value={form_livre.emplacement}
                  onChange={(e) =>
                    definir_form_livre((p) => ({ ...p, emplacement: e.target.value }))
                  }
                  placeholder="CDI Principal · Travée A"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Bouton
                  variante="fantome"
                  taille="sm"
                  type="button"
                  onClick={() => definir_modale_livre_ouverte(false)}
                >
                  Annuler
                </Bouton>
                <Bouton variante="principal" taille="sm" type="submit" classe_accent={theme.bouton_principal}>
                  {livre_en_edition ? 'Enregistrer modifications' : 'Ajouter au catalogue'}
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE PRET DE LIVRE */}
      {livre_a_preter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
          onClick={() => definir_livre_a_preter(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-display font-bold">Prêter un ouvrage</h3>
              <button
                type="button"
                onClick={() => definir_livre_a_preter(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!id_emprunteur_livre) return;
                emprunter_livre(
                  livre_a_preter.id,
                  id_emprunteur_livre,
                  date_retour_livre,
                  remarque_pret_livre
                );
                definir_livre_a_preter(null);
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {livre_a_preter.titre}
                </div>
                <div className="text-slate-500 mt-0.5 font-mono">
                  {livre_a_preter.exemplaires_disponibles} / {livre_a_preter.exemplaires_totaux}{' '}
                  exemplaire(s) disponible(s)
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emprunteur *
                </label>
                <select
                  value={id_emprunteur_livre}
                  onChange={(e) => definir_id_emprunteur_livre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {apprenants_etablissement.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.prenom} {app.nom} ({app.matricule})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date de retour prévue *
                </label>
                <input
                  type="date"
                  required
                  value={date_retour_livre}
                  onChange={(e) => definir_date_retour_livre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarque (optionnel)
                </label>
                <input
                  type="text"
                  value={remarque_pret_livre}
                  onChange={(e) => definir_remarque_pret_livre(e.target.value)}
                  placeholder="Ex. Préparation exposé / mémoire..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Bouton
                  variante="fantome"
                  taille="sm"
                  type="button"
                  onClick={() => definir_livre_a_preter(null)}
                >
                  Annuler
                </Bouton>
                <Bouton variante="principal" taille="sm" type="submit" classe_accent={theme.bouton_principal}>
                  Confirmer le prêt
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE RETOUR DE LIVRE */}
      {emprunt_a_retourner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
          onClick={() => definir_emprunt_a_retourner(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-display font-bold">Enregistrer le retour d’ouvrage</h3>
              <button
                type="button"
                onClick={() => definir_emprunt_a_retourner(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                retourner_livre(
                  emprunt_a_retourner.id,
                  etat_retour_livre,
                  remarque_retour_livre
                );
                definir_emprunt_a_retourner(null);
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  État constaté à la restitution
                </label>
                <select
                  value={etat_retour_livre}
                  onChange={(e) =>
                    definir_etat_retour_livre(
                      e.target.value as NonNullable<EmpruntBibliotheque['etat_retour']>
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="Bon état">Bon état (remise en rayon)</option>
                  <option value="Abîmé">Abîmé (remise en rayon avec observation)</option>
                  <option value="Perdu">Perdu / Non restitué (stock déduit)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observation (optionnel)
                </label>
                <input
                  type="text"
                  value={remarque_retour_livre}
                  onChange={(e) => definir_remarque_retour_livre(e.target.value)}
                  placeholder="Ex. Couverture cornée, pages intactes..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Bouton
                  variante="fantome"
                  taille="sm"
                  type="button"
                  onClick={() => definir_emprunt_a_retourner(null)}
                >
                  Annuler
                </Bouton>
                <Bouton variante="principal" taille="sm" type="submit" classe_accent={theme.bouton_principal}>
                  Valider le retour
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE AJOUT / EDITION MATERIEL */}
      {modale_materiel_ouverte && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
          onClick={() => definir_modale_materiel_ouverte(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-display font-bold">
                {materiel_en_edition
                  ? 'Modifier l’équipement & la maintenance'
                  : 'Ajouter un matériel à l’inventaire'}
              </h3>
              <button
                type="button"
                onClick={() => definir_modale_materiel_ouverte(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={valider_formulaire_materiel} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Code inventaire *
                  </label>
                  <input
                    type="text"
                    required
                    value={form_materiel.code}
                    onChange={(e) => definir_form_materiel((p) => ({ ...p, code: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Désignation du matériel *
                  </label>
                  <input
                    type="text"
                    required
                    value={form_materiel.nom}
                    onChange={(e) => definir_form_materiel((p) => ({ ...p, nom: e.target.value }))}
                    placeholder="Ex. Vidéoprojecteur HD, Multimètre, Microscope..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={form_materiel.categorie}
                    onChange={(e) =>
                      definir_form_materiel((p) => ({
                        ...p,
                        categorie: e.target.value as CategorieMateriel,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {CATEGORIES_MATERIEL.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    État général
                  </label>
                  <select
                    value={form_materiel.etat}
                    onChange={(e) =>
                      definir_form_materiel((p) => ({
                        ...p,
                        etat: e.target.value as EtatMateriel,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {ETATS_MATERIEL.map((et) => (
                      <option key={et} value={et}>
                        {et}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stock total *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form_materiel.quantite}
                    onChange={(e) =>
                      definir_form_materiel((p) => ({
                        ...p,
                        quantite: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                {materiel_en_edition && (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Disponible
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form_materiel.quantite_disponible}
                      onChange={(e) =>
                        definir_form_materiel((p) => ({
                          ...p,
                          quantite_disponible: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Seuil d’alerte
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form_materiel.seuil_alerte}
                    onChange={(e) =>
                      definir_form_materiel((p) => ({
                        ...p,
                        seuil_alerte: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Emplacement / Salle
                  </label>
                  <input
                    type="text"
                    value={form_materiel.emplacement}
                    onChange={(e) =>
                      definir_form_materiel((p) => ({ ...p, emplacement: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Numéro de série / Lot
                  </label>
                  <input
                    type="text"
                    value={form_materiel.numero_serie}
                    onChange={(e) =>
                      definir_form_materiel((p) => ({ ...p, numero_serie: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dernière vérification
                  </label>
                  <input
                    type="date"
                    value={form_materiel.date_verification}
                    onChange={(e) =>
                      definir_form_materiel((p) => ({ ...p, date_verification: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes de maintenance
                  </label>
                  <input
                    type="text"
                    value={form_materiel.notes_maintenance}
                    onChange={(e) =>
                      definir_form_materiel((p) => ({ ...p, notes_maintenance: e.target.value }))
                    }
                    placeholder="Révision, pièce à commander..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Bouton
                  variante="fantome"
                  taille="sm"
                  type="button"
                  onClick={() => definir_modale_materiel_ouverte(false)}
                >
                  Annuler
                </Bouton>
                <Bouton variante="principal" taille="sm" type="submit" classe_accent={theme.bouton_principal}>
                  {materiel_en_edition ? 'Enregistrer modifications' : 'Ajouter à l’inventaire'}
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE PRET / AFFECTATION MATERIEL */}
      {materiel_a_preter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
          onClick={() => definir_materiel_a_preter(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-display font-bold">Prêter / Affecter du matériel</h3>
              <button
                type="button"
                onClick={() => definir_materiel_a_preter(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={valider_pret_materiel} className="p-5 space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {materiel_a_preter.code} · {materiel_a_preter.nom}
                </div>
                <div className="text-slate-500 mt-0.5 font-mono">
                  {materiel_a_preter.quantite_disponible ?? materiel_a_preter.quantite} unité(s)
                  disponible(s)
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(['Apprenant', 'Enseignant', 'Salle / Atelier'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => definir_pret_mat_type(t)}
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-md cursor-pointer ${
                      pret_mat_type === t
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {pret_mat_type === 'Apprenant' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {terminologie.apprenant_singulier} *
                  </label>
                  <select
                    value={pret_mat_id_apprenant}
                    onChange={(e) => definir_pret_mat_id_apprenant(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {apprenants_etablissement.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.prenom} {a.nom} ({a.matricule})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {pret_mat_type === 'Enseignant' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {terminologie.enseignant_singulier} *
                  </label>
                  <select
                    value={pret_mat_id_enseignant}
                    onChange={(e) => definir_pret_mat_id_enseignant(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {enseignants_etablissement.map((ens) => (
                      <option key={ens.id} value={ens.id}>
                        {ens.nom_complet} ({ens.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {pret_mat_type === 'Salle / Atelier' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Salle, Laboratoire ou Atelier destinataire *
                  </label>
                  <input
                    type="text"
                    required
                    value={pret_mat_salle}
                    onChange={(e) => definir_pret_mat_salle(e.target.value)}
                    placeholder="Ex. Atelier Froid B, Salle 204..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantité *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={materiel_a_preter.quantite_disponible ?? materiel_a_preter.quantite}
                    required
                    value={pret_mat_quantite}
                    onChange={(e) => definir_pret_mat_quantite(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Retour prévu le *
                  </label>
                  <input
                    type="date"
                    required
                    value={pret_mat_retour_prevu}
                    onChange={(e) => definir_pret_mat_retour_prevu(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motif / Séance (optionnel)
                </label>
                <input
                  type="text"
                  value={pret_mat_remarque}
                  onChange={(e) => definir_pret_mat_remarque(e.target.value)}
                  placeholder="Ex. TP mesures électriques, examen pratique..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Bouton
                  variante="fantome"
                  taille="sm"
                  type="button"
                  onClick={() => definir_materiel_a_preter(null)}
                >
                  Annuler
                </Bouton>
                <Bouton variante="principal" taille="sm" type="submit" classe_accent={theme.bouton_principal}>
                  Confirmer l’affectation
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE RESTITUTION MATERIEL */}
      {pret_mat_a_retourner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
          onClick={() => definir_pret_mat_a_retourner(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-display font-bold">Enregistrer la restitution</h3>
              <button
                type="button"
                onClick={() => definir_pret_mat_a_retourner(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                retourner_materiel(
                  pret_mat_a_retourner.id,
                  etat_retour_mat,
                  remarque_retour_mat
                );
                definir_pret_mat_a_retourner(null);
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  État du matériel au retour
                </label>
                <select
                  value={etat_retour_mat}
                  onChange={(e) => definir_etat_retour_mat(e.target.value as EtatMateriel)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {ETATS_MATERIEL.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
                {(etat_retour_mat === 'À réparer' || etat_retour_mat === 'Hors service') && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                    L’équipement sera automatiquement signalé en alerte maintenance dans
                    l’inventaire.
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observation (optionnel)
                </label>
                <input
                  type="text"
                  value={remarque_retour_mat}
                  onChange={(e) => definir_remarque_retour_mat(e.target.value)}
                  placeholder="Ex. Câble vérifié, nettoyage effectué..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Bouton
                  variante="fantome"
                  taille="sm"
                  type="button"
                  onClick={() => definir_pret_mat_a_retourner(null)}
                >
                  Annuler
                </Bouton>
                <Bouton variante="principal" taille="sm" type="submit" classe_accent={theme.bouton_principal}>
                  Confirmer la restitution
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression_livre)}
        sur_fermeture={() => definir_cible_suppression_livre(null)}
        sur_confirmation={() => {
          if (cible_suppression_livre) {
            supprimer_livre_bibliotheque(cible_suppression_livre.id);
          }
        }}
        tonalite="danger"
        titre="Retirer cet ouvrage du catalogue ?"
        sous_titre={cible_suppression_livre?.auteur}
        description={`L’ouvrage « ${cible_suppression_livre?.titre ?? ''} » sera supprimé du fonds documentaire s’il n’a aucun emprunt en cours.`}
        elements_impact={
          cible_suppression_livre
            ? [
                { libelle: 'Titre', valeur: cible_suppression_livre.titre },
                { libelle: 'ISBN / Réf.', valeur: cible_suppression_livre.isbn },
                {
                  libelle: 'Exemplaires',
                  valeur: `${cible_suppression_livre.exemplaires_disponibles} / ${cible_suppression_livre.exemplaires_totaux}`,
                },
              ]
            : undefined
        }
        note_irreversible="La suppression est refusée automatiquement si des exemplaires sont encore empruntés."
        libelle_confirmation="Supprimer l’ouvrage"
      />

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression_materiel)}
        sur_fermeture={() => definir_cible_suppression_materiel(null)}
        sur_confirmation={() => {
          if (cible_suppression_materiel) {
            supprimer_article_inventaire(cible_suppression_materiel.id);
          }
        }}
        tonalite="danger"
        titre="Supprimer cet équipement de l’inventaire ?"
        sous_titre={cible_suppression_materiel?.code}
        description={`L’article « ${cible_suppression_materiel?.nom ?? ''} » sera retiré du registre matériel s’il n’est pas actuellement prêté.`}
        elements_impact={
          cible_suppression_materiel
            ? [
                { libelle: 'Équipement', valeur: cible_suppression_materiel.nom },
                { libelle: 'Catégorie', valeur: cible_suppression_materiel.categorie },
                { libelle: 'Stock total', valeur: `${cible_suppression_materiel.quantite} unité(s)` },
              ]
            : undefined
        }
        note_irreversible="La suppression est bloquée si des unités sont encore en prêt actif."
        libelle_confirmation="Supprimer l’équipement"
      />
    </div>
  );
};
