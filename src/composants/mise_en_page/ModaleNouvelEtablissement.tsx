import React, { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronLeft, ChevronRight, CreditCard, ShieldCheck, Trash2, Upload } from 'lucide-react';
import {
  CATALOGUE_FORFAITS_SAAS,
  obtenir_definition_forfait,
} from '../../configuration/forfaits_saas';
import { detecter_pays_navigateur } from '../../configuration/internationalisation';
import {
  CATALOGUE_DEVISES,
  INDICATIFS_INTERNATIONAUX,
  PROFILS_PAYS,
  TOUTES_LES_DEVISES,
  TOUS_LES_PAYS,
} from '../../configuration/regions_devises';
import { obtenir_terminologie } from '../../configuration/terminologie';
import { utiliserErp } from '../../contexte/ContexteErp';
import {
  CodeDevise,
  CodePays,
  ConfigurationEtablissement,
  ElementPedagogique,
  TypeEtablissement,
  UniteAcademique,
} from '../../modeles/erp';
import { traiter_image_logo } from '../../utilitaires/image_logo';
import {
  formater_numero_local,
  obtenir_indicatif_verrouille,
  valider_courriel,
  valider_fuseau_iana,
  valider_telephone_pays,
} from '../../utilitaires/validation_metier';
import { BadgeTypeEtablissement } from '../interface/BadgeTypeEtablissement';
import { Bouton } from '../interface/Bouton';
import { ChampMotDePasse } from '../interface/ChampMotDePasse';
import { JaugeForceMotDePasse } from '../interface/JaugeForceMotDePasse';
import { LogoEtablissement } from '../interface/LogoEtablissement';
import { Modale } from '../interface/Modale';

