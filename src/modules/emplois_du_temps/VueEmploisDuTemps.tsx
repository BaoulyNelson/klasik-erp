import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  Download,
  MapPin,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { declencher_impression_ciblee } from '../../composants/interface/FicheInscriptionImprimable';
import { LogoEtablissement } from '../../composants/interface/LogoEtablissement';
import { Modale } from '../../composants/interface/Modale';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { PROFILS_PAYS } from '../../configuration/regions_devises';
import { utiliserErp } from '../../contexte/ContexteErp';
import {
  CreneauEmploiDuTemps,
  EvenementCalendrierAcademique,
  TypeEvenementCalendrier,
} from '../../modeles/erp';
import { formater_date_fr } from '../../services/service_donnees';

const JOURS_SEMAINE: CreneauEmploiDuTemps['jour_semaine'][] = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

const LIBELLES_TYPE_EVENEMENT: Record<
  TypeEvenementCalendrier,
  { libelle: string; badge: string }
> = {
  ANNEE_LIMITE: {
    libelle: 'Début / Fin d’année académique',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  PERIODE: {
    libelle: 'Période / Trimestre / Semestre',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  EXAMEN: {
    libelle: 'Examen / Évaluation',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  CONGE: {
    libelle: 'Congés / Vacances',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  FERIE: {
    libelle: 'Jour férié officiel',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  EVENEMENT: {
    libelle: 'Événement académique',
    badge: 'bg-violet-100 text-violet-800 border-violet-200',
  },
  ECHEANCE: {
    libelle: 'Échéance administrative',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
  },
};

function calculer_duree_heures(heure_debut: string, heure_fin: string): number {
  const [hd, md] = heure_debut.split(':').map(Number);
  const [hf, mf] = heure_fin.split(':').map(Number);
  if (Number.isNaN(hd) || Number.isNaN(md) || Number.isNaN(hf) || Number.isNaN(mf)) return 0;
  const minutes = hf * 60 + mf - (hd * 60 + md);
  return minutes > 0 ? minutes / 60 : 0;
}

export const VueEmploisDuTemps: React.FC = () => {
  const {
    etablissement_actif,
    utilisateur_actif,
    id_role_actif,
    terminologie,
    emplois_du_temps_etablissement,
    evenements_calendrier_etablissement,
    unites_etablissement,
    elements_etablissement,
    enseignants_etablissement,
    apprenants_etablissement,
    ajouter_creneau_emploi_du_temps,
    modifier_creneau_emploi_du_temps,
    supprimer_creneau_emploi_du_temps,
    ajouter_evenement_calendrier,
    modifier_evenement_calendrier,
    supprimer_evenement_calendrier,
    a_permission,
  } = utiliserErp();

  const theme = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const profil_pays = PROFILS_PAYS[etablissement_actif.code_pays] ?? PROFILS_PAYS.HT;
  const peut_gerer = a_permission('emplois_du_temps:gerer') && id_role_actif !== 'SUPER_ADMIN';

  const unite_personnelle = useMemo(() => {
    if (id_role_actif === 'APPRENANT') {
      const apprenant =
        apprenants_etablissement.find(
          (a) =>
            utilisateur_actif.ids_apprenants_lies?.includes(a.id) ||
            (a.courriel ?? '').toLowerCase() === utilisateur_actif.courriel.toLowerCase()
        ) ?? apprenants_etablissement[0];
      return apprenant?.id_unite ?? '';
    }
    if (id_role_actif === 'PARENT') {
      const enfant =
        apprenants_etablissement.find((a) =>
          utilisateur_actif.ids_apprenants_lies?.includes(a.id)
        ) ?? apprenants_etablissement[0];
      return enfant?.id_unite ?? '';
    }
    return '';
  }, [
    id_role_actif,
    apprenants_etablissement,
    utilisateur_actif.ids_apprenants_lies,
    utilisateur_actif.courriel,
  ]);

  const [onglet, definir_onglet] = useState<'grille' | 'salles' | 'feries'>('grille');
  const [filtre_niveau, definir_filtre_niveau] = useState<string>('TOUS');
  const [filtre_unite, definir_filtre_unite] = useState<string>(unite_personnelle || 'TOUTES');
  const [filtre_salle, definir_filtre_salle] = useState<string>('TOUTES');

  useEffect(() => {
    definir_filtre_niveau('TOUS');
    definir_filtre_unite(unite_personnelle || 'TOUTES');
    definir_filtre_salle('TOUTES');
  }, [etablissement_actif.id, unite_personnelle]);

  // Modale ajout / édition créneau
  const [modale_creneau_ouverte, definir_modale_creneau_ouverte] = useState(false);
  const [id_creneau_edition, definir_id_creneau_edition] = useState<string | null>(null);
  const [id_unite, definir_id_unite] = useState(unites_etablissement[0]?.id ?? '');
  const [id_element, definir_id_element] = useState(elements_etablissement[0]?.id ?? '');
  const [id_enseignant, definir_id_enseignant] = useState(enseignants_etablissement[0]?.id ?? '');
  const [salle, definir_salle] = useState('Salle A1');
  const [jour_semaine, definir_jour_semaine] =
    useState<CreneauEmploiDuTemps['jour_semaine']>('Lundi');
  const [heure_debut, definir_heure_debut] = useState('08:00');
  const [heure_fin, definir_heure_fin] = useState('10:00');
  const [cible_suppression_creneau, definir_cible_suppression_creneau] = useState<{
    id: string;
    intitule: string;
    horaire: string;
    salle: string;
  } | null>(null);

  // Modale d'impression Emploi du temps par niveau
  const [modale_impression_edt, definir_modale_impression_edt] = useState(false);
  const [niveau_impression, definir_niveau_impression] = useState<string>('TOUS');

  // Calendrier académique : filtres, CRUD et impression PDF
  const [filtre_type_calendrier, definir_filtre_type_calendrier] = useState<
    'TOUS' | TypeEvenementCalendrier
  >('TOUS');
  const [modale_evenement_ouverte, definir_modale_evenement_ouverte] = useState(false);
  const [id_evenement_edition, definir_id_evenement_edition] = useState<string | null>(null);
  const [ev_type, definir_ev_type] = useState<TypeEvenementCalendrier>('EVENEMENT');
  const [ev_titre, definir_ev_titre] = useState('');
  const [ev_date_debut, definir_ev_date_debut] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [ev_date_fin, definir_ev_date_fin] = useState('');
  const [ev_concerne, definir_ev_concerne] = useState('Tous les niveaux');
  const [ev_description, definir_ev_description] = useState('');
  const [cible_suppression_evenement, definir_cible_suppression_evenement] =
    useState<EvenementCalendrierAcademique | null>(null);
  const [modale_impression_calendrier, definir_modale_impression_calendrier] = useState(false);

  const niveaux_distincts = useMemo(
    () =>
      Array.from(
        new Set(
          unites_etablissement
            .map((u) => (u.niveau_ou_duree || '').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'fr')),
    [unites_etablissement]
  );

  const unites_niveau_selectionne = useMemo(() => {
    if (filtre_niveau === 'TOUS') return unites_etablissement;
    return unites_etablissement.filter((u) => u.niveau_ou_duree === filtre_niveau);
  }, [unites_etablissement, filtre_niveau]);

  const salles_distinctes = useMemo(
    () =>
      Array.from(new Set(emplois_du_temps_etablissement.map((c) => c.salle))).sort((a, b) =>
        a.localeCompare(b, 'fr')
      ),
    [emplois_du_temps_etablissement]
  );

  const creneaux_filtres = useMemo(() => {
    const ids_unites_niveau = new Set(unites_niveau_selectionne.map((u) => u.id));
    return emplois_du_temps_etablissement
      .filter((c) => {
        const ok_niveau = filtre_niveau === 'TOUS' || ids_unites_niveau.has(c.id_unite);
        const ok_unite = filtre_unite === 'TOUTES' || c.id_unite === filtre_unite;
        const ok_salle = filtre_salle === 'TOUTES' || c.salle === filtre_salle;
        return ok_niveau && ok_unite && ok_salle;
      })
      .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
  }, [
    emplois_du_temps_etablissement,
    unites_niveau_selectionne,
    filtre_niveau,
    filtre_unite,
    filtre_salle,
  ]);

  const volume_hebdomadaire_heures = useMemo(() => {
    const total = creneaux_filtres.reduce(
      (acc, c) => acc + calculer_duree_heures(c.heure_debut, c.heure_fin),
      0
    );
    return Number(total.toFixed(1));
  }, [creneaux_filtres]);

  const salles_actives_filtrees = useMemo(
    () => new Set(creneaux_filtres.map((c) => c.salle)).size,
    [creneaux_filtres]
  );

  const salles_details = useMemo(() => {
    return salles_distinctes.map((nom_salle) => {
      const creneaux_salle = emplois_du_temps_etablissement.filter((c) => c.salle === nom_salle);
      const heures = creneaux_salle.reduce(
        (acc, c) => acc + calculer_duree_heures(c.heure_debut, c.heure_fin),
        0
      );
      const unites_salle = Array.from(
        new Set(
          creneaux_salle.map(
            (c) => unites_etablissement.find((u) => u.id === c.id_unite)?.nom ?? c.id_unite
          )
        )
      );
      const capacite_max = creneaux_salle.reduce((max, c) => {
        const u = unites_etablissement.find((item) => item.id === c.id_unite);
        return Math.max(max, u?.capacite ?? 30);
      }, 25);
      return {
        nom: nom_salle,
        nombre_creneaux: creneaux_salle.length,
        heures_hebdo: Number(heures.toFixed(1)),
        capacite_estimee: capacite_max,
        unites: unites_salle,
      };
    });
  }, [salles_distinctes, emplois_du_temps_etablissement, unites_etablissement]);

  const conflit = useMemo(() => {
    return emplois_du_temps_etablissement.find(
      (creneau) =>
        creneau.id !== id_creneau_edition &&
        creneau.jour_semaine === jour_semaine &&
        !(heure_fin <= creneau.heure_debut || heure_debut >= creneau.heure_fin) &&
        (creneau.salle.toLowerCase() === salle.trim().toLowerCase() ||
          creneau.id_enseignant === id_enseignant ||
          creneau.id_unite === id_unite)
    );
  }, [
    emplois_du_temps_etablissement,
    id_creneau_edition,
    jour_semaine,
    heure_debut,
    heure_fin,
    salle,
    id_enseignant,
    id_unite,
  ]);

  const enseignant_courant_formulaire = useMemo(
    () => enseignants_etablissement.find((ens) => ens.id === id_enseignant),
    [enseignants_etablissement, id_enseignant]
  );

  const elements_par_unite_selectionnee = useMemo(() => {
    const lies = elements_etablissement.filter((el) => el.id_unite === id_unite);
    return lies.length > 0 ? lies : elements_etablissement;
  }, [elements_etablissement, id_unite]);

  // Données groupées pour l'impression par niveau
  const unites_a_imprimer = useMemo(() => {
    const liste =
      niveau_impression === 'TOUS'
        ? unites_etablissement
        : unites_etablissement.filter((u) => u.niveau_ou_duree === niveau_impression);
    return liste;
  }, [unites_etablissement, niveau_impression]);

  const evenements_tries = useMemo(() => {
    return [...evenements_calendrier_etablissement]
      .filter((ev) => filtre_type_calendrier === 'TOUS' || ev.type === filtre_type_calendrier)
      .sort((a, b) => a.date_debut.localeCompare(b.date_debut));
  }, [evenements_calendrier_etablissement, filtre_type_calendrier]);

  const calendrier_complet_trie = useMemo(
    () =>
      [...evenements_calendrier_etablissement].sort((a, b) =>
        a.date_debut.localeCompare(b.date_debut)
      ),
    [evenements_calendrier_etablissement]
  );

  const ouvrir_creation_creneau = () => {
    const u_def = unites_niveau_selectionne[0] ?? unites_etablissement[0];
    const el_def =
      elements_etablissement.find((el) => el.id_unite === u_def?.id) ?? elements_etablissement[0];
    const ens_def =
      enseignants_etablissement.find(
        (ens) =>
          ens.id === el_def?.id_enseignant ||
          (el_def && ens.ids_elements_assignes?.includes(el_def.id))
      ) ?? enseignants_etablissement[0];
    definir_id_creneau_edition(null);
    definir_id_unite(u_def?.id ?? '');
    definir_id_element(el_def?.id ?? '');
    definir_id_enseignant(ens_def?.id ?? '');
    definir_salle(salles_distinctes[0] ?? 'Salle A1');
    definir_jour_semaine('Lundi');
    definir_heure_debut('08:00');
    definir_heure_fin('10:00');
    definir_modale_creneau_ouverte(true);
  };

  const ouvrir_edition_creneau = (creneau: CreneauEmploiDuTemps) => {
    definir_id_creneau_edition(creneau.id);
    definir_id_unite(creneau.id_unite);
    definir_id_element(creneau.id_element);
    definir_id_enseignant(creneau.id_enseignant);
    definir_salle(creneau.salle);
    definir_jour_semaine(creneau.jour_semaine);
    definir_heure_debut(creneau.heure_debut);
    definir_heure_fin(creneau.heure_fin);
    definir_modale_creneau_ouverte(true);
  };

  const gerer_sauvegarde_creneau = (e: React.FormEvent) => {
    e.preventDefault();
    const unite_resolue = id_unite || unites_etablissement[0]?.id;
    const element_resolu = id_element || elements_etablissement[0]?.id;
    if (conflit || !unite_resolue || !element_resolu) return;
    const payload = {
      id_unite: unite_resolue,
      id_element: element_resolu,
      id_enseignant: id_enseignant || enseignants_etablissement[0]?.id || '',
      salle: salle.trim() || 'Salle Principale',
      jour_semaine,
      heure_debut,
      heure_fin,
    };
    if (id_creneau_edition) {
      modifier_creneau_emploi_du_temps(id_creneau_edition, payload);
    } else {
      ajouter_creneau_emploi_du_temps(payload);
    }
    definir_modale_creneau_ouverte(false);
    definir_id_creneau_edition(null);
  };

  const ouvrir_creation_evenement = () => {
    definir_id_evenement_edition(null);
    definir_ev_type('EVENEMENT');
    definir_ev_titre('');
    definir_ev_date_debut(new Date().toISOString().slice(0, 10));
    definir_ev_date_fin('');
    definir_ev_concerne('Tous les niveaux');
    definir_ev_description('');
    definir_modale_evenement_ouverte(true);
  };

  const ouvrir_edition_evenement = (ev: EvenementCalendrierAcademique) => {
    definir_id_evenement_edition(ev.id);
    definir_ev_type(ev.type);
    definir_ev_titre(ev.titre);
    definir_ev_date_debut(ev.date_debut);
    definir_ev_date_fin(ev.date_fin ?? '');
    definir_ev_concerne(ev.concerne_unites ?? 'Tous les niveaux');
    definir_ev_description(ev.description ?? '');
    definir_modale_evenement_ouverte(true);
  };

  const gerer_sauvegarde_evenement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ev_titre.trim() || !ev_date_debut) return;
    const payload = {
      type: ev_type,
      titre: ev_titre.trim(),
      date_debut: ev_date_debut,
      date_fin: ev_date_fin || undefined,
      concerne_unites: ev_concerne.trim() || undefined,
      description: ev_description.trim() || undefined,
    };
    if (id_evenement_edition) {
      modifier_evenement_calendrier(id_evenement_edition, payload);
    } else {
      ajouter_evenement_calendrier(payload);
    }
    definir_modale_evenement_ouverte(false);
    definir_id_evenement_edition(null);
  };

  const importer_feries_pays = () => {
    const existants = new Set(
      evenements_calendrier_etablissement.map((ev) => ev.titre.toLowerCase())
    );
    profil_pays.jours_feries.forEach((jf) => {
      if (!existants.has(jf.libelle.toLowerCase())) {
        // Convertir JJ/MM ou texte en date ISO 2026/2027 si possible, sinon garder 2026-11-01
        const match = jf.date.match(/(\d{2})\/(\d{2})/);
        const mois = match ? match[2] : '11';
        const jour = match ? match[1] : '01';
        const annee = Number(mois) >= 9 ? '2026' : '2027';
        ajouter_evenement_calendrier({
          type: 'FERIE',
          titre: jf.libelle,
          date_debut: `${annee}-${mois}-${jour}`,
          concerne_unites: 'Tout l’établissement',
          description: `Jour férié officiel (${profil_pays.nom} · ${jf.date})`,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Emploi du temps, Salles & Calendrier académique
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Planification hebdomadaire par niveau d’études, affectations des enseignants et
            calendrier académique imprimable pour {etablissement_actif.nom}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unite_personnelle && (
            <Bouton
              variante={filtre_unite === unite_personnelle ? 'principal' : 'secondaire'}
              taille="sm"
              classe_accent={
                filtre_unite === unite_personnelle ? theme.bouton_principal : undefined
              }
              onClick={() =>
                definir_filtre_unite(
                  filtre_unite === unite_personnelle ? 'TOUTES' : unite_personnelle
                )
              }
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {filtre_unite === unite_personnelle
                  ? 'Mon planning affiché'
                  : 'Voir mon planning'}
              </span>
            </Bouton>
          )}
          <Bouton
            variante="secondaire"
            taille="sm"
            onClick={() => {
              definir_niveau_impression(filtre_niveau !== 'TOUS' ? filtre_niveau : niveaux_distincts[0] ?? 'TOUS');
              definir_modale_impression_edt(true);
            }}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer / PDF par niveau</span>
          </Bouton>
          {peut_gerer && (
            <Bouton
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
              onClick={ouvrir_creation_creneau}
            >
              <Plus className="w-4 h-4" />
              <span>Planifier un créneau</span>
            </Bouton>
          )}
        </div>
      </div>

      {/* Bandeau 3 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Carte rembourrage="petit" className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Créneaux planifiés</div>
            <div className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {creneaux_filtres.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </Carte>

        <Carte rembourrage="petit" className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Volume hebdomadaire</div>
            <div className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {volume_hebdomadaire_heures} h
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </Carte>

        <Carte rembourrage="petit" className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Salles & Ateliers actifs
            </div>
            <div className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {salles_actives_filtrees} / {salles_distinctes.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </Carte>
      </div>

      {/* Barre d'onglets et filtres */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => definir_onglet('grille')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              onglet === 'grille'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Grille Hebdomadaire
          </button>
          <button
            type="button"
            onClick={() => definir_onglet('salles')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              onglet === 'salles'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Salles, Labos & Capacités ({salles_distinctes.length})
          </button>
          <button
            type="button"
            onClick={() => definir_onglet('feries')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              onglet === 'feries'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Calendrier académique ({evenements_calendrier_etablissement.length})
          </button>
        </div>

        {onglet === 'grille' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtre_niveau}
              onChange={(e) => {
                definir_filtre_niveau(e.target.value);
                definir_filtre_unite('TOUTES');
              }}
              aria-label="Filtrer par niveau d'études"
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-medium"
            >
              <option value="TOUS">Tous les niveaux d’études</option>
              {niveaux_distincts.map((niv) => (
                <option key={niv} value={niv}>
                  Niveau : {niv}
                </option>
              ))}
            </select>

            <select
              value={filtre_unite}
              onChange={(e) => definir_filtre_unite(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
            >
              <option value="TOUTES">Toutes les unités ({terminologie.unite_pluriel})</option>
              {unites_niveau_selectionne.map((unite) => (
                <option key={unite.id} value={unite.id}>
                  {unite.nom}
                  {unite.id === unite_personnelle ? ' (Ma classe/filière)' : ''}
                </option>
              ))}
            </select>

            <select
              value={filtre_salle}
              onChange={(e) => definir_filtre_salle(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
            >
              <option value="TOUTES">Toutes les salles</option>
              {salles_distinctes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* VUE 1 : GRILLE HEBDOMADAIRE (Lundi à Samedi) */}
      {onglet === 'grille' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
          {JOURS_SEMAINE.map((jour) => {
            const creneaux_du_jour = creneaux_filtres.filter((c) => c.jour_semaine === jour);
            return (
              <Carte key={jour} rembourrage="aucun" className="flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-900/60">
                  <span className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                    {jour}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {creneaux_du_jour.length} cours
                  </span>
                </div>

                <div className="p-3.5 flex-1 space-y-2.5">
                  {creneaux_du_jour.length === 0 ? (
                    <div className="h-full min-h-[112px] flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 text-center">
                      Aucun créneau planifié ce jour
                    </div>
                  ) : (
                    creneaux_du_jour.map((creneau) => {
                      const unite = unites_etablissement.find((u) => u.id === creneau.id_unite);
                      const element = elements_etablissement.find(
                        (el) => el.id === creneau.id_element
                      );
                      const enseignant = enseignants_etablissement.find(
                        (ens) => ens.id === creneau.id_enseignant
                      );
                      return (
                        <div
                          key={creneau.id}
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold text-white ${
                                etablissement_actif.type === 'PRO'
                                  ? 'bg-amber-600'
                                  : etablissement_actif.type === 'UNIVERSITE'
                                    ? 'bg-violet-600'
                                    : 'bg-blue-600'
                              }`}
                            >
                              {creneau.heure_debut} – {creneau.heure_fin}
                            </span>

                            {peut_gerer && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => ouvrir_edition_creneau(creneau)}
                                  aria-label="Modifier le créneau"
                                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    definir_cible_suppression_creneau({
                                      id: creneau.id,
                                      intitule: element?.nom ?? creneau.id_element,
                                      horaire: `${creneau.jour_semaine} · ${creneau.heure_debut}–${creneau.heure_fin}`,
                                      salle: creneau.salle,
                                    })
                                  }
                                  aria-label="Supprimer le créneau"
                                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                              {element?.nom ?? creneau.id_element}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {element?.code ? `${element.code} · ` : ''}
                              {unite?.nom ?? creneau.id_unite}
                              {unite?.niveau_ou_duree ? ` (${unite.niveau_ou_duree})` : ''}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 min-w-0 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{creneau.salle}</span>
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0 truncate max-w-[140px]">
                              {enseignant?.nom_complet ?? 'À affecter'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Carte>
            );
          })}
        </div>
      )}

      {/* VUE 2 : SALLES, LABOS & CAPACITES */}
      {onglet === 'salles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {salles_details.length === 0 ? (
            <Carte className="md:col-span-3 text-center text-xs text-slate-500 py-8">
              Aucune salle planifiée pour le moment.
            </Carte>
          ) : (
            salles_details.map((s) => (
              <Carte key={s.nom} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                      {s.nom}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {s.unites.join(' · ')}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                    {s.nombre_creneaux} créneau(x)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-400">Occupation hebdo</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {s.heures_hebdo} h / sem.
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Capacité d’accueil</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {s.capacite_estimee} places
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <Bouton
                    variante="secondaire"
                    taille="sm"
                    className="w-full"
                    onClick={() => {
                      definir_filtre_salle(s.nom);
                      definir_filtre_niveau('TOUS');
                      definir_filtre_unite('TOUTES');
                      definir_onglet('grille');
                    }}
                  >
                    Voir la grille de cette salle
                  </Bouton>
                </div>
              </Carte>
            ))
          )}
        </div>
      )}

      {/* VUE 3 : CALENDRIER ACADÉMIQUE & JOURS FÉRIÉS */}
      {onglet === 'feries' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <Carte rembourrage="aucun" className="lg:col-span-8">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                    Calendrier académique officiel ({etablissement_actif.annee_academique})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dates de rentrée, périodes/trimestres, examens, congés, fériés et échéances.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  onClick={() => definir_modale_impression_calendrier(true)}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer / PDF Calendrier</span>
                </Bouton>
                {peut_gerer && (
                  <Bouton
                    variante="principal"
                    taille="sm"
                    classe_accent={theme.bouton_principal}
                    onClick={ouvrir_creation_evenement}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un événement</span>
                  </Bouton>
                )}
              </div>
            </div>

            <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 bg-slate-50/60 dark:bg-slate-900/40">
              <button
                type="button"
                onClick={() => definir_filtre_type_calendrier('TOUS')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md cursor-pointer ${
                  filtre_type_calendrier === 'TOUS'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60'
                }`}
              >
                Tout ({evenements_calendrier_etablissement.length})
              </button>
              {(Object.keys(LIBELLES_TYPE_EVENEMENT) as TypeEvenementCalendrier[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => definir_filtre_type_calendrier(type)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md cursor-pointer ${
                    filtre_type_calendrier === type
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60'
                  }`}
                >
                  {LIBELLES_TYPE_EVENEMENT[type].libelle.split('/')[0].trim()}
                </button>
              ))}
            </div>

            {evenements_tries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Aucun événement planifié pour ce filtre. Cliquez sur « Ajouter un événement ».
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {evenements_tries.map((ev) => {
                  const meta = LIBELLES_TYPE_EVENEMENT[ev.type];
                  return (
                    <div
                      key={ev.id}
                      className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formater_date_fr(ev.date_debut)}
                            {ev.date_fin && ev.date_fin !== ev.date_debut
                              ? ` → ${formater_date_fr(ev.date_fin)}`
                              : ''}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${meta.badge}`}
                          >
                            {meta.libelle}
                          </span>
                          {ev.concerne_unites && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                              {ev.concerne_unites}
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {ev.titre}
                        </div>
                        {ev.description && (
                          <div className="text-slate-500 dark:text-slate-400">{ev.description}</div>
                        )}
                      </div>

                      {peut_gerer && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Bouton
                            type="button"
                            variante="secondaire"
                            taille="sm"
                            onClick={() => ouvrir_edition_evenement(ev)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Modifier</span>
                          </Bouton>
                          <Bouton
                            type="button"
                            variante="danger"
                            taille="sm"
                            onClick={() => definir_cible_suppression_evenement(ev)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Bouton>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Carte>

          <Carte className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="text-xs font-display font-bold text-slate-900 dark:text-slate-100">
                Jours fériés officiels ({profil_pays.nom})
              </div>
              {peut_gerer && (
                <Bouton type="button" variante="secondaire" taille="sm" onClick={importer_feries_pays}>
                  <Download className="w-3 h-3" />
                  <span>Importer</span>
                </Bouton>
              )}
            </div>
            <div className="space-y-2 text-xs">
              {profil_pays.jours_feries.map((jour_ferie) => (
                <div
                  key={jour_ferie.date}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {jour_ferie.libelle}
                  </span>
                  <span className="font-mono text-slate-500 shrink-0 ml-2">{jour_ferie.date}</span>
                </div>
              ))}
            </div>
          </Carte>
        </div>
      )}

      {/* MODALE PLANIFIER / MODIFIER UN CRENEAU */}
      {modale_creneau_ouverte && peut_gerer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
          onClick={() => definir_modale_creneau_ouverte(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
                {id_creneau_edition ? 'Modifier le créneau horaire' : 'Planifier un créneau horaire'}
              </h3>
              <button
                type="button"
                onClick={() => definir_modale_creneau_ouverte(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={gerer_sauvegarde_creneau} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">{terminologie.unite_singulier}</label>
                <select
                  value={id_unite}
                  onChange={(e) => {
                    const nouvel_id = e.target.value;
                    definir_id_unite(nouvel_id);
                    const premier_el = elements_etablissement.find((el) => el.id_unite === nouvel_id);
                    if (premier_el) definir_id_element(premier_el.id);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {unites_etablissement.map((unite) => (
                    <option key={unite.id} value={unite.id}>
                      {unite.nom} ({unite.niveau_ou_duree})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  {terminologie.contenu_singulier}
                </label>
                <select
                  value={id_element}
                  onChange={(e) => {
                    const nouvel_el = e.target.value;
                    definir_id_element(nouvel_el);
                    const obj_el = elements_etablissement.find((x) => x.id === nouvel_el);
                    const ens_affecte = enseignants_etablissement.find(
                      (ens) =>
                        ens.id === obj_el?.id_enseignant ||
                        ens.ids_elements_assignes?.includes(nouvel_el)
                    );
                    if (ens_affecte) definir_id_enseignant(ens_affecte.id);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {elements_par_unite_selectionnee.map((element) => (
                    <option key={element.id} value={element.id}>
                      {element.code} · {element.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  {terminologie.enseignant_singulier}
                </label>
                <select
                  value={id_enseignant}
                  onChange={(e) => definir_id_enseignant(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {enseignants_etablissement.map((enseignant) => {
                    const est_affecte =
                      enseignant.ids_elements_assignes?.includes(id_element) ||
                      elements_etablissement.some(
                        (el) => el.id === id_element && el.id_enseignant === enseignant.id
                      );
                    return (
                      <option key={enseignant.id} value={enseignant.id}>
                        {enseignant.nom_complet}
                        {est_affecte ? ' (Affecté à cette matière)' : ''}
                      </option>
                    );
                  })}
                </select>
                {enseignant_courant_formulaire &&
                  (enseignant_courant_formulaire.ids_elements_assignes?.length ?? 0) > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Matières affectées :{' '}
                      {enseignant_courant_formulaire.ids_elements_assignes
                        ?.map(
                          (id_el) => elements_etablissement.find((x) => x.id === id_el)?.nom ?? id_el
                        )
                        .join(', ')}
                    </p>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Jour</label>
                  <select
                    value={jour_semaine}
                    onChange={(e) =>
                      definir_jour_semaine(e.target.value as CreneauEmploiDuTemps['jour_semaine'])
                    }
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {JOURS_SEMAINE.map((jour) => (
                      <option key={jour} value={jour}>
                        {jour}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Salle / Atelier</label>
                  <input
                    type="text"
                    value={salle}
                    onChange={(e) => definir_salle(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Début</label>
                  <input
                    type="time"
                    value={heure_debut}
                    onChange={(e) => definir_heure_debut(e.target.value)}
                    className="w-full px-2.5 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Fin</label>
                  <input
                    type="time"
                    value={heure_fin}
                    onChange={(e) => definir_heure_fin(e.target.value)}
                    className="w-full px-2.5 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              {conflit && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 p-2.5 text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Conflit détecté avec {conflit.salle} ({conflit.jour_semaine}{' '}
                    {conflit.heure_debut}–{conflit.heure_fin}).
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Bouton
                  type="button"
                  variante="fantome"
                  taille="sm"
                  onClick={() => definir_modale_creneau_ouverte(false)}
                >
                  Annuler
                </Bouton>
                <Bouton
                  type="submit"
                  variante="principal"
                  taille="sm"
                  classe_accent={theme.bouton_principal}
                  disabled={Boolean(conflit)}
                >
                  <span>{id_creneau_edition ? 'Enregistrer' : 'Ajouter le créneau'}</span>
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE AJOUT / ÉDITION ÉVÉNEMENT CALENDRIER ACADÉMIQUE */}
      <Modale
        ouverte={modale_evenement_ouverte}
        sur_fermeture={() => definir_modale_evenement_ouverte(false)}
        titre={
          id_evenement_edition
            ? 'Modifier un événement du calendrier'
            : 'Ajouter au calendrier académique'
        }
        sous_titre={`${etablissement_actif.nom_court} · ${etablissement_actif.annee_academique}`}
        classe_largeur_max="max-w-lg"
      >
        <form onSubmit={gerer_sauvegarde_evenement} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Catégorie *</label>
            <select
              value={ev_type}
              onChange={(e) => definir_ev_type(e.target.value as TypeEvenementCalendrier)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {(Object.keys(LIBELLES_TYPE_EVENEMENT) as TypeEvenementCalendrier[]).map((t) => (
                <option key={t} value={t}>
                  {LIBELLES_TYPE_EVENEMENT[t].libelle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Intitulé de l’événement / échéance *</label>
            <input
              type="text"
              required
              value={ev_titre}
              onChange={(e) => definir_ev_titre(e.target.value)}
              placeholder="Ex: Examens du 1er Trimestre, Rentrée des classes..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Date de début *</label>
              <input
                type="date"
                required
                value={ev_date_debut}
                onChange={(e) => definir_ev_date_debut(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Date de fin (facultatif)</label>
              <input
                type="date"
                value={ev_date_fin}
                onChange={(e) => definir_ev_date_fin(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Niveaux / Public concerné</label>
            <input
              type="text"
              value={ev_concerne}
              onChange={(e) => definir_ev_concerne(e.target.value)}
              placeholder="Ex: Tous les niveaux, NS4, Licence 1..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Description / Consignes</label>
            <textarea
              rows={2}
              value={ev_description}
              onChange={(e) => definir_ev_description(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_evenement_ouverte(false)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
            >
              {id_evenement_edition ? 'Enregistrer' : 'Ajouter au calendrier'}
            </Bouton>
          </div>
        </form>
      </Modale>

      {/* MODALE IMPRESSION EMPLOI DU TEMPS PAR NIVEAU (A4 PAYSAGE) */}
      <Modale
        ouverte={modale_impression_edt}
        sur_fermeture={() => definir_modale_impression_edt(false)}
        titre="Impression & PDF — Emplois du temps par niveau d’études"
        sous_titre={`${etablissement_actif.nom} · ${etablissement_actif.annee_academique}`}
        classe_largeur_max="max-w-5xl"
        pied_page={
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Niveau d’études à imprimer :
              </span>
              <select
                value={niveau_impression}
                onChange={(e) => definir_niveau_impression(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium"
              >
                <option value="TOUS">Tous les niveaux ({unites_etablissement.length} classes)</option>
                {niveaux_distincts.map((niv) => (
                  <option key={niv} value={niv}>
                    {niv}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Bouton variante="fantome" onClick={() => definir_modale_impression_edt(false)}>
                Fermer
              </Bouton>
              <Bouton
                variante="principal"
                classe_accent={theme.bouton_principal}
                onClick={declencher_impression_ciblee}
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer / Télécharger PDF</span>
              </Bouton>
            </div>
          </div>
        }
      >
        <div className="printable-document-root">
          <div className="print-sheet-a4-landscape bg-white text-slate-900 border border-slate-300 p-7 space-y-6 shadow-sm">
            {/* En-tête officiel établissement */}
            <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3.5">
                <LogoEtablissement
                  type={etablissement_actif.type}
                  code={etablissement_actif.code}
                  url_logo={etablissement_actif.url_logo}
                  nom={etablissement_actif.nom}
                  taille="grand"
                />
                <div>
                  <div className="text-base font-display font-bold uppercase tracking-tight text-slate-900">
                    {etablissement_actif.nom}
                  </div>
                  <div className="text-xs text-slate-600">
                    {etablissement_actif.adresse} · Tél. {etablissement_actif.telephone}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {etablissement_actif.courriel} · Fuseau : {etablissement_actif.fuseau_horaire}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-display font-bold uppercase tracking-wider text-slate-900">
                  EMPLOI DU TEMPS HEBDOMADAIRE
                </div>
                <div className="text-xs font-semibold text-indigo-700 mt-0.5">
                  Niveau : {niveau_impression === 'TOUS' ? 'Tous les niveaux' : niveau_impression}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {etablissement_actif.annee_academique} ·{' '}
                  {etablissement_actif.libelle_periode_courante}
                </div>
              </div>
            </div>

            {/* Tableaux par classe/unité du niveau */}
            {unites_a_imprimer.map((unite) => {
              const creneaux_unite = emplois_du_temps_etablissement
                .filter((c) => c.id_unite === unite.id)
                .sort((a, b) => {
                  const ja = JOURS_SEMAINE.indexOf(a.jour_semaine);
                  const jb = JOURS_SEMAINE.indexOf(b.jour_semaine);
                  if (ja !== jb) return ja - jb;
                  return a.heure_debut.localeCompare(b.heure_debut);
                });
              const total_h = creneaux_unite.reduce(
                (acc, c) => acc + calculer_duree_heures(c.heure_debut, c.heure_fin),
                0
              );

              return (
                <div
                  key={unite.id}
                  className="print-avoid-break border border-slate-300 rounded-lg overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-300 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900">{unite.nom}</span>
                      <span className="ml-2 text-xs text-slate-600">
                        ({unite.code} · Niveau : {unite.niveau_ou_duree})
                      </span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-slate-700">
                      {creneaux_unite.length} séances · {Number(total_h.toFixed(1))} h/sem.
                    </div>
                  </div>

                  {creneaux_unite.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-slate-500 italic">
                      Aucun créneau horaire planifié pour cette {terminologie.unite_singulier.toLowerCase()}.
                    </div>
                  ) : (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-300 text-slate-600">
                          <th className="px-3 py-2 text-left font-semibold w-28">Jour</th>
                          <th className="px-3 py-2 text-left font-semibold w-32">Horaire</th>
                          <th className="px-3 py-2 text-left font-semibold">
                            {terminologie.contenu_singulier}
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            {terminologie.enseignant_singulier}
                          </th>
                          <th className="px-3 py-2 text-left font-semibold w-36">Salle / Atelier</th>
                          <th className="px-3 py-2 text-right font-semibold w-20">Durée</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {creneaux_unite.map((c) => {
                          const el = elements_etablissement.find((x) => x.id === c.id_element);
                          const ens = enseignants_etablissement.find((x) => x.id === c.id_enseignant);
                          const duree = calculer_duree_heures(c.heure_debut, c.heure_fin);
                          return (
                            <tr key={c.id}>
                              <td className="px-3 py-2 font-semibold text-slate-900">
                                {c.jour_semaine}
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-800">
                                {c.heure_debut} – {c.heure_fin}
                              </td>
                              <td className="px-3 py-2">
                                <span className="font-semibold text-slate-900">
                                  {el?.nom ?? c.id_element}
                                </span>
                                {el?.code && (
                                  <span className="ml-1.5 font-mono text-[11px] text-slate-500">
                                    ({el.code})
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-800">
                                {ens?.nom_complet ?? 'À affecter'}
                              </td>
                              <td className="px-3 py-2 text-slate-700">{c.salle}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700">
                                {Number(duree.toFixed(1))}h
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}

            <div className="pt-4 border-t border-slate-300 flex items-end justify-between text-[11px] text-slate-600">
              <div>
                Document généré le {formater_date_fr(new Date().toISOString().slice(0, 10))} ·{' '}
                {etablissement_actif.nom_court}
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-800">Direction Académique</div>
                <div className="mt-6 border-t border-slate-400 w-44" />
              </div>
            </div>
          </div>
        </div>
      </Modale>

      {/* MODALE IMPRESSION CALENDRIER ACADÉMIQUE (A4 PORTRAIT) */}
      <Modale
        ouverte={modale_impression_calendrier}
        sur_fermeture={() => definir_modale_impression_calendrier(false)}
        titre="Impression & PDF — Calendrier académique officiel"
        sous_titre={`${etablissement_actif.nom} · ${etablissement_actif.annee_academique}`}
        classe_largeur_max="max-w-4xl"
        pied_page={
          <div className="w-full flex items-center justify-end gap-2">
            <Bouton
              variante="fantome"
              onClick={() => definir_modale_impression_calendrier(false)}
            >
              Fermer
            </Bouton>
            <Bouton
              variante="principal"
              classe_accent={theme.bouton_principal}
              onClick={declencher_impression_ciblee}
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / Télécharger PDF</span>
            </Bouton>
          </div>
        }
      >
        <div className="printable-document-root">
          <div className="print-sheet-a4 bg-white text-slate-900 border border-slate-300 p-7 space-y-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <LogoEtablissement
                  type={etablissement_actif.type}
                  code={etablissement_actif.code}
                  url_logo={etablissement_actif.url_logo}
                  nom={etablissement_actif.nom}
                  taille="grand"
                />
                <div>
                  <div className="text-base font-display font-bold uppercase text-slate-900">
                    {etablissement_actif.nom}
                  </div>
                  <div className="text-xs text-slate-600">
                    {etablissement_actif.adresse} · {etablissement_actif.telephone}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-display font-bold uppercase tracking-wider text-slate-900">
                  CALENDRIER ACADÉMIQUE
                </div>
                <div className="text-xs font-mono text-indigo-700 font-semibold mt-0.5">
                  Année {etablissement_actif.annee_academique}
                </div>
              </div>
            </div>

            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                  <th className="px-3 py-2 text-left font-semibold w-40">Date(s)</th>
                  <th className="px-3 py-2 text-left font-semibold w-40">Catégorie</th>
                  <th className="px-3 py-2 text-left font-semibold">Événement & Détails</th>
                  <th className="px-3 py-2 text-left font-semibold w-36">Concernés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {calendrier_complet_trie.map((ev) => (
                  <tr key={ev.id} className="print-avoid-break">
                    <td className="px-3 py-2 font-mono font-semibold text-slate-900 align-top">
                      {formater_date_fr(ev.date_debut)}
                      {ev.date_fin && ev.date_fin !== ev.date_debut
                        ? ` au ${formater_date_fr(ev.date_fin)}`
                        : ''}
                    </td>
                    <td className="px-3 py-2 text-slate-700 align-top">
                      {LIBELLES_TYPE_EVENEMENT[ev.type].libelle}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-semibold text-slate-900">{ev.titre}</div>
                      {ev.description && (
                        <div className="text-[11px] text-slate-600 mt-0.5">{ev.description}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700 align-top">
                      {ev.concerne_unites ?? 'Tous'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-4 border-t border-slate-300 flex items-end justify-between text-[11px] text-slate-600">
              <div>
                Calendrier officiel · {etablissement_actif.nom_court} · Édité le{' '}
                {formater_date_fr(new Date().toISOString().slice(0, 10))}
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-800">Direction Générale</div>
                <div className="mt-6 border-t border-slate-400 w-44" />
              </div>
            </div>
          </div>
        </div>
      </Modale>

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression_creneau)}
        sur_fermeture={() => definir_cible_suppression_creneau(null)}
        sur_confirmation={() => {
          if (cible_suppression_creneau) {
            supprimer_creneau_emploi_du_temps(cible_suppression_creneau.id);
          }
        }}
        tonalite="danger"
        titre="Supprimer ce créneau horaire ?"
        sous_titre={cible_suppression_creneau?.horaire}
        description="Ce créneau sera définitivement retiré du planning hebdomadaire et des portails enseignants/apprenants."
        elements_impact={
          cible_suppression_creneau
            ? [
                {
                  libelle: terminologie.contenu_singulier,
                  valeur: cible_suppression_creneau.intitule,
                },
                { libelle: 'Horaire', valeur: cible_suppression_creneau.horaire },
                { libelle: 'Salle', valeur: cible_suppression_creneau.salle },
              ]
            : undefined
        }
        note_irreversible="Cette suppression est définitive."
        libelle_confirmation="Supprimer le créneau"
      />

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression_evenement)}
        sur_fermeture={() => definir_cible_suppression_evenement(null)}
        sur_confirmation={() => {
          if (cible_suppression_evenement) {
            supprimer_evenement_calendrier(cible_suppression_evenement.id);
          }
        }}
        tonalite="danger"
        titre="Supprimer cet événement du calendrier ?"
        sous_titre={cible_suppression_evenement?.titre}
        description="L’événement sera retiré du calendrier académique imprimable."
        libelle_confirmation="Supprimer"
      />
    </div>
  );
};
