import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Copy,
  Layers,
  Link2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { Modale } from '../../composants/interface/Modale';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { MODELES_CYCLES, ModeleCycle } from '../../configuration/modeles_cycles';
import { CATALOGUE_DEVISES } from '../../configuration/regions_devises';
import { utiliserErp } from '../../contexte/ContexteErp';
import {
  ElementPedagogique,
  PersonnelEnseignant,
  UniteAcademique,
} from '../../modeles/erp';
import { formater_montant } from '../../services/service_donnees';

const LIBELLES_NATURES: Record<ElementPedagogique['nature'], string> = {
  MATIERE: 'Matière scolaire',
  UE: 'Unité d’Enseignement (UE)',
  MODULE_PRATIQUE: 'Module Pratique / Atelier',
  MODULE_THEORIQUE: 'Module Théorique',
};

export const VueStructureTarifs: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    devise_active,
    unites_etablissement: unites,
    elements_etablissement: elements,
    enseignants_etablissement: enseignants,
    apprenants_etablissement: apprenants,
    ajouter_unite_academique,
    modifier_unite_academique,
    supprimer_unite_academique,
    dupliquer_unite_academique,
    deployer_pack_cycle,
    ajouter_element_pedagogique,
    modifier_element_pedagogique,
    supprimer_element_pedagogique,
    ajouter_personnel_enseignant,
    modifier_personnel_enseignant,
    supprimer_personnel_enseignant,
    affecter_enseignant_pedagogie,
    a_permission,
  } = utiliserErp();

  const theme = obtenir_theme_etablissement(etablissement_actif.type);
  const peut_gerer = a_permission('parametres:gerer') || a_permission('pedagogie:noter');
  const [onglet, definir_onglet] = useState<'unites' | 'elements' | 'enseignants'>('unites');
  const [modale_pack_ouverte, definir_modale_pack_ouverte] = useState(false);

  const taux_devise = CATALOGUE_DEVISES[devise_active].pivot_htg_par_unite;

  // Modale création / modification Unité
  const [modale_unite_ouverte, definir_modale_unite_ouverte] = useState(false);
  const [unite_en_edition, definir_unite_en_edition] = useState<UniteAcademique | null>(null);
  const [code_unite, definir_code_unite] = useState('');
  const [nom_unite, definir_nom_unite] = useState('');
  const [duree_unite, definir_duree_unite] = useState('Annuel');
  const [indication_horaire_unite, definir_indication_horaire_unite] = useState('');
  const [capacite_unite, definir_capacite_unite] = useState('35');
  const [frais_inscription_unite, definir_frais_inscription_unite] = useState('5000');
  const [frais_scolarite_unite, definir_frais_scolarite_unite] = useState('35000');
  const [repartition_unite, definir_repartition_unite] = useState(
    terminologie.libelle_modele_facturation
  );
  const [responsable_unite, definir_responsable_unite] = useState(
    etablissement_actif.nom_direction
  );

  const nature_defaut: ElementPedagogique['nature'] =
    etablissement_actif.type === 'PRO'
      ? 'MODULE_PRATIQUE'
      : etablissement_actif.type === 'UNIVERSITE'
        ? 'UE'
        : 'MATIERE';

  // Modale création / modification Matière / UE / Module
  const [modale_element_ouverte, definir_modale_element_ouverte] = useState(false);
  const [element_en_edition, definir_element_en_edition] =
    useState<ElementPedagogique | null>(null);
  const [code_element, definir_code_element] = useState('');
  const [nom_element, definir_nom_element] = useState('');
  const [nature_element, definir_nature_element] =
    useState<ElementPedagogique['nature']>(nature_defaut);
  const [id_unite_element, definir_id_unite_element] = useState('');
  const [id_enseignant_element, definir_id_enseignant_element] = useState('');
  const [coefficient_element, definir_coefficient_element] = useState('4');
  const [heures_element, definir_heures_element] = useState('45');
  const [periode_element, definir_periode_element] = useState(
    etablissement_actif.libelle_periode_courante
  );

  const options_nature_etablissement = useMemo(() => {
    const base: { valeur: ElementPedagogique['nature']; libelle: string }[] =
      etablissement_actif.type === 'PRO'
        ? [
            { valeur: 'MODULE_PRATIQUE', libelle: 'Module Pratique / Atelier' },
            { valeur: 'MODULE_THEORIQUE', libelle: 'Module Théorique' },
          ]
        : etablissement_actif.type === 'UNIVERSITE'
          ? [{ valeur: 'UE', libelle: 'Unité d’Enseignement (UE)' }]
          : [{ valeur: 'MATIERE', libelle: 'Matière scolaire' }];

    if (
      element_en_edition &&
      !base.some((opt) => opt.valeur === element_en_edition.nature)
    ) {
      base.push({
        valeur: element_en_edition.nature,
        libelle: LIBELLES_NATURES[element_en_edition.nature],
      });
    }
    return base;
  }, [etablissement_actif.type, element_en_edition]);

  // Modale création / modification Enseignant
  const [modale_enseignant_ouverte, definir_modale_enseignant_ouverte] = useState(false);
  const [enseignant_en_edition, definir_enseignant_en_edition] =
    useState<PersonnelEnseignant | null>(null);
  const [code_enseignant, definir_code_enseignant] = useState('');
  const [nom_enseignant, definir_nom_enseignant] = useState('');
  const [specialite_enseignant, definir_specialite_enseignant] = useState('');
  const [contrat_enseignant, definir_contrat_enseignant] =
    useState<PersonnelEnseignant['type_contrat']>('CDI / Temps plein');
  const [heures_enseignant, definir_heures_enseignant] = useState('60');
  const [taux_enseignant, definir_taux_enseignant] = useState('1200');
  const [courriel_enseignant, definir_courriel_enseignant] = useState('');
  const [telephone_enseignant, definir_telephone_enseignant] = useState('');

  // Modale d'affectation Enseignant -> Matières & Classes/Unités
  const [modale_affectation_ouverte, definir_modale_affectation_ouverte] = useState(false);
  const [id_enseignant_affectation, definir_id_enseignant_affectation] = useState('');
  const [ids_unites_affectation, definir_ids_unites_affectation] = useState<string[]>([]);
  const [ids_elements_affectation, definir_ids_elements_affectation] = useState<string[]>([]);

  // Confirmation de suppression
  const [cible_suppression, definir_cible_suppression] = useState<
    | { type: 'unite'; id: string; titre: string }
    | { type: 'element'; id: string; titre: string }
    | { type: 'enseignant'; id: string; titre: string }
    | null
  >(null);

  const ouvrir_modale_unite = (unite?: UniteAcademique) => {
    if (unite) {
      definir_unite_en_edition(unite);
      definir_code_unite(unite.code);
      definir_nom_unite(unite.nom);
      definir_duree_unite(unite.niveau_ou_duree);
      definir_indication_horaire_unite(unite.indication_horaire ?? '');
      definir_capacite_unite(String(unite.capacite));
      definir_frais_inscription_unite(
        String(Math.round(unite.frais_inscription_htg / taux_devise))
      );
      definir_frais_scolarite_unite(String(Math.round(unite.frais_scolarite_htg / taux_devise)));
      definir_repartition_unite(unite.repartition_facturation);
      definir_responsable_unite(unite.responsable_nom);
    } else {
      definir_unite_en_edition(null);
      definir_code_unite('');
      definir_nom_unite('');
      definir_duree_unite(
        etablissement_actif.type === 'PRO'
          ? '6 mois'
          : etablissement_actif.type === 'UNIVERSITE'
            ? 'Semestriel'
            : 'Annuel'
      );
      definir_indication_horaire_unite('');
      definir_capacite_unite('35');
      definir_frais_inscription_unite(String(Math.round(5000 / taux_devise)));
      definir_frais_scolarite_unite(String(Math.round(35000 / taux_devise)));
      definir_repartition_unite(terminologie.libelle_modele_facturation);
      definir_responsable_unite(etablissement_actif.nom_direction);
    }
    definir_modale_unite_ouverte(true);
  };

  const gerer_soumission_unite = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!nom_unite.trim()) return;
    const code_propre = (
      code_unite.trim() || `${etablissement_actif.code}-${unites.length + 1}`
    ).toUpperCase();
    const charge = {
      code: code_propre,
      nom: nom_unite.trim(),
      categorie: terminologie.libelle_type_complet,
      niveau_ou_duree: duree_unite.trim() || 'Annuel',
      indication_horaire: indication_horaire_unite.trim() || undefined,
      capacite: Math.max(1, Number(capacite_unite) || 35),
      frais_inscription_htg: Math.round((Number(frais_inscription_unite) || 0) * taux_devise),
      frais_scolarite_htg: Math.round((Number(frais_scolarite_unite) || 0) * taux_devise),
      repartition_facturation:
        repartition_unite.trim() || terminologie.libelle_modele_facturation,
      responsable_nom: responsable_unite.trim() || etablissement_actif.nom_direction,
    };
    if (unite_en_edition) {
      modifier_unite_academique(unite_en_edition.id, charge);
    } else {
      ajouter_unite_academique(charge);
    }
    definir_modale_unite_ouverte(false);
  };

  const ouvrir_modale_element = (element?: ElementPedagogique) => {
    if (element) {
      definir_element_en_edition(element);
      definir_code_element(element.code);
      definir_nom_element(element.nom);
      definir_nature_element(element.nature);
      definir_id_unite_element(element.id_unite);
      definir_id_enseignant_element(element.id_enseignant);
      definir_coefficient_element(String(element.coefficient_ou_credits));
      definir_heures_element(String(element.volume_horaire_total));
      definir_periode_element(element.libelle_periode);
    } else {
      definir_element_en_edition(null);
      definir_code_element('');
      definir_nom_element('');
      definir_nature_element(nature_defaut);
      definir_id_unite_element(unites[0]?.id ?? '');
      definir_id_enseignant_element(enseignants[0]?.id ?? '');
      definir_coefficient_element('4');
      definir_heures_element('45');
      definir_periode_element(etablissement_actif.libelle_periode_courante);
    }
    definir_modale_element_ouverte(true);
  };

  const gerer_soumission_element = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!nom_element.trim()) return;
    const nature_soumise =
      options_nature_etablissement.some((opt) => opt.valeur === nature_element)
        ? nature_element
        : nature_defaut;
    const charge = {
      code: (code_element.trim() || `MOD-${elements.length + 1}`).toUpperCase(),
      nom: nom_element.trim(),
      id_unite: id_unite_element || unites[0]?.id || '',
      id_enseignant: id_enseignant_element || 'non-assigne',
      nature: nature_soumise,
      coefficient_ou_credits: Math.max(1, Number(coefficient_element) || 2),
      volume_horaire_total: Math.max(1, Number(heures_element) || 30),
      libelle_periode: periode_element.trim() || etablissement_actif.libelle_periode_courante,
    };
    if (element_en_edition) {
      modifier_element_pedagogique(element_en_edition.id, charge);
    } else {
      ajouter_element_pedagogique(charge);
    }
    definir_modale_element_ouverte(false);
  };

  const ouvrir_modale_enseignant = (enseignant?: PersonnelEnseignant) => {
    if (enseignant) {
      definir_enseignant_en_edition(enseignant);
      definir_code_enseignant(enseignant.code);
      definir_nom_enseignant(enseignant.nom_complet);
      definir_specialite_enseignant(enseignant.specialite);
      definir_contrat_enseignant(enseignant.type_contrat);
      definir_heures_enseignant(String(enseignant.heures_mensuelles));
      definir_taux_enseignant(
        String(Math.round(enseignant.taux_horaire_ou_mensuel_htg / taux_devise))
      );
      definir_courriel_enseignant(enseignant.courriel);
      definir_telephone_enseignant(enseignant.telephone);
    } else {
      definir_enseignant_en_edition(null);
      definir_code_enseignant(`ENS-${String(enseignants.length + 1).padStart(3, '0')}`);
      definir_nom_enseignant('');
      definir_specialite_enseignant('');
      definir_contrat_enseignant('CDI / Temps plein');
      definir_heures_enseignant('60');
      definir_taux_enseignant(String(Math.round(1200 / taux_devise)));
      definir_courriel_enseignant('');
      definir_telephone_enseignant(etablissement_actif.telephone);
    }
    definir_modale_enseignant_ouverte(true);
  };

  const gerer_soumission_enseignant = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!nom_enseignant.trim()) return;
    const taux_htg = Math.max(1, Math.round((Number(taux_enseignant) || 100) * taux_devise));
    if (enseignant_en_edition) {
      modifier_personnel_enseignant(enseignant_en_edition.id, {
        code: code_enseignant.trim() || enseignant_en_edition.code,
        nom_complet: nom_enseignant.trim(),
        specialite: specialite_enseignant.trim() || 'Général',
        type_contrat: contrat_enseignant,
        heures_mensuelles: Math.max(1, Number(heures_enseignant) || 60),
        taux_horaire_ou_mensuel_htg: taux_htg,
        courriel: courriel_enseignant.trim() || enseignant_en_edition.courriel,
        telephone: telephone_enseignant.trim() || etablissement_actif.telephone,
      });
    } else {
      ajouter_personnel_enseignant({
        code: code_enseignant.trim() || `ENS-${String(enseignants.length + 1).padStart(3, '0')}`,
        nom_complet: nom_enseignant.trim(),
        specialite: specialite_enseignant.trim() || 'Général',
        type_contrat: contrat_enseignant,
        ids_unites_assignees: unites[0] ? [unites[0].id] : [],
        ids_elements_assignes: [],
        taux_horaire_ou_mensuel_htg: taux_htg,
        heures_mensuelles: Math.max(1, Number(heures_enseignant) || 60),
        courriel:
          courriel_enseignant.trim() ||
          `enseignant${enseignants.length + 1}@${etablissement_actif.code.toLowerCase()}.edu`,
        telephone: telephone_enseignant.trim() || etablissement_actif.telephone,
      });
    }
    definir_modale_enseignant_ouverte(false);
  };

  const charger_affectation_pour_enseignant = (id_ens: string) => {
    definir_id_enseignant_affectation(id_ens);
    const ens = enseignants.find((t) => t.id === id_ens);
    const elements_lies = elements
      .filter((el) => el.id_enseignant === id_ens || ens?.ids_elements_assignes?.includes(el.id))
      .map((el) => el.id);
    const unites_liees = new Set<string>(ens?.ids_unites_assignees ?? []);
    elements
      .filter((el) => elements_lies.includes(el.id) && el.id_unite)
      .forEach((el) => unites_liees.add(el.id_unite));
    definir_ids_elements_affectation(Array.from(new Set(elements_lies)));
    definir_ids_unites_affectation(Array.from(unites_liees));
  };

  const ouvrir_modale_affectation = (id_ens?: string) => {
    const cible = id_ens || enseignants[0]?.id || '';
    if (!cible) return;
    charger_affectation_pour_enseignant(cible);
    definir_modale_affectation_ouverte(true);
  };

  const basculer_element_affectation = (el: ElementPedagogique) => {
    definir_ids_elements_affectation((prev) => {
      const existe = prev.includes(el.id);
      if (existe) return prev.filter((id) => id !== el.id);
      if (el.id_unite) {
        definir_ids_unites_affectation((u_prev) =>
          u_prev.includes(el.id_unite) ? u_prev : [...u_prev, el.id_unite]
        );
      }
      return [...prev, el.id];
    });
  };

  const basculer_unite_affectation = (id_unite: string) => {
    definir_ids_unites_affectation((prev) =>
      prev.includes(id_unite) ? prev.filter((id) => id !== id_unite) : [...prev, id_unite]
    );
  };

  const gerer_enregistrement_affectation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id_enseignant_affectation) return;
    affecter_enseignant_pedagogie(
      id_enseignant_affectation,
      ids_unites_affectation,
      ids_elements_affectation
    );
    definir_modale_affectation_ouverte(false);
  };

  const packs_disponibles = MODELES_CYCLES.filter(
    (pack) => pack.type_etablissement === etablissement_actif.type
  );

  const gerer_deploiement_pack = (pack: ModeleCycle) => {
    const unites_pack = pack.unites.map((u) => ({
      code: `${etablissement_actif.code}-${u.suffixe_code}`,
      nom: u.nom,
      categorie: terminologie.libelle_type_complet,
      niveau_ou_duree: u.niveau_ou_duree,
      indication_horaire: u.indication_horaire,
      capacite: u.capacite,
      frais_inscription_htg: u.frais_inscription_htg,
      frais_scolarite_htg: u.frais_scolarite_htg,
      repartition_facturation: terminologie.libelle_modele_facturation,
      responsable_nom: etablissement_actif.nom_direction,
      elements_initiaux: u.elements_initiaux.map((el) => ({
        code: el.code,
        nom: el.nom,
        nature: nature_defaut,
        coefficient_ou_credits: el.poids,
        volume_horaire_total: el.heures,
        id_enseignant: enseignants[0]?.id ?? 'non-assigne',
        libelle_periode: etablissement_actif.libelle_periode_courante,
      })),
    }));

    deployer_pack_cycle(pack.titre, unites_pack);
    definir_modale_pack_ouverte(false);
  };

  const elements_par_enseignant = useMemo(() => {
    const map = new Map<string, ElementPedagogique[]>();
    enseignants.forEach((ens) => {
      const liste = elements.filter(
        (el) => el.id_enseignant === ens.id || ens.ids_elements_assignes?.includes(el.id)
      );
      map.set(ens.id, liste);
    });
    return map;
  }, [enseignants, elements]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Structure académique, Affectations & Grille tarifaire
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Modèle de facturation : {terminologie.libelle_modele_facturation}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => definir_onglet('unites')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                onglet === 'unites'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {terminologie.unite_pluriel} ({unites.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => definir_onglet('elements')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                onglet === 'elements'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>
                {terminologie.contenu_pluriel.split(' ')[0]} ({elements.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => definir_onglet('enseignants')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                onglet === 'enseignants'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>
                {terminologie.enseignant_pluriel.split(' ')[0]} ({enseignants.length})
              </span>
            </button>
          </div>

          {peut_gerer && onglet === 'unites' && (
            <>
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => definir_modale_pack_ouverte(true)}
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Déployer un cycle complet</span>
              </Bouton>
              <Bouton
                variante="principal"
                taille="sm"
                classe_accent={theme.bouton_principal}
                onClick={() => ouvrir_modale_unite()}
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle {terminologie.unite_singulier.toLowerCase()}</span>
              </Bouton>
            </>
          )}
          {peut_gerer && onglet === 'elements' && (
            <Bouton
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
              onClick={() => ouvrir_modale_element()}
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter {terminologie.contenu_singulier.toLowerCase()}</span>
            </Bouton>
          )}
          {peut_gerer && onglet === 'enseignants' && (
            <>
              {enseignants.length > 0 && (
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  onClick={() => ouvrir_modale_affectation()}
                >
                  <Link2 className="w-4 h-4 text-indigo-500" />
                  <span>Affecter matières & classes</span>
                </Bouton>
              )}
              <Bouton
                variante="principal"
                taille="sm"
                classe_accent={theme.bouton_principal}
                onClick={() => ouvrir_modale_enseignant()}
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter {terminologie.enseignant_singulier.toLowerCase()}</span>
              </Bouton>
            </>
          )}
        </div>
      </div>

      {/* Onglet Unités */}
      {onglet === 'unites' &&
        (unites.length === 0 ? (
          <Carte className="text-center py-12 space-y-3">
            <Layers className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
              Aucune {terminologie.unite_singulier.toLowerCase()} créée pour l’instant
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Votre établissement démarre vierge. Créez votre première{' '}
              {terminologie.unite_singulier.toLowerCase()} et son tarif pour ouvrir les
              inscriptions.
            </p>
            {peut_gerer && (
              <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  onClick={() => definir_modale_pack_ouverte(true)}
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Déployer un cycle complet</span>
                </Bouton>
                <Bouton
                  variante="principal"
                  taille="sm"
                  classe_accent={theme.bouton_principal}
                  onClick={() => ouvrir_modale_unite()}
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer une {terminologie.unite_singulier.toLowerCase()}</span>
                </Bouton>
              </div>
            )}
          </Carte>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unites.map((unite) => {
              const inscrits = apprenants.filter((a) => a.id_unite === unite.id).length;
              return (
                <Carte key={unite.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {unite.code} · {unite.categorie}
                      </div>
                      <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {unite.nom}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formater_montant(
                          unite.frais_scolarite_htg,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        +{' '}
                        {formater_montant(
                          unite.frais_inscription_htg,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}{' '}
                        inscr.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Durée / Niveau</span>
                      <span className="font-medium">{unite.niveau_ou_duree}</span>
                    </div>
                    {unite.indication_horaire && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Créneau horaire</span>
                        <span className="font-mono">{unite.indication_horaire}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Responsable</span>
                      <span className="font-medium">{unite.responsable_nom}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Effectif</span>
                      <span className="font-mono tabular-nums">
                        {inscrits} / {unite.capacite} places
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Échéancier</span>
                      <span className="text-right max-w-[60%]">
                        {unite.repartition_facturation}
                      </span>
                    </div>
                  </div>
                  {peut_gerer && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-end gap-1.5">
                      <Bouton
                        type="button"
                        variante="fantome"
                        taille="sm"
                        onClick={() => ouvrir_modale_unite(unite)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </Bouton>
                      <Bouton
                        type="button"
                        variante="fantome"
                        taille="sm"
                        onClick={() => dupliquer_unite_academique(unite.id)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Dupliquer</span>
                      </Bouton>
                      <Bouton
                        type="button"
                        variante="fantome"
                        taille="sm"
                        onClick={() =>
                          definir_cible_suppression({
                            type: 'unite',
                            id: unite.id,
                            titre: `${unite.code} · ${unite.nom}`,
                          })
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-red-600 dark:text-red-400">Supprimer</span>
                      </Bouton>
                    </div>
                  )}
                </Carte>
              );
            })}
          </div>
        ))}

      {/* Onglet Éléments / Matières */}
      {onglet === 'elements' &&
        (elements.length === 0 ? (
          <Carte className="text-center py-12 space-y-3">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
              Aucun contenu pédagogique enregistré
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Ajoutez vos {terminologie.contenu_pluriel.toLowerCase()} pour activer les notes,
              cahiers de textes et emplois du temps.
            </p>
            {peut_gerer && (
              <div className="pt-1">
                <Bouton
                  variante="principal"
                  taille="sm"
                  classe_accent={theme.bouton_principal}
                  onClick={() => ouvrir_modale_element()}
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter {terminologie.contenu_singulier.toLowerCase()}</span>
                </Bouton>
              </div>
            )}
          </Carte>
        ) : (
          <Carte rembourrage="aucun">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-xs text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-2.5 text-left font-semibold">Code</th>
                    <th className="px-4 py-2.5 text-left font-semibold">
                      {terminologie.contenu_singulier}
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold">
                      {terminologie.unite_singulier}
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold">
                      {terminologie.enseignant_singulier}
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold">Période</th>
                    <th className="px-4 py-2.5 text-right font-semibold">
                      {terminologie.libelle_poids_contenu}
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold">Heures</th>
                    {peut_gerer && (
                      <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {elements.map((element) => {
                    const unite = unites.find((u) => u.id === element.id_unite);
                    const enseignant = enseignants.find((t) => t.id === element.id_enseignant);
                    return (
                      <tr
                        key={element.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                          {element.code}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          <div>{element.nom}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {LIBELLES_NATURES[element.nature] ?? element.nature}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                          {unite?.nom ?? (element.id_unite || 'Non assignée')}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                          {enseignant?.nom_complet ?? 'Non assigné'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">
                          {element.libelle_periode}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums">
                          {element.coefficient_ou_credits}
                          {etablissement_actif.type === 'PRO' ? ' h' : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-500 tabular-nums">
                          {element.volume_horaire_total}h
                        </td>
                        {peut_gerer && (
                          <td className="px-4 py-2.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => ouvrir_modale_element(element)}
                                title="Modifier"
                                className="p-1.5 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  definir_cible_suppression({
                                    type: 'element',
                                    id: element.id,
                                    titre: `${element.code} · ${element.nom}`,
                                  })
                                }
                                title="Supprimer"
                                className="p-1.5 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Carte>
        ))}

      {/* Onglet Enseignants & Affectations */}
      {onglet === 'enseignants' &&
        (enseignants.length === 0 ? (
          <Carte className="text-center py-12 space-y-3">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
              Aucun {terminologie.enseignant_singulier.toLowerCase()} enregistré
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Ajoutez votre équipe pédagogique pour les affecter aux cours, matières et emplois du
              temps.
            </p>
            {peut_gerer && (
              <div className="pt-1">
                <Bouton
                  variante="principal"
                  taille="sm"
                  classe_accent={theme.bouton_principal}
                  onClick={() => ouvrir_modale_enseignant()}
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter {terminologie.enseignant_singulier.toLowerCase()}</span>
                </Bouton>
              </div>
            )}
          </Carte>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enseignants.map((enseignant) => {
              const matieres_affectees = elements_par_enseignant.get(enseignant.id) ?? [];
              const unites_affectees = unites.filter(
                (u) =>
                  enseignant.ids_unites_assignees.includes(u.id) ||
                  matieres_affectees.some((m) => m.id_unite === u.id)
              );
              return (
                <Carte key={enseignant.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {enseignant.code} · {enseignant.type_contrat}
                      </div>
                      <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {enseignant.nom_complet}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {enseignant.specialite}
                      </p>
                    </div>
                    <div className="text-right font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums shrink-0">
                      <div>{enseignant.heures_mensuelles}h / mois</div>
                      <div className="text-[11px] text-slate-400">
                        {formater_montant(
                          enseignant.taux_horaire_ou_mensuel_htg,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Matières & Classes affectées */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-1">
                        {terminologie.unite_pluriel} affectées ({unites_affectees.length}) :
                      </span>
                      {unites_affectees.length === 0 ? (
                        <span className="text-slate-400 italic">Aucune classe affectée</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {unites_affectees.map((u) => (
                            <span
                              key={u.id}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono text-[11px]"
                            >
                              {u.code} · {u.nom}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">
                        {terminologie.contenu_pluriel.split(' ')[0]} attribuées (
                        {matieres_affectees.length}) :
                      </span>
                      {matieres_affectees.length === 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          Aucune matière attribuée pour le moment
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {matieres_affectees.map((m) => (
                            <span
                              key={m.id}
                              className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 text-[11px] font-medium"
                            >
                              {m.code} · {m.nom}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{enseignant.telephone}</span>
                    <span className="truncate max-w-[200px]">{enseignant.courriel}</span>
                  </div>

                  {peut_gerer && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-end gap-1.5">
                      <Bouton
                        type="button"
                        variante="secondaire"
                        taille="sm"
                        onClick={() => ouvrir_modale_affectation(enseignant.id)}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Affecter matières & classes</span>
                      </Bouton>
                      <Bouton
                        type="button"
                        variante="fantome"
                        taille="sm"
                        onClick={() => ouvrir_modale_enseignant(enseignant)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </Bouton>
                      <Bouton
                        type="button"
                        variante="fantome"
                        taille="sm"
                        onClick={() =>
                          definir_cible_suppression({
                            type: 'enseignant',
                            id: enseignant.id,
                            titre: `${enseignant.code} · ${enseignant.nom_complet}`,
                          })
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Bouton>
                    </div>
                  )}
                </Carte>
              );
            })}
          </div>
        ))}

      {/* Modale création / modification Unité */}
      <Modale
        ouverte={modale_unite_ouverte}
        sur_fermeture={() => definir_modale_unite_ouverte(false)}
        titre={
          unite_en_edition
            ? `Modifier ${terminologie.unite_singulier.toLowerCase()} (${unite_en_edition.code})`
            : `Nouvelle ${terminologie.unite_singulier.toLowerCase()}`
        }
        sous_titre={etablissement_actif.nom_court}
        classe_largeur_max="max-w-lg"
      >
        <form onSubmit={gerer_soumission_unite} className="space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Code</label>
              <input
                type="text"
                value={code_unite}
                onChange={(e) => definir_code_unite(e.target.value.toUpperCase())}
                placeholder={`${etablissement_actif.code}-01`}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold mb-1">Intitulé *</label>
              <input
                type="text"
                required
                value={nom_unite}
                onChange={(e) => definir_nom_unite(e.target.value)}
                placeholder={`ex. ${terminologie.unite_singulier} A`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Durée / Niveau d’études</label>
              <input
                type="text"
                value={duree_unite}
                onChange={(e) => definir_duree_unite(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Capacité (places)</label>
              <input
                type="number"
                min={1}
                value={capacite_unite}
                onChange={(e) => definir_capacite_unite(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">
                Frais d’inscription ({devise_active})
              </label>
              <input
                type="number"
                min={0}
                value={frais_inscription_unite}
                onChange={(e) => definir_frais_inscription_unite(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">
                Scolarité / Tarif ({devise_active})
              </label>
              <input
                type="number"
                min={0}
                value={frais_scolarite_unite}
                onChange={(e) => definir_frais_scolarite_unite(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Créneau horaire (optionnel)</label>
              <input
                type="text"
                value={indication_horaire_unite}
                onChange={(e) => definir_indication_horaire_unite(e.target.value)}
                placeholder="ex. Lun–Ven 08h00–13h00"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Responsable</label>
              <input
                type="text"
                value={responsable_unite}
                onChange={(e) => definir_responsable_unite(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Répartition facturation / échéancier</label>
            <input
              type="text"
              value={repartition_unite}
              onChange={(e) => definir_repartition_unite(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_unite_ouverte(false)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
            >
              {unite_en_edition ? 'Mettre à jour' : 'Enregistrer'}
            </Bouton>
          </div>
        </form>
      </Modale>

      {/* Modale création / modification Matière / UE / Module */}
      <Modale
        ouverte={modale_element_ouverte}
        sur_fermeture={() => definir_modale_element_ouverte(false)}
        titre={
          element_en_edition
            ? `Modifier ${terminologie.contenu_singulier.toLowerCase()} (${element_en_edition.code})`
            : `Ajouter ${terminologie.contenu_singulier.toLowerCase()}`
        }
        sous_titre={etablissement_actif.nom_court}
        classe_largeur_max="max-w-lg"
      >
        <form onSubmit={gerer_soumission_element} className="space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Code</label>
              <input
                type="text"
                value={code_element}
                onChange={(e) => definir_code_element(e.target.value.toUpperCase())}
                placeholder="MOD-01"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold mb-1">Intitulé *</label>
              <input
                type="text"
                required
                value={nom_element}
                onChange={(e) => definir_nom_element(e.target.value)}
                placeholder={`ex. ${terminologie.contenu_singulier}`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">
                Nature pédagogique ({terminologie.badge_type_libelle})
              </label>
              {options_nature_etablissement.length === 1 ? (
                <div className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium">
                  {options_nature_etablissement[0].libelle}
                </div>
              ) : (
                <select
                  value={
                    options_nature_etablissement.some((opt) => opt.valeur === nature_element)
                      ? nature_element
                      : nature_defaut
                  }
                  onChange={(e) =>
                    definir_nature_element(e.target.value as ElementPedagogique['nature'])
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {options_nature_etablissement.map((opt) => (
                    <option key={opt.valeur} value={opt.valeur}>
                      {opt.libelle}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block font-semibold mb-1">Période / Session</label>
              <input
                type="text"
                value={periode_element}
                onChange={(e) => definir_periode_element(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">{terminologie.unite_singulier}</label>
              <select
                value={id_unite_element}
                onChange={(e) => definir_id_unite_element(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {unites.length === 0 ? (
                  <option value="">Aucune unité (optionnel)</option>
                ) : (
                  unites.map((unite) => (
                    <option key={unite.id} value={unite.id}>
                      {unite.nom}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">
                {terminologie.enseignant_singulier}
              </label>
              <select
                value={id_enseignant_element}
                onChange={(e) => definir_id_enseignant_element(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="non-assigne">Non assigné</option>
                {enseignants.map((enseignant) => (
                  <option key={enseignant.id} value={enseignant.id}>
                    {enseignant.nom_complet}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">
                {terminologie.libelle_poids_contenu}
              </label>
              <input
                type="number"
                min={1}
                value={coefficient_element}
                onChange={(e) => definir_coefficient_element(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Volume horaire (h)</label>
              <input
                type="number"
                min={1}
                value={heures_element}
                onChange={(e) => definir_heures_element(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_element_ouverte(false)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
            >
              {element_en_edition ? 'Mettre à jour' : 'Ajouter'}
            </Bouton>
          </div>
        </form>
      </Modale>

      {/* Modale création / modification Enseignant */}
      <Modale
        ouverte={modale_enseignant_ouverte}
        sur_fermeture={() => definir_modale_enseignant_ouverte(false)}
        titre={
          enseignant_en_edition
            ? `Modifier ${enseignant_en_edition.nom_complet}`
            : `Ajouter un ${terminologie.enseignant_singulier.toLowerCase()}`
        }
        sous_titre={etablissement_actif.nom_court}
        classe_largeur_max="max-w-lg"
      >
        <form onSubmit={gerer_soumission_enseignant} className="space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Code</label>
              <input
                type="text"
                value={code_enseignant}
                onChange={(e) => definir_code_enseignant(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold mb-1">Nom complet *</label>
              <input
                type="text"
                required
                value={nom_enseignant}
                onChange={(e) => definir_nom_enseignant(e.target.value)}
                placeholder="ex. Prof. Claire Dupont"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Spécialité</label>
              <input
                type="text"
                value={specialite_enseignant}
                onChange={(e) => definir_specialite_enseignant(e.target.value)}
                placeholder="ex. Mathématiques / Informatique"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Type de contrat</label>
              <select
                value={contrat_enseignant}
                onChange={(e) =>
                  definir_contrat_enseignant(
                    e.target.value as PersonnelEnseignant['type_contrat']
                  )
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="CDI / Temps plein">CDI / Temps plein</option>
                <option value="Contractuel">Contractuel</option>
                <option value="Vacation horaire">Vacation horaire</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Volume mensuel (h)</label>
              <input
                type="number"
                min={1}
                value={heures_enseignant}
                onChange={(e) => definir_heures_enseignant(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">
                Taux horaire / base ({devise_active})
              </label>
              <input
                type="number"
                min={1}
                value={taux_enseignant}
                onChange={(e) => definir_taux_enseignant(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Courriel</label>
              <input
                type="email"
                value={courriel_enseignant}
                onChange={(e) => definir_courriel_enseignant(e.target.value)}
                placeholder="contact@etablissement.edu"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Téléphone</label>
              <input
                type="text"
                value={telephone_enseignant}
                onChange={(e) => definir_telephone_enseignant(e.target.value)}
                placeholder={etablissement_actif.telephone}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_enseignant_ouverte(false)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
            >
              {enseignant_en_edition ? 'Mettre à jour' : 'Ajouter'}
            </Bouton>
          </div>
        </form>
      </Modale>

      {/* Modale dédiée : Affectation Enseignant -> Matières & Classes */}
      <Modale
        ouverte={modale_affectation_ouverte}
        sur_fermeture={() => definir_modale_affectation_ouverte(false)}
        titre="Affectation des matières & classes aux enseignants"
        sous_titre="Synchronisée automatiquement avec les emplois du temps et cahiers de textes"
        classe_largeur_max="max-w-2xl"
      >
        <form onSubmit={gerer_enregistrement_affectation} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">
              Sélectionner un {terminologie.enseignant_singulier.toLowerCase()} *
            </label>
            <select
              value={id_enseignant_affectation}
              onChange={(e) => charger_affectation_pour_enseignant(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-medium"
            >
              {enseignants.map((ens) => (
                <option key={ens.id} value={ens.id}>
                  {ens.nom_complet} ({ens.code} · {ens.specialite})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold">
                {terminologie.unite_pluriel} / Niveaux concernés ({ids_unites_affectation.length})
              </label>
              <button
                type="button"
                onClick={() => definir_ids_unites_affectation([])}
                className="text-[11px] text-slate-500 hover:text-red-600 cursor-pointer"
              >
                Tout décocher
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
              {unites.map((u) => {
                const coche = ids_unites_affectation.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                      coche
                        ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={coche}
                      onChange={() => basculer_unite_affectation(u.id)}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{u.nom}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {u.code} · {u.niveau_ou_duree}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold">
                {terminologie.contenu_pluriel} attribuées ({ids_elements_affectation.length})
              </label>
              <button
                type="button"
                onClick={() => definir_ids_elements_affectation([])}
                className="text-[11px] text-slate-500 hover:text-red-600 cursor-pointer"
              >
                Retirer toutes les matières
              </button>
            </div>
            {elements.length === 0 ? (
              <p className="text-slate-500 p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                Aucune matière créée pour l’instant. Ajoutez d’abord des{' '}
                {terminologie.contenu_pluriel.toLowerCase()} dans l’onglet dédié.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                {elements.map((el) => {
                  const coche = ids_elements_affectation.includes(el.id);
                  const unite_el = unites.find((u) => u.id === el.id_unite);
                  const autre_prof =
                    el.id_enseignant &&
                    el.id_enseignant !== 'non-assigne' &&
                    el.id_enseignant !== id_enseignant_affectation
                      ? enseignants.find((t) => t.id === el.id_enseignant)?.nom_complet
                      : undefined;
                  return (
                    <label
                      key={el.id}
                      className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer ${
                        coche
                          ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/30'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={coche}
                        onChange={() => basculer_element_affectation(el)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {el.code} · {el.nom}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {unite_el?.nom ?? 'Unité non précisée'} · {el.volume_horaire_total}h
                        </div>
                        {autre_prof && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400">
                            Actuellement : {autre_prof}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_affectation_ouverte(false)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
            >
              Enregistrer l’affectation
            </Bouton>
          </div>
        </form>
      </Modale>

      {/* Modale Déploiement rapide de cycle complet */}
      <Modale
        ouverte={modale_pack_ouverte}
        sur_fermeture={() => definir_modale_pack_ouverte(false)}
        titre="Déployer un cycle complet en 1 clic"
        sous_titre={`${etablissement_actif.nom_court} · Modèle ${terminologie.badge_type_libelle}`}
        classe_largeur_max="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500 dark:text-slate-400">
            Sélectionnez un pack clé en main pour créer automatiquement l’ensemble des{' '}
            {terminologie.unite_pluriel.toLowerCase()}, leurs grilles tarifaires et leurs{' '}
            {terminologie.contenu_pluriel.toLowerCase()} de démarrage.
          </p>

          <div className="space-y-3">
            {packs_disponibles.map((pack) => (
              <div
                key={pack.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-900/50 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                        {pack.titre}
                      </h4>
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800">
                        {pack.badge}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">{pack.sous_titre}</p>
                  </div>

                  <Bouton
                    type="button"
                    variante="principal"
                    taille="sm"
                    classe_accent={theme.bouton_principal}
                    onClick={() => gerer_deploiement_pack(pack)}
                    className="shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Déployer ce cycle</span>
                  </Bouton>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  {pack.unites.map((u) => (
                    <div
                      key={u.suffixe_code}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800"
                    >
                      <span className="font-medium truncate">{u.nom}</span>
                      <span className="font-mono text-[11px] text-slate-500 shrink-0">
                        {formater_montant(
                          u.frais_scolarite_htg,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modale>

      {/* Confirmation suppression */}
      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression)}
        sur_fermeture={() => definir_cible_suppression(null)}
        sur_confirmation={() => {
          if (!cible_suppression) return;
          if (cible_suppression.type === 'unite') {
            supprimer_unite_academique(cible_suppression.id);
          } else if (cible_suppression.type === 'element') {
            supprimer_element_pedagogique(cible_suppression.id);
          } else {
            supprimer_personnel_enseignant(cible_suppression.id);
          }
          definir_cible_suppression(null);
        }}
        tonalite="danger"
        titre="Confirmer la suppression"
        sous_titre={cible_suppression?.titre}
        description="Cette opération supprime l’élément sélectionné dans l’établissement actif."
        elements_impact={[{ libelle: 'Élément', valeur: cible_suppression?.titre ?? '' }]}
        libelle_confirmation="Supprimer définitivement"
      />
    </div>
  );
};
