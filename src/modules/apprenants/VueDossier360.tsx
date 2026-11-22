import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  FileText,
  GraduationCap,
  HeartPulse,
  History,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Printer,
  ShieldAlert,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { CodeQrSvg } from '../../composants/interface/CodeQrSvg';
import {
  declencher_impression_ciblee,
  FicheInscriptionImprimable,
} from '../../composants/interface/FicheInscriptionImprimable';
import { Modale } from '../../composants/interface/Modale';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { PROFILS_PAYS } from '../../configuration/regions_devises';
import { utiliserErp } from '../../contexte/ContexteErp';
import { Apprenant, ContactTuteur, PaiementEnregistre } from '../../modeles/erp';
import {
  convertir_devise_vers_pivot,
  convertir_pivot_vers_devise,
  formater_date_fr,
  formater_montant,
} from '../../services/service_donnees';
import { convertir_note_internationale } from '../../utilitaires/notation';

interface ProprietesVueDossier360 {
  id_apprenant: string;
}

type OngletDossier =
  | 'identite'
  | 'documents'
  | 'notes'
  | 'finances'
  | 'stage'
  | 'parents'
  | 'discipline'
  | 'sante'
  | 'communication'
  | 'historique';

export const VueDossier360: React.FC<ProprietesVueDossier360> = ({ id_apprenant }) => {
  const {
    etablissement_actif,
    terminologie,
    devise_active,
    apprenants_etablissement,
    inscriptions_etablissement,
    unites_etablissement,
    paiements_etablissement,
    notes_etablissement,
    presences_etablissement,
    elements_etablissement,
    documents_etablissement,
    infirmerie_etablissement,
    discipline_etablissement,
    communications_etablissement,
    journaux_audit,
    fermer_dossier_apprenant,
    mettre_a_jour_apprenant,
    encaisser_paiement,
    emettre_document_officiel,
    definir_route_active,
    a_permission,
  } = utiliserErp();

  const [onglet, definir_onglet] = useState<OngletDossier>('identite');
  const [montant_paiement_rapide, definir_montant_paiement_rapide] = useState(() =>
    convertir_pivot_vers_devise(5000, devise_active, etablissement_actif.taux_change_usd)
  );

  // Modale permanente de fiche d'inscription imprimable / PDF
  const [modale_fiche_ouverte, definir_modale_fiche_ouverte] = useState(false);
  const [format_fiche, definir_format_fiche] = useState<'a4' | '80mm'>('a4');

  // Modale complète d'édition du dossier
  const [modale_edition_ouverte, definir_modale_edition_ouverte] = useState(false);
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
  const [ed_statut, definir_ed_statut] = useState<Apprenant['statut']>('ACTIF');
  const [ed_bourse, definir_ed_bourse] = useState(0);
  const [ed_credits_acquis, definir_ed_credits_acquis] = useState(0);
  const [ed_credits_requis, definir_ed_credits_requis] = useState(60);
  const [ed_entreprise_stage, definir_ed_entreprise_stage] = useState('');
  const [ed_pieces_fournies, definir_ed_pieces_fournies] = useState<string[]>([]);

  // Modale ajout / modification tuteur
  const [modale_tuteur_ouverte, definir_modale_tuteur_ouverte] = useState(false);
  const [index_tuteur_edition, definir_index_tuteur_edition] = useState<number | null>(null);
  const [tut_nom, definir_tut_nom] = useState('');
  const [tut_lien, definir_tut_lien] = useState<ContactTuteur['lien_parente']>('Mère');
  const [tut_telephone, definir_tut_telephone] = useState('');
  const [tut_urgence, definir_tut_urgence] = useState(true);
  const [tut_retrait, definir_tut_retrait] = useState(true);

  useEffect(() => {
    definir_montant_paiement_rapide(
      convertir_pivot_vers_devise(5000, devise_active, etablissement_actif.taux_change_usd)
    );
  }, [devise_active, etablissement_actif.taux_change_usd]);

  const profil_pays = PROFILS_PAYS[etablissement_actif.code_pays] ?? PROFILS_PAYS.INTL;
  const mode_paiement_rapide =
    (profil_pays.modes_paiement_preferes[0] as PaiementEnregistre['mode_paiement']) ??
    'Carte bancaire (Stripe/Visa)';

  const apprenant = apprenants_etablissement.find((a) => a.id === id_apprenant);
  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type);

  const inscription_active = useMemo(() => {
    if (!apprenant) return undefined;
    const associees = inscriptions_etablissement.filter((i) => i.id_apprenant === apprenant.id);
    return (
      associees.find((i) => i.statut_inscription === 'VALIDEE') ??
      associees[0]
    );
  }, [apprenant, inscriptions_etablissement]);

  const onglets = useMemo(() => {
    const liste: {
      id: OngletDossier;
      libelle: string;
      icone: React.FC<{ className?: string }>;
    }[] = [
      { id: 'identite', libelle: 'Identité & Contacts', icone: User },
      { id: 'documents', libelle: 'Documents', icone: FileText },
      { id: 'notes', libelle: 'Notes & Assiduité', icone: GraduationCap },
      { id: 'finances', libelle: 'Finances', icone: Wallet },
    ];
    if (terminologie.module_stages_actif) {
      liste.push({
        id: 'stage',
        libelle: etablissement_actif.type === 'UNIVERSITE' ? 'Stage & Mémoire' : 'Stage',
        icone: Briefcase,
      });
    }
    liste.push({
      id: 'parents',
      libelle: terminologie.etape_tuteurs_active ? 'Parents & Tuteurs' : 'Contacts d’urgence',
      icone: Phone,
    });
    liste.push(
      { id: 'discipline', libelle: 'Discipline', icone: ShieldAlert },
      { id: 'sante', libelle: 'Santé', icone: HeartPulse },
      { id: 'communication', libelle: 'Communication', icone: MessageSquare },
      { id: 'historique', libelle: 'Historique', icone: History }
    );
    return liste;
  }, [
    terminologie.module_stages_actif,
    terminologie.etape_tuteurs_active,
    etablissement_actif.type,
  ]);

  if (!apprenant) {
    return (
      <Carte>
        <p className="text-sm text-slate-500">Dossier introuvable dans cet établissement.</p>
        <Bouton
          variante="secondaire"
          taille="sm"
          className="mt-3"
          onClick={fermer_dossier_apprenant}
        >
          Retour au répertoire
        </Bouton>
      </Carte>
    );
  }

  const unite = unites_etablissement.find((u) => u.id === apprenant.id_unite);
  const solde = Math.max(0, apprenant.total_du_htg - apprenant.total_paye_htg);
  const paiements_apprenant = paiements_etablissement.filter(
    (p) => p.id_apprenant === apprenant.id
  );
  const notes_apprenant = notes_etablissement.filter((n) => n.id_apprenant === apprenant.id);
  const presences_apprenant = presences_etablissement.filter(
    (p) => p.id_apprenant === apprenant.id
  );
  const documents_apprenant = documents_etablissement.filter(
    (d) => d.id_apprenant === apprenant.id
  );
  const sante_apprenant = infirmerie_etablissement.filter(
    (v) => v.id_apprenant === apprenant.id
  );
  const discipline_apprenant = discipline_etablissement.filter(
    (d) => d.id_apprenant === apprenant.id
  );
  const equivalence_note = convertir_note_internationale(
    apprenant.moyenne_generale,
    etablissement_actif.echelle_notation
  );
  const peut_modifier_dossier =
    a_permission('admissions:gerer') || a_permission('parametres:gerer');

  const ouvrir_edition_dossier = () => {
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
    definir_ed_id_unite(apprenant.id_unite);
    definir_ed_libelle_niveau(apprenant.libelle_niveau);
    definir_ed_statut(apprenant.statut);
    definir_ed_bourse(apprenant.pourcentage_bourse ?? 0);
    definir_ed_credits_acquis(apprenant.credits_acquis ?? 0);
    definir_ed_credits_requis(apprenant.credits_requis ?? 60);
    definir_ed_entreprise_stage(apprenant.entreprise_stage ?? '');
    const manquantes = apprenant.pieces_manquantes ?? [];
    definir_ed_pieces_fournies(
      terminologie.pieces_admission_requises.filter((p) => !manquantes.includes(p))
    );
    definir_modale_edition_ouverte(true);
  };

  const gerer_enregistrement_dossier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ed_prenom.trim() || !ed_nom.trim()) return;
    const pieces_manquantes = terminologie.pieces_admission_requises.filter(
      (p) => !ed_pieces_fournies.includes(p)
    );
    mettre_a_jour_apprenant(apprenant.id, {
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
      id_unite: ed_id_unite,
      libelle_niveau: ed_libelle_niveau.trim(),
      statut: ed_statut,
      pourcentage_bourse: ed_bourse,
      credits_acquis:
        etablissement_actif.type === 'UNIVERSITE' ? ed_credits_acquis : apprenant.credits_acquis,
      credits_requis:
        etablissement_actif.type === 'UNIVERSITE' ? ed_credits_requis : apprenant.credits_requis,
      entreprise_stage: ed_entreprise_stage.trim() || undefined,
      dossier_complet: pieces_manquantes.length === 0,
      pieces_manquantes,
    });
    definir_modale_edition_ouverte(false);
  };

  const ouvrir_modale_tuteur = (tuteur?: ContactTuteur, index?: number) => {
    if (tuteur !== undefined && index !== undefined) {
      definir_index_tuteur_edition(index);
      definir_tut_nom(tuteur.nom_complet);
      definir_tut_lien(tuteur.lien_parente);
      definir_tut_telephone(tuteur.telephone);
      definir_tut_urgence(tuteur.est_contact_urgence);
      definir_tut_retrait(tuteur.retrait_autorise);
    } else {
      definir_index_tuteur_edition(null);
      definir_tut_nom('');
      definir_tut_lien(terminologie.etape_tuteurs_active ? 'Mère' : 'Proche / Urgence');
      definir_tut_telephone(`${profil_pays.indicatif_telephonique} `);
      definir_tut_urgence(true);
      definir_tut_retrait(true);
    }
    definir_modale_tuteur_ouverte(true);
  };

  const gerer_enregistrement_tuteur = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tut_nom.trim()) return;
    const actuel = apprenant.tuteurs ?? [];
    const nouveau_tuteur: ContactTuteur = {
      nom_complet: tut_nom.trim(),
      lien_parente: tut_lien,
      telephone: tut_telephone.trim() || profil_pays.indicatif_telephonique,
      est_contact_urgence: tut_urgence,
      retrait_autorise: tut_retrait,
    };
    const maj =
      index_tuteur_edition !== null
        ? actuel.map((t, i) => (i === index_tuteur_edition ? nouveau_tuteur : t))
        : [...actuel, nouveau_tuteur];
    mettre_a_jour_apprenant(apprenant.id, { tuteurs: maj });
    definir_modale_tuteur_ouverte(false);
  };

  const supprimer_tuteur = (index: number) => {
    const actuel = apprenant.tuteurs ?? [];
    mettre_a_jour_apprenant(apprenant.id, {
      tuteurs: actuel.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Bouton variante="fantome" taille="sm" onClick={fermer_dossier_apprenant}>
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au répertoire</span>
        </Bouton>
        <div className="flex flex-wrap items-center gap-2">
          <Bouton
            variante="secondaire"
            taille="sm"
            onClick={() => {
              definir_format_fiche('a4');
              definir_modale_fiche_ouverte(true);
            }}
          >
            <Printer className="w-4 h-4" />
            <span>Fiche d’inscription / PDF</span>
          </Bouton>
          {peut_modifier_dossier && (
            <Bouton variante="secondaire" taille="sm" onClick={ouvrir_edition_dossier}>
              <Pencil className="w-4 h-4" />
              <span>Modifier le dossier</span>
            </Bouton>
          )}
          {a_permission('documents:emettre') && (
            <Bouton
              variante="principal"
              taille="sm"
              classe_accent={theme_etab.bouton_principal}
              onClick={() =>
                emettre_document_officiel(apprenant.id, terminologie.documents_officiels[0])
              }
            >
              <FileText className="w-4 h-4" />
              <span>Émettre {terminologie.documents_officiels[0]}</span>
            </Bouton>
          )}
        </div>
      </div>

      {/* En-tête 360° + Chronologie interactive */}
      <Carte rembourrage="grand">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-display font-bold text-lg flex items-center justify-center shrink-0">
              {apprenant.prenom[0]}
              {apprenant.nom[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100">
                  {apprenant.prenom} {apprenant.nom}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {apprenant.matricule}
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {apprenant.statut}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {terminologie.apprenant_singulier} · {unite?.nom ?? apprenant.id_unite} ·{' '}
                {apprenant.libelle_niveau}
                {apprenant.nationalite ? ` · ${apprenant.nationalite}` : ''}
                {apprenant.mobilite_internationale ? ' · Mobilité internationale' : ''}
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Moyenne :{' '}
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {apprenant.moyenne_generale}/{etablissement_actif.echelle_notation}
                  </strong>{' '}
                  <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                    (GPA {equivalence_note.gpa4.toFixed(2)} · {equivalence_note.lettre})
                  </span>
                </span>
                <span>
                  Assiduité :{' '}
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {apprenant.taux_assiduite}%
                  </strong>
                </span>
                <span>
                  Solde dû :{' '}
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {formater_montant(
                      solde,
                      devise_active,
                      etablissement_actif.taux_change_usd
                    )}
                  </strong>
                </span>
                {apprenant.reference_visa_passeport && (
                  <span>
                    Passeport / Visa :{' '}
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {apprenant.reference_visa_passeport}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <CodeQrSvg valeur={`${etablissement_actif.code}|${apprenant.matricule}`} taille={72} />
        </div>

        {/* Chronologie 5 étapes cliquable pour faire progresser le dossier */}
        <div className="pt-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            Timeline de progression (cliquez sur une étape pour mettre à jour le statut)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {terminologie.etapes_parcours.map((etape_parcours) => {
              const terminee = etape_parcours.etape <= apprenant.indice_etape;
              const courante = etape_parcours.etape === apprenant.indice_etape;
              return (
                <button
                  key={etape_parcours.etape}
                  type="button"
                  onClick={() =>
                    mettre_a_jour_apprenant(apprenant.id, {
                      indice_etape: etape_parcours.etape as Apprenant['indice_etape'],
                    })
                  }
                  className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    courante
                      ? theme_etab.nav_active
                      : terminee
                        ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 opacity-65 hover:opacity-100'
                  }`}
                >
                  <div className="font-mono text-[10px] font-bold">
                    Étape {etape_parcours.etape}/5
                  </div>
                  <div className="text-xs font-semibold mt-0.5">{etape_parcours.libelle}</div>
                </button>
              );
            })}
          </div>
        </div>
      </Carte>

      {/* Onglets Dossier 360° */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {onglets.map((item_onglet) => {
          const Icone = item_onglet.icone;
          const actif = onglet === item_onglet.id;
          return (
            <button
              key={item_onglet.id}
              type="button"
              onClick={() => definir_onglet(item_onglet.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                actif
                  ? theme_etab.nav_active
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icone className="w-3.5 h-3.5" />
              <span>{item_onglet.libelle}</span>
            </button>
          );
        })}
      </div>

      {/* Contenu onglet */}
      {onglet === 'identite' && (
        <Carte className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2.5">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Nom complet & Sexe</span>
                <span className="font-semibold">
                  {apprenant.prenom} {apprenant.nom} ({apprenant.sexe})
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Date & lieu de naissance</span>
                <span>
                  {formater_date_fr(apprenant.date_naissance)} · {apprenant.lieu_naissance}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Téléphone</span>
                <span className="font-mono">{apprenant.telephone}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Courriel personnel</span>
                <span className="font-mono">{apprenant.courriel || 'Non renseigné'}</span>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Adresse</span>
                <span>{apprenant.adresse}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Date & N° d’inscription</span>
                <span className="font-mono">
                  {formater_date_fr(apprenant.date_inscription)}
                  {inscription_active ? ` · ${inscription_active.numero_inscription}` : ''}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Bourse / Réduction</span>
                <span className="font-mono font-semibold">
                  {apprenant.pourcentage_bourse ?? 0}%
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Dossier administratif</span>
                <span
                  className={
                    apprenant.dossier_complet
                      ? 'text-emerald-600 font-semibold'
                      : 'text-amber-600 font-semibold'
                  }
                >
                  {apprenant.dossier_complet
                    ? 'Complet'
                    : `Incomplet (${apprenant.pieces_manquantes?.join(', ')})`}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Responsables / Contacts d’urgence
              </span>
              {peut_modifier_dossier && (
                <Bouton
                  variante="fantome"
                  taille="sm"
                  onClick={() => ouvrir_modale_tuteur()}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un contact</span>
                </Bouton>
              )}
            </div>
            {(apprenant.tuteurs ?? []).length === 0 ? (
              <p className="text-slate-500">
                Aucun responsable ou contact d’urgence renseigné pour le moment.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(apprenant.tuteurs ?? []).map((tuteur, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold">{tuteur.nom_complet}</div>
                      <div className="text-[11px] text-slate-500">{tuteur.lien_parente}</div>
                    </div>
                    <span className="font-mono font-semibold">{tuteur.telephone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
            <span className="text-[11px] text-slate-500">
              La fiche d’inscription générée utilise en temps réel l’ensemble des données
              enregistrées dans ce dossier.
            </span>
            <Bouton
              variante="secondaire"
              taille="sm"
              onClick={() => {
                definir_format_fiche('a4');
                definir_modale_fiche_ouverte(true);
              }}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Consulter / Télécharger la fiche PDF</span>
            </Bouton>
          </div>
        </Carte>
      )}

      {onglet === 'documents' && (
        <Carte className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Pièces & Documents officiels émis</h3>
            <div className="flex items-center gap-2">
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => {
                  definir_format_fiche('a4');
                  definir_modale_fiche_ouverte(true);
                }}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Fiche d’inscription A4 / PDF</span>
              </Bouton>
              {!apprenant.dossier_complet && (
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  onClick={() =>
                    mettre_a_jour_apprenant(apprenant.id, {
                      dossier_complet: true,
                      pieces_manquantes: [],
                    })
                  }
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Marquer pièces complètes</span>
                </Bouton>
              )}
            </div>
          </div>
          {documents_apprenant.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aucun autre document officiel émis pour ce dossier (utilisez le bouton ci-dessus pour
              consulter ou imprimer sa fiche d’inscription permanente).
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {documents_apprenant.map((doc) => (
                <div key={doc.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{doc.type_document}</span>
                    <span className="font-mono text-slate-500 ml-2">{doc.numero_document}</span>
                  </div>
                  <span className="font-mono text-slate-400">
                    {formater_date_fr(doc.emis_le)} · {doc.empreinte_verification}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Carte>
      )}

      {onglet === 'notes' && (
        <Carte className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Évaluations & Assiduité</h3>
            <Bouton
              variante="secondaire"
              taille="sm"
              onClick={() => definir_route_active('pedagogie')}
            >
              Saisir des notes / Appel →
            </Bouton>
          </div>
          {notes_apprenant.length === 0 ? (
            <p className="text-xs text-slate-500">
              Moyenne consolidée actuelle :{' '}
              <strong className="font-mono">
                {apprenant.moyenne_generale}/{etablissement_actif.echelle_notation}
              </strong>
              . Saisissez de nouvelles évaluations depuis le module Pédagogie.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {notes_apprenant.map((note) => {
                const element = elements_etablissement.find((el) => el.id === note.id_element);
                return (
                  <div key={note.id} className="py-2.5 flex justify-between">
                    <span>
                      {element?.nom ?? note.id_element} · {note.type_evaluation}
                    </span>
                    <span className="font-mono font-bold">
                      {note.note}/{note.note_maximale}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            Taux de présence :{' '}
            <strong className="font-mono text-slate-800 dark:text-slate-200">
              {apprenant.taux_assiduite}%
            </strong>{' '}
            · {presences_apprenant.length} pointage(s) récent(s).
          </div>
        </Carte>
      )}

      {onglet === 'finances' && (
        <Carte className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="text-slate-500">Total facturé</div>
              <div className="font-mono text-base font-bold mt-1">
                {formater_montant(
                  apprenant.total_du_htg,
                  devise_active,
                  etablissement_actif.taux_change_usd
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30">
              <div className="text-emerald-700 dark:text-emerald-400">Montant encaissé</div>
              <div className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                {formater_montant(
                  apprenant.total_paye_htg,
                  devise_active,
                  etablissement_actif.taux_change_usd
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="text-slate-500">Solde restant</div>
              <div className="font-mono text-base font-bold mt-1">
                {formater_montant(solde, devise_active, etablissement_actif.taux_change_usd)}
              </div>
            </div>
          </div>

          {solde > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-mono text-slate-500">{devise_active}</span>
              <input
                type="number"
                step="any"
                min={0.01}
                value={montant_paiement_rapide}
                onChange={(e) => definir_montant_paiement_rapide(Number(e.target.value) || 0)}
                className="w-36 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <Bouton
                variante="principal"
                taille="sm"
                classe_accent={theme_etab.bouton_principal}
                disabled={montant_paiement_rapide <= 0}
                onClick={() =>
                  encaisser_paiement(
                    apprenant.id,
                    convertir_devise_vers_pivot(
                      montant_paiement_rapide,
                      devise_active,
                      etablissement_actif.taux_change_usd
                    ),
                    mode_paiement_rapide,
                    'Versement depuis Dossier 360°',
                    `PAY-${Date.now().toString().slice(-6)}`
                  )
                }
              >
                Encaisser ({mode_paiement_rapide.split(' ')[0]})
              </Bouton>
            </div>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {paiements_apprenant.map((paiement) => (
              <div key={paiement.id} className="py-2.5 flex justify-between">
                <span>
                  <strong className="font-mono">{paiement.numero_recu}</strong> ·{' '}
                  {paiement.libelle} ({paiement.mode_paiement})
                </span>
                <span className="font-mono font-semibold">
                  {formater_montant(
                    paiement.montant_htg,
                    devise_active,
                    etablissement_actif.taux_change_usd
                  )}
                </span>
              </div>
            ))}
          </div>
        </Carte>
      )}

      {onglet === 'stage' && (
        <Carte className="text-xs space-y-2">
          <div className="font-semibold text-sm">Stage & Insertion / Crédits</div>
          <p className="text-slate-600 dark:text-slate-300">
            Entreprise partenaire :{' '}
            <strong>{apprenant.entreprise_stage ?? 'Non encore attribuée'}</strong>
          </p>
          {terminologie.suivi_credits_actif && (
            <p className="text-slate-600 dark:text-slate-300">
              Crédits ECTS :{' '}
              <strong className="font-mono">
                {apprenant.credits_acquis ?? 0} / {apprenant.credits_requis ?? 60}
              </strong>
            </p>
          )}
          <Bouton
            variante="secondaire"
            taille="sm"
            onClick={() => definir_route_active('stages')}
          >
            Gérer dans le module Stages →
          </Bouton>
        </Carte>
      )}

      {onglet === 'parents' && (
        <Carte className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {terminologie.etape_tuteurs_active
                ? 'Parents & Tuteurs autorisés'
                : 'Responsables & Contacts d’urgence'}
            </h3>
            {peut_modifier_dossier && (
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => ouvrir_modale_tuteur()}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un contact</span>
              </Bouton>
            )}
          </div>
          {(apprenant.tuteurs ?? []).length === 0 ? (
            <p className="text-slate-500">Aucun responsable ou contact d’urgence enregistré.</p>
          ) : (
            (apprenant.tuteurs ?? []).map((tuteur, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center gap-3"
              >
                <div>
                  <div className="font-semibold">
                    {tuteur.nom_complet} ({tuteur.lien_parente})
                  </div>
                  <div className="text-slate-500">
                    {tuteur.est_contact_urgence ? 'Contact d’urgence' : 'Contact secondaire'} ·{' '}
                    {tuteur.retrait_autorise ? 'Retrait autorisé' : 'Retrait non autorisé'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{tuteur.telephone}</span>
                  {peut_modifier_dossier && (
                    <>
                      <button
                        type="button"
                        onClick={() => ouvrir_modale_tuteur(tuteur, index)}
                        className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => supprimer_tuteur(index)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </Carte>
      )}

      {onglet === 'discipline' && (
        <Carte className="text-xs space-y-2">
          <h3 className="text-sm font-semibold">Suivi disciplinaire</h3>
          {discipline_apprenant.length === 0 ? (
            <p className="text-slate-500">Aucun incident disciplinaire enregistré.</p>
          ) : (
            discipline_apprenant.map((incident) => (
              <div
                key={incident.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800"
              >
                <div className="font-semibold">
                  {incident.gravite} · {formater_date_fr(incident.date)}
                </div>
                <p className="mt-1">
                  {incident.description} — <em>{incident.sanction}</em>
                </p>
              </div>
            ))
          )}
        </Carte>
      )}

      {onglet === 'sante' && (
        <Carte className="text-xs space-y-2">
          <h3 className="text-sm font-semibold">Fiche Santé & Infirmerie</h3>
          {sante_apprenant.length === 0 ? (
            <p className="text-slate-500">Aucun passage à l’infirmerie consigné.</p>
          ) : (
            sante_apprenant.map((visite) => (
              <div
                key={visite.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800"
              >
                <div className="font-semibold">
                  {formater_date_fr(visite.date)} · {visite.motif}
                </div>
                <p className="mt-1">
                  {visite.soin_apporte} {visite.note_allergies ? `(${visite.note_allergies})` : ''}
                </p>
              </div>
            ))
          )}
        </Carte>
      )}

      {onglet === 'communication' && (
        <Carte className="text-xs space-y-2">
          <h3 className="text-sm font-semibold">Historique des communications</h3>
          {communications_etablissement.map((comm) => (
            <div key={comm.id} className="py-2 border-b border-slate-100 dark:border-slate-800">
              <div className="font-semibold">
                {comm.titre} ({comm.canal})
              </div>
              <p className="text-slate-500 mt-0.5">{comm.contenu}</p>
            </div>
          ))}
        </Carte>
      )}

      {onglet === 'historique' && (
        <Carte className="text-xs space-y-2">
          <h3 className="text-sm font-semibold">Journal d’activité</h3>
          {journaux_audit.slice(0, 6).map((entree) => (
            <div
              key={entree.id}
              className="py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between"
            >
              <span>
                <strong>{entree.action}</strong> · {entree.nom_acteur}
              </span>
              <span className="font-mono text-slate-400">{entree.horodatage}</span>
            </div>
          ))}
        </Carte>
      )}

      {/* Modale Permanente : Fiche d'Inscription Réelle (Imprimer / PDF) */}
      <Modale
        ouverte={modale_fiche_ouverte}
        sur_fermeture={() => definir_modale_fiche_ouverte(false)}
        titre={`Fiche d’inscription — ${apprenant.prenom} ${apprenant.nom}`}
        sous_titre={`${etablissement_actif.nom_court} · Matricule ${apprenant.matricule}`}
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
          apprenant={apprenant}
          unite={unite}
          inscription={inscription_active}
        />
      </Modale>

      {/* Modale complète d'édition de tous les champs du dossier apprenant */}
      <Modale
        ouverte={modale_edition_ouverte}
        sur_fermeture={() => definir_modale_edition_ouverte(false)}
        titre={`Modifier le dossier — ${apprenant.prenom} ${apprenant.nom}`}
        sous_titre={`Matricule ${apprenant.matricule} · Mise à jour complète des informations`}
        classe_largeur_max="max-w-2xl"
      >
        <form onSubmit={gerer_enregistrement_dossier} className="space-y-4 text-xs">
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
              <label className="block font-semibold mb-1">Courriel personnel</label>
              <input
                type="email"
                value={ed_courriel}
                onChange={(e) => definir_ed_courriel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Statut du dossier</label>
              <select
                value={ed_statut}
                onChange={(e) => definir_ed_statut(e.target.value as Apprenant['statut'])}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="ACTIF">Actif</option>
                <option value="EN_STAGE">En stage</option>
                <option value="DIPLOME">Diplômé</option>
                <option value="REDOUBLANT">Redoublant</option>
                <option value="SUSPENDU">Suspendu</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block font-semibold mb-1">Adresse complète</label>
              <input
                type="text"
                value={ed_adresse}
                onChange={(e) => definir_ed_adresse(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
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
              <label className="block font-semibold mb-1">Niveau / Promotion / Session</label>
              <input
                type="text"
                value={ed_libelle_niveau}
                onChange={(e) => definir_ed_libelle_niveau(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Bourse / Réduction (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={ed_bourse}
                onChange={(e) => definir_ed_bourse(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            {etablissement_actif.type === 'UNIVERSITE' && (
              <>
                <div>
                  <label className="block font-semibold mb-1">Crédits ECTS acquis</label>
                  <input
                    type="number"
                    min={0}
                    value={ed_credits_acquis}
                    onChange={(e) => definir_ed_credits_acquis(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Crédits ECTS requis</label>
                  <input
                    type="number"
                    min={1}
                    value={ed_credits_requis}
                    onChange={(e) => definir_ed_credits_requis(Number(e.target.value) || 60)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </>
            )}
            {terminologie.module_stages_actif && (
              <div>
                <label className="block font-semibold mb-1">Entreprise de stage</label>
                <input
                  type="text"
                  value={ed_entreprise_stage}
                  onChange={(e) => definir_ed_entreprise_stage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={ed_mobilite}
                onChange={(e) => definir_ed_mobilite(e.target.checked)}
              />
              <span>Mobilité internationale (Visa / Passeport)</span>
            </label>
            {ed_mobilite && (
              <input
                type="text"
                value={ed_visa}
                onChange={(e) => definir_ed_visa(e.target.value)}
                placeholder="Référence Passeport / Visa d’études"
                className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold">Pièces administratives déposées</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {terminologie.pieces_admission_requises.map((piece) => {
                const coche = ed_pieces_fournies.includes(piece);
                return (
                  <label
                    key={piece}
                    className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={coche}
                      onChange={() =>
                        definir_ed_pieces_fournies((prev) =>
                          coche ? prev.filter((p) => p !== piece) : [...prev, piece]
                        )
                      }
                    />
                    <span>{piece}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_edition_ouverte(false)}
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

      {/* Modale ajout / modification Tuteur */}
      <Modale
        ouverte={modale_tuteur_ouverte}
        sur_fermeture={() => definir_modale_tuteur_ouverte(false)}
        titre={
          index_tuteur_edition !== null ? 'Modifier le responsable légal' : 'Ajouter un responsable'
        }
        sous_titre={`${apprenant.prenom} ${apprenant.nom}`}
        classe_largeur_max="max-w-md"
      >
        <form onSubmit={gerer_enregistrement_tuteur} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Nom complet *</label>
            <input
              type="text"
              required
              value={tut_nom}
              onChange={(e) => definir_tut_nom(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Lien de parenté</label>
              <select
                value={tut_lien}
                onChange={(e) =>
                  definir_tut_lien(e.target.value as ContactTuteur['lien_parente'])
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
              <label className="block font-semibold mb-1">Téléphone *</label>
              <input
                type="text"
                required
                value={tut_telephone}
                onChange={(e) => definir_tut_telephone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={tut_urgence}
                onChange={(e) => definir_tut_urgence(e.target.checked)}
              />
              <span>Contact d’urgence</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={tut_retrait}
                onChange={(e) => definir_tut_retrait(e.target.checked)}
              />
              <span>Retrait autorisé</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_tuteur_ouverte(false)}
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
      </Modale>
    </div>
  );
};
