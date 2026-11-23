import React, { useState } from 'react';
import {
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { Modale } from '../../composants/interface/Modale';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { utiliserErp } from '../../contexte/ContexteErp';
import { PartenaireStage, SoutenanceMemoire } from '../../modeles/erp';
import { formater_date_fr, formater_montant } from '../../services/service_donnees';

export const VueStages: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    devise_active,
    partenaires_etablissement,
    apprenants_etablissement,
    soutenances_etablissement,
    attribuer_stage,
    ajouter_partenaire_stage,
    modifier_partenaire_stage,
    supprimer_partenaire_stage,
    ajouter_soutenance,
    mettre_a_jour_soutenance,
    supprimer_soutenance,
    emettre_document_officiel,
    a_permission,
  } = utiliserErp();

  const theme = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const [id_apprenant_selectionne, definir_id_apprenant_selectionne] = useState(
    apprenants_etablissement[0]?.id ?? ''
  );
  const [entreprise_selectionnee, definir_entreprise_selectionnee] = useState(
    partenaires_etablissement[0]?.nom_entreprise ?? 'Entreprise Partenaire'
  );

  // Soutenance Université : Création, Édition, Suppression
  const [titre_memoire, definir_titre_memoire] = useState('');
  const [directeur_memoire, definir_directeur_memoire] = useState('Dr. Carl-Henri Dorsainvil');
  const [date_soutenance, definir_date_soutenance] = useState('2026-12-20');
  const [soutenance_edition, definir_soutenance_edition] = useState<SoutenanceMemoire | null>(
    null
  );
  const [cible_suppression_soutenance, definir_cible_suppression_soutenance] =
    useState<SoutenanceMemoire | null>(null);

  // Partenaire de stage : Création, Édition, Suppression
  const [modale_partenaire_ouverte, definir_modale_partenaire_ouverte] = useState(false);
  const [id_partenaire_edition, definir_id_partenaire_edition] = useState<string | null>(null);
  const [part_entreprise, definir_part_entreprise] = useState('');
  const [part_secteur, definir_part_secteur] = useState('');
  const [part_ville, definir_part_ville] = useState(etablissement_actif.ville);
  const [part_tuteur, definir_part_tuteur] = useState('');
  const [part_telephone, definir_part_telephone] = useState('');
  const [part_places, definir_part_places] = useState(3);
  const [cible_suppression_partenaire, definir_cible_suppression_partenaire] =
    useState<PartenaireStage | null>(null);

  const gerer_attribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id_apprenant_selectionne || !entreprise_selectionnee) return;
    attribuer_stage(id_apprenant_selectionne, entreprise_selectionnee);
  };

  const gerer_creation_soutenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre_memoire.trim() || !id_apprenant_selectionne) return;
    ajouter_soutenance({
      id_apprenant: id_apprenant_selectionne,
      titre: titre_memoire.trim(),
      nom_directeur_memoire: directeur_memoire,
      membres_jury: `${directeur_memoire}, Jury académique`,
      date_soutenance,
      statut: 'PLANIFIEE',
    });
    definir_titre_memoire('');
  };

  const ouvrir_creation_partenaire = () => {
    definir_id_partenaire_edition(null);
    definir_part_entreprise('');
    definir_part_secteur('');
    definir_part_ville(etablissement_actif.ville);
    definir_part_tuteur('');
    definir_part_telephone(etablissement_actif.telephone);
    definir_part_places(3);
    definir_modale_partenaire_ouverte(true);
  };

  const ouvrir_edition_partenaire = (p: PartenaireStage) => {
    definir_id_partenaire_edition(p.id);
    definir_part_entreprise(p.nom_entreprise);
    definir_part_secteur(p.secteur);
    definir_part_ville(p.ville);
    definir_part_tuteur(p.nom_tuteur);
    definir_part_telephone(p.telephone);
    definir_part_places(p.places_disponibles);
    definir_modale_partenaire_ouverte(true);
  };

  const gerer_sauvegarde_partenaire = (e: React.FormEvent) => {
    e.preventDefault();
    if (!part_entreprise.trim()) return;
    const payload = {
      nom_entreprise: part_entreprise.trim(),
      secteur: part_secteur.trim() || 'Services / Technique',
      ville: part_ville.trim() || etablissement_actif.ville,
      nom_tuteur: part_tuteur.trim() || 'Responsable RH',
      telephone: part_telephone.trim() || etablissement_actif.telephone,
      places_disponibles: Math.max(1, Number(part_places) || 1),
    };
    if (id_partenaire_edition) {
      modifier_partenaire_stage(id_partenaire_edition, payload);
    } else {
      ajouter_partenaire_stage({ ...payload, stagiaires_actifs: 0 });
    }
    definir_modale_partenaire_ouverte(false);
    definir_id_partenaire_edition(null);
  };

  const meilleurs_candidats = [...apprenants_etablissement]
    .sort((a, b) => b.moyenne_generale - a.moyenne_generale)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
          {etablissement_actif.type === 'UNIVERSITE'
            ? 'Stages, Mémoires & Soutenances'
            : 'Stages pratiques, Entreprises partenaires & Graduation'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Gestion des entreprises partenaires, conventions de stage et contrôle automatique des
          prérequis de sortie.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Carte className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-display font-bold">Attribuer un stage</h3>
          </div>

          <form onSubmit={gerer_attribution} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">
                {terminologie.apprenant_singulier}
              </label>
              <select
                value={id_apprenant_selectionne}
                onChange={(e) => definir_id_apprenant_selectionne(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {meilleurs_candidats.map((apprenant) => (
                  <option key={apprenant.id} value={apprenant.id}>
                    {apprenant.prenom} {apprenant.nom} ({apprenant.moyenne_generale}/
                    {etablissement_actif.echelle_notation})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Entreprise partenaire</label>
              <select
                value={entreprise_selectionnee}
                onChange={(e) => definir_entreprise_selectionnee(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {partenaires_etablissement.map((partenaire) => (
                  <option key={partenaire.id} value={partenaire.nom_entreprise}>
                    {partenaire.nom_entreprise} ({partenaire.ville})
                  </option>
                ))}
              </select>
            </div>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
            >
              Valider la convention de stage
            </Bouton>
          </form>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-500">
                Entreprises partenaires ({partenaires_etablissement.length})
              </div>
              <Bouton
                type="button"
                variante="secondaire"
                taille="sm"
                onClick={ouvrir_creation_partenaire}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </Bouton>
            </div>
            {partenaires_etablissement.map((partenaire) => (
              <div
                key={partenaire.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{partenaire.nom_entreprise}</span>
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {partenaire.secteur} · {partenaire.ville} · Tuteur : {partenaire.nom_tuteur}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                    {partenaire.telephone} · {partenaire.stagiaires_actifs}/
                    {partenaire.places_disponibles} places
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Bouton
                    type="button"
                    variante="fantome"
                    taille="sm"
                    onClick={() => ouvrir_edition_partenaire(partenaire)}
                    aria-label="Modifier le partenaire"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Bouton>
                  <Bouton
                    type="button"
                    variante="danger"
                    taille="sm"
                    onClick={() => definir_cible_suppression_partenaire(partenaire)}
                    aria-label="Supprimer le partenaire"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Bouton>
                </div>
              </div>
            ))}
          </div>
        </Carte>

        <Carte className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            {etablissement_actif.type === 'UNIVERSITE' ? (
              <GraduationCap className="w-4 h-4 text-slate-400" />
            ) : (
              <Award className="w-4 h-4 text-slate-400" />
            )}
            <h3 className="text-sm font-display font-bold">
              {etablissement_actif.type === 'UNIVERSITE'
                ? 'Mémoires & Soutenances de fin d’études'
                : 'Contrôle automatique de graduation (Notes + Stage + Solde = 0)'}
            </h3>
          </div>

          {etablissement_actif.type === 'UNIVERSITE' ? (
            <div className="space-y-4">
              <form
                onSubmit={gerer_creation_soutenance}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs"
              >
                <input
                  type="text"
                  value={titre_memoire}
                  onChange={(e) => definir_titre_memoire(e.target.value)}
                  placeholder="Titre du mémoire..."
                  className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="date"
                  value={date_soutenance}
                  onChange={(e) => definir_date_soutenance(e.target.value)}
                  className="px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="text"
                  value={directeur_memoire}
                  onChange={(e) => definir_directeur_memoire(e.target.value)}
                  placeholder="Encadreur"
                  className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <Bouton type="submit" variante="secondaire" taille="sm">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Planifier</span>
                </Bouton>
              </form>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {soutenances_etablissement.map((soutenance) => {
                  const apprenant = apprenants_etablissement.find(
                    (a) => a.id === soutenance.id_apprenant
                  );
                  return (
                    <div
                      key={soutenance.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {soutenance.titre}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {apprenant
                            ? `${apprenant.prenom} ${apprenant.nom}`
                            : soutenance.id_apprenant}{' '}
                          · Encadreur : {soutenance.nom_directeur_memoire} ·{' '}
                          {formater_date_fr(soutenance.date_soutenance)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {soutenance.statut === 'SOUTENUE' ? (
                          <span className="font-mono font-bold text-emerald-600 mr-1">
                            Soutenue ({soutenance.note ?? 16}/20)
                          </span>
                        ) : (
                          <Bouton
                            variante="secondaire"
                            taille="sm"
                            onClick={() =>
                              mettre_a_jour_soutenance(soutenance.id, {
                                statut: 'SOUTENUE',
                                note: 16.5,
                              })
                            }
                          >
                            Valider
                          </Bouton>
                        )}
                        <Bouton
                          type="button"
                          variante="fantome"
                          taille="sm"
                          onClick={() => definir_soutenance_edition({ ...soutenance })}
                          aria-label="Modifier la soutenance"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Bouton>
                        <Bouton
                          type="button"
                          variante="danger"
                          taille="sm"
                          onClick={() => definir_cible_suppression_soutenance(soutenance)}
                          aria-label="Supprimer la soutenance"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Bouton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {meilleurs_candidats.map((apprenant) => {
                const notes_valides =
                  apprenant.moyenne_generale >= etablissement_actif.note_passage;
                const stage_valide = Boolean(apprenant.entreprise_stage);
                const solde = Math.max(0, apprenant.total_du_htg - apprenant.total_paye_htg);
                const finances_a_jour = solde === 0;
                const est_eligible = notes_valides && stage_valide && finances_a_jour;

                return (
                  <div
                    key={apprenant.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {apprenant.prenom} {apprenant.nom}{' '}
                        <span className="font-mono text-slate-400">({apprenant.matricule})</span>
                      </div>
                      <div className="text-slate-500 mt-0.5 flex flex-wrap gap-2">
                        <span className={notes_valides ? 'text-emerald-600' : 'text-red-600'}>
                          Notes : {apprenant.moyenne_generale}/{etablissement_actif.echelle_notation}
                        </span>
                        <span>·</span>
                        <span className={stage_valide ? 'text-emerald-600' : 'text-amber-600'}>
                          Stage : {apprenant.entreprise_stage ?? 'Manquant'}
                        </span>
                        <span>·</span>
                        <span className={finances_a_jour ? 'text-emerald-600' : 'text-red-600'}>
                          Solde :{' '}
                          {formater_montant(
                            solde,
                            devise_active,
                            etablissement_actif.taux_change_usd
                          )}
                        </span>
                      </div>
                    </div>
                    {a_permission('documents:emettre') && (
                      <Bouton
                        variante={est_eligible ? 'principal' : 'secondaire'}
                        taille="sm"
                        classe_accent={est_eligible ? theme.bouton_principal : undefined}
                        disabled={!est_eligible}
                        onClick={() =>
                          emettre_document_officiel(apprenant.id, 'Certificat de fin d’études')
                        }
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{est_eligible ? 'Émettre certificat' : 'Prérequis incomplets'}</span>
                      </Bouton>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Carte>
      </div>

      {/* MODALE PARTENAIRE DE STAGE */}
      <Modale
        ouverte={modale_partenaire_ouverte}
        sur_fermeture={() => definir_modale_partenaire_ouverte(false)}
        titre={
          id_partenaire_edition
            ? 'Modifier une entreprise partenaire'
            : 'Ajouter une entreprise partenaire'
        }
        classe_largeur_max="max-w-md"
      >
        <form onSubmit={gerer_sauvegarde_partenaire} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Nom de l’entreprise *</label>
            <input
              type="text"
              required
              value={part_entreprise}
              onChange={(e) => definir_part_entreprise(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Secteur d’activité</label>
              <input
                type="text"
                value={part_secteur}
                onChange={(e) => definir_part_secteur(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Ville</label>
              <input
                type="text"
                value={part_ville}
                onChange={(e) => definir_part_ville(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Nom du tuteur</label>
              <input
                type="text"
                value={part_tuteur}
                onChange={(e) => definir_part_tuteur(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Téléphone</label>
              <input
                type="text"
                value={part_telephone}
                onChange={(e) => definir_part_telephone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Places de stage disponibles</label>
            <input
              type="number"
              min={1}
              value={part_places}
              onChange={(e) => definir_part_places(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_partenaire_ouverte(false)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
            >
              {id_partenaire_edition ? 'Enregistrer' : 'Ajouter'}
            </Bouton>
          </div>
        </form>
      </Modale>

      {/* MODALE ÉDITION SOUTENANCE */}
      <Modale
        ouverte={Boolean(soutenance_edition)}
        sur_fermeture={() => definir_soutenance_edition(null)}
        titre="Modifier la soutenance"
        classe_largeur_max="max-w-md"
      >
        {soutenance_edition && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mettre_a_jour_soutenance(soutenance_edition.id, {
                titre: soutenance_edition.titre,
                nom_directeur_memoire: soutenance_edition.nom_directeur_memoire,
                membres_jury: soutenance_edition.membres_jury,
                date_soutenance: soutenance_edition.date_soutenance,
                statut: soutenance_edition.statut,
                note: soutenance_edition.note,
              });
              definir_soutenance_edition(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1">Titre du mémoire *</label>
              <input
                type="text"
                required
                value={soutenance_edition.titre}
                onChange={(e) =>
                  definir_soutenance_edition({ ...soutenance_edition, titre: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Directeur de mémoire</label>
                <input
                  type="text"
                  value={soutenance_edition.nom_directeur_memoire}
                  onChange={(e) =>
                    definir_soutenance_edition({
                      ...soutenance_edition,
                      nom_directeur_memoire: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Date</label>
                <input
                  type="date"
                  value={soutenance_edition.date_soutenance}
                  onChange={(e) =>
                    definir_soutenance_edition({
                      ...soutenance_edition,
                      date_soutenance: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Statut</label>
                <select
                  value={soutenance_edition.statut}
                  onChange={(e) =>
                    definir_soutenance_edition({
                      ...soutenance_edition,
                      statut: e.target.value as SoutenanceMemoire['statut'],
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="PLANIFIEE">Planifiée</option>
                  <option value="SOUTENUE">Soutenue</option>
                  <option value="AJOURNEE">Ajournée</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Note (/20)</label>
                <input
                  type="number"
                  step="0.25"
                  min={0}
                  max={20}
                  value={soutenance_edition.note ?? ''}
                  onChange={(e) =>
                    definir_soutenance_edition({
                      ...soutenance_edition,
                      note: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Bouton
                type="button"
                variante="secondaire"
                taille="sm"
                onClick={() => definir_soutenance_edition(null)}
              >
                Annuler
              </Bouton>
              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                classe_accent={theme.bouton_principal}
              >
                Enregistrer
              </Bouton>
            </div>
          </form>
        )}
      </Modale>

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression_partenaire)}
        sur_fermeture={() => definir_cible_suppression_partenaire(null)}
        sur_confirmation={() => {
          if (cible_suppression_partenaire) {
            supprimer_partenaire_stage(cible_suppression_partenaire.id);
          }
        }}
        tonalite="danger"
        titre="Supprimer cette entreprise partenaire ?"
        sous_titre={cible_suppression_partenaire?.nom_entreprise}
        description="L’entreprise sera retirée du répertoire des partenaires de stage."
        libelle_confirmation="Supprimer"
      />

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression_soutenance)}
        sur_fermeture={() => definir_cible_suppression_soutenance(null)}
        sur_confirmation={() => {
          if (cible_suppression_soutenance) {
            supprimer_soutenance(cible_suppression_soutenance.id);
          }
        }}
        tonalite="danger"
        titre="Supprimer cette soutenance ?"
        sous_titre={cible_suppression_soutenance?.titre}
        description="Cette soutenance sera définitivement supprimée du planning universitaire."
        libelle_confirmation="Supprimer"
      />
    </div>
  );
};
