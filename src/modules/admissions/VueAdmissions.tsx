import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Ban,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { CodeQrSvg } from '../../composants/interface/CodeQrSvg';
import {
  declencher_impression_ciblee,
  FicheInscriptionImprimable,
} from '../../composants/interface/FicheInscriptionImprimable';
import { LogoEtablissement } from '../../composants/interface/LogoEtablissement';
import { Modale } from '../../composants/interface/Modale';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { PROFILS_PAYS } from '../../configuration/regions_devises';
import { utiliserErp } from '../../contexte/ContexteErp';
import {
  Apprenant,
  ContactTuteur,
  InscriptionApprenant,
  PaiementEnregistre,
  StatutInscription,
} from '../../modeles/erp';
import {
  convertir_devise_vers_pivot,
  convertir_pivot_vers_devise,
  formater_date_fr,
  formater_montant,
} from '../../services/service_donnees';
import {
  creer_cle_brouillon_admission,
  effacer_brouillon_admission,
} from '../../services/service_brouillons';
import {
  obtenir_modes_paiement_pays,
  valider_courriel,
  valider_telephone_pays,
} from '../../utilitaires/validation_metier';

export const VueAdmissions: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    devise_active,
    utilisateur_actif,
    unites_etablissement,
    apprenants_etablissement,
    inscriptions_etablissement,
    inscrire_apprenant,
    reinscrire_apprenant,
    modifier_inscription,
    annuler_inscription,
    archiver_inscription,
    supprimer_inscription,
    inscrire_apprenants_lot,
    ouvrir_dossier_apprenant,
    definir_route_active,
    ajouter_toast,
    a_permission,
  } = utiliserErp();

  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const profil_pays = PROFILS_PAYS[etablissement_actif.code_pays] ?? PROFILS_PAYS.INTL;
  const peut_gerer_admissions = a_permission('admissions:gerer');

  const [mode_saisie, definir_mode_saisie] = useState<'nouveau' | 'reinscription' | 'registre'>(
    'nouveau'
  );
  const [etape, definir_etape] = useState(1);

  // Formulaire brouillon sauvegardé automatiquement
  const cle_brouillon = creer_cle_brouillon_admission(etablissement_actif.id);
  const [prenom, definir_prenom] = useState('');
  const [nom, definir_nom] = useState('');
  const [sexe, definir_sexe] = useState<'F' | 'M'>('F');
  const [date_naissance, definir_date_naissance] = useState('2005-05-14');
  const [lieu_naissance, definir_lieu_naissance] = useState(profil_pays.ville_defaut);
  const [telephone, definir_telephone] = useState(`${profil_pays.indicatif_telephonique} `);
  const [courriel, definir_courriel] = useState('');
  const [adresse, definir_adresse] = useState(`${profil_pays.ville_defaut}, ${profil_pays.nom}`);
  const [nationalite, definir_nationalite] = useState(profil_pays.nom);
  const [mobilite_internationale, definir_mobilite_internationale] = useState(false);
  const [reference_visa_passeport, definir_reference_visa_passeport] = useState('');

  const [pieces_cochees, definir_pieces_cochees] = useState<string[]>([]);
  const [id_unite, definir_id_unite] = useState(unites_etablissement[0]?.id ?? '');
  const [credits_choisis, definir_credits_choisis] = useState(30);
  const [pourcentage_bourse, definir_pourcentage_bourse] = useState(0);
  const [option_cantine, definir_option_cantine] = useState(false);
  const [option_transport, definir_option_transport] = useState(false);
  const [montant_initial_saisi, definir_montant_initial_saisi] = useState(0);
  const [mode_paiement, definir_mode_paiement] = useState<PaiementEnregistre['mode_paiement']>(
    obtenir_modes_paiement_pays(etablissement_actif.code_pays)[0]
  );
  const [reference_paiement, definir_reference_paiement] = useState('');

  // Responsables & Contacts d'urgence (tous types d'établissements)
  const lien_defaut = terminologie.etape_tuteurs_active ? 'Mère' : 'Proche / Urgence';
  const [tuteur_1_nom, definir_tuteur_1_nom] = useState('');
  const [tuteur_1_lien, definir_tuteur_1_lien] =
    useState<ContactTuteur['lien_parente']>(lien_defaut);
  const [tuteur_1_telephone, definir_tuteur_1_telephone] = useState(
    `${profil_pays.indicatif_telephonique} `
  );
  const [tuteur_2_nom, definir_tuteur_2_nom] = useState('');
  const [tuteur_2_lien, definir_tuteur_2_lien] =
    useState<ContactTuteur['lien_parente']>('Tuteur');
  const [tuteur_2_telephone, definir_tuteur_2_telephone] = useState(
    `${profil_pays.indicatif_telephonique} `
  );

  // Import CSV en lot & Fiche imprimable
  const [modale_csv_ouverte, definir_modale_csv_ouverte] = useState(false);
  const [texte_csv, definir_texte_csv] = useState(
    `Prénom;Nom;Genre;Téléphone;Adresse\nSabrina;Louis;F;${profil_pays.indicatif_telephonique} 11223344;${profil_pays.ville_defaut}\nMarc;Diallo;M;${profil_pays.indicatif_telephonique} 55667788;${profil_pays.ville_defaut}`
  );
  const [apprenant_cree, definir_apprenant_cree] = useState<Apprenant | null>(null);
  const [modale_fiche_ouverte, definir_modale_fiche_ouverte] = useState(false);
  const [format_fiche, definir_format_fiche] = useState<'a4' | '80mm'>('a4');
  const [mode_fiche_vierge, definir_mode_fiche_vierge] = useState(false);
  const [fiche_inscription_cible, definir_fiche_inscription_cible] = useState<{
    apprenant: Apprenant;
    inscription?: InscriptionApprenant;
  } | null>(null);

  // Réinscription
  const [apprenant_reinscription, definir_apprenant_reinscription] =
    useState<Apprenant | null>(null);
  const [re_id_unite, definir_re_id_unite] = useState(unites_etablissement[0]?.id ?? '');
  const [re_niveau, definir_re_niveau] = useState(etablissement_actif.libelle_periode_courante);
  const [re_annee, definir_re_annee] = useState(etablissement_actif.annee_academique);
  const [re_bourse, definir_re_bourse] = useState(0);
  const [re_observations, definir_re_observations] = useState('');

  // Registre des inscriptions (Consultation, Modification, Annulation, Archivage, Suppression)
  const [recherche_registre, definir_recherche_registre] = useState('');
  const [filtre_statut_registre, definir_filtre_statut_registre] = useState<
    'TOUTES' | StatutInscription
  >('TOUTES');
  const [inscription_en_edition, definir_inscription_en_edition] =
    useState<InscriptionApprenant | null>(null);
  const [ed_prenom, definir_ed_prenom] = useState('');
  const [ed_nom, definir_ed_nom] = useState('');
  const [ed_sexe, definir_ed_sexe] = useState<'F' | 'M'>('F');
  const [ed_date_naissance, definir_ed_date_naissance] = useState('');
  const [ed_lieu_naissance, definir_ed_lieu_naissance] = useState('');
  const [ed_telephone, definir_ed_telephone] = useState('');
  const [ed_courriel, definir_ed_courriel] = useState('');
  const [ed_adresse, definir_ed_adresse] = useState('');
  const [ed_nationalite, definir_ed_nationalite] = useState('');
  const [ed_mobilite, definir_ed_mobilite] = useState(false);
  const [ed_visa, definir_ed_visa] = useState('');
  const [ed_id_unite, definir_ed_id_unite] = useState('');
  const [ed_libelle_niveau, definir_ed_libelle_niveau] = useState('');
  const [ed_annee_academique, definir_ed_annee_academique] = useState('');
  const [ed_libelle_periode, definir_ed_libelle_periode] = useState('');
  const [ed_date_inscription, definir_ed_date_inscription] = useState('');
  const [ed_bourse, definir_ed_bourse] = useState(0);
  const [ed_type_inscription, definir_ed_type_inscription] =
    useState<InscriptionApprenant['type_inscription']>('NOUVELLE');
  const [ed_statut_inscription, definir_ed_statut_inscription] =
    useState<StatutInscription>('VALIDEE');
  const [ed_observations, definir_ed_observations] = useState('');
  const [ed_tuteur_1_nom, definir_ed_tuteur_1_nom] = useState('');
  const [ed_tuteur_1_lien, definir_ed_tuteur_1_lien] =
    useState<ContactTuteur['lien_parente']>('Proche / Urgence');
  const [ed_tuteur_1_telephone, definir_ed_tuteur_1_telephone] = useState('');
  const [ed_tuteur_2_nom, definir_ed_tuteur_2_nom] = useState('');
  const [ed_tuteur_2_lien, definir_ed_tuteur_2_lien] =
    useState<ContactTuteur['lien_parente']>('Tuteur');
  const [ed_tuteur_2_telephone, definir_ed_tuteur_2_telephone] = useState('');
  const [ed_pieces_fournies, definir_ed_pieces_fournies] = useState<string[]>([]);

  const [inscription_a_annuler, definir_inscription_a_annuler] =
    useState<InscriptionApprenant | null>(null);
  const [motif_annulation, definir_motif_annulation] = useState('');
  const [inscription_a_supprimer, definir_inscription_a_supprimer] =
    useState<InscriptionApprenant | null>(null);

  useEffect(() => {
    const profil = PROFILS_PAYS[etablissement_actif.code_pays] ?? PROFILS_PAYS.INTL;
    definir_id_unite(unites_etablissement[0]?.id ?? '');
    definir_re_id_unite(unites_etablissement[0]?.id ?? '');
    definir_re_niveau(etablissement_actif.libelle_periode_courante);
    definir_re_annee(etablissement_actif.annee_academique);
    definir_pieces_cochees([]);
    definir_apprenant_cree(null);
    definir_etape(1);
    definir_lieu_naissance(profil.ville_defaut);
    definir_telephone(`${profil.indicatif_telephonique} `);
    definir_adresse(`${profil.ville_defaut}, ${profil.nom}`);
    definir_nationalite(profil.nom);
    definir_tuteur_1_lien(terminologie.etape_tuteurs_active ? 'Mère' : 'Proche / Urgence');
    definir_tuteur_1_telephone(`${profil.indicatif_telephonique} `);
    definir_tuteur_2_telephone(`${profil_pays.indicatif_telephonique} `);
    definir_mode_paiement(
      obtenir_modes_paiement_pays(etablissement_actif.code_pays)[0]
    );
    definir_texte_csv(
      `Prénom;Nom;Genre;Téléphone;Adresse\nSabrina;Louis;F;${profil.indicatif_telephonique} 11223344;${profil.ville_defaut}\nMarc;Diallo;M;${profil.indicatif_telephonique} 55667788;${profil.ville_defaut}`
    );
    try {
      const sauvegarde = localStorage.getItem(cle_brouillon);
      if (sauvegarde) {
        const donnees = JSON.parse(sauvegarde);
        if (donnees.prenom) definir_prenom(donnees.prenom);
        if (donnees.nom) definir_nom(donnees.nom);
        if (donnees.telephone) definir_telephone(donnees.telephone);
      }
    } catch {
      // ignorer
    }
  }, [
    etablissement_actif.id,
    etablissement_actif.code_pays,
    etablissement_actif.annee_academique,
    etablissement_actif.libelle_periode_courante,
    terminologie.etape_tuteurs_active,
    unites_etablissement,
    cle_brouillon,
    profil_pays.indicatif_telephonique,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(cle_brouillon, JSON.stringify({ prenom, nom, telephone }));
    } catch {
      // ignorer
    }
  }, [cle_brouillon, prenom, nom, telephone]);

  const unite_selectionnee =
    unites_etablissement.find((u) => u.id === id_unite) ?? unites_etablissement[0];
  const sequence_suivante = String(apprenants_etablissement.length + 1).padStart(3, '0');
  const apercu_matricule = etablissement_actif.format_matricule.replace(
    '{SEQ}',
    sequence_suivante
  );

  const validation_tel_etape1 = valider_telephone_pays(etablissement_actif.code_pays, telephone);
  const courriel_etape1_valide = !courriel.trim() || valider_courriel(courriel);
  const modes_paiement_pays = useMemo(
    () => obtenir_modes_paiement_pays(etablissement_actif.code_pays),
    [etablissement_actif.code_pays]
  );

  // Détection de doublon en temps réel
  const doublon_potentiel = useMemo(() => {
    if (!prenom.trim() || !nom.trim()) return null;
    const p = prenom.trim().toLowerCase();
    const n = nom.trim().toLowerCase();
    return (
      apprenants_etablissement.find(
        (apprenant) =>
          (apprenant.prenom.toLowerCase() === p && apprenant.nom.toLowerCase() === n) ||
          (telephone.trim().length > 8 && apprenant.telephone === telephone.trim())
      ) ?? null
    );
  }, [prenom, nom, telephone, apprenants_etablissement]);

  // Calcul financier dynamique selon type
  const synthese_financiere = useMemo(() => {
    if (!unite_selectionnee) return { brut: 0, remise: 0, options: 0, net_a_payer: 0 };
    const scolarite_base =
      etablissement_actif.type === 'UNIVERSITE'
        ? Math.round(credits_choisis * 1200)
        : unite_selectionnee.frais_scolarite_htg;
    const brut = unite_selectionnee.frais_inscription_htg + scolarite_base;
    const remise = Math.round((scolarite_base * pourcentage_bourse) / 100);
    const options =
      etablissement_actif.type === 'SCOLAIRE'
        ? (option_cantine ? 3500 : 0) + (option_transport ? 4000 : 0)
        : 0;
    const net_a_payer = Math.max(0, brut - remise + options);
    return { brut, remise, options, net_a_payer };
  }, [
    unite_selectionnee,
    etablissement_actif.type,
    credits_choisis,
    pourcentage_bourse,
    option_cantine,
    option_transport,
  ]);

  const liste_etapes = useMemo(() => {
    return [
      { numero: 1, libelle: 'Identité' },
      { numero: 2, libelle: 'Pièces du dossier' },
      { numero: 3, libelle: terminologie.unite_singulier },
      {
        numero: 4,
        libelle: terminologie.etape_tuteurs_active ? 'Tuteurs & Urgence' : 'Contacts d’urgence',
      },
      { numero: 5, libelle: 'Plan financier' },
      { numero: 6, libelle: 'Validation & Badge' },
    ];
  }, [terminologie]);

  const etape_maximale = liste_etapes.length;
  const est_etape_tuteurs = etape === 4;
  const est_etape_finances = etape === 5;
  const est_etape_confirmation = etape === 6;

  const basculer_piece = (piece: string) => {
    definir_pieces_cochees((precedent) =>
      precedent.includes(piece) ? precedent.filter((d) => d !== piece) : [...precedent, piece]
    );
  };

  const montant_initial_htg = convertir_devise_vers_pivot(
    montant_initial_saisi,
    devise_active,
    etablissement_actif.taux_change_usd
  );

  const gerer_confirmation_inscription = () => {
    if (!unite_selectionnee) return;
    const dossier_complet =
      pieces_cochees.length >= terminologie.pieces_admission_requises.length;
    const pieces_manquantes = terminologie.pieces_admission_requises.filter(
      (d) => !pieces_cochees.includes(d)
    );
    const paye = Math.min(synthese_financiere.net_a_payer, Math.max(0, montant_initial_htg));
    if (paye > 0 && mode_paiement !== 'Espèces' && !reference_paiement.trim()) {
      ajouter_toast({
        titre: 'Référence de règlement requise',
        description:
          'Saisissez la référence du règlement déclaré. Aucune passerelle de paiement en ligne n’est connectée.',
        variante: 'error',
      });
      definir_etape(5);
      return;
    }
    const statut_paiement: Apprenant['statut_paiement'] =
      paye >= synthese_financiere.net_a_payer
        ? 'A_JOUR'
        : paye >= synthese_financiere.net_a_payer * 0.35
          ? 'PARTIEL'
          : 'EN_RETARD';

    const tuteurs_saisis: ContactTuteur[] = [];
    if (tuteur_1_nom.trim()) {
      tuteurs_saisis.push({
        nom_complet: tuteur_1_nom.trim(),
        lien_parente: tuteur_1_lien,
        telephone:
          tuteur_1_telephone.trim() || `${profil_pays.indicatif_telephonique} 0000-0000`,
        est_contact_urgence: true,
        retrait_autorise: true,
      });
    }
    if (tuteur_2_nom.trim()) {
      tuteurs_saisis.push({
        nom_complet: tuteur_2_nom.trim(),
        lien_parente: tuteur_2_lien,
        telephone:
          tuteur_2_telephone.trim() || `${profil_pays.indicatif_telephonique} 0000-0000`,
        est_contact_urgence: tuteurs_saisis.length === 0,
        retrait_autorise: true,
      });
    }
    const tuteurs: ContactTuteur[] | undefined =
      tuteurs_saisis.length > 0 ? tuteurs_saisis : undefined;

    const tel_normalise = validation_tel_etape1.valide
      ? validation_tel_etape1.numero_normalise
      : telephone.trim();

    const nouvel_apprenant: Apprenant = {
      id: `lrn-${Date.now()}`,
      id_etablissement: etablissement_actif.id,
      matricule: apercu_matricule,
      prenom: prenom.trim(),
      nom: nom.trim(),
      sexe,
      date_naissance,
      lieu_naissance,
      telephone: tel_normalise,
      courriel: courriel.trim() || undefined,
      adresse: adresse.trim(),
      id_unite: unite_selectionnee.id,
      libelle_niveau: etablissement_actif.libelle_periode_courante,
      date_inscription: new Date().toISOString().slice(0, 10),
      indice_etape: 1,
      statut: 'ACTIF',
      total_du_htg: synthese_financiere.net_a_payer,
      total_paye_htg: paye,
      statut_paiement,
      moyenne_generale: 0,
      taux_assiduite: 100,
      pourcentage_bourse,
      nationalite: nationalite.trim() || profil_pays.nom,
      mobilite_internationale,
      reference_visa_passeport: mobilite_internationale
        ? reference_visa_passeport.trim() || undefined
        : undefined,
      credits_requis: etablissement_actif.type === 'UNIVERSITE' ? 60 : undefined,
      credits_acquis: etablissement_actif.type === 'UNIVERSITE' ? 0 : undefined,
      tuteurs,
      dossier_complet,
      pieces_manquantes,
    };

    const ok = inscrire_apprenant(
      nouvel_apprenant,
      paye > 0
        ? {
            numero_recu: `REC-${etablissement_actif.code}-2026-${String(Math.floor(1000 + Math.random() * 8999))}`,
            id_apprenant: nouvel_apprenant.id,
            montant_htg: paye,
            mode_paiement,
            code_reference: reference_paiement || undefined,
            libelle: `Inscription + 1er versement (${unite_selectionnee.code})`,
            paye_le: new Date().toISOString().slice(0, 10),
            encaisse_par: utilisateur_actif.nom_complet,
            statut: 'VALIDE',
          }
        : undefined,
      {
        type_inscription: 'NOUVELLE',
        montant_brut_htg: synthese_financiere.brut,
        pieces_fournies: pieces_cochees,
        option_cantine,
        option_transport,
      }
    );
    if (!ok) return;

    effacer_brouillon_admission(etablissement_actif.id);
    definir_apprenant_cree(nouvel_apprenant);
  };

  const gerer_importation_lot = () => {
    if (!unite_selectionnee) return;
    const lignes = texte_csv
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.toLowerCase().startsWith('prénom'));

    const lot: Apprenant[] = lignes.map((ligne, index) => {
      const [
        p = 'Apprenant',
        n = 'International',
        g = 'F',
        tel = `${profil_pays.indicatif_telephonique} 0000-0000`,
        addr = profil_pays.ville_defaut,
      ] = ligne.split(';').map((s) => s.trim());
      const seq = String(apprenants_etablissement.length + index + 1).padStart(3, '0');
      return {
        id: `lrn-batch-${Date.now()}-${index}`,
        id_etablissement: etablissement_actif.id,
        matricule: etablissement_actif.format_matricule.replace('{SEQ}', seq),
        prenom: p,
        nom: n,
        sexe: g.toUpperCase() === 'M' ? 'M' : 'F',
        date_naissance: '2004-01-15',
        lieu_naissance: profil_pays.ville_defaut,
        telephone: tel,
        adresse: addr,
        nationalite: profil_pays.nom,
        id_unite: unite_selectionnee.id,
        libelle_niveau: etablissement_actif.libelle_periode_courante,
        date_inscription: new Date().toISOString().slice(0, 10),
        indice_etape: 1,
        statut: 'ACTIF',
        total_du_htg:
          unite_selectionnee.frais_scolarite_htg + unite_selectionnee.frais_inscription_htg,
        total_paye_htg: 0,
        statut_paiement: 'EN_RETARD',
        moyenne_generale: 0,
        taux_assiduite: 100,
        dossier_complet: false,
        pieces_manquantes: terminologie.pieces_admission_requises,
      };
    });

    if (lot.length > 0) {
      inscrire_apprenants_lot(lot);
      definir_modale_csv_ouverte(false);
    }
  };

  const gerer_validation_reinscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apprenant_reinscription) return;
    const unite =
      unites_etablissement.find((u) => u.id === re_id_unite) ?? unites_etablissement[0];
    if (!unite) return;
    const brut = unite.frais_inscription_htg + unite.frais_scolarite_htg;
    const remise = Math.round((unite.frais_scolarite_htg * re_bourse) / 100);
    const net = Math.max(0, brut - remise);
    const creee = reinscrire_apprenant({
      id_apprenant: apprenant_reinscription.id,
      id_unite: unite.id,
      libelle_niveau: re_niveau.trim() || etablissement_actif.libelle_periode_courante,
      annee_academique: re_annee.trim() || etablissement_actif.annee_academique,
      libelle_periode: etablissement_actif.libelle_periode_courante,
      pourcentage_bourse: re_bourse,
      montant_brut_htg: brut,
      montant_net_htg: net,
      pieces_fournies: apprenant_reinscription.dossier_complet
        ? terminologie.pieces_admission_requises
        : [],
      observations: re_observations.trim() || undefined,
    });
    if (creee) {
      definir_apprenant_reinscription(null);
      definir_mode_saisie('registre');
    }
  };

  const ouvrir_edition_inscription = (ins: InscriptionApprenant) => {
    const apprenant = apprenants_etablissement.find((a) => a.id === ins.id_apprenant);
    if (!apprenant) return;
    definir_inscription_en_edition(ins);
    definir_ed_prenom(apprenant.prenom);
    definir_ed_nom(apprenant.nom);
    definir_ed_sexe(apprenant.sexe);
    definir_ed_date_naissance(apprenant.date_naissance);
    definir_ed_lieu_naissance(apprenant.lieu_naissance);
    definir_ed_telephone(apprenant.telephone);
    definir_ed_courriel(apprenant.courriel ?? '');
    definir_ed_adresse(apprenant.adresse);
    definir_ed_nationalite(apprenant.nationalite ?? profil_pays.nom);
    definir_ed_mobilite(Boolean(apprenant.mobilite_internationale));
    definir_ed_visa(apprenant.reference_visa_passeport ?? '');
    definir_ed_id_unite(ins.id_unite);
    definir_ed_libelle_niveau(ins.libelle_niveau);
    definir_ed_annee_academique(ins.annee_academique);
    definir_ed_libelle_periode(ins.libelle_periode);
    definir_ed_date_inscription(ins.date_inscription);
    definir_ed_bourse(ins.pourcentage_bourse);
    definir_ed_type_inscription(ins.type_inscription);
    definir_ed_statut_inscription(ins.statut_inscription);
    definir_ed_observations(ins.observations ?? '');

    const t1 = apprenant.tuteurs?.[0];
    const t2 = apprenant.tuteurs?.[1];
    definir_ed_tuteur_1_nom(t1?.nom_complet ?? '');
    definir_ed_tuteur_1_lien(
      t1?.lien_parente ?? (terminologie.etape_tuteurs_active ? 'Mère' : 'Proche / Urgence')
    );
    definir_ed_tuteur_1_telephone(
      t1?.telephone ?? `${profil_pays.indicatif_telephonique} `
    );
    definir_ed_tuteur_2_nom(t2?.nom_complet ?? '');
    definir_ed_tuteur_2_lien(t2?.lien_parente ?? 'Tuteur');
    definir_ed_tuteur_2_telephone(
      t2?.telephone ?? `${profil_pays.indicatif_telephonique} `
    );
    const manquantes = apprenant.pieces_manquantes ?? [];
    definir_ed_pieces_fournies(
      terminologie.pieces_admission_requises.filter((p) => !manquantes.includes(p))
    );
  };

  const gerer_enregistrement_edition_inscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inscription_en_edition || !ed_prenom.trim() || !ed_nom.trim()) return;
    const unite = unites_etablissement.find((u) => u.id === ed_id_unite);
    const brut = unite
      ? unite.frais_inscription_htg + unite.frais_scolarite_htg
      : inscription_en_edition.montant_brut_htg;
    const remise = unite
      ? Math.round((unite.frais_scolarite_htg * ed_bourse) / 100)
      : Math.round((brut * ed_bourse) / 100);
    const net = Math.max(0, brut - remise);

    const tuteurs_maj: ContactTuteur[] = [];
    if (ed_tuteur_1_nom.trim()) {
      tuteurs_maj.push({
        nom_complet: ed_tuteur_1_nom.trim(),
        lien_parente: ed_tuteur_1_lien,
        telephone: ed_tuteur_1_telephone.trim() || profil_pays.indicatif_telephonique,
        est_contact_urgence: true,
        retrait_autorise: true,
      });
    }
    if (ed_tuteur_2_nom.trim()) {
      tuteurs_maj.push({
        nom_complet: ed_tuteur_2_nom.trim(),
        lien_parente: ed_tuteur_2_lien,
        telephone: ed_tuteur_2_telephone.trim() || profil_pays.indicatif_telephonique,
        est_contact_urgence: tuteurs_maj.length === 0,
        retrait_autorise: true,
      });
    }
    const pieces_manquantes = terminologie.pieces_admission_requises.filter(
      (p) => !ed_pieces_fournies.includes(p)
    );

    const ok = modifier_inscription(
      inscription_en_edition.id,
      {
        id_unite: ed_id_unite,
        libelle_niveau: ed_libelle_niveau.trim(),
        annee_academique: ed_annee_academique.trim(),
        libelle_periode: ed_libelle_periode.trim(),
        date_inscription: ed_date_inscription,
        pourcentage_bourse: ed_bourse,
        montant_brut_htg: brut,
        montant_net_htg: net,
        type_inscription: ed_type_inscription,
        statut_inscription: ed_statut_inscription,
        observations: ed_observations.trim() || undefined,
        pieces_fournies: ed_pieces_fournies,
      },
      {
        prenom: ed_prenom.trim(),
        nom: ed_nom.trim(),
        sexe: ed_sexe,
        date_naissance: ed_date_naissance,
        lieu_naissance: ed_lieu_naissance.trim(),
        telephone: ed_telephone.trim(),
        courriel: ed_courriel.trim() || undefined,
        adresse: ed_adresse.trim(),
        nationalite: ed_nationalite.trim() || undefined,
        mobilite_internationale: ed_mobilite,
        reference_visa_passeport: ed_mobilite ? ed_visa.trim() || undefined : undefined,
        tuteurs: tuteurs_maj,
        dossier_complet: pieces_manquantes.length === 0,
        pieces_manquantes,
      }
    );
    if (ok) {
      definir_inscription_en_edition(null);
    }
  };

  const inscriptions_filtrees = useMemo(() => {
    const q = recherche_registre.trim().toLowerCase();
    return inscriptions_etablissement.filter((ins) => {
      if (filtre_statut_registre !== 'TOUTES' && ins.statut_inscription !== filtre_statut_registre) {
        return false;
      }
      if (!q) return true;
      const ap = apprenants_etablissement.find((a) => a.id === ins.id_apprenant);
      const u = unites_etablissement.find((un) => un.id === ins.id_unite);
      return `${ins.numero_inscription} ${ins.annee_academique} ${ins.libelle_niveau} ${ap?.prenom ?? ''} ${ap?.nom ?? ''} ${ap?.matricule ?? ''} ${u?.nom ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [
    inscriptions_etablissement,
    filtre_statut_registre,
    recherche_registre,
    apprenants_etablissement,
    unites_etablissement,
  ]);

  const apprenant_pour_modale_fiche = mode_fiche_vierge
    ? null
    : fiche_inscription_cible?.apprenant ?? apprenant_cree;
  const inscription_pour_modale_fiche = mode_fiche_vierge
    ? undefined
    : fiche_inscription_cible?.inscription ??
      (apprenant_cree
        ? inscriptions_etablissement.find((i) => i.id_apprenant === apprenant_cree.id)
        : undefined);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Admissions, Réinscriptions & Registre — {terminologie.apprenant_singulier}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Inscrivez, réinscrivez, modifiez, annulez, archivez ou imprimez chaque fiche
            d’inscription à tout moment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => definir_mode_saisie('nouveau')}
              className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                mode_saisie === 'nouveau'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Nouvelle inscription
            </button>
            <button
              type="button"
              onClick={() => definir_mode_saisie('reinscription')}
              className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                mode_saisie === 'reinscription'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Réinscription
            </button>
            <button
              type="button"
              onClick={() => definir_mode_saisie('registre')}
              className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                mode_saisie === 'registre'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Registre ({inscriptions_etablissement.length})
            </button>
          </div>
          <Bouton
            variante="secondaire"
            taille="sm"
            onClick={() => {
              definir_fiche_inscription_cible(null);
              definir_mode_fiche_vierge(true);
              definir_format_fiche('a4');
              definir_modale_fiche_ouverte(true);
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Fiche vierge A4</span>
          </Bouton>
          <Bouton
            variante="secondaire"
            taille="sm"
            onClick={() => definir_modale_csv_ouverte(true)}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV (lot)</span>
          </Bouton>
        </div>
      </div>

      {unites_etablissement.length === 0 && (
        <Carte className="border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Aucune {terminologie.unite_singulier.toLowerCase()} configurée dans cet
                  établissement vierge
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  Créez d’abord au moins une {terminologie.unite_singulier.toLowerCase()} et son
                  tarif avant d’inscrire un {terminologie.apprenant_singulier.toLowerCase()}.
                </p>
              </div>
            </div>
            <Bouton
              variante="principal"
              taille="sm"
              classe_accent={theme_etab.bouton_principal}
              onClick={() => definir_route_active('structure')}
            >
              <span>Créer une {terminologie.unite_singulier.toLowerCase()}</span>
            </Bouton>
          </div>
        </Carte>
      )}

      {/* MODE REGISTRE DES INSCRIPTIONS */}
      {mode_saisie === 'registre' ? (
        <Carte className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={recherche_registre}
                onChange={(e) => definir_recherche_registre(e.target.value)}
                placeholder="Rechercher par N° inscription, matricule, nom, classe..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              {(
                [
                  { id: 'TOUTES', libelle: 'Toutes' },
                  { id: 'VALIDEE', libelle: 'Validées' },
                  { id: 'ANNULEE', libelle: 'Annulées' },
                  { id: 'ARCHIVEE', libelle: 'Archivées' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => definir_filtre_statut_registre(opt.id)}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                    filtre_statut_registre === opt.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {opt.libelle}
                </button>
              ))}
            </div>
          </div>

          {inscriptions_filtrees.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              Aucune inscription trouvée pour les critères sélectionnés.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {inscriptions_filtrees.map((ins) => {
                const apprenant = apprenants_etablissement.find((a) => a.id === ins.id_apprenant);
                const unite = unites_etablissement.find((u) => u.id === ins.id_unite);
                return (
                  <div
                    key={ins.id}
                    className="py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                          {ins.numero_inscription}
                        </span>
                        <span
                          className={`font-semibold text-[11px] px-2 py-0.5 rounded border ${
                            ins.statut_inscription === 'VALIDEE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : ins.statut_inscription === 'ANNULEE'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {ins.statut_inscription}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {ins.type_inscription} · {formater_date_fr(ins.date_inscription)}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {apprenant ? (
                          <button
                            type="button"
                            onClick={() => ouvrir_dossier_apprenant(apprenant.id)}
                            className="hover:underline text-left cursor-pointer"
                          >
                            {apprenant.prenom} {apprenant.nom} ({apprenant.matricule})
                          </button>
                        ) : (
                          'Dossier apprenant archivé'
                        )}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {unite?.nom ?? ins.id_unite} · {ins.libelle_niveau} ·{' '}
                        {ins.annee_academique} · Net :{' '}
                        <strong className="font-mono text-slate-700 dark:text-slate-200">
                          {formater_montant(
                            ins.montant_net_htg,
                            devise_active,
                            etablissement_actif.taux_change_usd
                          )}
                        </strong>
                        {ins.pourcentage_bourse > 0 ? ` (Bourse ${ins.pourcentage_bourse}%)` : ''}
                      </div>
                      {ins.motif_statut && (
                        <div className="text-[11px] text-red-600 dark:text-red-400">
                          Motif : {ins.motif_statut}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {apprenant && (
                        <Bouton
                          variante="secondaire"
                          taille="sm"
                          onClick={() => {
                            definir_mode_fiche_vierge(false);
                            definir_fiche_inscription_cible({ apprenant, inscription: ins });
                            definir_format_fiche('a4');
                            definir_modale_fiche_ouverte(true);
                          }}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Fiche PDF</span>
                        </Bouton>
                      )}
                      {peut_gerer_admissions && apprenant && (
                        <Bouton
                          variante="secondaire"
                          taille="sm"
                          onClick={() => ouvrir_edition_inscription(ins)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </Bouton>
                      )}
                      {peut_gerer_admissions && ins.statut_inscription === 'VALIDEE' && (
                        <Bouton
                          variante="fantome"
                          taille="sm"
                          onClick={() => {
                            definir_inscription_a_annuler(ins);
                            definir_motif_annulation('');
                          }}
                        >
                          <Ban className="w-3.5 h-3.5 text-amber-600" />
                          <span>Annuler</span>
                        </Bouton>
                      )}
                      {peut_gerer_admissions && ins.statut_inscription !== 'ARCHIVEE' && (
                        <Bouton
                          variante="fantome"
                          taille="sm"
                          onClick={() => archiver_inscription(ins.id)}
                        >
                          <Archive className="w-3.5 h-3.5 text-slate-500" />
                          <span>Archiver</span>
                        </Bouton>
                      )}
                      {peut_gerer_admissions && (
                        <Bouton
                          variante="fantome"
                          taille="sm"
                          onClick={() => definir_inscription_a_supprimer(ins)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Bouton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Carte>
      ) : mode_saisie === 'reinscription' ? (
        <Carte className="space-y-4">
          <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
            Réinscription d’un dossier existant ({etablissement_actif.annee_academique})
          </h3>
          {apprenants_etablissement.length === 0 ? (
            <p className="text-xs text-slate-500">Aucun dossier existant à réinscrire.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {apprenants_etablissement.map((apprenant) => {
                const unite = unites_etablissement.find((u) => u.id === apprenant.id_unite);
                return (
                  <div
                    key={apprenant.id}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-mono font-semibold text-slate-500 mr-2">
                        {apprenant.matricule}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {apprenant.prenom} {apprenant.nom}
                      </span>
                      <span className="text-slate-500 ml-2">
                        · {unite?.nom ?? apprenant.id_unite} ({apprenant.libelle_niveau})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bouton
                        variante="fantome"
                        taille="sm"
                        onClick={() => {
                          const ins = inscriptions_etablissement.find(
                            (i) => i.id_apprenant === apprenant.id
                          );
                          definir_mode_fiche_vierge(false);
                          definir_fiche_inscription_cible({ apprenant, inscription: ins });
                          definir_format_fiche('a4');
                          definir_modale_fiche_ouverte(true);
                        }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Fiche</span>
                      </Bouton>
                      <Bouton
                        variante="secondaire"
                        taille="sm"
                        onClick={() => {
                          definir_apprenant_reinscription(apprenant);
                          definir_re_id_unite(
                            apprenant.id_unite || unites_etablissement[0]?.id || ''
                          );
                          definir_re_niveau(etablissement_actif.libelle_periode_courante);
                          definir_re_annee(etablissement_actif.annee_academique);
                          definir_re_bourse(apprenant.pourcentage_bourse ?? 0);
                          definir_re_observations('');
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reconduire le dossier</span>
                      </Bouton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Carte>
      ) : apprenant_cree ? (
        <Carte rembourrage="grand" className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            <span>Inscription enregistrée avec succès</span>
          </div>
          <h3 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100 mt-2">
            {apprenant_cree.prenom} {apprenant_cree.nom} ·{' '}
            <span className="font-mono">{apprenant_cree.matricule}</span>
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Le badge QR et la fiche d’inscription sont enregistrés et consultables à tout moment
            depuis le Dossier 360° ou le Registre.
          </p>

          <div className="mt-5 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LogoEtablissement
                type={etablissement_actif.type}
                code={etablissement_actif.code}
                url_logo={etablissement_actif.url_logo}
                nom={etablissement_actif.nom}
                taille="grand"
              />
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  {etablissement_actif.nom}
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {apprenant_cree.prenom} {apprenant_cree.nom}
                </div>
                <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                  {apprenant_cree.matricule} · {unite_selectionnee?.nom}
                </div>
              </div>
            </div>
            <CodeQrSvg
              valeur={`${etablissement_actif.code}|${apprenant_cree.matricule}`}
              taille={72}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Bouton
              variante="principal"
              classe_accent={theme_etab.bouton_principal}
              onClick={() => {
                definir_fiche_inscription_cible(null);
                definir_mode_fiche_vierge(false);
                definir_format_fiche('a4');
                definir_modale_fiche_ouverte(true);
              }}
            >
              <FileText className="w-4 h-4" />
              <span>Fiche d’inscription A4 / PDF</span>
            </Bouton>
            <Bouton
              variante="secondaire"
              onClick={() => {
                definir_fiche_inscription_cible(null);
                definir_mode_fiche_vierge(false);
                definir_format_fiche('80mm');
                definir_modale_fiche_ouverte(true);
              }}
            >
              <Printer className="w-4 h-4" />
              <span>Ticket 80mm</span>
            </Bouton>
            <Bouton
              variante="secondaire"
              onClick={() => ouvrir_dossier_apprenant(apprenant_cree.id)}
            >
              Ouvrir le Dossier 360°
            </Bouton>
            <Bouton
              variante="fantome"
              onClick={() => {
                definir_apprenant_cree(null);
                definir_prenom('');
                definir_nom('');
                definir_courriel('');
                definir_tuteur_1_nom('');
                definir_tuteur_2_nom('');
                definir_etape(1);
              }}
            >
              Nouvelle inscription
            </Bouton>
          </div>
        </Carte>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Assistant d'inscription */}
          <Carte className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs">
              {liste_etapes.map((item_etape) => (
                <button
                  key={item_etape.numero}
                  type="button"
                  onClick={() => item_etape.numero <= etape && definir_etape(item_etape.numero)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer ${
                    etape === item_etape.numero
                      ? theme_etab.nav_active + ' font-semibold'
                      : item_etape.numero < etape
                        ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                        : 'text-slate-400'
                  }`}
                >
                  <span className="font-mono">{item_etape.numero}.</span>
                  <span>{item_etape.libelle}</span>
                </button>
              ))}
            </div>

            {/* Étape 1 : Identité */}
            {etape === 1 && (
              <div className="mt-5 space-y-4">
                {doublon_potentiel && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        Doublon potentiel détecté :{' '}
                        <strong>
                          {doublon_potentiel.prenom} {doublon_potentiel.nom}
                        </strong>{' '}
                        ({doublon_potentiel.matricule})
                      </span>
                    </div>
                    <Bouton
                      variante="secondaire"
                      taille="sm"
                      onClick={() => ouvrir_dossier_apprenant(doublon_potentiel.id)}
                    >
                      Voir fiche
                    </Bouton>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      value={prenom}
                      onChange={(e) => definir_prenom(e.target.value)}
                      placeholder="ex. Clara"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nom de famille *
                    </label>
                    <input
                      type="text"
                      value={nom}
                      onChange={(e) => definir_nom(e.target.value)}
                      placeholder="ex. Moreau"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sexe
                    </label>
                    <select
                      value={sexe}
                      onChange={(e) => definir_sexe(e.target.value as 'F' | 'M')}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="F">Féminin</option>
                      <option value="M">Masculin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Téléphone ({profil_pays.indicatif_telephonique}) *
                    </label>
                    <input
                      type="text"
                      value={telephone}
                      onChange={(e) => definir_telephone(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                    {telephone.trim().length > profil_pays.indicatif_telephonique.length + 1 &&
                      !validation_tel_etape1.valide && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                          {validation_tel_etape1.erreur}
                        </p>
                      )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Courriel personnel
                    </label>
                    <input
                      type="email"
                      value={courriel}
                      onChange={(e) => definir_courriel(e.target.value)}
                      placeholder="ex. clara.moreau@exemple.org"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                    {!courriel_etape1_valide && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                        Format de courriel invalide.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date de naissance
                    </label>
                    <input
                      type="date"
                      value={date_naissance}
                      onChange={(e) => definir_date_naissance(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Lieu de naissance
                    </label>
                    <input
                      type="text"
                      value={lieu_naissance}
                      onChange={(e) => definir_lieu_naissance(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nationalité / Citoyenneté
                    </label>
                    <input
                      type="text"
                      value={nationalite}
                      onChange={(e) => definir_nationalite(e.target.value)}
                      placeholder="ex. Française, Canadienne, Américaine, Sénégalaise..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Adresse complète ({profil_pays.nom})
                    </label>
                    <input
                      type="text"
                      value={adresse}
                      onChange={(e) => definir_adresse(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div className="sm:col-span-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mobilite_internationale}
                        onChange={(e) => definir_mobilite_internationale(e.target.checked)}
                      />
                      <span>
                        Mobilité internationale / {terminologie.apprenant_singulier} étranger (Visa /
                        Passeport)
                      </span>
                    </label>
                    {mobilite_internationale && (
                      <input
                        type="text"
                        value={reference_visa_passeport}
                        onChange={(e) => definir_reference_visa_passeport(e.target.value)}
                        placeholder="N° Passeport ou Visa d’études (ex. PP-FR-202699)"
                        className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Étape 2 : Pièces du dossier */}
            {etape === 2 && (
              <div className="mt-5 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cochez les pièces déposées et vérifiées pour ce dossier (
                  {terminologie.libelle_type_complet}) :
                </p>
                {terminologie.pieces_admission_requises.map((piece) => {
                  const cochee = pieces_cochees.includes(piece);
                  return (
                    <label
                      key={piece}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors ${
                        cochee
                          ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={cochee}
                          onChange={() => basculer_piece(piece)}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {piece}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-slate-500">
                        {cochee ? 'Vérifié' : 'En attente'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Étape 3 : Choix Unité d'étude */}
            {etape === 3 && (
              <div className="mt-5 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sélectionnez le choix de {terminologie.unite_singulier.toLowerCase()} pour{' '}
                  {etablissement_actif.libelle_periode_courante} :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {unites_etablissement.map((unite) => {
                    const est_selectionnee = unite.id === id_unite;
                    return (
                      <button
                        key={unite.id}
                        type="button"
                        onClick={() => definir_id_unite(unite.id)}
                        className={`text-left p-3.5 rounded-xl border cursor-pointer transition-colors ${
                          est_selectionnee
                            ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/30'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs text-slate-500">{unite.code}</span>
                          {est_selectionnee && <Check className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1">
                          {unite.nom}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {unite.niveau_ou_duree}{' '}
                          {unite.indication_horaire ? `· ${unite.indication_horaire}` : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {etablissement_actif.type === 'UNIVERSITE' && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Crédits ECTS inscrits ce semestre (facturation au prorata :{' '}
                      {formater_montant(1200, devise_active, etablissement_actif.taux_change_usd)}
                      /crédit)
                    </label>
                    <input
                      type="number"
                      min={12}
                      max={36}
                      value={credits_choisis}
                      onChange={(e) => definir_credits_choisis(Number(e.target.value) || 30)}
                      className="w-40 px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Étape 4 : Responsables / Contacts d'urgence (tous types d'établissements) */}
            {est_etape_tuteurs && (
              <div className="mt-5 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {terminologie.etape_tuteurs_active
                    ? 'Obligatoire pour la protection des mineurs : indiquez les parents/tuteurs et contacts d’urgence autorisés à récupérer l’élève (imprimés sur la fiche d’inscription).'
                    : 'Indiquez un ou deux responsables / contacts d’urgence à prévenir en cas de besoin (ces informations apparaissent directement à la section 3 de la fiche d’inscription).'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold mb-1">Lien / Relation</label>
                    <select
                      value={tuteur_1_lien}
                      onChange={(e) =>
                        definir_tuteur_1_lien(e.target.value as ContactTuteur['lien_parente'])
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="Mère">Mère</option>
                      <option value="Père">Père</option>
                      <option value="Tuteur">Tuteur</option>
                      <option value="Tutrice">Tutrice</option>
                      <option value="Conjoint(e)">Conjoint(e)</option>
                      <option value="Proche / Urgence">Proche / Contact d’urgence</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold mb-1">
                      Responsable / Contact 1 {terminologie.etape_tuteurs_active ? '*' : ''}
                    </label>
                    <input
                      type="text"
                      value={tuteur_1_nom}
                      onChange={(e) => definir_tuteur_1_nom(e.target.value)}
                      placeholder="ex. Hélène Bernard"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold mb-1">
                      Téléphone urgence ({profil_pays.indicatif_telephonique})
                    </label>
                    <input
                      type="text"
                      value={tuteur_1_telephone}
                      onChange={(e) => definir_tuteur_1_telephone(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Lien (2ème contact)</label>
                    <select
                      value={tuteur_2_lien}
                      onChange={(e) =>
                        definir_tuteur_2_lien(e.target.value as ContactTuteur['lien_parente'])
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="Père">Père</option>
                      <option value="Mère">Mère</option>
                      <option value="Tuteur">Tuteur</option>
                      <option value="Tutrice">Tutrice</option>
                      <option value="Conjoint(e)">Conjoint(e)</option>
                      <option value="Proche / Urgence">Proche / Contact d’urgence</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      2ème personne à contacter (optionnel)
                    </label>
                    <input
                      type="text"
                      value={tuteur_2_nom}
                      onChange={(e) => definir_tuteur_2_nom(e.target.value)}
                      placeholder="Nom complet"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Téléphone ({profil_pays.indicatif_telephonique})
                    </label>
                    <input
                      type="text"
                      value={tuteur_2_telephone}
                      onChange={(e) => definir_tuteur_2_telephone(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Étape Plan financier */}
            {est_etape_finances && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Bourse / Remise (%)</label>
                    <select
                      value={pourcentage_bourse}
                      onChange={(e) => definir_pourcentage_bourse(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value={0}>Aucune remise (0%)</option>
                      <option value={15}>Bourse mérite (15%)</option>
                      <option value={25}>Bourse sociale (25%)</option>
                      <option value={50}>Demi-bourse (50%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      1er encaissement à l’inscription ({devise_active})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      max={convertir_pivot_vers_devise(
                        synthese_financiere.net_a_payer,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                      value={montant_initial_saisi}
                      onChange={(e) =>
                        definir_montant_initial_saisi(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>

                {etablissement_actif.type === 'SCOLAIRE' && (
                  <div className="flex flex-wrap gap-4 pt-1 text-xs">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={option_cantine}
                        onChange={(e) => definir_option_cantine(e.target.checked)}
                      />
                      <span>
                        Option Cantine (+
                        {formater_montant(
                          3500,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                        )
                      </span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={option_transport}
                        onChange={(e) => definir_option_transport(e.target.checked)}
                      />
                      <span>
                        Option Transport scolaire (+
                        {formater_montant(
                          4000,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                        )
                      </span>
                    </label>
                  </div>
                )}

                {montant_initial_htg > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Mode de paiement</label>
                      <select
                        value={mode_paiement}
                        onChange={(e) =>
                          definir_mode_paiement(e.target.value as typeof mode_paiement)
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        {modes_paiement_pays.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Référence transaction
                      </label>
                      <input
                        type="text"
                        required={mode_paiement !== 'Espèces'}
                        value={reference_paiement}
                        onChange={(e) => definir_reference_paiement(e.target.value)}
                        placeholder="Référence du règlement déclaré"
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Enregistrement manuel avec référence; aucune passerelle en ligne n’est
                        connectée.
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Montant brut ({unite_selectionnee?.code})
                    </span>
                    <span className="font-mono">
                      {formater_montant(
                        synthese_financiere.brut,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                    </span>
                  </div>
                  {synthese_financiere.remise > 0 && (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                      <span>Remise / Bourse</span>
                      <span className="font-mono">
                        -
                        {formater_montant(
                          synthese_financiere.remise,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Net à payer</span>
                    <span className="font-mono">
                      {formater_montant(
                        synthese_financiere.net_a_payer,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Étape Validation */}
            {est_etape_confirmation && (
              <div className="mt-5 space-y-3 text-xs">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-slate-500">Identité</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {prenom || '—'} {nom || '—'} ({sexe})
                    </span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-slate-500">{terminologie.unite_singulier}</span>
                    <span className="font-semibold">{unite_selectionnee?.nom}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-slate-500">Pièces vérifiées</span>
                    <span className="font-mono">
                      {pieces_cochees.length}/{terminologie.pieces_admission_requises.length}
                    </span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between gap-2">
                    <span className="text-slate-500">Responsable / Contact urgence</span>
                    <span className="font-medium text-right">
                      {tuteur_1_nom.trim()
                        ? `${tuteur_1_nom.trim()} (${tuteur_1_lien}) · ${tuteur_1_telephone.trim()}`
                        : 'Non renseigné'}
                      {tuteur_2_nom.trim()
                        ? ` / ${tuteur_2_nom.trim()} (${tuteur_2_lien})`
                        : ''}
                    </span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-slate-500">Net facturé / Versé</span>
                    <span className="font-mono font-semibold">
                      {formater_montant(
                        synthese_financiere.net_a_payer,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}{' '}
                      /{' '}
                      {formater_montant(
                        montant_initial_htg,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Pied de l'assistant */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Bouton
                variante="secondaire"
                taille="sm"
                disabled={etape === 1}
                onClick={() => definir_etape((s) => Math.max(1, s - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Précédent</span>
              </Bouton>

              {!est_etape_confirmation ? (
                <Bouton
                  variante="principal"
                  taille="sm"
                  classe_accent={theme_etab.bouton_principal}
                  disabled={
                    (etape === 1 &&
                      (!prenom.trim() ||
                        !nom.trim() ||
                        !validation_tel_etape1.valide ||
                        !courriel_etape1_valide)) ||
                    (etape === 3 && !unite_selectionnee) ||
                    (etape === 4 && terminologie.etape_tuteurs_active && !tuteur_1_nom.trim())
                  }
                  onClick={() => definir_etape((s) => Math.min(etape_maximale, s + 1))}
                >
                  <span>Continuer</span>
                  <ChevronRight className="w-4 h-4" />
                </Bouton>
              ) : (
                <Bouton
                  variante="principal"
                  taille="sm"
                  classe_accent={theme_etab.bouton_principal}
                  onClick={gerer_confirmation_inscription}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Valider et générer le matricule</span>
                </Bouton>
              )}
            </div>
          </Carte>

          {/* Aperçu en direct du badge imprimable */}
          <Carte className="lg:col-span-4">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
              Aperçu du badge en direct
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-950 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
                <LogoEtablissement
                  type={etablissement_actif.type}
                  code={etablissement_actif.code}
                  url_logo={etablissement_actif.url_logo}
                  nom={etablissement_actif.nom}
                  taille="petit"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {etablissement_actif.nom}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {etablissement_actif.annee_academique}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">
                    {terminologie.apprenant_singulier}
                  </div>
                  <div className="text-base font-display font-bold text-slate-900 dark:text-slate-100 truncate">
                    {prenom || 'Prénom'} {nom || 'Nom'}
                  </div>
                  <div className="font-mono text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {apercu_matricule}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {unite_selectionnee?.nom ?? '—'}
                  </div>
                </div>
                <CodeQrSvg
                  valeur={`${etablissement_actif.code}|${apercu_matricule}`}
                  taille={68}
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                <span>Sceau : {etablissement_actif.code_sceau}</span>
                <span>{etablissement_actif.ville.split(',')[0]}</span>
              </div>
            </div>
          </Carte>
        </div>
      )}

      {/* Modale Import CSV */}
      <Modale
        ouverte={modale_csv_ouverte}
        sur_fermeture={() => definir_modale_csv_ouverte(false)}
        titre="Inscription par lot (Import CSV)"
        sous_titre={`Unité cible : ${unite_selectionnee?.nom ?? ''}`}
        pied_page={
          <>
            <Bouton variante="fantome" onClick={() => definir_modale_csv_ouverte(false)}>
              Annuler
            </Bouton>
            <Bouton
              variante="principal"
              classe_accent={theme_etab.bouton_principal}
              onClick={gerer_importation_lot}
            >
              Importer les dossiers
            </Bouton>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-500 dark:text-slate-400">
            Collez vos lignes CSV séparées par point-virgule (Prénom;Nom;Genre;Téléphone;Adresse) :
          </p>
          <textarea
            rows={6}
            value={texte_csv}
            onChange={(e) => definir_texte_csv(e.target.value)}
            className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs"
          />
        </div>
      </Modale>

      {/* Modale Réinscription */}
      <Modale
        ouverte={Boolean(apprenant_reinscription)}
        sur_fermeture={() => definir_apprenant_reinscription(null)}
        titre={`Réinscription — ${apprenant_reinscription?.prenom ?? ''} ${apprenant_reinscription?.nom ?? ''}`}
        sous_titre={apprenant_reinscription?.matricule}
        classe_largeur_max="max-w-lg"
      >
        <form onSubmit={gerer_validation_reinscription} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">{terminologie.unite_singulier}</label>
              <select
                value={re_id_unite}
                onChange={(e) => definir_re_id_unite(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {unites_etablissement.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Année académique</label>
              <input
                type="text"
                value={re_annee}
                onChange={(e) => definir_re_annee(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Niveau / Session</label>
              <input
                type="text"
                value={re_niveau}
                onChange={(e) => definir_re_niveau(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Bourse / Réduction (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={re_bourse}
                onChange={(e) => definir_re_bourse(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Observations administratives</label>
            <input
              type="text"
              value={re_observations}
              onChange={(e) => definir_re_observations(e.target.value)}
              placeholder="ex. Passage en classe supérieure"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_apprenant_reinscription(null)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme_etab.bouton_principal}
            >
              Valider la réinscription
            </Bouton>
          </div>
        </form>
      </Modale>

      {/* Modale Modification complète d'une inscription existante */}
      <Modale
        ouverte={Boolean(inscription_en_edition)}
        sur_fermeture={() => definir_inscription_en_edition(null)}
        titre={`Modifier l’inscription ${inscription_en_edition?.numero_inscription ?? ''}`}
        sous_titre="Corrigez les informations de l’apprenant ou les paramètres administratifs"
        classe_largeur_max="max-w-2xl"
      >
        <form onSubmit={gerer_enregistrement_edition_inscription} className="space-y-4 text-xs">
          <div className="font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1">
            1. Identité de l’apprenant
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Prénom *</label>
              <input
                type="text"
                required
                value={ed_prenom}
                onChange={(e) => definir_ed_prenom(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Nom *</label>
              <input
                type="text"
                required
                value={ed_nom}
                onChange={(e) => definir_ed_nom(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Sexe</label>
              <select
                value={ed_sexe}
                onChange={(e) => definir_ed_sexe(e.target.value as 'F' | 'M')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Date de naissance</label>
              <input
                type="date"
                value={ed_date_naissance}
                onChange={(e) => definir_ed_date_naissance(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Lieu de naissance</label>
              <input
                type="text"
                value={ed_lieu_naissance}
                onChange={(e) => definir_ed_lieu_naissance(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Nationalité</label>
              <input
                type="text"
                value={ed_nationalite}
                onChange={(e) => definir_ed_nationalite(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Téléphone</label>
              <input
                type="text"
                value={ed_telephone}
                onChange={(e) => definir_ed_telephone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Courriel</label>
              <input
                type="email"
                value={ed_courriel}
                onChange={(e) => definir_ed_courriel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Adresse</label>
              <input
                type="text"
                value={ed_adresse}
                onChange={(e) => definir_ed_adresse(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={ed_mobilite}
                onChange={(e) => definir_ed_mobilite(e.target.checked)}
              />
              <span>Mobilité internationale</span>
            </label>
            {ed_mobilite && (
              <input
                type="text"
                value={ed_visa}
                onChange={(e) => definir_ed_visa(e.target.value)}
                placeholder="N° Passeport / Visa"
                className="flex-1 px-3 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            )}
          </div>

          <div className="font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1 pt-1">
            2. Données administratives de l’inscription
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">{terminologie.unite_singulier}</label>
              <select
                value={ed_id_unite}
                onChange={(e) => definir_ed_id_unite(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {unites_etablissement.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Niveau / Session</label>
              <input
                type="text"
                value={ed_libelle_niveau}
                onChange={(e) => definir_ed_libelle_niveau(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Année académique</label>
              <input
                type="text"
                value={ed_annee_academique}
                onChange={(e) => definir_ed_annee_academique(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Période</label>
              <input
                type="text"
                value={ed_libelle_periode}
                onChange={(e) => definir_ed_libelle_periode(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Date d’inscription</label>
              <input
                type="date"
                value={ed_date_inscription}
                onChange={(e) => definir_ed_date_inscription(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Bourse (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={ed_bourse}
                onChange={(e) => definir_ed_bourse(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Type</label>
              <select
                value={ed_type_inscription}
                onChange={(e) =>
                  definir_ed_type_inscription(
                    e.target.value as InscriptionApprenant['type_inscription']
                  )
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="NOUVELLE">Nouvelle</option>
                <option value="REINSCRIPTION">Réinscription</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Statut administratif</label>
              <select
                value={ed_statut_inscription}
                onChange={(e) => definir_ed_statut_inscription(e.target.value as StatutInscription)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="VALIDEE">Validée</option>
                <option value="ANNULEE">Annulée</option>
                <option value="ARCHIVEE">Archivée</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Observations</label>
              <input
                type="text"
                value={ed_observations}
                onChange={(e) => definir_ed_observations(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1 pt-1">
            3. Responsables / Contacts d’urgence
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Lien (Contact 1)</label>
              <select
                value={ed_tuteur_1_lien}
                onChange={(e) =>
                  definir_ed_tuteur_1_lien(e.target.value as ContactTuteur['lien_parente'])
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Mère">Mère</option>
                <option value="Père">Père</option>
                <option value="Tuteur">Tuteur</option>
                <option value="Tutrice">Tutrice</option>
                <option value="Conjoint(e)">Conjoint(e)</option>
                <option value="Proche / Urgence">Proche / Contact d’urgence</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Nom complet (Contact 1)</label>
              <input
                type="text"
                value={ed_tuteur_1_nom}
                onChange={(e) => definir_ed_tuteur_1_nom(e.target.value)}
                placeholder="ex. Hélène Bernard"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Téléphone (Contact 1)</label>
              <input
                type="text"
                value={ed_tuteur_1_telephone}
                onChange={(e) => definir_ed_tuteur_1_telephone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Lien (Contact 2)</label>
              <select
                value={ed_tuteur_2_lien}
                onChange={(e) =>
                  definir_ed_tuteur_2_lien(e.target.value as ContactTuteur['lien_parente'])
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Père">Père</option>
                <option value="Mère">Mère</option>
                <option value="Tuteur">Tuteur</option>
                <option value="Tutrice">Tutrice</option>
                <option value="Conjoint(e)">Conjoint(e)</option>
                <option value="Proche / Urgence">Proche / Contact d’urgence</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Nom complet (Contact 2)</label>
              <input
                type="text"
                value={ed_tuteur_2_nom}
                onChange={(e) => definir_ed_tuteur_2_nom(e.target.value)}
                placeholder="Optionnel"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Téléphone (Contact 2)</label>
              <input
                type="text"
                value={ed_tuteur_2_telephone}
                onChange={(e) => definir_ed_tuteur_2_telephone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1 pt-1">
            4. Contrôle des pièces administratives
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {terminologie.pieces_admission_requises.map((piece) => {
              const cochee = ed_pieces_fournies.includes(piece);
              return (
                <label key={piece} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cochee}
                    onChange={() =>
                      definir_ed_pieces_fournies((prec) =>
                        prec.includes(piece)
                          ? prec.filter((x) => x !== piece)
                          : [...prec, piece]
                      )
                    }
                  />
                  <span>{piece}</span>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_inscription_en_edition(null)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme_etab.bouton_principal}
            >
              Enregistrer les modifications
            </Bouton>
          </div>
        </form>
      </Modale>

      {/* Modale d'annulation d'inscription */}
      <Modale
        ouverte={Boolean(inscription_a_annuler)}
        sur_fermeture={() => definir_inscription_a_annuler(null)}
        titre={`Annuler l’inscription ${inscription_a_annuler?.numero_inscription ?? ''}`}
        sous_titre="L’annulation conserve le dossier apprenant et l’historique financier intact"
        classe_largeur_max="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!inscription_a_annuler || !motif_annulation.trim()) {
              ajouter_toast({
                titre: 'Le motif d’annulation est obligatoire',
                variante: 'warning',
              });
              return;
            }
            annuler_inscription(inscription_a_annuler.id, motif_annulation.trim());
            definir_inscription_a_annuler(null);
          }}
          className="space-y-3 text-xs"
        >
          <div>
            <label className="block font-semibold mb-1">Motif officiel de l’annulation *</label>
            <textarea
              rows={3}
              required
              value={motif_annulation}
              onChange={(e) => definir_motif_annulation(e.target.value)}
              placeholder="ex. Désistement avant la rentrée / Changement d’établissement"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_inscription_a_annuler(null)}
            >
              Fermer
            </Bouton>
            <Bouton type="submit" variante="danger" taille="sm">
              Confirmer l’annulation
            </Bouton>
          </div>
        </form>
      </Modale>

      {/* Modale Confirmation Suppression d'inscription (préserve le dossier & l'historique) */}
      <ModaleConfirmationAction
        ouverte={Boolean(inscription_a_supprimer)}
        sur_fermeture={() => definir_inscription_a_supprimer(null)}
        sur_confirmation={() => {
          if (inscription_a_supprimer) {
            supprimer_inscription(inscription_a_supprimer.id);
            definir_inscription_a_supprimer(null);
          }
        }}
        tonalite="danger"
        titre={`Supprimer l’inscription ${inscription_a_supprimer?.numero_inscription ?? ''}`}
        description="La suppression retire uniquement cette fiche d’inscription administrative. Le dossier de l’apprenant, ses paiements, ses notes et ses documents officiels émis ne seront PAS supprimés."
        elements_impact={[
          {
            libelle: 'N° Inscription',
            valeur: inscription_a_supprimer?.numero_inscription ?? '',
          },
          {
            libelle: 'Données conservées',
            valeur: 'Dossier apprenant + Paiements + Notes + Documents',
          },
        ]}
        libelle_confirmation="Supprimer uniquement l’inscription"
      />

      {/* Modale Fiche d'Inscription A4 / Ticket 80mm */}
      <Modale
        ouverte={modale_fiche_ouverte}
        sur_fermeture={() => definir_modale_fiche_ouverte(false)}
        titre={
          mode_fiche_vierge
            ? 'Modèle de Fiche d’Inscription Vierge'
            : `Fiche d’inscription — ${apprenant_pour_modale_fiche?.prenom ?? ''} ${apprenant_pour_modale_fiche?.nom ?? ''}`
        }
        sous_titre={`${etablissement_actif.nom_court} · ${format_fiche === 'a4' ? 'Format Officiel A4' : 'Ticket Thermique 80mm'}`}
        classe_largeur_max={format_fiche === '80mm' ? 'max-w-md' : 'max-w-4xl'}
        pied_page={
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => definir_format_fiche('a4')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  format_fiche === 'a4'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Format A4 Officiel
              </button>
              <button
                type="button"
                onClick={() => definir_format_fiche('80mm')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  format_fiche === '80mm'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Ticket 80mm
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Bouton variante="fantome" onClick={() => definir_modale_fiche_ouverte(false)}>
                Fermer
              </Bouton>
              <Bouton
                variante="principal"
                classe_accent={theme_etab.bouton_principal}
                onClick={declencher_impression_ciblee}
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer / Télécharger PDF ({format_fiche.toUpperCase()})</span>
              </Bouton>
            </div>
          </div>
        }
      >
        <FicheInscriptionImprimable
          etablissement={etablissement_actif}
          terminologie={terminologie}
          devise={devise_active}
          format={format_fiche}
          apprenant={apprenant_pour_modale_fiche}
          unite={
            mode_fiche_vierge
              ? undefined
              : unites_etablissement.find(
                  (u) =>
                    u.id ===
                    (inscription_pour_modale_fiche?.id_unite ?? apprenant_pour_modale_fiche?.id_unite)
                ) ?? unite_selectionnee
          }
          inscription={inscription_pour_modale_fiche}
        />
      </Modale>
    </div>
  );
};
