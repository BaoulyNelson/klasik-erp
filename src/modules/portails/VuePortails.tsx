import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  HeartHandshake,
  IdCard,
  MessageSquare,
  Printer,
  QrCode,
  Receipt,
  Ticket,
  Wallet,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { CodeQrSvg } from '../../composants/interface/CodeQrSvg';
import { declencher_impression_ciblee } from '../../composants/interface/FicheInscriptionImprimable';
import { LogoEtablissement } from '../../composants/interface/LogoEtablissement';
import { Modale } from '../../composants/interface/Modale';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { PROFILS_PAYS } from '../../configuration/regions_devises';
import { utiliserErp } from '../../contexte/ContexteErp';
import { DocumentOfficielEmis, EcheancePaiement, PaiementEnregistre } from '../../modeles/erp';
import {
  convertir_devise_vers_pivot,
  convertir_pivot_vers_devise,
  formater_date_fr,
  formater_montant,
} from '../../services/service_donnees';
import { convertir_note_internationale } from '../../utilitaires/notation';
import { obtenir_modes_paiement_pays } from '../../utilitaires/validation_metier';

interface ProprietesVuePortails {
  type_portail: 'parent' | 'apprenant' | 'enseignant';
}

type ModalePortailOuverte =
  | null
  | { type: 'carte_qr' }
  | { type: 'ticket_examen' }
  | { type: 'releve_notes' }
  | {
      type: 'recu';
      libelle: string;
      montant_htg: number;
      date_paiement: string;
      mode_paiement: string;
      numero_recu: string;
      encaisse_par: string;
    }
  | { type: 'document_emis'; document: DocumentOfficielEmis };

