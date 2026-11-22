import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeDollarSign,
  BookOpen,
  CalendarOff,
  Check,
  CheckCircle2,
  Clock,
  FileText,
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
import { utiliserErp } from '../../contexte/ContexteErp';
import { BulletinPaie, DemandeConge, PersonnelEnseignant } from '../../modeles/erp';
import { formater_date_fr, formater_montant } from '../../services/service_donnees';
import { calculer_bulletin_paie } from '../../utilitaires/validation_metier';

export const VueRessourcesHumaines: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    devise_active,
    enseignants_etablissement,
    unites_etablissement,
    elements_etablissement,
    paie_etablissement,
    demandes_conge_etablissement,
    creer_bulletin_paie,
    modifier_bulletin_paie,
    supprimer_bulletin_paie,
    marquer_paie_payee,
    creer_demande_conge,
    modifier_demande_conge,
    supprimer_demande_conge,
    mettre_a_jour_statut_conge,
    ajouter_personnel_enseignant,
    modifier_personnel_enseignant,
    supprimer_personnel_enseignant,
    affecter_enseignant_pedagogie,
    a_permission,
  } = utiliserErp();

  const [onglet, definir_onglet] = useState<'paie' | 'personnel' | 'conges'>('paie');
  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type);
  const peut_gerer_rh = a_permission('rh:gerer');

  // --- PAIE : Modale création / édition + Aperçu PDF + Suppression ---
  const [modale_paie_ouverte, definir_modale_paie_ouverte] = useState(false);
  const [id_paie_edition, definir_id_paie_edition] = useState<string | null>(null);
  const [paie_id_personnel, definir_paie_id_personnel] = useState<string>(
    enseignants_etablissement[0]?.id ?? 'LIBRE'
  );
  const [paie_nom_personnel, definir_paie_nom_personnel] = useState('');
  const [paie_libelle_role, definir_paie_libelle_role] = useState(
    terminologie.enseignant_singulier
  );
  const [paie_libelle_mois, definir_paie_libelle_mois] = useState('Novembre 2026');
  const [paie_heures, definir_paie_heures] = useState(40);
  const [paie_base, definir_paie_base] = useState(0);
  const [paie_primes, definir_paie_primes] = useState(0);
  const [paie_motif_primes, definir_paie_motif_primes] = useState('');
  const [paie_retenues, definir_paie_retenues] = useState(0);
  const [paie_motif_retenues, definir_paie_motif_retenues] = useState('');
  const [paie_statut, definir_paie_statut] = useState<'PAYE' | 'EN_ATTENTE'>('EN_ATTENTE');
  const [paie_mode, definir_paie_mode] = useState('Virement bancaire');
  const [paie_observations, definir_paie_observations] = useState('');

  const [bulletin_aperçu, definir_bulletin_apercu] = useState<BulletinPaie | null>(null);
  const [cible_suppression_paie, definir_cible_suppression_paie] = useState<BulletinPaie | null>(
    null
  );

  // --- CONGÉS : Création, Édition, Suppression ---
  const [nom_personnel, definir_nom_personnel] = useState(
    enseignants_etablissement[0]?.nom_complet ?? ''
  );
  const [libelle_role, definir_libelle_role] = useState(terminologie.enseignant_singulier);
  const [type_conge, definir_type_conge] = useState<DemandeConge['type_conge']>('Congé annuel');
  const [date_debut, definir_date_debut] = useState(new Date().toISOString().slice(0, 10));
  const [date_fin, definir_date_fin] = useState(new Date().toISOString().slice(0, 10));
  const [motif, definir_motif] = useState('');
  const [conge_edition, definir_conge_edition] = useState<DemandeConge | null>(null);
  const [cible_suppression_conge, definir_cible_suppression_conge] = useState<DemandeConge | null>(
    null
  );

  // --- PERSONNEL : Ajout, Édition, Affectation matières/classes, Suppression ---
  const [modale_personnel_ouverte, definir_modale_personnel_ouverte] = useState(false);
  const [id_personnel_edition, definir_id_personnel_edition] = useState<string | null>(null);
  const [pers_code, definir_pers_code] = useState('');
  const [pers_nom, definir_pers_nom] = useState('');
  const [pers_specialite, definir_pers_specialite] = useState('');
  const [pers_contrat, definir_pers_contrat] =
    useState<PersonnelEnseignant['type_contrat']>('CDI / Temps plein');
  const [pers_tel, definir_pers_tel] = useState('');
  const [pers_courriel, definir_pers_courriel] = useState('');
  const [pers_heures, definir_pers_heures] = useState(60);
  const [pers_taux, definir_pers_taux] = useState(0);

  const [pers_affectation, definir_pers_affectation] = useState<PersonnelEnseignant | null>(null);
  const [aff_unites, definir_aff_unites] = useState<string[]>([]);
  const [aff_elements, definir_aff_elements] = useState<string[]>([]);
  const [cible_suppression_personnel, definir_cible_suppression_personnel] =
    useState<PersonnelEnseignant | null>(null);

  const calcul_paie_courant = useMemo(
    () => calculer_bulletin_paie(paie_base, paie_primes, paie_retenues),
    [paie_base, paie_primes, paie_retenues]
  );

  const masse_salariale_nette = paie_etablissement.reduce(
    (somme, bulletin) => somme + bulletin.montant_net_htg,
    0
  );
  const paiements_en_attente = paie_etablissement.filter(
    (bulletin) => bulletin.statut === 'EN_ATTENTE'
  ).length;
  const conges_en_attente = demandes_conge_etablissement.filter(
    (demande) => demande.statut === 'EN_ATTENTE'
  ).length;

  const pre_remplir_depuis_enseignant = (id_pers: string) => {
    definir_paie_id_personnel(id_pers);
    if (id_pers === 'LIBRE') {
      definir_paie_nom_personnel('');
      definir_paie_libelle_role('Personnel administratif');
      return;
    }
    const ens = enseignants_etablissement.find((e) => e.id === id_pers);
    if (!ens) return;
    definir_paie_nom_personnel(ens.nom_complet);
    definir_paie_libelle_role(`${terminologie.enseignant_singulier} · ${ens.specialite}`);
    definir_paie_heures(ens.heures_mensuelles);
    const base_estimee =
      ens.type_contrat === 'Vacation horaire'
        ? ens.heures_mensuelles * ens.taux_horaire_ou_mensuel_htg
        : ens.taux_horaire_ou_mensuel_htg;
    definir_paie_base(base_estimee > 0 ? base_estimee : 25000);
  };

  const ouvrir_creation_paie = () => {
    definir_id_paie_edition(null);
    const premier = enseignants_etablissement[0];
    if (premier) {
      pre_remplir_depuis_enseignant(premier.id);
    } else {
      definir_paie_id_personnel('LIBRE');
      definir_paie_nom_personnel('');
      definir_paie_libelle_role('Collaborateur');
      definir_paie_heures(40);
      definir_paie_base(25000);
    }
    definir_paie_libelle_mois('Novembre 2026');
    definir_paie_primes(0);
    definir_paie_motif_primes('');
    definir_paie_retenues(0);
    definir_paie_motif_retenues('');
    definir_paie_statut('EN_ATTENTE');
    definir_paie_mode('Virement bancaire');
    definir_paie_observations('');
    definir_modale_paie_ouverte(true);
  };

  const ouvrir_edition_paie = (b: BulletinPaie) => {
    definir_id_paie_edition(b.id);
    const existe_ens = enseignants_etablissement.some((e) => e.id === b.id_personnel);
    definir_paie_id_personnel(existe_ens ? b.id_personnel : 'LIBRE');
    definir_paie_nom_personnel(b.nom_personnel);
    definir_paie_libelle_role(b.libelle_role);
    definir_paie_libelle_mois(b.libelle_mois);
    definir_paie_heures(b.heures_travaillees);
    const primes = b.primes_htg ?? 0;
    const base = b.salaire_base_htg ?? Math.max(0, b.montant_brut_htg - primes);
    definir_paie_base(base);
    definir_paie_primes(primes);
    definir_paie_motif_primes(b.motif_primes ?? '');
    definir_paie_retenues(b.retenues_htg);
    definir_paie_motif_retenues(b.motif_retenues ?? '');
    definir_paie_statut(b.statut);
    definir_paie_mode(b.mode_paiement ?? 'Virement bancaire');
    definir_paie_observations(b.observations ?? '');
    definir_modale_paie_ouverte(true);
  };

  const gerer_sauvegarde_paie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcul_paie_courant.valide || !paie_nom_personnel.trim() || !paie_libelle_mois.trim()) {
      return;
    }
    const payload = {
      id_personnel:
        paie_id_personnel === 'LIBRE' ? `pers-libre-${Date.now()}` : paie_id_personnel,
      nom_personnel: paie_nom_personnel.trim(),
      libelle_role: paie_libelle_role.trim() || 'Collaborateur',
      libelle_mois: paie_libelle_mois.trim(),
      heures_travaillees: Math.max(0, Number(paie_heures) || 0),
      salaire_base_htg: paie_base,
      primes_htg: paie_primes,
      motif_primes: paie_motif_primes.trim() || undefined,
      retenues_htg: paie_retenues,
      motif_retenues: paie_motif_retenues.trim() || undefined,
      statut: paie_statut,
      mode_paiement: paie_mode.trim() || undefined,
      observations: paie_observations.trim() || undefined,
    };

    const ok = id_paie_edition
      ? modifier_bulletin_paie(id_paie_edition, payload)
      : Boolean(creer_bulletin_paie(payload));

    if (ok) {
      definir_modale_paie_ouverte(false);
      definir_id_paie_edition(null);
    }
  };

  const gerer_creation_conge = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!nom_personnel.trim() || !motif.trim()) return;
    creer_demande_conge({
      nom_personnel: nom_personnel.trim(),
      libelle_role: libelle_role.trim() || terminologie.enseignant_singulier,
      type_conge,
      date_debut,
      date_fin,
      motif: motif.trim(),
    });
    definir_motif('');
  };

  const gerer_sauvegarde_conge_edition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conge_edition) return;
    modifier_demande_conge(conge_edition.id, {
      nom_personnel: conge_edition.nom_personnel,
      libelle_role: conge_edition.libelle_role,
      type_conge: conge_edition.type_conge,
      date_debut: conge_edition.date_debut,
      date_fin: conge_edition.date_fin,
      motif: conge_edition.motif,
    });
    definir_conge_edition(null);
  };

  const ouvrir_creation_personnel = () => {
    definir_id_personnel_edition(null);
    definir_pers_code(`ENS-${String(enseignants_etablissement.length + 1).padStart(2, '0')}`);
    definir_pers_nom('');
    definir_pers_specialite('');
    definir_pers_contrat('CDI / Temps plein');
    definir_pers_tel(etablissement_actif.telephone);
    definir_pers_courriel('');
    definir_pers_heures(60);
    definir_pers_taux(25000);
    definir_modale_personnel_ouverte(true);
  };

  const ouvrir_edition_personnel = (ens: PersonnelEnseignant) => {
    definir_id_personnel_edition(ens.id);
    definir_pers_code(ens.code);
    definir_pers_nom(ens.nom_complet);
    definir_pers_specialite(ens.specialite);
    definir_pers_contrat(ens.type_contrat);
    definir_pers_tel(ens.telephone);
    definir_pers_courriel(ens.courriel);
    definir_pers_heures(ens.heures_mensuelles);
    definir_pers_taux(ens.taux_horaire_ou_mensuel_htg);
    definir_modale_personnel_ouverte(true);
  };

  const gerer_sauvegarde_personnel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pers_nom.trim()) return;
    const payload = {
      code: pers_code.trim() || `ENS-${enseignants_etablissement.length + 1}`,
      nom_complet: pers_nom.trim(),
      specialite: pers_specialite.trim() || 'Enseignement général',
      type_contrat: pers_contrat,
      telephone: pers_tel.trim() || etablissement_actif.telephone,
      courriel: pers_courriel.trim() || 'enseignant@etablissement.edu',
      heures_mensuelles: Math.max(0, Number(pers_heures) || 0),
      taux_horaire_ou_mensuel_htg: Math.max(0, Number(pers_taux) || 0),
    };
    if (id_personnel_edition) {
      modifier_personnel_enseignant(id_personnel_edition, payload);
    } else {
      ajouter_personnel_enseignant({
        ...payload,
        ids_unites_assignees: [],
        ids_elements_assignes: [],
      });
    }
    definir_modale_personnel_ouverte(false);
    definir_id_personnel_edition(null);
  };

  const ouvrir_affectation_personnel = (ens: PersonnelEnseignant) => {
    definir_pers_affectation(ens);
    definir_aff_unites(ens.ids_unites_assignees ?? []);
    const lies_par_element = elements_etablissement
      .filter((el) => el.id_enseignant === ens.id)
      .map((el) => el.id);
    definir_aff_elements(
      Array.from(new Set([...(ens.ids_elements_assignes ?? []), ...lies_par_element]))
    );
  };

  const gerer_sauvegarde_affectation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pers_affectation) return;
    affecter_enseignant_pedagogie(pers_affectation.id, aff_unites, aff_elements);
    definir_pers_affectation(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Ressources humaines, Paie & Congés ({terminologie.enseignant_pluriel})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Création et édition des fiches de paie, impression PDF, congés et affectations du
            personnel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => definir_onglet('paie')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              onglet === 'paie'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BadgeDollarSign className="w-3.5 h-3.5" />
            <span>Fiches de paie ({paie_etablissement.length})</span>
          </button>
          <button
            type="button"
            onClick={() => definir_onglet('conges')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              onglet === 'conges'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <CalendarOff className="w-3.5 h-3.5" />
            <span>Congés & Permissions ({demandes_conge_etablissement.length})</span>
          </button>
          <button
            type="button"
            onClick={() => definir_onglet('personnel')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              onglet === 'personnel'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Dossiers du personnel ({enseignants_etablissement.length})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Carte>
          <div className="text-xs text-slate-500">Effectif actif</div>
          <div className="mt-1.5 font-mono text-xl font-bold tabular-nums">
            {enseignants_etablissement.length}
          </div>
        </Carte>
        <Carte>
          <div className="text-xs text-slate-500">Masse salariale nette</div>
          <div className="mt-1.5 font-mono text-xl font-bold tabular-nums">
            {formater_montant(
              masse_salariale_nette,
              devise_active,
              etablissement_actif.taux_change_usd
            )}
          </div>
        </Carte>
        <Carte>
          <div className="text-xs text-slate-500">Paiements en attente</div>
          <div className="mt-1.5 font-mono text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {paiements_en_attente}
          </div>
        </Carte>
        <Carte>
          <div className="text-xs text-slate-500">Congés à valider</div>
          <div className="mt-1.5 font-mono text-xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {conges_en_attente}
          </div>
        </Carte>
      </div>

      {/* ONGLET 1 : PAIE */}
      {onglet === 'paie' && (
        <Carte rembourrage="aucun">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                Bulletins & Fiches de paie ({paie_etablissement.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Calculez automatiquement le brut et le net à payer, modifiez ou imprimez en PDF.
              </p>
            </div>
            {peut_gerer_rh && (
              <Bouton
                variante="principal"
                taille="sm"
                classe_accent={theme_etab.bouton_principal}
                onClick={ouvrir_creation_paie}
              >
                <Plus className="w-4 h-4" />
                <span>Créer une fiche de paie</span>
              </Bouton>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-slate-500">
                  <th className="px-4 py-2.5 text-left font-semibold">Collaborateur</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Période</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Heures</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Base + Primes</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Retenues</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Net à payer</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Statut</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paie_etablissement.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      Aucune fiche de paie enregistrée. Cliquez sur « Créer une fiche de paie ».
                    </td>
                  </tr>
                ) : (
                  paie_etablissement.map((bulletin) => (
                    <tr key={bulletin.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {bulletin.nom_personnel}
                        </div>
                        <div className="text-slate-500">{bulletin.libelle_role}</div>
                      </td>
                      <td className="px-4 py-3">{bulletin.libelle_mois}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {bulletin.heures_travaillees}h
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        <div>
                          {formater_montant(
                            bulletin.montant_brut_htg,
                            devise_active,
                            etablissement_actif.taux_change_usd
                          )}
                        </div>
                        {(bulletin.primes_htg ?? 0) > 0 && (
                          <div className="text-[10px] text-emerald-600">
                            dont +
                            {formater_montant(
                              bulletin.primes_htg ?? 0,
                              devise_active,
                              etablissement_actif.taux_change_usd
                            )}{' '}
                            prime
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-red-600 dark:text-red-400">
                        {formater_montant(
                          bulletin.retenues_htg,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                        {formater_montant(
                          bulletin.montant_net_htg,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {bulletin.statut === 'PAYE' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              Payé {bulletin.paye_le ? `(${formater_date_fr(bulletin.paye_le)})` : ''}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>En attente</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Bouton
                            type="button"
                            variante="secondaire"
                            taille="sm"
                            onClick={() => definir_bulletin_apercu(bulletin)}
                            title="Consulter et imprimer le bulletin PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </Bouton>
                          {peut_gerer_rh && bulletin.statut !== 'PAYE' && (
                            <Bouton
                              type="button"
                              variante="principal"
                              taille="sm"
                              classe_accent={theme_etab.bouton_principal}
                              onClick={() => marquer_paie_payee(bulletin.id)}
                            >
                              Payer
                            </Bouton>
                          )}
                          {peut_gerer_rh && (
                            <>
                              <Bouton
                                type="button"
                                variante="fantome"
                                taille="sm"
                                onClick={() => ouvrir_edition_paie(bulletin)}
                                aria-label="Modifier la fiche de paie"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Bouton>
                              <Bouton
                                type="button"
                                variante="danger"
                                taille="sm"
                                onClick={() => definir_cible_suppression_paie(bulletin)}
                                aria-label="Supprimer la fiche de paie"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Bouton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Carte>
      )}

      {/* ONGLET 2 : CONGÉS */}
      {onglet === 'conges' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Carte className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <CalendarOff className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-display font-bold">Nouvelle demande de congé</h3>
            </div>
            <form onSubmit={gerer_creation_conge} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Collaborateur *</label>
                {enseignants_etablissement.length > 0 ? (
                  <select
                    value={nom_personnel}
                    onChange={(e) => definir_nom_personnel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {enseignants_etablissement.map((enseignant) => (
                      <option key={enseignant.id} value={enseignant.nom_complet}>
                        {enseignant.nom_complet} ({enseignant.specialite})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={nom_personnel}
                    onChange={(e) => definir_nom_personnel(e.target.value)}
                    placeholder="Nom du collaborateur"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Type de congé</label>
                  <select
                    value={type_conge}
                    onChange={(e) =>
                      definir_type_conge(e.target.value as DemandeConge['type_conge'])
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Congé annuel">Congé annuel</option>
                    <option value="Congé maladie">Congé maladie</option>
                    <option value="Permission exceptionnelle">Permission exceptionnelle</option>
                    <option value="Maternité / Paternité">Maternité / Paternité</option>
                    <option value="Formation continue">Formation continue</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Fonction</label>
                  <input
                    type="text"
                    value={libelle_role}
                    onChange={(e) => definir_libelle_role(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Date début</label>
                  <input
                    type="date"
                    value={date_debut}
                    onChange={(e) => definir_date_debut(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date fin</label>
                  <input
                    type="date"
                    value={date_fin}
                    onChange={(e) => definir_date_fin(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Motif exact *</label>
                <textarea
                  rows={3}
                  required
                  value={motif}
                  onChange={(e) => definir_motif(e.target.value)}
                  placeholder="Précisez la raison de l'absence ou de la mission..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                classe_accent={theme_etab.bouton_principal}
                className="w-full"
              >
                <Plus className="w-4 h-4" />
                <span>Soumettre la demande</span>
              </Bouton>
            </form>
          </Carte>

          <Carte rembourrage="aucun" className="lg:col-span-8">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-display font-bold">
                Registre des demandes de congés & permissions ({demandes_conge_etablissement.length})
              </h3>
            </div>
            {demandes_conge_etablissement.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Aucune demande de congé enregistrée pour cet établissement.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {demandes_conge_etablissement.map((demande) => {
                  const style_statut =
                    demande.statut === 'APPROUVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : demande.statut === 'REFUSE'
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';

                  return (
                    <div
                      key={demande.id}
                      className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {demande.nom_personnel}
                          </span>
                          <span className="text-slate-400">· {demande.libelle_role}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
                            {demande.type_conge}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${style_statut}`}
                          >
                            {demande.statut === 'APPROUVE'
                              ? 'Approuvé'
                              : demande.statut === 'REFUSE'
                                ? 'Refusé'
                                : 'En attente'}
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">{demande.motif}</div>
                        <div className="font-mono text-[11px] text-slate-400">
                          Du {formater_date_fr(demande.date_debut)} au{' '}
                          {formater_date_fr(demande.date_fin)} · Demandé le{' '}
                          {formater_date_fr(demande.demande_le)}
                          {demande.traite_par ? ` · Traité par ${demande.traite_par}` : ''}
                        </div>
                      </div>

                      {peut_gerer_rh && (
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {demande.statut === 'EN_ATTENTE' && (
                            <>
                              <Bouton
                                type="button"
                                variante="principal"
                                taille="sm"
                                classe_accent={theme_etab.bouton_principal}
                                onClick={() => mettre_a_jour_statut_conge(demande.id, 'APPROUVE')}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approuver</span>
                              </Bouton>
                              <Bouton
                                type="button"
                                variante="danger"
                                taille="sm"
                                onClick={() => mettre_a_jour_statut_conge(demande.id, 'REFUSE')}
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Refuser</span>
                              </Bouton>
                            </>
                          )}
                          <Bouton
                            type="button"
                            variante="secondaire"
                            taille="sm"
                            onClick={() => definir_conge_edition({ ...demande })}
                            aria-label="Modifier la demande"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Bouton>
                          <Bouton
                            type="button"
                            variante="danger"
                            taille="sm"
                            onClick={() => definir_cible_suppression_conge(demande)}
                            aria-label="Supprimer la demande"
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
        </div>
      )}

      {/* ONGLET 3 : PERSONNEL */}
      {onglet === 'personnel' && (
        <div className="space-y-4">
          {peut_gerer_rh && (
            <div className="flex justify-end">
              <Bouton
                variante="principal"
                taille="sm"
                classe_accent={theme_etab.bouton_principal}
                onClick={ouvrir_creation_personnel}
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un {terminologie.enseignant_singulier.toLowerCase()}</span>
              </Bouton>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enseignants_etablissement.map((enseignant) => {
              const elements_assignes = elements_etablissement.filter(
                (el) =>
                  enseignant.ids_elements_assignes?.includes(el.id) ||
                  el.id_enseignant === enseignant.id
              );
              const unites_assignees = unites_etablissement.filter((u) =>
                enseignant.ids_unites_assignees.includes(u.id)
              );

              return (
                <Carte key={enseignant.id} className="text-xs space-y-3">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="font-mono text-slate-500">
                        {enseignant.code} · {enseignant.type_contrat}
                      </div>
                      <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {enseignant.nom_complet}
                      </h3>
                      <p className="text-slate-500">{enseignant.specialite}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold">
                        {enseignant.heures_mensuelles}h/mois
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {formater_montant(
                          enseignant.taux_horaire_ou_mensuel_htg,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {terminologie.unite_pluriel} :
                      </span>{' '}
                      {unites_assignees.length > 0 ? (
                        unites_assignees.map((u) => u.nom).join(', ')
                      ) : (
                        <span className="italic text-slate-400">Aucune classe affectée</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {terminologie.contenu_pluriel} :
                      </span>{' '}
                      {elements_assignes.length > 0 ? (
                        elements_assignes.map((el) => `${el.code} (${el.nom})`).join(', ')
                      ) : (
                        <span className="italic text-slate-400">Aucune matière affectée</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-slate-500">
                    <div>
                      <span className="font-mono">{enseignant.telephone}</span> ·{' '}
                      <span>{enseignant.courriel}</span>
                    </div>
                    {peut_gerer_rh && (
                      <div className="flex items-center gap-1">
                        <Bouton
                          type="button"
                          variante="secondaire"
                          taille="sm"
                          onClick={() => ouvrir_affectation_personnel(enseignant)}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Affecter</span>
                        </Bouton>
                        <Bouton
                          type="button"
                          variante="fantome"
                          taille="sm"
                          onClick={() => ouvrir_edition_personnel(enseignant)}
                          aria-label="Modifier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Bouton>
                        <Bouton
                          type="button"
                          variante="danger"
                          taille="sm"
                          onClick={() => definir_cible_suppression_personnel(enseignant)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Bouton>
                      </div>
                    )}
                  </div>
                </Carte>
              );
            })}
          </div>
        </div>
      )}

      {/* MODALE CRÉATION / ÉDITION FICHE DE PAIE */}
      <Modale
        ouverte={modale_paie_ouverte}
        sur_fermeture={() => definir_modale_paie_ouverte(false)}
        titre={id_paie_edition ? 'Modifier la fiche de paie' : 'Créer une fiche de paie'}
        sous_titre={`${etablissement_actif.nom_court} · Devise : ${devise_active}`}
        classe_largeur_max="max-w-xl"
      >
        <form onSubmit={gerer_sauvegarde_paie} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Sélectionner le collaborateur *</label>
              <select
                value={paie_id_personnel}
                onChange={(e) => pre_remplir_depuis_enseignant(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {enseignants_etablissement.map((ens) => (
                  <option key={ens.id} value={ens.id}>
                    {ens.nom_complet} ({ens.specialite})
                  </option>
                ))}
                <option value="LIBRE">Autre collaborateur (saisie libre)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Nom complet du collaborateur *</label>
              <input
                type="text"
                required
                value={paie_nom_personnel}
                onChange={(e) => definir_paie_nom_personnel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Fonction / Poste *</label>
              <input
                type="text"
                required
                value={paie_libelle_role}
                onChange={(e) => definir_paie_libelle_role(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Période de paie *</label>
              <input
                type="text"
                required
                value={paie_libelle_mois}
                onChange={(e) => definir_paie_libelle_mois(e.target.value)}
                placeholder="Ex: Novembre 2026"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Heures travaillées</label>
              <input
                type="number"
                min={0}
                value={paie_heures}
                onChange={(e) => definir_paie_heures(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Salaire de base ({etablissement_actif.devise_defaut}) *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={paie_base}
                onChange={(e) => definir_paie_base(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">
                Primes & indemnités ({etablissement_actif.devise_defaut})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={paie_primes}
                onChange={(e) => definir_paie_primes(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Libellé / Motif des primes</label>
              <input
                type="text"
                value={paie_motif_primes}
                onChange={(e) => definir_paie_motif_primes(e.target.value)}
                placeholder="Ex: Prime d’assiduité, heures supplémentaires..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Retenues & déductions ({etablissement_actif.devise_defaut})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={paie_retenues}
                onChange={(e) => definir_paie_retenues(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Motif des retenues</label>
              <input
                type="text"
                value={paie_motif_retenues}
                onChange={(e) => definir_paie_motif_retenues(e.target.value)}
                placeholder="Ex: Cotisations sociales, avance sur salaire..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Statut du paiement</label>
              <select
                value={paie_statut}
                onChange={(e) => definir_paie_statut(e.target.value as 'PAYE' | 'EN_ATTENTE')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="EN_ATTENTE">En attente de paiement</option>
                <option value="PAYE">Payé</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Mode de paiement</label>
              <select
                value={paie_mode}
                onChange={(e) => definir_paie_mode(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Virement bancaire">Virement bancaire</option>
                <option value="Chèque">Chèque</option>
                <option value="Espèces">Espèces</option>
                <option value="Mobile Money">Mobile Money</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Observations</label>
              <input
                type="text"
                value={paie_observations}
                onChange={(e) => definir_paie_observations(e.target.value)}
                placeholder="Remarques complémentaires figurant sur la fiche"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Récapitulatif calculé en temps réel */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Salaire brut calculé (Base + Primes)</span>
              <span className="font-mono font-semibold">
                {formater_montant(
                  calcul_paie_courant.montant_brut_htg,
                  devise_active,
                  etablissement_actif.taux_change_usd
                )}
              </span>
            </div>
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>Total retenues</span>
              <span className="font-mono">
                -
                {formater_montant(
                  calcul_paie_courant.retenues_htg,
                  devise_active,
                  etablissement_actif.taux_change_usd
                )}
              </span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 text-sm font-bold">
              <span>Salaire Net à payer</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400">
                {formater_montant(
                  calcul_paie_courant.montant_net_htg,
                  devise_active,
                  etablissement_actif.taux_change_usd
                )}
              </span>
            </div>
            {!calcul_paie_courant.valide && calcul_paie_courant.erreur && (
              <div className="pt-1 text-red-600 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{calcul_paie_courant.erreur}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_paie_ouverte(false)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme_etab.bouton_principal}
              disabled={!calcul_paie_courant.valide}
            >
              {id_paie_edition ? 'Enregistrer les modifications' : 'Créer la fiche de paie'}
            </Bouton>
          </div>
        </form>
      </Modale>

      {/* MODALE BULLETIN DE PAIE IMPRIMABLE A4 */}
      <Modale
        ouverte={Boolean(bulletin_aperçu)}
        sur_fermeture={() => definir_bulletin_apercu(null)}
        titre={`Bulletin de paie — ${bulletin_aperçu?.nom_personnel ?? ''}`}
        sous_titre={`${bulletin_aperçu?.libelle_mois ?? ''} · ${etablissement_actif.nom_court}`}
        classe_largeur_max="max-w-3xl"
        pied_page={
          <div className="w-full flex items-center justify-end gap-2">
            <Bouton variante="fantome" onClick={() => definir_bulletin_apercu(null)}>
              Fermer
            </Bouton>
            <Bouton
              variante="principal"
              classe_accent={theme_etab.bouton_principal}
              onClick={declencher_impression_ciblee}
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / Télécharger PDF</span>
            </Bouton>
          </div>
        }
      >
        {bulletin_aperçu && (
          <div className="printable-document-root">
            <div className="print-sheet-a4 bg-white text-slate-900 border border-slate-300 p-7 space-y-6 shadow-sm">
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
                    BULLETIN DE PAIE
                  </div>
                  <div className="text-xs font-mono font-semibold text-indigo-700 mt-0.5">
                    Période : {bulletin_aperçu.libelle_mois}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Réf. : {bulletin_aperçu.id.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-500">Collaborateur :</span>{' '}
                    <span className="font-bold text-slate-900">
                      {bulletin_aperçu.nom_personnel}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Poste / Fonction :</span>{' '}
                    <span className="font-medium text-slate-800">
                      {bulletin_aperçu.libelle_role}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Volume horaire :</span>{' '}
                    <span className="font-mono font-semibold">
                      {bulletin_aperçu.heures_travaillees} heures
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-500">Statut :</span>{' '}
                    <span className="font-bold text-slate-900">
                      {bulletin_aperçu.statut === 'PAYE' ? 'PAYÉ' : 'EN ATTENTE DE PAIEMENT'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Mode de règlement :</span>{' '}
                    <span>{bulletin_aperçu.mode_paiement ?? 'Virement bancaire'}</span>
                  </div>
                  {bulletin_aperçu.paye_le && (
                    <div>
                      <span className="text-slate-500">Date de paiement :</span>{' '}
                      <span className="font-mono">{formater_date_fr(bulletin_aperçu.paye_le)}</span>
                    </div>
                  )}
                </div>
              </div>

              <table className="w-full text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                    <th className="px-4 py-2.5 text-left font-semibold">Rubrique de paie</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Détail / Justification</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Gains</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Retenues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">Salaire de base</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {bulletin_aperçu.heures_travaillees} h déclarées
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">
                      {formater_montant(
                        bulletin_aperçu.salaire_base_htg ??
                          Math.max(
                            0,
                            bulletin_aperçu.montant_brut_htg - (bulletin_aperçu.primes_htg ?? 0)
                          ),
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      Primes & indemnités
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {bulletin_aperçu.motif_primes ?? 'Aucune prime spécifique'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700">
                      {formater_montant(
                        bulletin_aperçu.primes_htg ?? 0,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-400">—</td>
                  </tr>
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={2} className="px-4 py-2 text-right text-slate-700">
                      Total Salaire Brut
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-900">
                      {formater_montant(
                        bulletin_aperçu.montant_brut_htg,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      Retenues & déductions
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {bulletin_aperçu.motif_retenues ?? 'Cotisations & prélèvements légaux'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-red-700">
                      {formater_montant(
                        bulletin_aperçu.retenues_htg,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-sm">
                    <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wide">
                      Net à payer
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-right font-mono">
                      {formater_montant(
                        bulletin_aperçu.montant_net_htg,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {bulletin_aperçu.observations && (
                <div className="p-3 rounded border border-slate-200 text-xs text-slate-700 bg-slate-50">
                  <span className="font-semibold">Observations :</span>{' '}
                  {bulletin_aperçu.observations}
                </div>
              )}

              <div className="pt-4 grid grid-cols-2 gap-8 text-xs text-slate-700">
                <div>
                  <div className="font-semibold">Signature de l’Employeur / Comptabilité</div>
                  <div className="mt-10 border-t border-slate-400 w-48" />
                </div>
                <div className="text-right">
                  <div className="font-semibold">Signature du Collaborateur</div>
                  <div className="mt-10 border-t border-slate-400 w-48 ml-auto" />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modale>

      {/* MODALE ÉDITION DEMANDE DE CONGÉ */}
      <Modale
        ouverte={Boolean(conge_edition)}
        sur_fermeture={() => definir_conge_edition(null)}
        titre="Modifier la demande de congé"
        classe_largeur_max="max-w-md"
      >
        {conge_edition && (
          <form onSubmit={gerer_sauvegarde_conge_edition} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Collaborateur *</label>
              <input
                type="text"
                required
                value={conge_edition.nom_personnel}
                onChange={(e) =>
                  definir_conge_edition({ ...conge_edition, nom_personnel: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Type de congé</label>
                <select
                  value={conge_edition.type_conge}
                  onChange={(e) =>
                    definir_conge_edition({
                      ...conge_edition,
                      type_conge: e.target.value as DemandeConge['type_conge'],
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="Congé annuel">Congé annuel</option>
                  <option value="Congé maladie">Congé maladie</option>
                  <option value="Permission exceptionnelle">Permission exceptionnelle</option>
                  <option value="Maternité / Paternité">Maternité / Paternité</option>
                  <option value="Formation continue">Formation continue</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Fonction</label>
                <input
                  type="text"
                  value={conge_edition.libelle_role}
                  onChange={(e) =>
                    definir_conge_edition({ ...conge_edition, libelle_role: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Date début</label>
                <input
                  type="date"
                  value={conge_edition.date_debut}
                  onChange={(e) =>
                    definir_conge_edition({ ...conge_edition, date_debut: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Date fin</label>
                <input
                  type="date"
                  value={conge_edition.date_fin}
                  onChange={(e) =>
                    definir_conge_edition({ ...conge_edition, date_fin: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Motif *</label>
              <textarea
                rows={3}
                required
                value={conge_edition.motif}
                onChange={(e) => definir_conge_edition({ ...conge_edition, motif: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Bouton
                type="button"
                variante="secondaire"
                taille="sm"
                onClick={() => definir_conge_edition(null)}
              >
                Annuler
              </Bouton>
              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                classe_accent={theme_etab.bouton_principal}
              >
                Enregistrer
              </Bouton>
            </div>
          </form>
        )}
      </Modale>

      {/* MODALE AJOUT / ÉDITION PERSONNEL */}
      <Modale
        ouverte={modale_personnel_ouverte}
        sur_fermeture={() => definir_modale_personnel_ouverte(false)}
        titre={
          id_personnel_edition
            ? `Modifier ${terminologie.enseignant_singulier}`
            : `Ajouter un ${terminologie.enseignant_singulier}`
        }
        classe_largeur_max="max-w-lg"
      >
        <form onSubmit={gerer_sauvegarde_personnel} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Code</label>
              <input
                type="text"
                value={pers_code}
                onChange={(e) => definir_pers_code(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Type de contrat</label>
              <select
                value={pers_contrat}
                onChange={(e) =>
                  definir_pers_contrat(e.target.value as PersonnelEnseignant['type_contrat'])
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="CDI / Temps plein">CDI / Temps plein</option>
                <option value="Vacation horaire">Vacation horaire</option>
                <option value="Contractuel">Contractuel</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block font-semibold mb-1">Nom complet *</label>
              <input
                type="text"
                required
                value={pers_nom}
                onChange={(e) => definir_pers_nom(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold mb-1">Spécialité / Discipline</label>
              <input
                type="text"
                value={pers_specialite}
                onChange={(e) => definir_pers_specialite(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Téléphone</label>
              <input
                type="text"
                value={pers_tel}
                onChange={(e) => definir_pers_tel(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Courriel</label>
              <input
                type="email"
                value={pers_courriel}
                onChange={(e) => definir_pers_courriel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Heures mensuelles</label>
              <input
                type="number"
                min={0}
                value={pers_heures}
                onChange={(e) => definir_pers_heures(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">
                Taux horaire / Salaire ({etablissement_actif.devise_defaut})
              </label>
              <input
                type="number"
                min={0}
                value={pers_taux}
                onChange={(e) => definir_pers_taux(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_personnel_ouverte(false)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme_etab.bouton_principal}
            >
              {id_personnel_edition ? 'Enregistrer' : 'Ajouter'}
            </Bouton>
          </div>
        </form>
      </Modale>

      {/* MODALE AFFECTATION MATIÈRES & CLASSES */}
      <Modale
        ouverte={Boolean(pers_affectation)}
        sur_fermeture={() => definir_pers_affectation(null)}
        titre={`Affecter matières & classes — ${pers_affectation?.nom_complet ?? ''}`}
        classe_largeur_max="max-w-2xl"
      >
        <form onSubmit={gerer_sauvegarde_affectation} className="space-y-4 text-xs">
          <div>
            <div className="font-semibold mb-2">{terminologie.unite_pluriel} / Niveaux</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1">
              {unites_etablissement.map((u) => {
                const coche = aff_unites.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${
                      coche
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={coche}
                      onChange={() =>
                        definir_aff_unites((prev) =>
                          prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id]
                        )
                      }
                    />
                    <span>
                      <strong>{u.nom}</strong> ({u.niveau_ou_duree})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2">{terminologie.contenu_pluriel}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1">
              {elements_etablissement.map((el) => {
                const coche = aff_elements.includes(el.id);
                const u = unites_etablissement.find((x) => x.id === el.id_unite);
                return (
                  <label
                    key={el.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${
                      coche
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={coche}
                      onChange={() =>
                        definir_aff_elements((prev) =>
                          prev.includes(el.id) ? prev.filter((x) => x !== el.id) : [...prev, el.id]
                        )
                      }
                    />
                    <span>
                      <strong>{el.code}</strong> · {el.nom}
                      {u ? ` (${u.nom})` : ''}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_pers_affectation(null)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme_etab.bouton_principal}
            >
              Enregistrer l’affectation
            </Bouton>
          </div>
        </form>
      </Modale>

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression_paie)}
        sur_fermeture={() => definir_cible_suppression_paie(null)}
        sur_confirmation={() => {
          if (cible_suppression_paie) supprimer_bulletin_paie(cible_suppression_paie.id);
        }}
        tonalite="danger"
        titre="Supprimer cette fiche de paie ?"
        sous_titre={
          cible_suppression_paie
            ? `${cible_suppression_paie.nom_personnel} · ${cible_suppression_paie.libelle_mois}`
            : ''
        }
        description="Cette fiche de paie sera définitivement retirée du registre RH."
        libelle_confirmation="Supprimer"
      />

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression_conge)}
        sur_fermeture={() => definir_cible_suppression_conge(null)}
        sur_confirmation={() => {
          if (cible_suppression_conge) supprimer_demande_conge(cible_suppression_conge.id);
        }}
        tonalite="danger"
        titre="Supprimer cette demande de congé ?"
        sous_titre={cible_suppression_conge?.nom_personnel}
        description="La demande sera définitivement supprimée du registre des congés."
        libelle_confirmation="Supprimer"
      />

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression_personnel)}
        sur_fermeture={() => definir_cible_suppression_personnel(null)}
        sur_confirmation={() => {
          if (cible_suppression_personnel) {
            supprimer_personnel_enseignant(cible_suppression_personnel.id);
          }
        }}
        tonalite="danger"
        titre="Supprimer ce dossier personnel ?"
        sous_titre={cible_suppression_personnel?.nom_complet}
        description="La suppression est autorisée uniquement si aucun créneau d’emploi du temps actif ne dépend de cet enseignant."
        libelle_confirmation="Supprimer"
      />
    </div>
  );
};