export const ModaleNouvelEtablissement: React.FC = () => {
  const {
    modale_nouvel_etablissement_ouverte,
    definir_modale_nouvel_etablissement_ouverte,
    offre_saas_creation_selectionnee,
    creer_etablissement_complet,
    utilisateur_actif,
    est_authentifie,
    utilisateurs,
    ajouter_toast,
  } = utiliserErp();

  const pays_initial = detecter_pays_navigateur();
  const profil_initial = PROFILS_PAYS[pays_initial];
  const fuseau_navigateur =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || profil_initial.fuseau_horaire
      : profil_initial.fuseau_horaire;

  const [etape, definir_etape] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [type, definir_type] = useState<TypeEtablissement>('SCOLAIRE');
  const [code_pays, definir_code_pays] = useState<CodePays>(pays_initial);
  const [nom_pays_personnalise, definir_nom_pays_personnalise] = useState('');
  const [indicatif_personnalise, definir_indicatif_personnalise] = useState(
    INDICATIFS_INTERNATIONAUX[0].indicatif
  );
  const [fuseau_personnalise, definir_fuseau_personnalise] = useState(fuseau_navigateur);
  const [echelle_notation, definir_echelle_notation] = useState<10 | 20 | 100>(
    profil_initial.echelle_notation_defaut
  );
  const [nom, definir_nom] = useState('');
  const [code, definir_code] = useState('');
  const [ville, definir_ville] = useState(
    pays_initial === 'INTL' ? '' : profil_initial.ville_defaut
  );
  const [telephone_local, definir_telephone_local] = useState('');
  const [devise, definir_devise] = useState<CodeDevise>(profil_initial.devise_defaut);
  const [nom_direction, definir_nom_direction] = useState('');
  const [annee_academique, definir_annee_academique] = useState('2026–2027');
  const [libelle_periode, definir_libelle_periode] = useState('1er Trimestre (Oct–Déc)');
  const [demarrer_vierge, definir_demarrer_vierge] = useState(true);
  const [nom_unite_defaut, definir_nom_unite_defaut] = useState('Secondaire — Cycle Terminal');
  const [frais_scolarite_pivot_htg, definir_frais_scolarite_pivot_htg] = useState(286000);
  const [frais_inscription_pivot_htg, definir_frais_inscription_pivot_htg] = useState(42900);
  const [courriel_admin, definir_courriel_admin] = useState('');
  const [mot_de_passe_admin, definir_mot_de_passe_admin] = useState('');
  const [offre_saas, definir_offre_saas] =
    useState<ConfigurationEtablissement['offre_saas']>(offre_saas_creation_selectionnee);
  const [mode_activation_saas, definir_mode_activation_saas] = useState<'ESSAI_14J' | 'PAYE'>(
    'ESSAI_14J'
  );
  const [reference_paiement_saas, definir_reference_paiement_saas] = useState('');
  const [url_logo, definir_url_logo] = useState<string | undefined>(undefined);
  const ref_champ_logo = useRef<HTMLInputElement>(null);
  const ref_utilisateur_prerempli = useRef<string | null>(null);

  useEffect(() => {
    if (modale_nouvel_etablissement_ouverte) {
      definir_offre_saas(offre_saas_creation_selectionnee);
      definir_mode_activation_saas('ESSAI_14J');
      definir_reference_paiement_saas('');
    }
  }, [modale_nouvel_etablissement_ouverte, offre_saas_creation_selectionnee]);

  useEffect(() => {
    if (!modale_nouvel_etablissement_ouverte) return;
    const cle_utilisateur = est_authentifie ? utilisateur_actif.id : '__ANONYME__';
    const changement_compte = ref_utilisateur_prerempli.current !== cle_utilisateur;

    if (est_authentifie && utilisateur_actif.nom_complet.trim()) {
      definir_nom_direction((precedent) =>
        changement_compte || !precedent.trim() ? utilisateur_actif.nom_complet : precedent
      );
      definir_courriel_admin((precedent) =>
        changement_compte || !precedent.trim() ? utilisateur_actif.courriel : precedent
      );
      definir_mot_de_passe_admin((precedent) => (changement_compte ? '' : precedent));
    } else if (changement_compte) {
      definir_nom_direction('');
      definir_courriel_admin('');
      definir_mot_de_passe_admin('');
    }

    ref_utilisateur_prerempli.current = cle_utilisateur;
  }, [
    modale_nouvel_etablissement_ouverte,
    est_authentifie,
    utilisateur_actif.id,
    utilisateur_actif.courriel,
    utilisateur_actif.nom_complet,
  ]);

  const terminologie_apercu = obtenir_terminologie(type);
  const profil_pays = PROFILS_PAYS[code_pays];
  const nom_pays_effectif =
    code_pays === 'INTL'
      ? nom_pays_personnalise.trim() || 'International'
      : profil_pays.nom;
  const indicatif_effectif = obtenir_indicatif_verrouille(code_pays, indicatif_personnalise);
  const validation_telephone = valider_telephone_pays(
    code_pays,
    telephone_local,
    indicatif_personnalise
  );
  const fuseau_effectif =
    code_pays === 'INTL'
      ? fuseau_personnalise.trim() || 'UTC'
      : profil_pays.fuseau_horaire;

  const fuseau_valide = code_pays !== 'INTL' || valider_fuseau_iana(fuseau_personnalise);
  const etape2_valide =
    nom.trim().length >= 2 &&
    ville.trim().length >= 2 &&
    validation_telephone.valide &&
    (code_pays !== 'INTL' || (nom_pays_personnalise.trim().length >= 2 && fuseau_valide));
  const etape3_valide =
    annee_academique.trim().length >= 4 && libelle_periode.trim().length >= 2;
  const etape4_valide = demarrer_vierge || nom_unite_defaut.trim().length >= 2;
  const etape5_valide =
    frais_inscription_pivot_htg >= 0 &&
    frais_scolarite_pivot_htg >= 0 &&
    (offre_saas === 'Gratuit' ||
      mode_activation_saas === 'ESSAI_14J' ||
      reference_paiement_saas.trim().length >= 4);

  const courriel_admin_propre = courriel_admin.trim().toLowerCase();
  const rattache_utilisateur_courant =
    est_authentifie &&
    !utilisateur_actif.est_super_admin_plateforme &&
    courriel_admin_propre === utilisateur_actif.courriel.toLowerCase();
  const courriel_admin_valide = valider_courriel(courriel_admin);
  const courriel_en_conflit =
    courriel_admin_valide &&
    !rattache_utilisateur_courant &&
    utilisateurs.some((u) => u.courriel.toLowerCase() === courriel_admin_propre);
  const mot_de_passe_requis = !rattache_utilisateur_courant;
  const mot_de_passe_valide =
    !mot_de_passe_requis || mot_de_passe_admin.trim().length >= 8;
  const etape6_valide =
    nom_direction.trim().length >= 2 &&
    courriel_admin_valide &&
    !courriel_en_conflit &&
    mot_de_passe_valide;

  const gerer_selection_pays = (c: CodePays) => {
    definir_code_pays(c);
    const profil = PROFILS_PAYS[c];
    definir_ville(c === 'INTL' ? '' : profil.ville_defaut);
    definir_telephone_local('');
    definir_devise(profil.devise_defaut);
    definir_echelle_notation(type === 'PRO' ? 100 : profil.echelle_notation_defaut);
  };

  const gerer_selection_type = (t: TypeEtablissement) => {
    definir_type(t);
    definir_echelle_notation(t === 'PRO' ? 100 : PROFILS_PAYS[code_pays].echelle_notation_defaut);
    if (t === 'PRO') {
      definir_libelle_periode('Session Octobre 2026');
      definir_nom_unite_defaut('Électricité Bâtiment & Solaire');
      definir_frais_scolarite_pivot_htg(143000);
      definir_frais_inscription_pivot_htg(14300);
    } else if (t === 'SCOLAIRE') {
      definir_libelle_periode('1er Trimestre (Oct–Déc)');
      definir_nom_unite_defaut('Secondaire — Cycle Terminal');
      definir_frais_scolarite_pivot_htg(286000);
      definir_frais_inscription_pivot_htg(35750);
    } else {
      definir_libelle_periode('Semestre 1 (Automne)');
      definir_nom_unite_defaut('Licence 1 — Sciences Informatiques');
      definir_frais_scolarite_pivot_htg(357500);
      definir_frais_inscription_pivot_htg(42900);
    }
  };

  const gerer_fermeture = () => {
    definir_modale_nouvel_etablissement_ouverte(false);
    definir_etape(1);
  };

  const gerer_fichier_logo = async (evenement: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = evenement.target.files?.[0];
    if (!fichier) return;
    try {
      const url_donnees = await traiter_image_logo(fichier, 256);
      definir_url_logo(url_donnees);
    } catch (erreur) {
      ajouter_toast({
        titre: erreur instanceof Error ? erreur.message : 'Impossible de charger ce logo',
        variante: 'error',
      });
    } finally {
      if (ref_champ_logo.current) ref_champ_logo.current.value = '';
    }
  };

  const gerer_creation = () => {
    if (!etape2_valide) {
      ajouter_toast({
        titre: !validation_telephone.valide
          ? 'Numéro de téléphone invalide'
          : 'Informations d’identité incomplètes',
        description: !validation_telephone.valide
          ? validation_telephone.erreur
          : 'Vérifiez le nom officiel, la ville, le pays et le fuseau horaire.',
        variante: 'error',
      });
      definir_etape(2);
      return;
    }

    if (!etape3_valide) {
      ajouter_toast({
        titre: 'Période académique requise',
        description: 'Renseignez l’année académique et la période en cours.',
        variante: 'error',
      });
      definir_etape(3);
      return;
    }

    if (!etape4_valide) {
      ajouter_toast({
        titre: 'Structure initiale incomplète',
        description: `Indiquez le nom de la première ${terminologie_apercu.unite_singulier.toLowerCase()}.`,
        variante: 'error',
      });
      definir_etape(4);
      return;
    }

    if (!etape5_valide) {
      ajouter_toast({
        titre: 'Tarifs ou référence SaaS invalides',
        description:
          'Les frais doivent être positifs et une référence de règlement est requise pour un forfait payé.',
        variante: 'error',
      });
      definir_etape(5);
      return;
    }

    if (!etape6_valide) {
      ajouter_toast({
        titre: 'Compte responsable invalide',
        description: courriel_en_conflit
          ? 'Ce courriel administrateur existe déjà sur la plateforme.'
          : 'Renseignez un nom de responsable, un courriel valide et un mot de passe d’au moins 8 caractères.',
        variante: 'error',
      });
      return;
    }

    const code_nettoye = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const nom_sigle = nom.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const code_propre = (code_nettoye || nom_sigle.slice(0, 3) || 'ETB').slice(0, 4);
    const id = `t-custom-${Date.now()}`;
    const echelle_finale: 10 | 20 | 100 = type === 'PRO' ? 100 : echelle_notation;
    const note_passage_finale =
      echelle_finale === 100 ? 60 : echelle_finale === 20 ? 10 : 5;

    const nouvel_etablissement: ConfigurationEtablissement = {
      id,
      code: code_propre,
      nom: nom.trim(),
      nom_court: nom.trim().slice(0, 22),
      type,
      code_pays,
      nom_pays: nom_pays_effectif,
      fuseau_horaire: fuseau_effectif,
      autorite_tutelle: profil_pays.autorite_tutelle,
      ville: ville.trim(),
      adresse: `${ville.trim()}, ${nom_pays_effectif}`,
      telephone: validation_telephone.numero_normalise,
      courriel: courriel_admin.trim(),
      annee_academique: annee_academique.trim(),
      libelle_periode_courante: libelle_periode.trim(),
      devise_defaut: devise,
      taux_change_usd: 132,
      format_matricule: `${code_propre}-26-{SEQ}`,
      echelle_notation: echelle_finale,
      note_passage: type === 'PRO' ? 70 : note_passage_finale,
      couleur_accent: type === 'PRO' ? 'amber' : type === 'SCOLAIRE' ? 'blue' : 'violet',
      devise_etablissement: 'Savoir, Rigueur et Ouverture Mondiale',
      url_logo,
      titre_direction:
        type === 'UNIVERSITE'
          ? 'Recteur'
          : type === 'PRO'
            ? 'Directeur du centre'
            : 'Directeur d’établissement',
      nom_direction: nom_direction.trim() || 'Direction Générale',
      code_sceau: `SCEAU-${code_propre}-${code_pays}`,
      services_actifs: {
        bibliotheque: true,
        cantine: type === 'SCOLAIRE',
        transport: type === 'SCOLAIRE',
        infirmerie: true,
        anciens: true,
      },
      offre_saas,
      statut_abonnement_saas:
        offre_saas === 'Gratuit'
          ? 'GRATUIT'
          : mode_activation_saas === 'PAYE'
            ? 'PAYE'
            : 'ESSAI_14J',
      date_fin_essai_saas:
        offre_saas !== 'Gratuit' && mode_activation_saas === 'ESSAI_14J'
          ? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
          : undefined,
      reference_paiement_saas:
        offre_saas !== 'Gratuit' && mode_activation_saas === 'PAYE'
          ? reference_paiement_saas.trim() || `REG-${Date.now().toString().slice(-6)}`
          : undefined,
      bloquer_documents_si_impaye: true,
    };

    const id_unite = `u-init-${Date.now()}`;
    const nouvelle_unite: UniteAcademique = {
      id: id_unite,
      id_etablissement: id,
      code: `${code_propre}-01`,
      nom: nom_unite_defaut.trim() || terminologie_apercu.unite_singulier,
      categorie: terminologie_apercu.libelle_type_complet,
      niveau_ou_duree: type === 'PRO' ? '6 mois' : type === 'SCOLAIRE' ? 'Annuel' : 'Semestriel',
      capacite: 35,
      frais_inscription_htg: frais_inscription_pivot_htg,
      frais_scolarite_htg: frais_scolarite_pivot_htg,
      repartition_facturation: terminologie_apercu.libelle_modele_facturation,
      responsable_nom: nom_direction.trim() || 'Responsable pédagogique',
    };

    const nouvel_element: ElementPedagogique = {
      id: `pi-init-${Date.now()}`,
      id_etablissement: id,
      id_unite,
      code: `${code_propre}-MOD1`,
      nom:
        type === 'PRO'
          ? 'Module Pratique Fondamental'
          : type === 'SCOLAIRE'
            ? 'Mathématiques'
            : 'UE Fondamentale 101',
      nature: type === 'PRO' ? 'MODULE_PRATIQUE' : type === 'SCOLAIRE' ? 'MATIERE' : 'UE',
      coefficient_ou_credits: type === 'PRO' ? 120 : 5,
      volume_horaire_total: 60,
      id_enseignant: 'st-init',
      libelle_periode,
    };

    const ok = creer_etablissement_complet(
      nouvel_etablissement,
      demarrer_vierge ? [] : [nouvelle_unite],
      demarrer_vierge ? [] : [nouvel_element],
      {
        nom_complet: nom_direction.trim(),
        courriel: courriel_admin.trim(),
        telephone: validation_telephone.numero_normalise,
        mot_de_passe: mot_de_passe_admin.trim(),
      }
    );
    if (!ok) return;
    gerer_fermeture();
    definir_nom('');
    definir_code('');
    definir_telephone_local('');
    definir_nom_direction('');
    definir_courriel_admin('');
    definir_mot_de_passe_admin('');
    definir_url_logo(undefined);
  };

  return (
    <Modale
      ouverte={modale_nouvel_etablissement_ouverte}
      sur_fermeture={gerer_fermeture}
      titre="Assistant de création d’établissement (6 étapes)"
      sous_titre="Pré-remplissage intelligent des unités, tarifs et terminologie"
      classe_largeur_max="max-w-xl"
      pied_page={
        <>
          {etape > 1 ? (
            <Bouton
              variante="secondaire"
              onClick={() => definir_etape((precedente) => (precedente - 1) as typeof etape)}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Précédent</span>
            </Bouton>
          ) : (
            <Bouton variante="fantome" onClick={gerer_fermeture}>
              Annuler
            </Bouton>
          )}
          {etape < 6 ? (
            <Bouton
              variante="principal"
              onClick={() => definir_etape((precedente) => (precedente + 1) as typeof etape)}
              disabled={
                (etape === 2 && !etape2_valide) ||
                (etape === 3 && !etape3_valide) ||
                (etape === 4 && !etape4_valide) ||
                (etape === 5 && !etape5_valide)
              }
            >
              <span>Continuer</span>
              <ChevronRight className="w-4 h-4" />
            </Bouton>
          ) : (
            <Bouton variante="principal" onClick={gerer_creation} disabled={!etape6_valide}>
              <Check className="w-4 h-4" />
              <span>Créer et basculer vers cet établissement</span>
            </Bouton>
          )}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
        {[
          '1. Type',
          '2. Identité',
          '3. Année',
          '4. Structure',
          '5. Tarifs',
          '6. Utilisateurs',
        ].map((libelle, indice) => (
          <span
            key={libelle}
            className={
              etape === indice + 1
                ? 'font-semibold text-indigo-600 dark:text-indigo-400'
                : etape > indice + 1
                  ? 'text-emerald-600'
                  : ''
            }
          >
            {libelle}
          </span>
        ))}
      </div>

      {etape === 1 && (
        <div className="space-y-3">
          {(['PRO', 'SCOLAIRE', 'UNIVERSITE'] as TypeEtablissement[]).map((type_cand) => {
            const dictionnaire = obtenir_terminologie(type_cand);
            const est_selectionne = type === type_cand;
            return (
              <button
                key={type_cand}
                type="button"
                onClick={() => gerer_selection_type(type_cand)}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                  est_selectionne
                    ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BadgeTypeEtablissement type={type_cand} />
                    <span className="font-semibold text-sm">
                      {dictionnaire.libelle_type_complet}
                    </span>
                  </div>
                  {est_selectionne && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {dictionnaire.apprenant_pluriel} · {dictionnaire.unite_pluriel} ·{' '}
                  {dictionnaire.libelle_modele_facturation}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {etape === 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="sm:col-span-2">
            <label className="block font-semibold mb-1">Nom officiel *</label>
            <input
              type="text"
              required
              minLength={2}
              value={nom}
              onChange={(evenement) => definir_nom(evenement.target.value)}
              placeholder="ex. Campus International Saint-Exupéry"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            {nom.length > 0 && nom.trim().length < 2 && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                Indiquez au moins 2 caractères pour le nom de l’établissement.
              </p>
            )}
          </div>
          <div>
            <label className="block font-semibold mb-1">Sigle</label>
            <input
              type="text"
              maxLength={4}
              value={code}
              onChange={(evenement) =>
                definir_code(evenement.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
              }
              placeholder="CISE"
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Pays / Région</label>
            <select
              value={code_pays}
              onChange={(evenement) => gerer_selection_pays(evenement.target.value as CodePays)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {TOUS_LES_PAYS.map((c) => (
                <option key={c} value={c}>
                  {PROFILS_PAYS[c].nom}
                  {c !== 'INTL' ? ` (${PROFILS_PAYS[c].indicatif_telephonique})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Ville *</label>
            <input
              type="text"
              required
              minLength={2}
              value={ville}
              onChange={(evenement) => definir_ville(evenement.target.value)}
              placeholder="ex. Lyon, Montréal, Abidjan, Tokyo..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            {ville.trim().length < 2 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                Ville obligatoire (min. 2 caractères).
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold mb-1">
              Téléphone officiel * (indicatif verrouillé : {indicatif_effectif})
            </label>
            <div className="flex items-stretch rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950 focus-within:ring-2 focus-within:ring-indigo-500/30">
              {code_pays === 'INTL' ? (
                <select
                  value={indicatif_personnalise}
                  onChange={(e) => definir_indicatif_personnalise(e.target.value)}
                  aria-label="Indicatif international"
                  className="px-2.5 py-2 text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 shrink-0"
                >
                  {INDICATIFS_INTERNATIONAUX.map((item) => (
                    <option key={item.indicatif} value={item.indicatif}>
                      {item.pays}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  title={`Indicatif officiel verrouillé pour ${profil_pays.nom}`}
                  className="px-3 py-2 text-sm font-mono font-semibold bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 select-none shrink-0"
                >
                  {indicatif_effectif}
                </span>
              )}
              <input
                type="tel"
                inputMode="numeric"
                value={telephone_local}
                onChange={(evenement) => {
                  const brut = evenement.target.value.replace(/\D/g, '').slice(0, 12);
                  definir_telephone_local(formater_numero_local(brut));
                }}
                placeholder={profil_pays.validation_telephone.exemple_local}
                className="flex-1 min-w-0 px-3 py-2 text-sm font-mono bg-transparent focus:outline-none"
              />
            </div>
            {telephone_local.length > 0 && !validation_telephone.valide ? (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                {validation_telephone.erreur}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                Format requis ({profil_pays.nom}) : {profil_pays.validation_telephone.format_masque}{' '}
                · Ex : {indicatif_effectif} {profil_pays.validation_telephone.exemple_local}
              </p>
            )}
          </div>
          {code_pays === 'INTL' && (
            <>
              <div>
                <label className="block font-semibold mb-1">Nom du pays *</label>
                <input
                  type="text"
                  value={nom_pays_personnalise}
                  onChange={(e) => definir_nom_pays_personnalise(e.target.value)}
                  placeholder="ex. Colombie, Japon, Tunisie..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Fuseau horaire (IANA) *</label>
                <input
                  type="text"
                  value={fuseau_personnalise}
                  onChange={(e) => definir_fuseau_personnalise(e.target.value)}
                  placeholder="ex. Africa/Tunis"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                {!fuseau_valide && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                    Fuseau IANA invalide (exemples : Europe/Paris, Africa/Tunis, Asia/Tokyo, UTC).
                  </p>
                )}
              </div>
            </>
          )}
          <div className="sm:col-span-3 flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 mt-1">
            <LogoEtablissement
              type={type}
              code={(code.trim() || nom.slice(0, 3) || 'ETB').toUpperCase()}
              url_logo={url_logo}
              nom={nom || 'Nouvel établissement'}
              taille="moyen"
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Logo de l’établissement (optionnel)
              </div>
              <div className="text-[11px] text-slate-500">
                PNG, JPG, SVG ou WebP — modifiable à tout moment dans Paramètres.
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                ref={ref_champ_logo}
                type="file"
                accept="image/*"
                onChange={gerer_fichier_logo}
                className="hidden"
              />
              <Bouton
                type="button"
                variante="secondaire"
                taille="sm"
                onClick={() => ref_champ_logo.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{url_logo ? 'Changer' : 'Importer'}</span>
              </Bouton>
              {url_logo && (
                <Bouton
                  type="button"
                  variante="fantome"
                  taille="sm"
                  onClick={() => definir_url_logo(undefined)}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Bouton>
              )}
            </div>
          </div>
        </div>
      )}

      {etape === 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Année académique *</label>
            <input
              type="text"
              required
              minLength={4}
              value={annee_academique}
              onChange={(evenement) => definir_annee_academique(evenement.target.value)}
              placeholder="ex. 2026–2027"
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            {annee_academique.trim().length < 4 && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                Année académique obligatoire (ex. 2026–2027).
              </p>
            )}
          </div>
          <div>
            <label className="block font-semibold mb-1">
              {terminologie_apercu.periode_singulier} en cours *
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={libelle_periode}
              onChange={(evenement) => definir_libelle_periode(evenement.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            {libelle_periode.trim().length < 2 && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                Libellé de période obligatoire.
              </p>
            )}
          </div>
          {type !== 'PRO' && (
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Échelle de notation officielle</label>
              <select
                value={echelle_notation}
                onChange={(evenement) =>
                  definir_echelle_notation(Number(evenement.target.value) as 10 | 20 | 100)
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value={20}>Sur 20 (Système francophone / européen)</option>
                <option value={100}>Sur 100 (Amérique du Nord / Pourcentage)</option>
                <option value={10}>Sur 10 (Primaire / Amérique latine)</option>
              </select>
            </div>
          )}
        </div>
      )}

      {etape === 4 && (
        <div className="space-y-3 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Choisissez l’état initial des données de votre établissement (toujours isolé des autres
            écoles) :
          </p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => definir_demarrer_vierge(true)}
              className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                demarrer_vierge
                  ? 'border-indigo-600 bg-indigo-50/60 dark:border-indigo-400 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Démarrer avec un espace 100% vierge (Recommandé)
                </span>
                {demarrer_vierge && (
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                0 {terminologie_apercu.unite_singulier.toLowerCase()}, 0{' '}
                {terminologie_apercu.contenu_singulier.toLowerCase()}, 0{' '}
                {terminologie_apercu.apprenant_singulier.toLowerCase()}, 0 paiement — vous créez
                tout à votre rythme.
              </p>
            </button>

            <button
              type="button"
              onClick={() => definir_demarrer_vierge(false)}
              className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                !demarrer_vierge
                  ? 'border-indigo-600 bg-indigo-50/60 dark:border-indigo-400 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Créer une première {terminologie_apercu.unite_singulier.toLowerCase()} dès
                  maintenant
                </span>
                {!demarrer_vierge && (
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Aucun {terminologie_apercu.apprenant_singulier.toLowerCase()} ni paiement
                pré-rempli, uniquement votre 1ère{' '}
                {terminologie_apercu.unite_singulier.toLowerCase()}.
              </p>
            </button>
          </div>

          {!demarrer_vierge && (
            <div className="pt-1">
              <label className="block font-semibold mb-1">
                Nom de la première {terminologie_apercu.unite_singulier.toLowerCase()} *
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={nom_unite_defaut}
                onChange={(evenement) => definir_nom_unite_defaut(evenement.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              {nom_unite_defaut.trim().length < 2 && (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                  Indiquez un nom valide (min. 2 caractères).
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {etape === 5 && (
        <div className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-semibold">Forfait SaaS de l’établissement</label>
              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                Sélectionné : {offre_saas} ({obtenir_definition_forfait(offre_saas).libelle_prix}/mois)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATALOGUE_FORFAITS_SAAS.map((forfait_option) => {
                const actif = offre_saas === forfait_option.nom;
                return (
                  <button
                    key={forfait_option.nom}
                    type="button"
                    onClick={() => definir_offre_saas(forfait_option.nom)}
                    className={`text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                      actif
                        ? 'border-indigo-600 bg-indigo-50/70 dark:border-indigo-400 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {forfait_option.nom}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {forfait_option.libelle_prix}/mois
                        </span>
                        {actif && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {forfait_option.libelle_quota}
                    </div>
                  </button>
                );
              })}
            </div>

            {offre_saas === 'Gratuit' ? (
              <div className="mt-2.5 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Forfait Gratuit (0 $/mois) :</strong> aucun paiement requis. Accès
                  immédiat au tableau de bord avec un quota de 30 apprenants.
                </span>
              </div>
            ) : (
              <div className="mt-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-amber-900 dark:text-amber-200">
                    Activation du forfait payant ({offre_saas} ·{' '}
                    {obtenir_definition_forfait(offre_saas).libelle_prix}/mois)
                  </span>
                  <button
                    type="button"
                    onClick={() => definir_offre_saas('Gratuit')}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Passer plutôt au forfait Gratuit (0 $)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => definir_mode_activation_saas('ESSAI_14J')}
                    className={`text-left p-2 rounded-lg border cursor-pointer ${
                      mode_activation_saas === 'ESSAI_14J'
                        ? 'border-amber-600 bg-white dark:bg-slate-900'
                        : 'border-amber-200/70 dark:border-amber-800/60 bg-white/50 dark:bg-slate-950/40'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Essai gratuit 14 jours
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sans paiement immédiat · statut marqué « Essai (non payé) »
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => definir_mode_activation_saas('PAYE')}
                    className={`text-left p-2 rounded-lg border cursor-pointer ${
                      mode_activation_saas === 'PAYE'
                        ? 'border-emerald-600 bg-white dark:bg-slate-900'
                        : 'border-amber-200/70 dark:border-amber-800/60 bg-white/50 dark:bg-slate-950/40'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Déjà réglé / Référence paiement</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Saisissez votre N° de transaction SaaS
                    </div>
                  </button>
                </div>

                {mode_activation_saas === 'PAYE' && (
                  <div>
                    <input
                      type="text"
                      value={reference_paiement_saas}
                      onChange={(e) => definir_reference_paiement_saas(e.target.value)}
                      placeholder="Référence de paiement SaaS * (ex. STRIPE-88421 ou VIR-2026-09)"
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                    {reference_paiement_saas.trim().length < 4 && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
                        Saisissez une référence de règlement valide (min. 4 caractères) ou optez pour
                        l’essai gratuit 14 jours.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold mb-1">Devise principale de facturation</label>
            <select
              value={devise}
              onChange={(evenement) => definir_devise(evenement.target.value as CodeDevise)}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {TOUTES_LES_DEVISES.map((c) => (
                <option key={c} value={c}>
                  {CATALOGUE_DEVISES[c].libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Frais d’inscription ({devise})</label>
              <input
                type="number"
                min={0}
                value={Math.round(
                  frais_inscription_pivot_htg / CATALOGUE_DEVISES[devise].pivot_htg_par_unite
                )}
                onChange={(evenement) =>
                  definir_frais_inscription_pivot_htg(
                    Math.max(
                      0,
                      Math.round(
                        (Number(evenement.target.value) || 0) *
                          CATALOGUE_DEVISES[devise].pivot_htg_par_unite
                      )
                    )
                  )
                }
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Scolarité principale ({devise})</label>
              <input
                type="number"
                min={0}
                value={Math.round(
                  frais_scolarite_pivot_htg / CATALOGUE_DEVISES[devise].pivot_htg_par_unite
                )}
                onChange={(evenement) =>
                  definir_frais_scolarite_pivot_htg(
                    Math.max(
                      0,
                      Math.round(
                        (Number(evenement.target.value) || 0) *
                          CATALOGUE_DEVISES[devise].pivot_htg_par_unite
                      )
                    )
                  )
                }
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
        </div>
      )}

      {etape === 6 && (
        <div className="space-y-3 text-xs">
          {est_authentifie && (
            <div className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 text-[11px]">
              Pré-rempli avec votre profil connecté (<strong>{utilisateur_actif.nom_complet}</strong>
              ). Vous pouvez modifier librement le nom ou le courriel si vous créez cet établissement
              pour un autre responsable.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Nom du responsable / fondateur *</label>
              <input
                type="text"
                required
                minLength={2}
                value={nom_direction}
                onChange={(evenement) => definir_nom_direction(evenement.target.value)}
                placeholder="ex. Dr. Sophie Moreau"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              {nom_direction.trim().length < 2 && (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                  Le nom du responsable est obligatoire (min. 2 caractères).
                </p>
              )}
            </div>
            <div>
              <label className="block font-semibold mb-1">Courriel administrateur *</label>
              <input
                type="email"
                required
                value={courriel_admin}
                onChange={(evenement) => definir_courriel_admin(evenement.target.value)}
                placeholder="ex. direction@votre-ecole.org"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              {!courriel_admin_valide && (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                  Saisissez une adresse courriel valide (ex. nom@domaine.com).
                </p>
              )}
              {courriel_en_conflit && (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                  Ce courriel appartient déjà à un autre utilisateur.
                </p>
              )}
            </div>
            <div>
              <label className="block font-semibold mb-1">
                Mot de passe du compte {mot_de_passe_requis ? '*' : '(optionnel — compte connecté)'}
              </label>
              {rattache_utilisateur_courant ? (
                <div className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30 text-[11px] text-emerald-800 dark:text-emerald-300">
                  Rattaché à votre session active ({utilisateur_actif.courriel}). Vos identifiants
                  actuels restent inchangés.
                </div>
              ) : (
                <>
                  <ChampMotDePasse
                    value={mot_de_passe_admin}
                    onChange={(evenement) => definir_mot_de_passe_admin(evenement.target.value)}
                    placeholder="Minimum 8 caractères"
                    className="w-full py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <JaugeForceMotDePasse
                    compact
                    mot_de_passe={mot_de_passe_admin}
                    sur_generation={(genere) => definir_mot_de_passe_admin(genere)}
                  />
                  {mot_de_passe_admin.trim().length < 8 && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                      Minimum 8 caractères requis pour le compte administrateur.
                    </p>
                  )}
                </>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold">Formule SaaS & Statut</label>
                <button
                  type="button"
                  onClick={() => definir_etape(5)}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Modifier (Étape 5)
                </button>
              </div>
              <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {offre_saas} ({obtenir_definition_forfait(offre_saas).libelle_prix}/mois)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {offre_saas === 'Gratuit'
                    ? 'Gratuit sans paiement · Quota 30 apprenants'
                    : mode_activation_saas === 'PAYE'
                      ? `Réglé (${reference_paiement_saas || 'Confirmé'})`
                      : 'Essai gratuit 14 jours (paiement non encore encaissé)'}
                </div>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <div className="font-semibold">
                {nom || 'Nouvel établissement'} ({nom_pays_effectif}) · Forfait {offre_saas} (
                {offre_saas === 'Gratuit'
                  ? '0 $/mois'
                  : mode_activation_saas === 'PAYE'
                    ? 'Payé'
                    : 'Essai 14j'}
                )
              </div>
              <div className="text-slate-500">
                {terminologie_apercu.libelle_type_complet} ·{' '}
                {demarrer_vierge ? 'Espace 100% vierge (0 donnée)' : nom_unite_defaut} ·{' '}
                {Math.round(
                  frais_scolarite_pivot_htg / CATALOGUE_DEVISES[devise].pivot_htg_par_unite
                ).toLocaleString('fr-FR')}{' '}
                {CATALOGUE_DEVISES[devise].symbole} · {fuseau_effectif}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modale>
  );
};