export const VuePortails: React.FC<ProprietesVuePortails> = ({ type_portail }) => {
  const {
    etablissement_actif,
    terminologie,
    devise_active,
    utilisateur_actif,
    id_role_actif,
    apprenants_etablissement,
    unites_etablissement,
    emplois_du_temps_etablissement,
    elements_etablissement,
    enseignants_etablissement,
    notes_etablissement,
    paiements_etablissement,
    communications_etablissement,
    documents_etablissement,
    devoirs_lms_etablissement,
    remises_devoirs_etablissement,
    encaisser_paiement,
    definir_route_active,
    ajouter_toast,
  } = utiliserErp();
  const api_actif = import.meta.env.PROD || import.meta.env.VITE_SOURCE_DONNEES === 'api';

  const theme = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const profil_pays = PROFILS_PAYS[etablissement_actif.code_pays] ?? PROFILS_PAYS.INTL;
  const modes_paiement_pays = useMemo(
    () => obtenir_modes_paiement_pays(etablissement_actif.code_pays),
    [etablissement_actif.code_pays]
  );

  const peut_simuler_profil_apprenant =
    Boolean(utilisateur_actif.est_super_admin_plateforme) ||
    ['SUPER_ADMIN', 'DIRECTEUR', 'ADMIN_ETAB', 'DIR_ETUDES', 'SCOLARITE'].includes(id_role_actif);

  // Résolution des apprenants accessibles selon le contexte (Parent vs Apprenant vs Simulation)
  const apprenants_lies = useMemo(() => {
    if (type_portail === 'apprenant' && peut_simuler_profil_apprenant) {
      return apprenants_etablissement;
    }
    if (utilisateur_actif.ids_apprenants_lies && utilisateur_actif.ids_apprenants_lies.length > 0) {
      const correspondances = apprenants_etablissement.filter((apprenant) =>
        utilisateur_actif.ids_apprenants_lies?.includes(apprenant.id)
      );
      if (correspondances.length > 0) return correspondances;
    }
    if (type_portail === 'apprenant') {
      const par_courriel = apprenants_etablissement.find(
        (a) => (a.courriel ?? '').toLowerCase() === utilisateur_actif.courriel.toLowerCase()
      );
      if (par_courriel) return [par_courriel];
      return apprenants_etablissement.slice(0, 1);
    }
    return apprenants_etablissement.slice(0, 2);
  }, [
    type_portail,
    peut_simuler_profil_apprenant,
    apprenants_etablissement,
    utilisateur_actif.ids_apprenants_lies,
    utilisateur_actif.courriel,
  ]);

  const [id_apprenant_selectionne, definir_id_apprenant_selectionne] = useState(
    apprenants_lies[0]?.id ?? apprenants_etablissement[0]?.id ?? ''
  );

  useEffect(() => {
    if (!apprenants_lies.some((a) => a.id === id_apprenant_selectionne)) {
      definir_id_apprenant_selectionne(apprenants_lies[0]?.id ?? '');
    }
  }, [etablissement_actif.id, apprenants_lies, id_apprenant_selectionne]);

  const [canal_paiement, definir_canal_paiement] = useState<PaiementEnregistre['mode_paiement']>(
    (profil_pays.modes_paiement_preferes[0] as PaiementEnregistre['mode_paiement']) ??
      'Carte bancaire (Stripe/Visa)'
  );
  const [reference_paiement, definir_reference_paiement] = useState('');
  const [montant_declare, definir_montant_declare] = useState(() =>
    convertir_pivot_vers_devise(5000, devise_active, etablissement_actif.taux_change_usd)
  );
  const [modale_ouverte, definir_modale_ouverte] = useState<ModalePortailOuverte>(null);

  useEffect(() => {
    const profil = PROFILS_PAYS[etablissement_actif.code_pays] ?? PROFILS_PAYS.INTL;
    definir_canal_paiement(
      (profil.modes_paiement_preferes[0] as PaiementEnregistre['mode_paiement']) ??
        'Carte bancaire (Stripe/Visa)'
    );
  }, [etablissement_actif.id, etablissement_actif.code_pays]);

  useEffect(() => {
    definir_montant_declare(
      convertir_pivot_vers_devise(5000, devise_active, etablissement_actif.taux_change_usd)
    );
  }, [devise_active, etablissement_actif.taux_change_usd]);

  const apprenant_suivi =
    apprenants_etablissement.find((apprenant) => apprenant.id === id_apprenant_selectionne) ??
    apprenants_lies[0] ??
    apprenants_etablissement[0];

  const unite = unites_etablissement.find((u) => u.id === apprenant_suivi?.id_unite);
  const solde = apprenant_suivi
    ? Math.max(0, apprenant_suivi.total_du_htg - apprenant_suivi.total_paye_htg)
    : 0;
  const pourcentage_regle =
    apprenant_suivi && apprenant_suivi.total_du_htg > 0
      ? Math.min(100, Math.round((apprenant_suivi.total_paye_htg / apprenant_suivi.total_du_htg) * 100))
      : 100;

  // Emploi du temps de l'apprenant
  const creneaux_unite = useMemo(() => {
    if (!apprenant_suivi) return [];
    return emplois_du_temps_etablissement.filter((c) => c.id_unite === apprenant_suivi.id_unite);
  }, [emplois_du_temps_etablissement, apprenant_suivi]);

  // Notes & Modules / Matières / UE de l'apprenant
  const elements_suivis = useMemo(() => {
    if (!apprenant_suivi) return [];
    const de_lunite = elements_etablissement.filter((el) => el.id_unite === apprenant_suivi.id_unite);
    return de_lunite.length > 0 ? de_lunite : elements_etablissement.slice(0, 4);
  }, [elements_etablissement, apprenant_suivi]);

  const notes_apprenant = useMemo(() => {
    if (!apprenant_suivi) return [];
    return notes_etablissement.filter((n) => n.id_apprenant === apprenant_suivi.id);
  }, [notes_etablissement, apprenant_suivi]);

  // Devoirs Classroom de la classe
  const devoirs_apprenant = useMemo(() => {
    if (!apprenant_suivi) return [];
    return devoirs_lms_etablissement.filter(
      (d) => d.statut !== 'BROUILLON' && (!apprenant_suivi.id_unite || d.id_unite === apprenant_suivi.id_unite)
    );
  }, [devoirs_lms_etablissement, apprenant_suivi]);

  const stats_devoirs = useMemo(() => {
    if (!apprenant_suivi) return { actifs: 0, a_rendre: 0, notes: 0 };
    let a_rendre = 0;
    let notes = 0;
    devoirs_apprenant.forEach((devoir) => {
      const remise = remises_devoirs_etablissement.find(
        (r) => r.id_devoir === devoir.id && r.id_apprenant === apprenant_suivi.id
      );
      if (remise?.statut === 'EVALUE') {
        notes += 1;
      } else if (!remise || remise.statut === 'ASSIGNE' || remise.statut === 'A_REVOIR') {
        a_rendre += 1;
      }
    });
    return { actifs: devoirs_apprenant.length, a_rendre, notes };
  }, [devoirs_apprenant, remises_devoirs_etablissement, apprenant_suivi]);

  // Paiements & Échéances détaillées
  const paiements_apprenant = useMemo(() => {
    if (!apprenant_suivi) return [];
    return paiements_etablissement.filter(
      (p) => p.id_apprenant === apprenant_suivi.id && p.statut === 'VALIDE'
    );
  }, [paiements_etablissement, apprenant_suivi]);

  const echeances_calculees: EcheancePaiement[] = useMemo(() => {
    if (!apprenant_suivi) return [];
    if (apprenant_suivi.echeancier && apprenant_suivi.echeancier.length > 0) {
      return apprenant_suivi.echeancier;
    }

    const total_du = Math.max(0, apprenant_suivi.total_du_htg);
    const frais_insc = Math.min(total_du, unite?.frais_inscription_htg ?? Math.round(total_du * 0.1));
    const reste_scolarite = Math.max(0, total_du - frais_insc);
    const t1 = Math.round(reste_scolarite * 0.4);
    const t2 = Math.round(reste_scolarite * 0.3);
    const t3 = Math.max(0, reste_scolarite - t1 - t2);

    const libelles_tranches =
      terminologie.type_etablissement === 'SCOLAIRE'
        ? ['Frais d’inscription', '1er Trimestre', '2ème Trimestre', '3ème Trimestre']
        : terminologie.type_etablissement === 'UNIVERSITE'
          ? ['Frais d’admission', 'Semestre 1 (Tranche 1)', 'Semestre 1 (Tranche 2)', 'Semestre 2']
          : ['Frais d’inscription', '1ère Tranche', '2ème Tranche', '3ème Tranche'];

    const dates_reference = [
      apprenant_suivi.date_inscription || '2026-09-10',
      '2026-10-10',
      '2026-11-15',
      '2026-12-20',
    ];
    const montants = [frais_insc, t1, t2, t3];

    let reste_paye = apprenant_suivi.total_paye_htg;
    return libelles_tranches
      .map((libelle, idx) => {
        const du = montants[idx];
        const paye = Math.min(du, Math.max(0, reste_paye));
        reste_paye = Math.max(0, reste_paye - paye);
        const statut: EcheancePaiement['statut'] =
          du === 0 || paye >= du
            ? 'PAYEE'
            : paye > 0
              ? 'PARTIELLE'
              : apprenant_suivi.statut_paiement === 'EN_RETARD'
                ? 'EN_RETARD'
                : 'A_PAYER';
        return {
          id: `ech-${apprenant_suivi.id}-${idx + 1}`,
          libelle,
          date_echeance: dates_reference[idx],
          montant_du_htg: du,
          montant_paye_htg: paye,
          statut,
        };
      })
      .filter((e) => e.montant_du_htg > 0);
  }, [apprenant_suivi, unite, terminologie.type_etablissement]);

  const equivalence_moyenne = convertir_note_internationale(
    apprenant_suivi?.moyenne_generale ?? 0,
    etablissement_actif.echelle_notation
  );

  // Portail Enseignant (inchangé dans son périmètre)
  if (type_portail === 'enseignant') {
    return (
      <div className="space-y-5 max-w-5xl">
        <Carte>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500">
                Portail mobile-first · {terminologie.enseignant_singulier}
              </div>
              <h2 className="text-lg font-display font-bold mt-0.5">
                Bonjour, {utilisateur_actif.nom_complet}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Accès rapide à vos séances, à l’appel numérique (hors-ligne inclus) et à la saisie
                des notes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => definir_route_active('campus_numerique')}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Devoirs & Copies</span>
              </Bouton>
              <Bouton
                variante="principal"
                taille="sm"
                classe_accent={theme.bouton_principal}
                onClick={() => definir_route_active('pedagogie')}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Faire l’appel / Saisir notes</span>
              </Bouton>
            </div>
          </div>
        </Carte>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Carte>
            <div className="flex items-center gap-2 text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Prochains cours programmés</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs mt-1">
              {emplois_du_temps_etablissement.map((creneau) => {
                const element = elements_etablissement.find((el) => el.id === creneau.id_element);
                return (
                  <div key={creneau.id} className="py-2.5 flex justify-between">
                    <span>
                      <strong>{creneau.jour_semaine}</strong> · {element?.nom ?? creneau.id_element}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {creneau.heure_debut}–{creneau.heure_fin} ({creneau.salle})
                    </span>
                  </div>
                );
              })}
            </div>
          </Carte>

          <Carte>
            <div className="flex items-center gap-2 text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>Mes {terminologie.contenu_pluriel.toLowerCase()}</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs mt-1">
              {elements_etablissement.slice(0, 5).map((element) => (
                <div key={element.id} className="py-2.5 flex justify-between">
                  <span className="font-medium">{element.nom}</span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {element.volume_horaire_total}h
                  </span>
                </div>
              ))}
            </div>
          </Carte>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* En-tête de l'espace personnel */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {type_portail === 'parent'
                ? 'Portail Parent / Tuteur'
                : `Portail ${terminologie.apprenant_singulier}`}
            </span>
            <span aria-hidden="true">·</span>
            <span>{etablissement_actif.nom}</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 mt-1">
            Mon Espace Personnel ·{' '}
            {apprenant_suivi
              ? `${apprenant_suivi.prenom} ${apprenant_suivi.nom}`
              : utilisateur_actif.nom_complet}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Consultation en lecture seule de votre dossier académique, emploi du temps et reçus.
          </p>
        </div>

        {apprenants_lies.length > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="selecteur-profil-portail"
              className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap"
            >
              {type_portail === 'parent' ? 'Enfant suivi :' : 'Profil simulé :'}
            </label>
            <select
              id="selecteur-profil-portail"
              value={apprenant_suivi?.id ?? ''}
              onChange={(e) => definir_id_apprenant_selectionne(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              {apprenants_lies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.prenom} {item.nom} ({item.matricule})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Carte d'identité académique + Actions officielles + Avancement du parcours */}
      {apprenant_suivi && (
        <Carte rembourrage="grand" className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-display font-bold text-lg flex items-center justify-center shrink-0">
                {apprenant_suivi.prenom[0]}
                {apprenant_suivi.nom[0]}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {apprenant_suivi.matricule}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{unite?.nom ?? apprenant_suivi.id_unite}</span>
                </div>
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  {apprenant_suivi.prenom} {apprenant_suivi.nom}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>{apprenant_suivi.libelle_niveau}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Inscrit(e) le{' '}
                    <span className="font-mono tabular-nums">
                      {formater_date_fr(apprenant_suivi.date_inscription)}
                    </span>
                  </span>
                  {apprenant_suivi.entreprise_stage && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Stage : {apprenant_suivi.entreprise_stage}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => definir_modale_ouverte({ type: 'ticket_examen' })}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Ticket Examen</span>
              </Bouton>
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => definir_modale_ouverte({ type: 'carte_qr' })}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Ma Carte QR</span>
              </Bouton>
              <Bouton
                variante="principal"
                taille="sm"
                classe_accent={theme.bouton_principal}
                onClick={() => definir_modale_ouverte({ type: 'releve_notes' })}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Mon Relevé de notes</span>
              </Bouton>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2.5">
              Avancement de mon parcours
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {terminologie.etapes_parcours.map((etape_parcours) => {
                const est_validee = etape_parcours.etape < apprenant_suivi.indice_etape;
                const est_en_cours = etape_parcours.etape === apprenant_suivi.indice_etape;
                return (
                  <div
                    key={etape_parcours.etape}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors ${
                      est_en_cours
                        ? 'border-indigo-500 bg-indigo-50/40 dark:border-indigo-400 dark:bg-indigo-950/30'
                        : est_validee
                          ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                        est_validee
                          ? 'bg-emerald-600 text-white'
                          : est_en_cours
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {est_validee ? <Check className="w-3.5 h-3.5" /> : etape_parcours.etape}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {etape_parcours.libelle}
                      </div>
                      <div
                        className={`text-[11px] ${
                          est_validee
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : est_en_cours
                              ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                              : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {est_validee ? 'Validée' : est_en_cours ? 'En cours' : 'À venir'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Carte>
      )}

      {/* 3 cartes synthétiques : Emploi du temps · Moyenne générale · Solde scolarité */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Carte className="flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Emploi du temps</span>
            <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
          </div>
          <div>
            <div className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
              {unite?.indication_horaire ??
                (creneaux_unite[0]
                  ? `${creneaux_unite[0].jour_semaine} · ${creneaux_unite[0].heure_debut}–${creneaux_unite[0].heure_fin}`
                  : 'Planning en cours de publication')}
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {terminologie.enseignant_singulier} :{' '}
                  {unite?.responsable_nom ?? 'Équipe pédagogique'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => definir_route_active('emplois_du_temps')}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 shrink-0 cursor-pointer"
              >
                Grille complète →
              </button>
            </div>
          </div>
        </Carte>

        <Carte className="flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Moyenne générale</span>
            <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {apprenant_suivi?.moyenne_generale ?? 0}/{etablissement_actif.echelle_notation}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums text-right">
              Assiduité {apprenant_suivi?.taux_assiduite ?? 100}%
              {terminologie.suivi_credits_actif && apprenant_suivi?.credits_requis
                ? ` · ${apprenant_suivi.credits_acquis ?? 0}/${apprenant_suivi.credits_requis} ECTS`
                : ''}
            </div>
          </div>
        </Carte>

        <Carte className="flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Solde scolarité</span>
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div
              className={`text-2xl font-display font-bold font-mono tabular-nums ${
                solde === 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {formater_montant(solde, devise_active, etablissement_actif.taux_change_usd)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {pourcentage_regle}% réglé
            </div>
          </div>
        </Carte>
      </div>

      {/* Bandeau Devoirs & Travaux de ma classe (lien direct vers Classroom) */}
      {apprenant_suivi && (
        <Carte className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                  Devoirs & Travaux de ma classe
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                  <strong className="text-slate-800 dark:text-slate-200">
                    {stats_devoirs.actifs}
                  </strong>{' '}
                  travail(aux) actif(s) ·{' '}
                  <strong className="text-amber-600 dark:text-amber-400">
                    {stats_devoirs.a_rendre}
                  </strong>{' '}
                  à rendre ·{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {stats_devoirs.notes}
                  </strong>{' '}
                  noté(s)
                </div>
              </div>
            </div>

            <Bouton
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
              onClick={() => definir_route_active('campus_numerique')}
            >
              <span>Ouvrir Devoirs & Travaux (Classroom)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Bouton>
          </div>

          {devoirs_apprenant.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {devoirs_apprenant.slice(0, 3).map((devoir) => {
                const remise = remises_devoirs_etablissement.find(
                  (r) => r.id_devoir === devoir.id && r.id_apprenant === apprenant_suivi.id
                );
                return (
                  <div
                    key={devoir.id}
                    className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {devoir.titre}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 ml-2">
                        · {devoir.theme_ou_chapitre ?? 'Général'} · Échéance{' '}
                        <span className="font-mono tabular-nums">
                          {formater_date_fr(devoir.date_limite)}
                        </span>
                      </span>
                    </div>
                    <span className="font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                      {remise?.statut === 'EVALUE' && remise.note_attribuee !== undefined
                        ? `Noté ${remise.note_attribuee}/${devoir.points_max}`
                        : remise?.statut === 'REMIS'
                          ? 'Remis'
                          : remise?.statut === 'RENDU_EN_RETARD'
                            ? 'Rendu en retard'
                            : 'À rendre'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Carte>
      )}

      {/* Grille principale : Notes & Modules/Matières/UE + Échéances & Reçus Officiels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <Carte rembourrage="aucun" className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
              Mes Notes & {terminologie.contenu_pluriel}
            </h3>
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Seuil : {etablissement_actif.note_passage}/{etablissement_actif.echelle_notation}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {elements_suivis.length === 0 ? (
              <div className="p-5 text-center text-slate-500">
                Aucun élément pédagogique configuré pour cette unité.
              </div>
            ) : (
              elements_suivis.map((element) => {
                const note_eval = notes_apprenant.find((n) => n.id_element === element.id);
                const enseignant = enseignants_etablissement.find(
                  (e) => e.id === element.id_enseignant
                );
                const valide =
                  note_eval !== undefined
                    ? note_eval.note >= etablissement_actif.note_passage
                    : null;
                return (
                  <div
                    key={element.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {element.nom}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {element.code} · {element.volume_horaire_total}h
                        {terminologie.type_etablissement !== 'PRO'
                          ? ` · ${element.coefficient_ou_credits} ${
                              terminologie.type_etablissement === 'UNIVERSITE' ? 'ECTS' : 'coeff.'
                            }`
                          : ''}
                        {enseignant ? ` · ${enseignant.nom_complet}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {note_eval ? (
                        <>
                          <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                            {note_eval.note}/{note_eval.note_maximale}
                          </div>
                          <div
                            className={`text-[11px] font-semibold ${
                              valide
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {valide ? 'Validé' : 'À rattraper'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-mono tabular-nums font-semibold text-slate-400">
                            —/{etablissement_actif.echelle_notation}
                          </div>
                          <div className="text-[11px] text-slate-400">En cours</div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Carte>

        <Carte rembourrage="aucun" className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
              Mes Échéances & Reçus Officiels
            </h3>
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {paiements_apprenant.length} reçu(s) enregistré(s)
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {echeances_calculees.map((ech, index) => {
              const paiement_associe = paiements_apprenant[index] ?? paiements_apprenant[0];
              const peut_ouvrir_recu = ech.montant_paye_htg > 0;
              return (
                <div
                  key={ech.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {ech.libelle}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                      Échéance {formater_date_fr(ech.date_echeance)} ·{' '}
                      {formater_montant(
                        ech.montant_du_htg,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {peut_ouvrir_recu && (
                      <Bouton
                        variante="secondaire"
                        taille="sm"
                        onClick={() =>
                          definir_modale_ouverte({
                            type: 'recu',
                            libelle: ech.libelle,
                            montant_htg: ech.montant_paye_htg,
                            date_paiement: paiement_associe?.paye_le ?? ech.date_echeance,
                            mode_paiement: paiement_associe?.mode_paiement ?? 'Guichet / Mobile Money',
                            numero_recu:
                              paiement_associe?.numero_recu ??
                              `REC-${etablissement_actif.code}-2026-0${index + 1}`,
                            encaisse_par: paiement_associe?.encaisse_par ?? 'Économat',
                          })
                        }
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Reçu</span>
                      </Bouton>
                    )}
                    <span
                      className={`font-semibold text-[11px] ${
                        ech.statut === 'PAYEE'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : ech.statut === 'PARTIELLE'
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : ech.statut === 'EN_RETARD'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-500'
                      }`}
                    >
                      {ech.statut === 'PAYEE'
                        ? 'Payé'
                        : ech.statut === 'PARTIELLE'
                          ? 'Partiel'
                          : ech.statut === 'EN_RETARD'
                            ? 'En retard'
                            : 'À payer'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Carte>
      </div>

      {/* Section inférieure : déclaration de paiement, documents officiels & annonces */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <Carte className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
            <Wallet className="w-4 h-4 text-slate-400" />
            <span>Déclarer un paiement ({profil_pays.nom})</span>
          </div>
          {api_actif ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Aucun paiement en ligne n’est traité ici. Les modes et références ne servent qu’à
              documenter un règlement manuel; la déclaration depuis le portail n’est pas encore
              enregistrée par l’API. Contactez l’économat pour faire confirmer le versement.
            </p>
          ) : solde === 0 ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Compte à jour : aucun solde dû pour la période en cours.
            </p>
          ) : (
            <div className="space-y-2.5 text-xs">
              <select
                value={canal_paiement}
                onChange={(e) =>
                  definir_canal_paiement(e.target.value as PaiementEnregistre['mode_paiement'])
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {modes_paiement_pays.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Montant ({devise_active})
                </label>
                <input
                  type="number"
                  step="any"
                  min={0.01}
                  value={montant_declare}
                  onChange={(e) => definir_montant_declare(Number(e.target.value) || 0)}
                  placeholder={`Montant (${devise_active})`}
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                {devise_active !== etablissement_actif.devise_defaut && (
                  <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                    ≈{' '}
                    {formater_montant(
                      convertir_devise_vers_pivot(
                        montant_declare,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      ),
                      etablissement_actif.devise_defaut,
                      etablissement_actif.taux_change_usd
                    )}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={reference_paiement}
                onChange={(e) => definir_reference_paiement(e.target.value)}
                placeholder="Référence du règlement déclaré"
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <Bouton
                variante="principal"
                taille="sm"
                classe_accent={theme.bouton_principal}
                disabled={!reference_paiement.trim() || !apprenant_suivi || montant_declare <= 0}
                onClick={() => {
                  if (!apprenant_suivi) return;
                  encaisser_paiement(
                    apprenant_suivi.id,
                    convertir_devise_vers_pivot(
                      montant_declare,
                      devise_active,
                      etablissement_actif.taux_change_usd
                    ),
                    canal_paiement,
                    'Paiement déclaré depuis portail',
                    reference_paiement
                  );
                  definir_reference_paiement('');
                }}
              >
                Envoyer la référence de paiement
              </Bouton>
            </div>
          )}
        </Carte>

        <Carte className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Documents & Demandes administratives</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {documents_etablissement.filter((doc) => doc.id_apprenant === apprenant_suivi?.id)
              .length === 0 ? (
              <p className="py-2 text-slate-500">
                Aucun document administratif émis pour le moment.
              </p>
            ) : (
              documents_etablissement
                .filter((doc) => doc.id_apprenant === apprenant_suivi?.id)
                .map((doc) => (
                  <div key={doc.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{doc.type_document}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {doc.numero_document}
                      </div>
                    </div>
                    <Bouton
                      variante="secondaire"
                      taille="sm"
                      onClick={() => definir_modale_ouverte({ type: 'document_emis', document: doc })}
                    >
                      Ouvrir
                    </Bouton>
                  </div>
                ))
            )}
          </div>
          <Bouton
            variante="secondaire"
            taille="sm"
            onClick={() =>
              ajouter_toast({
                titre: 'Demande transmise au secrétariat',
                description: `Demande d'attestation officielle pour ${apprenant_suivi?.prenom ?? ''}.`,
                variante: 'success',
              })
            }
          >
            Demander une attestation officielle
          </Bouton>
        </Carte>

        <Carte className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <span>Annonces de l’établissement</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {communications_etablissement.length === 0 ? (
              <p className="py-2 text-slate-500">Aucune annonce publiée.</p>
            ) : (
              communications_etablissement.map((message) => (
                <div key={message.id} className="py-2.5">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {message.titre}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{message.contenu}</p>
                </div>
              ))
            )}
          </div>
        </Carte>
      </div>

      {/* Modales interactives & imprimables (Carte QR, Ticket Examen, Relevé de notes, Reçu, Document) */}
      <Modale
        ouverte={Boolean(modale_ouverte)}
        sur_fermeture={() => definir_modale_ouverte(null)}
        titre={
          modale_ouverte?.type === 'carte_qr'
            ? 'Ma Carte d’Identité QR'
            : modale_ouverte?.type === 'ticket_examen'
              ? 'Ticket d’Examen & Convocation'
              : modale_ouverte?.type === 'releve_notes'
                ? 'Mon Relevé de notes officiel'
                : modale_ouverte?.type === 'recu'
                  ? `Reçu de paiement · ${modale_ouverte.numero_recu}`
                  : modale_ouverte?.type === 'document_emis'
                    ? modale_ouverte.document.type_document
                    : ''
        }
        sous_titre={
          apprenant_suivi
            ? `${etablissement_actif.nom} · ${apprenant_suivi.prenom} ${apprenant_suivi.nom} (${apprenant_suivi.matricule})`
            : etablissement_actif.nom
        }
        classe_largeur_max={modale_ouverte?.type === 'releve_notes' ? 'max-w-2xl' : 'max-w-lg'}
        pied_page={
          <div className="flex items-center justify-end gap-2">
            <Bouton variante="fantome" onClick={() => definir_modale_ouverte(null)}>
              Fermer
            </Bouton>
            <Bouton
              variante="principal"
              classe_accent={theme.bouton_principal}
              onClick={declencher_impression_ciblee}
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF</span>
            </Bouton>
          </div>
        }
      >
        {modale_ouverte?.type === 'carte_qr' && apprenant_suivi && (
          <div className="printable-document-root">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <LogoEtablissement
                    type={etablissement_actif.type}
                    code={etablissement_actif.code}
                    url_logo={etablissement_actif.url_logo}
                    nom={etablissement_actif.nom}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {etablissement_actif.nom}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Année académique {etablissement_actif.annee_academique}
                    </div>
                  </div>
                </div>
                <IdCard className="w-5 h-5 text-slate-400" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
                    {apprenant_suivi.prenom} {apprenant_suivi.nom}
                  </div>
                  <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {apprenant_suivi.matricule}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    {unite?.nom ?? apprenant_suivi.libelle_niveau}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Statut : <strong>{apprenant_suivi.statut}</strong> · Assiduité{' '}
                    <span className="font-mono tabular-nums">{apprenant_suivi.taux_assiduite}%</span>
                  </div>
                </div>
                <CodeQrSvg
                  valeur={`${etablissement_actif.code}|${apprenant_suivi.matricule}|${etablissement_actif.annee_academique}`}
                  taille={88}
                />
              </div>
            </div>
          </div>
        )}

        {modale_ouverte?.type === 'ticket_examen' && apprenant_suivi && (
          <div className="printable-document-root">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4 text-xs">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {etablissement_actif.nom}
                  </div>
                  <div className="text-slate-500">
                    Convocation officielle · {etablissement_actif.libelle_periode_courante}
                  </div>
                </div>
                <CodeQrSvg
                  valeur={`EXAM|${etablissement_actif.code}|${apprenant_suivi.matricule}`}
                  taille={68}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-slate-500">{terminologie.apprenant_singulier}</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {apprenant_suivi.prenom} {apprenant_suivi.nom}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Matricule</div>
                  <div className="font-mono font-semibold">{apprenant_suivi.matricule}</div>
                </div>
                <div>
                  <div className="text-slate-500">{terminologie.unite_singulier}</div>
                  <div className="font-medium">{unite?.nom ?? apprenant_suivi.libelle_niveau}</div>
                </div>
                <div>
                  <div className="text-slate-500">Statut d’accès en salle</div>
                  <div
                    className={`font-semibold ${
                      etablissement_actif.bloquer_documents_si_impaye && solde > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {etablissement_actif.bloquer_documents_si_impaye && solde > 0
                      ? 'Régularisation requise à l’économat'
                      : 'Autorisé à composer'}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                Présentez ce ticket accompagné d’une pièce d’identité ou de votre Carte QR à l’entrée
                de la salle.
              </div>
            </div>
          </div>
        )}

        {modale_ouverte?.type === 'releve_notes' && apprenant_suivi && (
          <div className="printable-document-root">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4 text-xs">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <LogoEtablissement
                    type={etablissement_actif.type}
                    code={etablissement_actif.code}
                    url_logo={etablissement_actif.url_logo}
                    nom={etablissement_actif.nom}
                  />
                  <div>
                    <div className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                      {etablissement_actif.nom}
                    </div>
                    <div className="text-slate-500">
                      Relevé de notes · {etablissement_actif.libelle_periode_courante}
                    </div>
                  </div>
                </div>
                <CodeQrSvg
                  valeur={`TRANSCRIPT|${apprenant_suivi.matricule}|${apprenant_suivi.moyenne_generale}`}
                  taille={64}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  <strong>
                    {apprenant_suivi.prenom} {apprenant_suivi.nom}
                  </strong>{' '}
                  (<span className="font-mono">{apprenant_suivi.matricule}</span>) ·{' '}
                  {unite?.nom ?? apprenant_suivi.libelle_niveau}
                </span>
                <span className="font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                  Moyenne : {apprenant_suivi.moyenne_generale}/
                  {etablissement_actif.echelle_notation} (GPA {equivalence_moyenne.gpa4.toFixed(2)} ·{' '}
                  {equivalence_moyenne.lettre})
                </span>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {elements_suivis.map((el) => {
                  const note_eval = notes_apprenant.find((n) => n.id_element === el.id);
                  return (
                    <div key={el.id} className="px-3 py-2 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {el.nom}
                        </span>
                        <span className="text-slate-500 ml-2 font-mono text-[11px]">
                          ({el.code})
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-semibold">
                        {note_eval
                          ? `${note_eval.note}/${note_eval.note_maximale}`
                          : 'En cours'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
                <span>Sceau : {etablissement_actif.code_sceau}</span>
                <span>
                  {etablissement_actif.nom_direction} · {etablissement_actif.titre_direction}
                </span>
              </div>
            </div>
          </div>
        )}

        {modale_ouverte?.type === 'recu' && apprenant_suivi && (
          <div className="printable-document-root">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4 text-xs">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {etablissement_actif.nom}
                  </div>
                  <div className="font-mono text-slate-500 mt-0.5">
                    {modale_ouverte.numero_recu}
                  </div>
                </div>
                <CodeQrSvg
                  valeur={`${modale_ouverte.numero_recu}|${apprenant_suivi.matricule}|${modale_ouverte.montant_htg}`}
                  taille={64}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">{terminologie.apprenant_singulier}</span>
                  <span className="font-semibold">
                    {apprenant_suivi.prenom} {apprenant_suivi.nom} ({apprenant_suivi.matricule})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Motif / Tranche</span>
                  <span className="font-semibold">{modale_ouverte.libelle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Montant réglé</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                    {formater_montant(
                      modale_ouverte.montant_htg,
                      devise_active,
                      etablissement_actif.taux_change_usd
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode déclaré</span>
                  <span>{modale_ouverte.mode_paiement}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Caissier</span>
                  <span className="font-mono tabular-nums">
                    {formater_date_fr(modale_ouverte.date_paiement)} · {modale_ouverte.encaisse_par}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {modale_ouverte?.type === 'document_emis' && apprenant_suivi && (
          <div className="printable-document-root">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4 text-xs">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {etablissement_actif.nom}
                  </div>
                  <div className="font-mono text-slate-500">
                    {modale_ouverte.document.numero_document}
                  </div>
                </div>
                <CodeQrSvg
                  valeur={`${modale_ouverte.document.numero_document}|${modale_ouverte.document.empreinte_verification}`}
                  taille={64}
                />
              </div>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                La Direction de <strong>{etablissement_actif.nom}</strong> certifie que{' '}
                <strong>
                  {apprenant_suivi.prenom} {apprenant_suivi.nom}
                </strong>{' '}
                (Matricule <span className="font-mono">{apprenant_suivi.matricule}</span>) est
                régulièrement inscrit(e) dans l’unité{' '}
                <strong>{unite?.nom ?? apprenant_suivi.libelle_niveau}</strong> pour l’année{' '}
                <strong>{etablissement_actif.annee_academique}</strong>.
              </p>
              <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
                <span>
                  Émis le {formater_date_fr(modale_ouverte.document.emis_le)} · Hash{' '}
                  <span className="font-mono">
                    {modale_ouverte.document.empreinte_verification}
                  </span>
                </span>
                <span>{etablissement_actif.code_sceau}</span>
              </div>
            </div>
          </div>
        )}
      </Modale>
    </div>
  );
};
