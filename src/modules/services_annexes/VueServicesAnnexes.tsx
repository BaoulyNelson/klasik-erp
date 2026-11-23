import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookMarked,
  Bus,
  HeartPulse,
  Package,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { Modale } from '../../composants/interface/Modale';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { utiliserErp } from '../../contexte/ContexteErp';
import { FicheAncienEtudiant, IncidentDiscipline } from '../../modeles/erp';
import { formater_date_fr, formater_montant } from '../../services/service_donnees';

export const VueServicesAnnexes: React.FC = () => {
  const {
    etablissement_actif,
    devise_active,
    utilisateur_actif,
    apprenants_etablissement,
    livres_bibliotheque_etablissement,
    emprunts_bibliotheque_etablissement,
    infirmerie_etablissement,
    discipline_etablissement,
    abonnements_etablissement,
    inventaire_etablissement,
    anciens_etablissement,
    emprunter_livre,
    retourner_livre,
    ajouter_visite_infirmerie,
    supprimer_visite_infirmerie,
    ajouter_incident_discipline,
    supprimer_incident_discipline,
    ajouter_ancien_etudiant,
    modifier_ancien_etudiant,
    supprimer_ancien_etudiant,
    supprimer_abonnement_service,
    basculer_abonnement_service,
    definir_route_active,
  } = utiliserErp();

  const theme = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const [onglet, definir_onglet] = useState<
    'bibliotheque' | 'cantine' | 'infirmerie' | 'discipline' | 'inventaire' | 'anciens'
  >(etablissement_actif.services_actifs.bibliotheque ? 'bibliotheque' : 'infirmerie');

  // Formulaires rapides
  const [id_apprenant_selectionne, definir_id_apprenant_selectionne] = useState(
    apprenants_etablissement[0]?.id ?? ''
  );
  const [motif_sante, definir_motif_sante] = useState('');
  const [soin_sante, definir_soin_sante] = useState('');
  const [description_discipline, definir_description_discipline] = useState('');
  const [sanction_discipline, definir_sanction_discipline] = useState('Avertissement');
  const [gravite_discipline, definir_gravite_discipline] =
    useState<IncidentDiscipline['gravite']>('Mineur');

  // Anciens élèves (Alumni) CRUD + Suppressions annexes
  const [modale_ancien_ouverte, definir_modale_ancien_ouverte] = useState(false);
  const [ancien_edition, definir_ancien_edition] = useState<FicheAncienEtudiant | null>(null);
  const [anc_nom, definir_anc_nom] = useState('');
  const [anc_promo, definir_anc_promo] = useState('2025');
  const [anc_unite, definir_anc_unite] = useState('');
  const [anc_poste, definir_anc_poste] = useState('');
  const [anc_employeur, definir_anc_employeur] = useState('');
  const [anc_ville, definir_anc_ville] = useState(etablissement_actif.ville);
  const [anc_tel, definir_anc_tel] = useState(etablissement_actif.telephone);

  const [cible_suppression, definir_cible_suppression] = useState<{
    type: 'visite' | 'incident' | 'abonnement' | 'ancien';
    id: string;
    titre: string;
  } | null>(null);

  const onglets = useMemo(
    () =>
      [
        {
          id: 'bibliotheque' as const,
          libelle: 'Bibliothèque',
          icone: BookMarked,
          actif: etablissement_actif.services_actifs.bibliotheque,
        },
        {
          id: 'cantine' as const,
          libelle: 'Cantine & Transport',
          icone: Bus,
          actif:
            etablissement_actif.services_actifs.cantine ||
            etablissement_actif.services_actifs.transport,
        },
        {
          id: 'infirmerie' as const,
          libelle: 'Infirmerie',
          icone: HeartPulse,
          actif: etablissement_actif.services_actifs.infirmerie,
        },
        { id: 'discipline' as const, libelle: 'Discipline', icone: ShieldAlert, actif: true },
        { id: 'inventaire' as const, libelle: 'Inventaire', icone: Package, actif: true },
        {
          id: 'anciens' as const,
          libelle: 'Anciens (Alumni)',
          icone: Award,
          actif: etablissement_actif.services_actifs.anciens,
        },
      ].filter((item) => item.actif),
    [etablissement_actif.services_actifs]
  );

  useEffect(() => {
    if (!onglets.some((item) => item.id === onglet) && onglets[0]) {
      definir_onglet(onglets[0].id);
    }
  }, [etablissement_actif.id, onglet, onglets]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Services complémentaires & Vie de campus
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Modules activés pour {etablissement_actif.nom_court} (paramétrables dans Paramètres).
          </p>
        </div>
        <Bouton
          variante="secondaire"
          taille="sm"
          onClick={() => definir_route_active('bibliotheque_materiels')}
        >
          <BookMarked className="w-4 h-4" />
          <span>Ouvrir Bibliothèque & Matériels complet</span>
        </Bouton>
      </div>

      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start w-fit">
        {onglets.map((item) => {
          const Icone = item.icone;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => definir_onglet(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                onglet === item.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Icone className="w-3.5 h-3.5" />
              <span>{item.libelle}</span>
            </button>
          );
        })}
      </div>

      {onglet === 'bibliotheque' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <Carte rembourrage="aucun" className="lg:col-span-7">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-bold">
              Catalogue ({livres_bibliotheque_etablissement.length} titres)
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {livres_bibliotheque_etablissement.map((livre) => (
                <div key={livre.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{livre.titre}</div>
                    <div className="text-slate-500">
                      {livre.auteur} · {livre.categorie} · ISBN {livre.isbn}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono">
                      {livre.exemplaires_disponibles}/{livre.exemplaires_totaux} disp.
                    </span>
                    <Bouton
                      variante="secondaire"
                      taille="sm"
                      disabled={livre.exemplaires_disponibles <= 0 || !id_apprenant_selectionne}
                      onClick={() => emprunter_livre(livre.id, id_apprenant_selectionne)}
                    >
                      Prêter
                    </Bouton>
                  </div>
                </div>
              ))}
            </div>
          </Carte>

          <Carte className="lg:col-span-5 space-y-3">
            <div className="text-sm font-bold">Prêts en cours</div>
            <select
              value={id_apprenant_selectionne}
              onChange={(e) => definir_id_apprenant_selectionne(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {apprenants_etablissement.map((apprenant) => (
                <option key={apprenant.id} value={apprenant.id}>
                  Emprunteur : {apprenant.prenom} {apprenant.nom} ({apprenant.matricule})
                </option>
              ))}
            </select>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {emprunts_bibliotheque_etablissement.map((emprunt) => {
                const livre = livres_bibliotheque_etablissement.find(
                  (b) => b.id === emprunt.id_livre
                );
                const apprenant = apprenants_etablissement.find(
                  (a) => a.id === emprunt.id_apprenant
                );
                return (
                  <div key={emprunt.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{livre?.titre ?? emprunt.id_livre}</div>
                      <div className="text-slate-500">
                        {apprenant
                          ? `${apprenant.prenom} ${apprenant.nom}`
                          : emprunt.id_apprenant}{' '}
                        · Retour prévu {formater_date_fr(emprunt.retour_prevu_le)}
                      </div>
                    </div>
                    {emprunt.retourne_le ? (
                      <span className="text-emerald-600 font-semibold">Retourné</span>
                    ) : (
                      <Bouton
                        variante="secondaire"
                        taille="sm"
                        onClick={() => retourner_livre(emprunt.id)}
                      >
                        Retour
                      </Bouton>
                    )}
                  </div>
                );
              })}
            </div>
          </Carte>
        </div>
      )}

      {onglet === 'cantine' && (
        <Carte className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold">
              Abonnements Cantine & Transport ({etablissement_actif.nom_court})
            </h3>
            <div className="flex gap-2">
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() =>
                  basculer_abonnement_service(
                    id_apprenant_selectionne,
                    'Cantine',
                    3500,
                    'Repas chaud midi (Lun–Ven)'
                  )
                }
              >
                Basculer Cantine
              </Bouton>
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() =>
                  basculer_abonnement_service(
                    id_apprenant_selectionne,
                    'Transport',
                    4000,
                    'Circuit Ligne Nord / Campus Central'
                  )
                }
              >
                Basculer Transport
              </Bouton>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {abonnements_etablissement.map((abonnement) => {
              const apprenant = apprenants_etablissement.find(
                (a) => a.id === abonnement.id_apprenant
              );
              return (
                <div key={abonnement.id} className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-semibold">{abonnement.type_service}</span> ·{' '}
                    {apprenant
                      ? `${apprenant.prenom} ${apprenant.nom}`
                      : abonnement.id_apprenant}{' '}
                    · {abonnement.ligne_ou_formule}
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span>
                      {formater_montant(
                        abonnement.tarif_mensuel_ou_annuel_htg,
                        devise_active,
                        etablissement_actif.taux_change_usd
                      )}
                      /mois ·{' '}
                      <span
                        className={
                          abonnement.actif ? 'text-emerald-600 font-semibold' : 'text-slate-400'
                        }
                      >
                        {abonnement.actif ? 'Actif' : 'Suspendu'}
                      </span>
                    </span>
                    <Bouton
                      variante="danger"
                      taille="sm"
                      onClick={() =>
                        definir_cible_suppression({
                          type: 'abonnement',
                          id: abonnement.id,
                          titre: `${abonnement.type_service} · ${apprenant ? `${apprenant.prenom} ${apprenant.nom}` : abonnement.id_apprenant}`,
                        })
                      }
                      aria-label="Supprimer l'abonnement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Bouton>
                  </div>
                </div>
              );
            })}
          </div>
        </Carte>
      )}

      {onglet === 'infirmerie' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <Carte className="lg:col-span-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold">Enregistrer une consultation</h3>
            <select
              value={id_apprenant_selectionne}
              onChange={(e) => definir_id_apprenant_selectionne(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {apprenants_etablissement.map((apprenant) => (
                <option key={apprenant.id} value={apprenant.id}>
                  {apprenant.prenom} {apprenant.nom} ({apprenant.matricule})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={motif_sante}
              onChange={(e) => definir_motif_sante(e.target.value)}
              placeholder="Motif de visite (ex. Fièvre, blessure mineure)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              value={soin_sante}
              onChange={(e) => definir_soin_sante(e.target.value)}
              placeholder="Soins apportés / Décision"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <Bouton
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
              disabled={!motif_sante.trim()}
              onClick={() => {
                ajouter_visite_infirmerie({
                  id_apprenant: id_apprenant_selectionne,
                  date: new Date().toISOString().slice(0, 10),
                  motif: motif_sante,
                  soin_apporte: soin_sante || 'Repos et surveillance',
                  nom_infirmier: utilisateur_actif.nom_complet,
                });
                definir_motif_sante('');
                definir_soin_sante('');
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter au registre santé</span>
            </Bouton>
          </Carte>

          <Carte className="lg:col-span-7">
            <h3 className="text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
              Passages à l’infirmerie
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs mt-1">
              {infirmerie_etablissement.map((visite) => {
                const apprenant = apprenants_etablissement.find(
                  (a) => a.id === visite.id_apprenant
                );
                return (
                  <div key={visite.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">
                        {apprenant
                          ? `${apprenant.prenom} ${apprenant.nom}`
                          : visite.id_apprenant}{' '}
                        · {visite.motif}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {visite.soin_apporte} · {formater_date_fr(visite.date)}
                      </div>
                    </div>
                    <Bouton
                      variante="danger"
                      taille="sm"
                      onClick={() =>
                        definir_cible_suppression({
                          type: 'visite',
                          id: visite.id,
                          titre: visite.motif,
                        })
                      }
                      aria-label="Supprimer cette consultation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Bouton>
                  </div>
                );
              })}
            </div>
          </Carte>
        </div>
      )}

      {onglet === 'discipline' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <Carte className="lg:col-span-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold">Signaler un incident disciplinaire</h3>
            <select
              value={id_apprenant_selectionne}
              onChange={(e) => definir_id_apprenant_selectionne(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {apprenants_etablissement.map((apprenant) => (
                <option key={apprenant.id} value={apprenant.id}>
                  {apprenant.prenom} {apprenant.nom}
                </option>
              ))}
            </select>
            <select
              value={gravite_discipline}
              onChange={(e) =>
                definir_gravite_discipline(e.target.value as IncidentDiscipline['gravite'])
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Mineur">Mineur</option>
              <option value="Moyen">Moyen</option>
              <option value="Grave">Grave</option>
            </select>
            <input
              type="text"
              value={description_discipline}
              onChange={(e) => definir_description_discipline(e.target.value)}
              placeholder="Faits constatés..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              value={sanction_discipline}
              onChange={(e) => definir_sanction_discipline(e.target.value)}
              placeholder="Mesure / Convocation"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <Bouton
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
              disabled={!description_discipline.trim()}
              onClick={() => {
                ajouter_incident_discipline({
                  id_apprenant: id_apprenant_selectionne,
                  date: new Date().toISOString().slice(0, 10),
                  gravite: gravite_discipline,
                  description: description_discipline,
                  sanction: sanction_discipline,
                  parent_notifie: true,
                });
                definir_description_discipline('');
              }}
            >
              Consigner l’incident
            </Bouton>
          </Carte>

          <Carte className="lg:col-span-7">
            <h3 className="text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
              Registre disciplinaire
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs mt-1">
              {discipline_etablissement.map((incident) => {
                const apprenant = apprenants_etablissement.find(
                  (a) => a.id === incident.id_apprenant
                );
                return (
                  <div key={incident.id} className="py-2.5 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">
                        [{incident.gravite}]{' '}
                        {apprenant
                          ? `${apprenant.prenom} ${apprenant.nom}`
                          : incident.id_apprenant}{' '}
                        · {formater_date_fr(incident.date)}
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        {incident.description} — Mesure : {incident.sanction}
                      </p>
                    </div>
                    <Bouton
                      variante="fantome"
                      taille="sm"
                      title="Supprimer l’incident"
                      onClick={() =>
                        definir_cible_suppression({
                          type: 'incident',
                          id: incident.id,
                          titre: incident.description,
                        })
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Bouton>
                  </div>
                );
              })}
            </div>
          </Carte>
        </div>
      )}

      {onglet === 'inventaire' && (
        <Carte rembourrage="aucun">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-bold">
            Inventaire & Patrimoine ({inventaire_etablissement.length} lots)
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {inventaire_etablissement.map((article) => (
              <div key={article.id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <span className="font-mono text-slate-500 mr-2">{article.code}</span>
                  <span className="font-semibold">{article.nom}</span>
                  <span className="text-slate-500 ml-2">· {article.emplacement}</span>
                </div>
                <span className="font-mono font-bold">
                  {article.quantite} unités ({article.etat})
                </span>
              </div>
            ))}
          </div>
        </Carte>
      )}

      {onglet === 'anciens' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Bouton
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
              onClick={() => {
                definir_ancien_edition(null);
                definir_anc_nom('');
                definir_anc_promo('2025');
                definir_anc_unite('');
                definir_anc_poste('');
                definir_anc_employeur('');
                definir_anc_ville(etablissement_actif.ville);
                definir_anc_tel(etablissement_actif.telephone);
                definir_modale_ancien_ouverte(true);
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un ancien élève / alumni</span>
            </Bouton>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anciens_etablissement.map((ancien) => (
              <Carte key={ancien.id} className="text-xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm">{ancien.nom_complet}</div>
                    <div className="text-slate-500">
                      Promotion {ancien.promotion} · {ancien.nom_unite}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Bouton
                      variante="fantome"
                      taille="sm"
                      onClick={() => {
                        definir_ancien_edition(ancien);
                        definir_anc_nom(ancien.nom_complet);
                        definir_anc_promo(ancien.promotion);
                        definir_anc_unite(ancien.nom_unite);
                        definir_anc_poste(ancien.poste_actuel);
                        definir_anc_employeur(ancien.employeur);
                        definir_anc_ville(ancien.ville);
                        definir_anc_tel(ancien.telephone);
                        definir_modale_ancien_ouverte(true);
                      }}
                      aria-label="Modifier l'ancien élève"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Bouton>
                    <Bouton
                      variante="danger"
                      taille="sm"
                      onClick={() =>
                        definir_cible_suppression({
                          type: 'ancien',
                          id: ancien.id,
                          titre: ancien.nom_complet,
                        })
                      }
                      aria-label="Supprimer l'ancien élève"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Bouton>
                  </div>
                </div>
                <div className="pt-1 font-medium text-indigo-600 dark:text-indigo-400">
                  {ancien.poste_actuel} chez {ancien.employeur} ({ancien.ville})
                </div>
                <div className="font-mono text-slate-400">{ancien.telephone}</div>
              </Carte>
            ))}
          </div>
        </div>
      )}

      {/* MODALE AJOUT / ÉDITION ANCIEN ÉLÈVE */}
      <Modale
        ouverte={modale_ancien_ouverte}
        sur_fermeture={() => definir_modale_ancien_ouverte(false)}
        titre={ancien_edition ? 'Modifier un profil Alumni' : 'Ajouter un ancien élève / Alumni'}
        classe_largeur_max="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!anc_nom.trim()) return;
            const payload = {
              nom_complet: anc_nom.trim(),
              promotion: anc_promo.trim() || '2025',
              nom_unite: anc_unite.trim() || 'Promotion générale',
              poste_actuel: anc_poste.trim() || 'Diplômé',
              employeur: anc_employeur.trim() || 'Indépendant',
              ville: anc_ville.trim() || etablissement_actif.ville,
              telephone: anc_tel.trim() || etablissement_actif.telephone,
            };
            if (ancien_edition) {
              modifier_ancien_etudiant(ancien_edition.id, payload);
            } else {
              ajouter_ancien_etudiant(payload);
            }
            definir_modale_ancien_ouverte(false);
          }}
          className="space-y-3 text-xs"
        >
          <div>
            <label className="block font-semibold mb-1">Nom complet *</label>
            <input
              type="text"
              required
              value={anc_nom}
              onChange={(e) => definir_anc_nom(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Promotion</label>
              <input
                type="text"
                value={anc_promo}
                onChange={(e) => definir_anc_promo(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Filière / Classe</label>
              <input
                type="text"
                value={anc_unite}
                onChange={(e) => definir_anc_unite(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Poste actuel</label>
              <input
                type="text"
                value={anc_poste}
                onChange={(e) => definir_anc_poste(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Employeur</label>
              <input
                type="text"
                value={anc_employeur}
                onChange={(e) => definir_anc_employeur(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Ville</label>
              <input
                type="text"
                value={anc_ville}
                onChange={(e) => definir_anc_ville(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Téléphone</label>
              <input
                type="text"
                value={anc_tel}
                onChange={(e) => definir_anc_tel(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_ancien_ouverte(false)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
            >
              {ancien_edition ? 'Enregistrer' : 'Ajouter'}
            </Bouton>
          </div>
        </form>
      </Modale>

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression)}
        sur_fermeture={() => definir_cible_suppression(null)}
        sur_confirmation={() => {
          if (!cible_suppression) return;
          if (cible_suppression.type === 'visite') supprimer_visite_infirmerie(cible_suppression.id);
          if (cible_suppression.type === 'incident')
            supprimer_incident_discipline(cible_suppression.id);
          if (cible_suppression.type === 'abonnement')
            supprimer_abonnement_service(cible_suppression.id);
          if (cible_suppression.type === 'ancien') supprimer_ancien_etudiant(cible_suppression.id);
        }}
        tonalite="danger"
        titre="Confirmer la suppression ?"
        sous_titre={cible_suppression?.titre}
        description="Cet enregistrement sera définitivement retiré du module."
        libelle_confirmation="Supprimer"
      />
    </div>
  );
};
