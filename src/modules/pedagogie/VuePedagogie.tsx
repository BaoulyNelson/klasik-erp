import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  Lock,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  Unlock,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { Modale } from '../../composants/interface/Modale';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { utiliserErp } from '../../contexte/ContexteErp';
import { EntreeCahierTextes, NoteEvaluation, PresenceEnregistree } from '../../modeles/erp';
import { formater_date_fr } from '../../services/service_donnees';

export const VuePedagogie: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    utilisateur_actif,
    id_role_actif,
    unites_etablissement,
    elements_etablissement,
    apprenants_etablissement,
    notes_etablissement,
    cahiers_textes_etablissement,
    enregistrer_note,
    modifier_note,
    supprimer_note,
    basculer_verrouillage_notes_element,
    enregistrer_presences_lot,
    ajouter_entree_cahier_textes,
    modifier_entree_cahier_textes,
    supprimer_entree_cahier_textes,
    a_permission,
    emettre_document_officiel,
  } = utiliserErp();

  const theme = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const peut_noter = a_permission('pedagogie:noter') && id_role_actif !== 'SUPER_ADMIN';
  const peut_faire_appel = a_permission('pedagogie:appel') && id_role_actif !== 'SUPER_ADMIN';
  const peut_verrouiller = a_permission('pedagogie:verrouiller') && id_role_actif !== 'SUPER_ADMIN';
  const peut_emettre_documents = a_permission('documents:emettre') && id_role_actif !== 'SUPER_ADMIN';
  const est_lecture_seule =
    id_role_actif === 'SUPER_ADMIN' ||
    (!peut_noter && !peut_faire_appel && !peut_verrouiller && !peut_emettre_documents);
  const [onglet, definir_onglet] = useState<'notes' | 'presences' | 'cahier_textes' | 'specifique'>('notes');
  const [id_unite_selectionnee, definir_id_unite_selectionnee] = useState(
    unites_etablissement[0]?.id ?? ''
  );
  const [id_element_selectionne, definir_id_element_selectionne] = useState(
    elements_etablissement[0]?.id ?? ''
  );
  const [type_evaluation, definir_type_evaluation] =
    useState<NoteEvaluation['type_evaluation']>('Contrôle');
  const [saisies_notes, definir_saisies_notes] = useState<Record<string, string>>({});

  useEffect(() => {
    definir_id_unite_selectionnee(unites_etablissement[0]?.id ?? '');
    definir_id_element_selectionne(elements_etablissement[0]?.id ?? '');
    definir_saisies_notes({});
    definir_brouillon_presences({});
  }, [etablissement_actif.id, unites_etablissement, elements_etablissement]);

  // Appel numérique
  const [date_presence, definir_date_presence] = useState(new Date().toISOString().slice(0, 10));
  const [brouillon_presences, definir_brouillon_presences] = useState<
    Record<string, PresenceEnregistree['statut']>
  >({});

  // Cahier de textes
  const [sujet_seance, definir_sujet_seance] = useState('');
  const [devoir_donne, definir_devoir_donne] = useState('');
  const [entree_cahier_edition, definir_entree_cahier_edition] =
    useState<EntreeCahierTextes | null>(null);
  const [cible_suppression_cahier, definir_cible_suppression_cahier] =
    useState<EntreeCahierTextes | null>(null);

  // Édition / Suppression de notes
  const [note_edition, definir_note_edition] = useState<NoteEvaluation | null>(null);
  const [cible_suppression_note, definir_cible_suppression_note] =
    useState<NoteEvaluation | null>(null);

  // Conseil de classe (Scolaire)
  const [decisions_conseil, definir_decisions_conseil] = useState<Record<string, string>>({});

  const apprenants_unite = useMemo(
    () =>
      apprenants_etablissement.filter(
        (apprenant) => !id_unite_selectionnee || apprenant.id_unite === id_unite_selectionnee
      ),
    [apprenants_etablissement, id_unite_selectionnee]
  );

  const elements_unite = useMemo(
    () =>
      elements_etablissement.filter(
        (element) => !id_unite_selectionnee || element.id_unite === id_unite_selectionnee
      ),
    [elements_etablissement, id_unite_selectionnee]
  );

  const element_actif =
    elements_unite.find((element) => element.id === id_element_selectionne) ?? elements_unite[0];

  const element_verrouille = useMemo(
    () =>
      element_actif
        ? notes_etablissement.some(
            (note) =>
              note.id_element === element_actif.id &&
              note.libelle_periode === etablissement_actif.libelle_periode_courante &&
              note.verrouillee
          )
        : false,
    [element_actif, notes_etablissement, etablissement_actif.libelle_periode_courante]
  );

  const gerer_enregistrement_note = (id_apprenant: string) => {
    if (!element_actif) return;
    const valeur = Number(saisies_notes[id_apprenant]);
    if (Number.isNaN(valeur) || valeur < 0 || valeur > etablissement_actif.echelle_notation) {
      return;
    }
    enregistrer_note({
      id_apprenant,
      id_element: element_actif.id,
      libelle_periode: etablissement_actif.libelle_periode_courante,
      type_evaluation,
      note: valeur,
      note_maximale: etablissement_actif.echelle_notation,
      verrouillee: false,
      enregistree_le: new Date().toISOString().slice(0, 10),
    });
    definir_saisies_notes((precedent) => ({ ...precedent, [id_apprenant]: '' }));
  };

  const gerer_enregistrement_appel = () => {
    const entrees = apprenants_unite.map((apprenant) => ({
      id_apprenant: apprenant.id,
      date: date_presence,
      statut: brouillon_presences[apprenant.id] ?? ('PRESENT' as const),
      id_unite: id_unite_selectionnee || apprenant.id_unite,
    }));
    if (entrees.length > 0) {
      enregistrer_presences_lot(entrees);
    }
  };

  const gerer_ajout_cahier_textes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sujet_seance.trim() || !element_actif) return;
    ajouter_entree_cahier_textes({
      id_unite: id_unite_selectionnee || element_actif.id_unite,
      id_element: element_actif.id,
      nom_enseignant: utilisateur_actif.nom_complet,
      date: new Date().toISOString().slice(0, 10),
      sujet: sujet_seance.trim(),
      devoir_donne: devoir_donne.trim() || undefined,
    });
    definir_sujet_seance('');
    definir_devoir_donne('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Pédagogie, Évaluations & Assiduité
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {terminologie.libelle_evaluation} · Barème /{etablissement_actif.echelle_notation} · Prise
            en charge hors-ligne active
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => definir_onglet('notes')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              onglet === 'notes'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Saisie des notes</span>
          </button>
          <button
            type="button"
            onClick={() => definir_onglet('presences')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              onglet === 'presences'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Appel numérique</span>
          </button>
          <button
            type="button"
            onClick={() => definir_onglet('cahier_textes')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              onglet === 'cahier_textes'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Cahier de textes</span>
          </button>
          <button
            type="button"
            onClick={() => definir_onglet('specifique')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              onglet === 'specifique'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>
              {etablissement_actif.type === 'SCOLAIRE'
                ? 'Bulletins & Conseil'
                : etablissement_actif.type === 'UNIVERSITE'
                  ? 'Crédits ECTS & Jury'
                  : 'Validation Modules'}
            </span>
          </button>
        </div>
      </div>

      {est_lecture_seule && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">
                {id_role_actif === 'SUPER_ADMIN'
                  ? 'Mode supervision SaaS en lecture seule (Séparation des privilèges)'
                  : 'Consultation pédagogique en lecture seule'}
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                {id_role_actif === 'SUPER_ADMIN'
                  ? 'Le Super-administrateur Plateforme supervise la configuration sans saisir de notes, effectuer l’appel ni valider de bulletins.'
                  : 'Votre rôle actuel ne dispose pas des droits d’écriture pour saisir des notes, faire l’appel ou émettre des bulletins.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres Unité & Élément pédagogique */}
      <Carte rembourrage="petit">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              {terminologie.unite_singulier}
            </label>
            <select
              value={id_unite_selectionnee}
              onChange={(e) => {
                definir_id_unite_selectionnee(e.target.value);
                const premier_element = elements_etablissement.find(
                  (el) => el.id_unite === e.target.value
                );
                if (premier_element) definir_id_element_selectionne(premier_element.id);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {unites_etablissement.map((unite) => (
                <option key={unite.id} value={unite.id}>
                  {unite.nom}
                </option>
              ))}
            </select>
          </div>

          {onglet !== 'presences' && onglet !== 'specifique' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                {terminologie.contenu_singulier}
              </label>
              <select
                value={element_actif?.id ?? ''}
                onChange={(e) => definir_id_element_selectionne(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {elements_unite.map((element) => (
                  <option key={element.id} value={element.id}>
                    {element.code} — {element.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onglet === 'notes' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Type d’évaluation
                </label>
                <select
                  value={type_evaluation}
                  onChange={(e) =>
                    definir_type_evaluation(e.target.value as NoteEvaluation['type_evaluation'])
                  }
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="Devoir">Devoir</option>
                  <option value="Contrôle">Contrôle</option>
                  <option value="Examen">Examen</option>
                  <option value="Pratique">Pratique</option>
                  {etablissement_actif.type === 'UNIVERSITE' && (
                    <option value="Rattrapage">Rattrapage</option>
                  )}
                </select>
              </div>

              {peut_verrouiller && element_actif && (
                <div className="ml-auto">
                  <Bouton
                    variante="secondaire"
                    taille="sm"
                    onClick={() =>
                      basculer_verrouillage_notes_element(
                        element_actif.id,
                        etablissement_actif.libelle_periode_courante,
                        !element_verrouille
                      )
                    }
                  >
                    {element_verrouille ? (
                      <Unlock className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {element_verrouille ? 'Déverrouiller les notes' : 'Verrouiller la période'}
                    </span>
                  </Bouton>
                </div>
              )}
            </>
          )}
        </div>
      </Carte>

      {/* Onglet 1 : Saisie des notes */}
      {onglet === 'notes' && (
        <div className="space-y-4">
          <Carte rembourrage="aucun">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-500">
                    <th className="px-4 py-2.5 text-left font-semibold">Matricule</th>
                    <th className="px-4 py-2.5 text-left font-semibold">
                      {terminologie.apprenant_singulier}
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold">Moyenne actuelle</th>
                    <th className="px-4 py-2.5 text-right font-semibold">
                      Nouvelle note (/{etablissement_actif.echelle_notation})
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {apprenants_unite.map((apprenant) => (
                    <tr
                      key={apprenant.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                        {apprenant.matricule}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        {apprenant.nom.toUpperCase()} {apprenant.prenom}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums">
                        {apprenant.moyenne_generale}/{etablissement_actif.echelle_notation}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          step="0.25"
                          min={0}
                          max={etablissement_actif.echelle_notation}
                          disabled={element_verrouille || !peut_noter}
                          value={saisies_notes[apprenant.id] ?? ''}
                          onChange={(e) =>
                            definir_saisies_notes((precedent) => ({
                              ...precedent,
                              [apprenant.id]: e.target.value,
                            }))
                          }
                          placeholder="—"
                          className="w-24 px-2.5 py-1 text-xs font-mono text-right rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Bouton
                          variante="secondaire"
                          taille="sm"
                          disabled={
                            element_verrouille ||
                            !peut_noter ||
                            !saisies_notes[apprenant.id]
                          }
                          onClick={() => gerer_enregistrement_note(apprenant.id)}
                        >
                          Enregistrer
                        </Bouton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Carte>

          {element_actif && (
            <Carte rembourrage="aucun">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-display font-bold text-slate-900 dark:text-slate-100">
                  Historique des notes enregistrées — {element_actif.code} · {element_actif.nom}
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {notes_etablissement.filter((n) => n.id_element === element_actif.id).length} note(s)
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {notes_etablissement.filter((n) => n.id_element === element_actif.id).length ===
                0 ? (
                  <div className="p-6 text-center text-slate-500">
                    Aucune note saisie pour cet élément pédagogique.
                  </div>
                ) : (
                  notes_etablissement
                    .filter((n) => n.id_element === element_actif.id)
                    .map((n) => {
                      const ap = apprenants_etablissement.find((a) => a.id === n.id_apprenant);
                      return (
                        <div
                          key={n.id}
                          className="px-4 py-2.5 flex items-center justify-between gap-3"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {ap ? `${ap.prenom} ${ap.nom}` : n.id_apprenant}
                            </span>
                            <span className="text-slate-400 ml-2">
                              · {n.type_evaluation} · {n.libelle_periode} ·{' '}
                              {formater_date_fr(n.enregistree_le)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {n.note}/{n.note_maximale}
                            </span>
                            {peut_noter && !n.verrouillee && (
                              <>
                                <Bouton
                                  variante="fantome"
                                  taille="sm"
                                  onClick={() => definir_note_edition({ ...n })}
                                  aria-label="Modifier la note"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Bouton>
                                <Bouton
                                  variante="danger"
                                  taille="sm"
                                  onClick={() => definir_cible_suppression_note(n)}
                                  aria-label="Supprimer la note"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
          )}
        </div>
      )}

      {/* Onglet 2 : Appel numérique */}
      {onglet === 'presences' && (
        <Carte className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Date de séance :
              </label>
              <input
                type="date"
                value={date_presence}
                onChange={(e) => definir_date_presence(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            {peut_faire_appel && (
              <Bouton
                variante="principal"
                taille="sm"
                classe_accent={theme.bouton_principal}
                onClick={gerer_enregistrement_appel}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider l’appel ({apprenants_unite.length})</span>
              </Bouton>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {apprenants_unite.map((apprenant) => {
              const statut_courant = brouillon_presences[apprenant.id] ?? 'PRESENT';
              return (
                <div
                  key={apprenant.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-mono text-xs text-slate-500 mr-2">
                      {apprenant.matricule}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {apprenant.prenom} {apprenant.nom}
                    </span>
                    <span className="text-xs text-slate-400 ml-2 font-mono">
                      (Assiduité {apprenant.taux_assiduite}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    {(
                      [
                        { id: 'PRESENT', libelle: 'Présent' },
                        { id: 'ABSENT', libelle: 'Absent' },
                        { id: 'RETARD', libelle: 'Retard' },
                        { id: 'EXCUSE', libelle: 'Excusé' },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={!peut_faire_appel}
                        onClick={() =>
                          definir_brouillon_presences((precedent) => ({
                            ...precedent,
                            [apprenant.id]: option.id,
                          }))
                        }
                        className={`px-2.5 py-1 text-xs rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                          peut_faire_appel ? 'cursor-pointer' : ''
                        } ${
                          statut_courant === option.id
                            ? option.id === 'ABSENT'
                              ? 'bg-red-600 text-white font-semibold'
                              : option.id === 'RETARD'
                                ? 'bg-amber-500 text-white font-semibold'
                                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {option.libelle}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Carte>
      )}

      {/* Onglet 3 : Cahier de textes */}
      {onglet === 'cahier_textes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {(peut_noter || peut_faire_appel) && (
            <Carte className="lg:col-span-5">
              <h3 className="text-sm font-display font-bold mb-3">Nouvelle entrée cahier de textes</h3>
              <form onSubmit={gerer_ajout_cahier_textes} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Contenu abordé en séance *</label>
                  <textarea
                    rows={3}
                    value={sujet_seance}
                    onChange={(e) => definir_sujet_seance(e.target.value)}
                    placeholder="Thème, exercices pratiques, chapitre..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Travail à faire / Devoir</label>
                  <input
                    type="text"
                    value={devoir_donne}
                    onChange={(e) => definir_devoir_donne(e.target.value)}
                    placeholder="Pour la prochaine séance..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <Bouton type="submit" variante="principal" taille="sm" classe_accent={theme.bouton_principal}>
                  <Plus className="w-4 h-4" />
                  <span>Publier la séance</span>
                </Bouton>
              </form>
            </Carte>
          )}

          <Carte className={peut_noter || peut_faire_appel ? 'lg:col-span-7' : 'lg:col-span-12'}>
            <h3 className="text-sm font-display font-bold mb-3">
              Séances enregistrées ({cahiers_textes_etablissement.length})
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {cahiers_textes_etablissement.map((entree) => {
                const element = elements_etablissement.find((el) => el.id === entree.id_element);
                return (
                  <div key={entree.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-slate-500">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {element?.nom ?? entree.id_element} · {entree.nom_enseignant}
                        </span>
                        <span className="font-mono">{formater_date_fr(entree.date)}</span>
                      </div>
                      <p className="mt-1 text-slate-700 dark:text-slate-300">{entree.sujet}</p>
                      {entree.devoir_donne && (
                        <p className="mt-1 text-indigo-600 dark:text-indigo-400">
                          Devoir : {entree.devoir_donne}
                        </p>
                      )}
                    </div>
                    {(peut_noter || peut_faire_appel) && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Bouton
                          variante="fantome"
                          taille="sm"
                          onClick={() => definir_entree_cahier_edition({ ...entree })}
                          aria-label="Modifier la séance"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Bouton>
                        <Bouton
                          variante="danger"
                          taille="sm"
                          onClick={() => definir_cible_suppression_cahier(entree)}
                          aria-label="Supprimer la séance"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Bouton>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Carte>
        </div>
      )}

      {/* Onglet 4 : Spécifique type (Bulletins & Conseil / Crédits ECTS / Validation Pro) */}
      {onglet === 'specifique' && (
        <Carte rembourrage="aucun">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                {etablissement_actif.type === 'SCOLAIRE'
                  ? 'Conseil de classe, Classement & Bulletins périodiques'
                  : etablissement_actif.type === 'UNIVERSITE'
                    ? 'Suivi des crédits ECTS, Compensation & Rattrapages'
                    : 'Bilan de validation des modules pratiques & théoriques'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Seuil de réussite configuré : {etablissement_actif.note_passage}/
                {etablissement_actif.echelle_notation}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-500">
                  <th className="px-4 py-2.5 text-left font-semibold">Rang</th>
                  <th className="px-4 py-2.5 text-left font-semibold">
                    {terminologie.apprenant_singulier}
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">Moyenne</th>
                  {etablissement_actif.type === 'UNIVERSITE' && (
                    <th className="px-4 py-2.5 text-right font-semibold">Crédits ECTS</th>
                  )}
                  <th className="px-4 py-2.5 text-left font-semibold">Décision / Statut</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...apprenants_unite]
                  .sort((a, b) => b.moyenne_generale - a.moyenne_generale)
                  .map((apprenant, index) => {
                    const reussi = apprenant.moyenne_generale >= etablissement_actif.note_passage;
                    const decision_defaut =
                      etablissement_actif.type === 'SCOLAIRE'
                        ? reussi
                          ? 'Passage en classe supérieure'
                          : apprenant.moyenne_generale >= etablissement_actif.note_passage - 1
                            ? 'Repêchage'
                            : 'Redoublement'
                        : reussi
                          ? 'Validé (Admis)'
                          : 'Rattrapage requis';
                    const decision = decisions_conseil[apprenant.id] ?? decision_defaut;

                    return (
                      <tr
                        key={apprenant.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-xs"
                      >
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-500">
                          #{index + 1}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {apprenant.prenom} {apprenant.nom}{' '}
                          <span className="font-mono text-slate-400">({apprenant.matricule})</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums">
                          {apprenant.moyenne_generale}/{etablissement_actif.echelle_notation}
                        </td>
                        {etablissement_actif.type === 'UNIVERSITE' && (
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                            {apprenant.credits_acquis ?? 0}/{apprenant.credits_requis ?? 60}
                          </td>
                        )}
                        <td className="px-4 py-2.5">
                          {etablissement_actif.type === 'SCOLAIRE' ? (
                            <select
                              value={decision}
                              disabled={!peut_verrouiller && !peut_noter}
                              onChange={(e) =>
                                definir_decisions_conseil((precedent) => ({
                                  ...precedent,
                                  [apprenant.id]: e.target.value,
                                }))
                              }
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs disabled:opacity-60"
                            >
                              <option value="Passage en classe supérieure">
                                Passage en classe supérieure
                              </option>
                              <option value="Repêchage">Repêchage</option>
                              <option value="Redoublement">Redoublement</option>
                            </select>
                          ) : (
                            <span
                              className={
                                reussi
                                  ? 'text-emerald-600 font-semibold'
                                  : 'text-amber-600 font-semibold'
                              }
                            >
                              {decision}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {peut_emettre_documents ? (
                            <Bouton
                              variante="secondaire"
                              taille="sm"
                              onClick={() =>
                                emettre_document_officiel(
                                  apprenant.id,
                                  etablissement_actif.type === 'SCOLAIRE'
                                    ? 'Bulletin périodique'
                                    : etablissement_actif.type === 'UNIVERSITE'
                                      ? 'Relevé de notes officiel (Transcript)'
                                      : 'Attestation de réussite'
                                )
                              }
                            >
                              Émettre
                            </Bouton>
                          ) : (
                            <span className="text-[11px] text-slate-400">Lecture seule</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Carte>
      )}

      {/* MODALE ÉDITION NOTE */}
      <Modale
        ouverte={Boolean(note_edition)}
        sur_fermeture={() => definir_note_edition(null)}
        titre="Modifier la note"
        classe_largeur_max="max-w-sm"
      >
        {note_edition && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              modifier_note(note_edition.id, {
                note: note_edition.note,
                type_evaluation: note_edition.type_evaluation,
              });
              definir_note_edition(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1">Type d’évaluation</label>
              <select
                value={note_edition.type_evaluation}
                onChange={(e) =>
                  definir_note_edition({
                    ...note_edition,
                    type_evaluation: e.target.value as NoteEvaluation['type_evaluation'],
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Devoir">Devoir</option>
                <option value="Contrôle">Contrôle</option>
                <option value="Examen">Examen</option>
                <option value="Pratique">Pratique</option>
                <option value="Rattrapage">Rattrapage</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">
                Note (/{note_edition.note_maximale})
              </label>
              <input
                type="number"
                step="0.25"
                min={0}
                max={note_edition.note_maximale}
                required
                value={note_edition.note}
                onChange={(e) =>
                  definir_note_edition({ ...note_edition, note: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Bouton
                type="button"
                variante="secondaire"
                taille="sm"
                onClick={() => definir_note_edition(null)}
              >
                Annuler
              </Bouton>
              <Bouton type="submit" variante="principal" taille="sm" classe_accent={theme.bouton_principal}>
                Enregistrer
              </Bouton>
            </div>
          </form>
        )}
      </Modale>

      {/* MODALE ÉDITION CAHIER DE TEXTES */}
      <Modale
        ouverte={Boolean(entree_cahier_edition)}
        sur_fermeture={() => definir_entree_cahier_edition(null)}
        titre="Modifier la séance (Cahier de textes)"
        classe_largeur_max="max-w-md"
      >
        {entree_cahier_edition && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              modifier_entree_cahier_textes(entree_cahier_edition.id, {
                sujet: entree_cahier_edition.sujet,
                devoir_donne: entree_cahier_edition.devoir_donne,
                date: entree_cahier_edition.date,
              });
              definir_entree_cahier_edition(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1">Date</label>
              <input
                type="date"
                required
                value={entree_cahier_edition.date}
                onChange={(e) =>
                  definir_entree_cahier_edition({ ...entree_cahier_edition, date: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Contenu abordé *</label>
              <textarea
                rows={3}
                required
                value={entree_cahier_edition.sujet}
                onChange={(e) =>
                  definir_entree_cahier_edition({ ...entree_cahier_edition, sujet: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Devoir / Travail à faire</label>
              <input
                type="text"
                value={entree_cahier_edition.devoir_donne ?? ''}
                onChange={(e) =>
                  definir_entree_cahier_edition({
                    ...entree_cahier_edition,
                    devoir_donne: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Bouton
                type="button"
                variante="secondaire"
                taille="sm"
                onClick={() => definir_entree_cahier_edition(null)}
              >
                Annuler
              </Bouton>
              <Bouton type="submit" variante="principal" taille="sm" classe_accent={theme.bouton_principal}>
                Enregistrer
              </Bouton>
            </div>
          </form>
        )}
      </Modale>

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression_note)}
        sur_fermeture={() => definir_cible_suppression_note(null)}
        sur_confirmation={() => {
          if (cible_suppression_note) supprimer_note(cible_suppression_note.id);
        }}
        tonalite="danger"
        titre="Supprimer cette note ?"
        description="La moyenne de l’apprenant sera recalculée automatiquement après suppression."
        libelle_confirmation="Supprimer"
      />

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression_cahier)}
        sur_fermeture={() => definir_cible_suppression_cahier(null)}
        sur_confirmation={() => {
          if (cible_suppression_cahier) supprimer_entree_cahier_textes(cible_suppression_cahier.id);
        }}
        tonalite="danger"
        titre="Supprimer cette séance du cahier de textes ?"
        description="Cette entrée sera définitivement retirée."
        libelle_confirmation="Supprimer"
      />
    </div>
  );
};
