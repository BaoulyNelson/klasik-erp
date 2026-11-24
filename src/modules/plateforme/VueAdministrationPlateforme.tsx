import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  Globe,
  Mail,
  MapPin,
  Palette,
  PauseCircle,
  Phone,
  PlayCircle,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { BadgeTypeEtablissement } from '../../composants/interface/BadgeTypeEtablissement';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { LogoEtablissement } from '../../composants/interface/LogoEtablissement';
import { LogoPlateforme } from '../../composants/interface/LogoPlateforme';
import { Modale } from '../../composants/interface/Modale';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import {
  CATALOGUE_FORFAITS_SAAS,
  TARIFS_MENSUELS_USD_SAAS,
  resoudre_statut_abonnement_saas,
} from '../../configuration/forfaits_saas';
import { utiliserErp } from '../../contexte/ContexteErp';
import {
  ConfigurationEtablissement,
  ConfigurationPlateforme,
  HistoriqueAbonnementSaas,
} from '../../modeles/erp';
import { requeteApi } from '../../services/clientApi';
import { formater_date_fr, formater_montant } from '../../services/service_donnees';
import { traiter_image_logo } from '../../utilitaires/image_logo';

const COULEURS_MARQUE: {
  id: ConfigurationPlateforme['couleur_marque'];
  libelle: string;
  pastille: string;
}[] = [
  { id: 'slate', libelle: 'Anthracite', pastille: 'bg-slate-900' },
  { id: 'indigo', libelle: 'Indigo', pastille: 'bg-indigo-600' },
  { id: 'blue', libelle: 'Bleu Royal', pastille: 'bg-blue-700' },
  { id: 'emerald', libelle: 'Émeraude', pastille: 'bg-emerald-600' },
  { id: 'amber', libelle: 'Ambre', pastille: 'bg-amber-600' },
  { id: 'violet', libelle: 'Violet', pastille: 'bg-violet-600' },
];

export const VueAdministrationPlateforme: React.FC = () => {
  const {
    configuration_plateforme,
    utilisateur_actif,
    mettre_a_jour_configuration_plateforme,
    reinitialiser_configuration_plateforme,
    etablissements,
    tous_les_apprenants,
    tous_les_paiements,
    tous_les_documents,
    changer_etablissement,
    mettre_a_jour_etablissement,
    basculer_statut_etablissement,
    supprimer_etablissement,
    definir_modale_nouvel_etablissement_ouverte,
    definir_route_active,
    ajouter_toast,
  } = utiliserErp();

  const [onglet_actif, definir_onglet_actif] = useState<'reseau' | 'marque'>('reseau');
  const [recherche_verification, definir_recherche_verification] = useState('');
  const [recherche_etablissements, definir_recherche_etablissements] = useState('');
  const [cible_suppression, definir_cible_suppression] =
    useState<ConfigurationEtablissement | null>(null);
  const [cible_suspension, definir_cible_suspension] =
    useState<ConfigurationEtablissement | null>(null);
  const [cible_supervision, definir_cible_supervision] =
    useState<ConfigurationEtablissement | null>(null);
  const [cible_details, definir_cible_details] =
    useState<ConfigurationEtablissement | null>(null);
  const [historique_forfaits, definir_historique_forfaits] =
    useState<HistoriqueAbonnementSaas[]>([]);
  const [chargement_historique, definir_chargement_historique] = useState(false);
  const [erreur_historique, definir_erreur_historique] = useState<string | null>(null);
  const [confirmation_reinit_marque, definir_confirmation_reinit_marque] = useState(false);
  const ref_champ_logo = useRef<HTMLInputElement>(null);

  const [ebauche, definir_ebauche] = useState<ConfigurationPlateforme>(configuration_plateforme);
  const peut_consulter_donnees_metier = utilisateur_actif.affiliations.length > 0;

  useEffect(() => {
    definir_ebauche(configuration_plateforme);
  }, [configuration_plateforme]);

  useEffect(() => {
    let effet_actif = true;
    void requeteApi<ConfigurationPlateforme>('/plateforme/configuration/')
      .then((configuration) => {
        if (!effet_actif) return;
        definir_ebauche({
          ...configuration,
          url_logo: configuration.url_logo || undefined,
        });
      })
      .catch(() => {
        // Conserver le brouillon déjà chargé dans le contexte si l’API est temporairement indisponible.
      });
    return () => {
      effet_actif = false;
    };
  }, []);

  useEffect(() => {
    if (!cible_details) {
      definir_historique_forfaits([]);
      definir_erreur_historique(null);
      return;
    }

    let effet_actif = true;
    definir_chargement_historique(true);
    definir_erreur_historique(null);
    void requeteApi<{ historique_forfaits_saas: HistoriqueAbonnementSaas[] }>(
      `/plateforme/etablissements/${encodeURIComponent(cible_details.id)}/`
    )
      .then(({ historique_forfaits_saas }) => {
        if (effet_actif) definir_historique_forfaits(historique_forfaits_saas);
      })
      .catch((erreur: unknown) => {
        if (effet_actif) {
          definir_erreur_historique(
            erreur instanceof Error
              ? erreur.message
              : 'Impossible de charger l’historique du forfait.'
          );
        }
      })
      .finally(() => {
        if (effet_actif) definir_chargement_historique(false);
      });

    return () => {
      effet_actif = false;
    };
  }, [cible_details]);

  const indicateurs = useMemo(() => {
    const nombre_pays = new Set(etablissements.map((etab) => etab.code_pays)).size;
    const total_apprenants = tous_les_apprenants.length;
    const revenu_mensuel_usd = etablissements.reduce((somme, etab) => {
      if (resoudre_statut_abonnement_saas(etab) !== 'PAYE') return somme;
      return somme + TARIFS_MENSUELS_USD_SAAS[etab.offre_saas];
    }, 0);
    const total_encaisse_pivot = tous_les_paiements
      .filter((paiement) => paiement.statut === 'VALIDE')
      .reduce((somme, paiement) => somme + paiement.montant_htg, 0);
    return { nombre_pays, total_apprenants, revenu_mensuel_usd, total_encaisse_pivot };
  }, [etablissements, tous_les_apprenants, tous_les_paiements]);

  const document_correspondant = useMemo(() => {
    const requete = recherche_verification.trim().toLowerCase();
    if (!requete) return null;
    return (
      tous_les_documents.find(
        (doc) =>
          doc.empreinte_verification.toLowerCase() === requete ||
          doc.numero_document.toLowerCase() === requete
      ) ?? null
    );
  }, [recherche_verification, tous_les_documents]);

  const etablissements_filtres = useMemo(() => {
    const requete = recherche_etablissements.trim().toLocaleLowerCase();
    if (!requete) return etablissements;
    return etablissements.filter((etab) => {
      const administrateurs = (etab.administrateurs_affilies ?? [])
        .flatMap((admin) => [admin.nom, admin.courriel])
        .join(' ');
      return [
        etab.nom,
        etab.ville,
        etab.nom_pays,
        etab.code_pays,
        etab.proprietaire_nom,
        etab.proprietaire_courriel,
        administrateurs,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(requete);
    });
  }, [etablissements, recherche_etablissements]);

  const gerer_fichier_logo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    try {
      const url_donnees = await traiter_image_logo(fichier, 256);
      definir_ebauche((precedent) => ({ ...precedent, url_logo: url_donnees }));
      mettre_a_jour_configuration_plateforme({ url_logo: url_donnees });
    } catch (erreur) {
      ajouter_toast({
        titre: erreur instanceof Error ? erreur.message : 'Impossible de charger ce logo',
        variante: 'error',
      });
    } finally {
      if (ref_champ_logo.current) ref_champ_logo.current.value = '';
    }
  };

  const gerer_enregistrement_plateforme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ebauche.nom_plateforme.trim()) return;
    mettre_a_jour_configuration_plateforme({
      ...ebauche,
      nom_plateforme: ebauche.nom_plateforme.trim(),
      initiales_logo: (
        ebauche.initiales_logo.trim() ||
        ebauche.nom_plateforme.trim()[0] ||
        'K'
      ).toUpperCase(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Console SaaS Multi-Pays & Configuration Plateforme
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pilotage global des établissements hébergés, marque blanche (nom, logo, slogan,
            coordonnées) et vérification universelle de diplômes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Bouton
            variante={onglet_actif === 'reseau' ? 'principal' : 'secondaire'}
            taille="sm"
            onClick={() => definir_onglet_actif('reseau')}
          >
            <Globe className="w-4 h-4" />
            <span>Réseau ({etablissements.length})</span>
          </Bouton>
          <Bouton
            variante={onglet_actif === 'marque' ? 'principal' : 'secondaire'}
            taille="sm"
            onClick={() => definir_onglet_actif('marque')}
          >
            <Palette className="w-4 h-4" />
            <span>Identité & Marque blanche</span>
          </Bouton>
          <Bouton
            variante="secondaire"
            taille="sm"
            onClick={() => definir_modale_nouvel_etablissement_ouverte(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Déployer un établissement</span>
          </Bouton>
        </div>
      </div>

      {cible_supervision && (
        <div
          role="status"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30"
        >
          <div>
            <p className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">
              Supervision plateforme · {cible_supervision.nom}
            </p>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80 mt-1">
              Vue limitée aux informations d’établissement et d’abonnement. Les apprenants, notes,
              paiements et données de paie restent inaccessibles sans affiliation explicite.
            </p>
          </div>
          <Bouton
            variante="secondaire"
            taille="sm"
            onClick={() => definir_cible_supervision(null)}
          >
            Quitter la supervision
          </Bouton>
        </div>
      )}

      {onglet_actif === 'reseau' ? (
        <>
          {/* Indicateurs plateforme mondiale */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Carte>
              <div className="text-xs text-slate-500">Établissements actifs</div>
              <div className="text-2xl font-display font-bold mt-1 tabular-nums">
                {etablissements.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Déployés dans {indicateurs.nombre_pays} pays
              </div>
            </Carte>
            <Carte>
              <div className="text-xs text-slate-500">Apprenants hébergés</div>
              <div className="text-2xl font-display font-bold mt-1 tabular-nums">
                {peut_consulter_donnees_metier ? indicateurs.total_apprenants : '—'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {peut_consulter_donnees_metier
                  ? 'Données des établissements affiliés uniquement'
                  : 'Non consultables sans affiliation'}
              </div>
            </Carte>
            <Carte>
              <div className="text-xs text-slate-500">MRR Plateforme (estimé)</div>
              <div className="text-2xl font-display font-bold mt-1 font-mono tabular-nums text-emerald-600">
                {indicateurs.revenu_mensuel_usd.toLocaleString('fr-FR')} USD / mois
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Facturation multi-devises SaaS</div>
            </Carte>
            <Carte>
              <div className="text-xs text-slate-500">Volume encaissé consolidé</div>
              <div className="text-2xl font-display font-bold mt-1 font-mono tabular-nums">
                {peut_consulter_donnees_metier
                  ? formater_montant(indicateurs.total_encaisse_pivot, 'USD')
                  : '—'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {peut_consulter_donnees_metier
                  ? 'Données des établissements affiliés uniquement'
                  : 'Non consultable sans affiliation'}
              </div>
            </Carte>
          </div>

          {/* Tableau consolidé des établissements dans le monde */}
          <Carte rembourrage="aucun">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-display font-bold">
                  Réseau mondial des établissements ({etablissements_filtres.length}
                  {etablissements_filtres.length !== etablissements.length
                    ? ` / ${etablissements.length}`
                    : ''}
                  )
                </h3>
              </div>
              <div className="relative w-full max-w-xl">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={recherche_etablissements}
                  onChange={(e) => definir_recherche_etablissements(e.target.value)}
                  placeholder="Rechercher par établissement, ville, pays, propriétaire ou courriel…"
                  aria-label="Rechercher un établissement ou son responsable"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-slate-500">
                    <th className="px-4 py-2.5 text-left font-semibold">Établissement</th>
                    <th className="px-4 py-2.5 text-left font-semibold">
                      Propriétaire / Responsable
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold">Pays & Fuseau</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Tutelle / Norme</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Devise</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Apprenants</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Statut</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Plan SaaS</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {etablissements_filtres.map((etab) => {
                    const est_affilie = utilisateur_actif.affiliations.some(
                      (affiliation) => affiliation.id_etablissement === etab.id
                    );
                    const effectif =
                      etab.nombre_apprenants_total ??
                      (est_affilie
                        ? tous_les_apprenants.filter(
                            (apprenant) => apprenant.id_etablissement === etab.id
                          ).length
                        : 0);
                    return (
                      <tr key={etab.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <LogoEtablissement
                              type={etab.type}
                              code={etab.code}
                              url_logo={etab.url_logo}
                              nom={etab.nom}
                              taille="petit"
                            />
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {etab.nom}
                              </div>
                              <div className="mt-0.5">
                                <BadgeTypeEtablissement type={etab.type} compact />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 min-w-56">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {etab.proprietaire_nom || etab.nom_direction || 'Responsable à renseigner'}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                est_affilie
                                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {est_affilie ? 'Votre compte' : 'Client'}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {etab.proprietaire_courriel || etab.courriel || '—'}
                          </div>
                          {etab.proprietaire_telephone && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {etab.proprietaire_telephone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {etab.nom_pays} ({etab.code_pays}) · {etab.ville}
                          </div>
                          <div className="text-[11px] text-slate-500">{etab.fuseau_horaire}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {etab.autorite_tutelle}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold">{etab.devise_defaut}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                          {effectif}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              etab.statut === 'SUSPENDU'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            {etab.statut === 'SUSPENDU' ? 'Suspendu' : 'Actif'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <select
                              value={etab.offre_saas}
                              onChange={(e) => {
                                const nouvelle_offre = e.target
                                  .value as ConfigurationEtablissement['offre_saas'];
                                mettre_a_jour_etablissement(etab.id, {
                                  offre_saas: nouvelle_offre,
                                  statut_abonnement_saas:
                                    nouvelle_offre === 'Gratuit'
                                      ? 'GRATUIT'
                                      : etab.statut_abonnement_saas === 'GRATUIT' ||
                                          !etab.statut_abonnement_saas
                                        ? 'PAYE'
                                        : etab.statut_abonnement_saas,
                                });
                              }}
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                            >
                              {CATALOGUE_FORFAITS_SAAS.map((f) => (
                                <option key={f.nom} value={f.nom}>
                                  {f.nom} ({f.libelle_prix})
                                </option>
                              ))}
                            </select>
                            {etab.offre_saas !== 'Gratuit' && (
                              <select
                                value={resoudre_statut_abonnement_saas(etab)}
                                onChange={(e) =>
                                  mettre_a_jour_etablissement(etab.id, {
                                    statut_abonnement_saas: e.target.value as NonNullable<
                                      ConfigurationEtablissement['statut_abonnement_saas']
                                    >,
                                  })
                                }
                                className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[11px]"
                              >
                                <option value="PAYE">Payé</option>
                                <option value="ESSAI_14J">Essai 14j (non payé)</option>
                                <option value="EN_ATTENTE_PAIEMENT">En attente paiement</option>
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {utilisateur_actif.affiliations.some(
                              (affiliation) => affiliation.id_etablissement === etab.id
                            ) ? (
                              <Bouton
                                variante="secondaire"
                                taille="sm"
                                onClick={() => {
                                  changer_etablissement(etab.id);
                                  definir_route_active('tableau_de_bord');
                                }}
                              >
                                <span>Ouvrir mon établissement</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Bouton>
                            ) : (
                              <Bouton
                                variante="secondaire"
                                taille="sm"
                                onClick={() => definir_cible_supervision(etab)}
                              >
                                <span>Superviser</span>
                              </Bouton>
                            )}
                            <Bouton
                              variante="fantome"
                              taille="sm"
                              title={`Consulter les détails client de ${etab.nom}`}
                              onClick={() => definir_cible_details(etab)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Détails client</span>
                            </Bouton>
                            <Bouton
                              variante={etab.statut === 'SUSPENDU' ? 'principal' : 'fantome'}
                              taille="sm"
                              title={
                                etab.statut === 'SUSPENDU'
                                  ? `Réactiver ${etab.nom_court}`
                                  : `Suspendre ${etab.nom_court}`
                              }
                              onClick={() => {
                                if (etab.statut === 'SUSPENDU') {
                                  basculer_statut_etablissement(etab.id);
                                } else {
                                  definir_cible_suspension(etab);
                                }
                              }}
                            >
                              {etab.statut === 'SUSPENDU' ? (
                                <>
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>Réactiver</span>
                                </>
                              ) : (
                                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                              )}
                            </Bouton>
                            <Bouton
                              variante="fantome"
                              taille="sm"
                              disabled={etablissements.length <= 1}
                              title={
                                etablissements.length <= 1
                                  ? 'Au moins un établissement doit rester actif'
                                  : `Supprimer ${etab.nom_court}`
                              }
                              onClick={() => definir_cible_suppression(etab)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Bouton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {etablissements_filtres.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400"
                      >
                        Aucun établissement ne correspond à cette recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Carte>

          {/* Portail universel de vérification QR multi-établissements */}
          <Carte className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-display font-bold">
                Vérificateur mondial d’authenticité des diplômes & relevés
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={recherche_verification}
                  onChange={(e) => definir_recherche_verification(e.target.value)}
                  placeholder="Saisissez un code QR (ex. SN-ISPD-31F8C2, FR-LHI-66B9A1, HT-IUT-72E0B5)..."
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            {document_correspondant && (
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-900 dark:text-emerald-200">
                    Document authentique certifié · {document_correspondant.type_document} (
                    {document_correspondant.numero_document})
                  </div>
                  <div className="text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Émis par{' '}
                    {
                      etablissements.find(
                        (etab) => etab.id === document_correspondant.id_etablissement
                      )?.nom
                    }{' '}
                    (
                    {
                      etablissements.find(
                        (etab) => etab.id === document_correspondant.id_etablissement
                      )?.nom_pays
                    }
                    ) le {formater_date_fr(document_correspondant.emis_le)} · Signataire :{' '}
                    {document_correspondant.emis_par}
                  </div>
                </div>
              </div>
            )}
          </Carte>
        </>
      ) : (
        /* Onglet 2 : Configuration Marque Blanche de la plateforme SaaS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={gerer_enregistrement_plateforme} className="lg:col-span-8 space-y-6">
            <Carte className="space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-display font-bold">
                    Identité visuelle & Marque blanche SaaS
                  </h3>
                </div>
                <Bouton
                  type="button"
                  variante="fantome"
                  taille="sm"
                  onClick={() => definir_confirmation_reinit_marque(true)}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser</span>
                </Bouton>
              </div>

              {/* Téléversement Logo + Couleur */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                <LogoPlateforme configuration={ebauche} taille="grand" />
                <div className="flex-1 space-y-2">
                  <div className="text-xs font-semibold">Logo officiel de la plateforme</div>
                  <div className="flex flex-wrap items-center gap-2">
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
                      <span>{ebauche.url_logo ? 'Changer le logo' : 'Importer un logo'}</span>
                    </Bouton>
                    {ebauche.url_logo && (
                      <Bouton
                        type="button"
                        variante="fantome"
                        taille="sm"
                        onClick={() => {
                          definir_ebauche((precedent) => ({ ...precedent, url_logo: undefined }));
                          mettre_a_jour_configuration_plateforme({ url_logo: undefined });
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span>Retirer</span>
                      </Bouton>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    PNG, SVG, JPG ou WebP. En l’absence de logo image, le monogramme et la couleur
                    ci-dessous sont affichés.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Nom de la plateforme *</label>
                  <input
                    type="text"
                    required
                    value={ebauche.nom_plateforme}
                    onChange={(e) =>
                      definir_ebauche({ ...ebauche, nom_plateforme: e.target.value })
                    }
                    placeholder="Ex: EduNova Cloud, CampusSuite..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Sous-titre court</label>
                  <input
                    type="text"
                    value={ebauche.accroche_courte}
                    onChange={(e) =>
                      definir_ebauche({ ...ebauche, accroche_courte: e.target.value })
                    }
                    placeholder="Ex: SaaS Éducatif Multi-Établissements"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Monogramme (1 à 3 lettres)</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={ebauche.initiales_logo}
                    onChange={(e) =>
                      definir_ebauche({
                        ...ebauche,
                        initiales_logo: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Couleur du badge marque</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {COULEURS_MARQUE.map((couleur) => (
                      <button
                        key={couleur.id}
                        type="button"
                        onClick={() => definir_ebauche({ ...ebauche, couleur_marque: couleur.id })}
                        title={couleur.libelle}
                        className={`w-7 h-7 rounded-lg ${couleur.pastille} cursor-pointer transition-transform ${
                          ebauche.couleur_marque === couleur.id
                            ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 dark:ring-offset-slate-900'
                            : 'opacity-75 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">Slogan / Bandeau d’accroche</label>
                  <input
                    type="text"
                    value={ebauche.slogan}
                    onChange={(e) => definir_ebauche({ ...ebauche, slogan: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">
                    Titre principal de la page d’accueil
                  </label>
                  <input
                    type="text"
                    value={ebauche.titre_banniere}
                    onChange={(e) =>
                      definir_ebauche({ ...ebauche, titre_banniere: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">
                    Présentation affichée dans le pied de page
                  </label>
                  <textarea
                    rows={2}
                    value={ebauche.resume_pied_page ?? ''}
                    onChange={(e) =>
                      definir_ebauche({ ...ebauche, resume_pied_page: e.target.value })
                    }
                    placeholder="Description institutionnelle de la plateforme affichée dans le pied de page public..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
            </Carte>

            <Carte className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Building2 className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-display font-bold">
                  Coordonnées de l’opérateur & Support SaaS (Pied de page)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <p className="sm:col-span-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Les coordonnées laissées vides ne sont pas affichées sur le site public.
                  Renseignez uniquement des informations réelles et vérifiées.
                </p>
                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">Raison sociale / Éditeur</label>
                  <input
                    type="text"
                    value={ebauche.entite_legale}
                    onChange={(e) => definir_ebauche({ ...ebauche, entite_legale: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Courriel de support</label>
                  <input
                    type="email"
                    value={ebauche.courriel_support}
                    onChange={(e) =>
                      definir_ebauche({ ...ebauche, courriel_support: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Téléphone / Hotline</label>
                  <input
                    type="text"
                    value={ebauche.telephone_support}
                    onChange={(e) =>
                      definir_ebauche({ ...ebauche, telephone_support: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Site web officiel</label>
                  <input
                    type="url"
                    value={ebauche.site_web}
                    onChange={(e) => definir_ebauche({ ...ebauche, site_web: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Bureaux / Siège</label>
                  <input
                    type="text"
                    value={ebauche.adresse_siege}
                    onChange={(e) => definir_ebauche({ ...ebauche, adresse_siege: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">Horaires d’assistance support</label>
                  <input
                    type="text"
                    value={ebauche.horaires_support ?? ''}
                    onChange={(e) =>
                      definir_ebauche({ ...ebauche, horaires_support: e.target.value })
                    }
                    placeholder="Ex: Lun–Sam · 07h30–18h00 (GMT-5 / GMT+1)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div className="sm:col-span-2 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ebauche.autoriser_creation_autonome}
                      onChange={(e) =>
                        definir_ebauche({
                          ...ebauche,
                          autoriser_creation_autonome: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300"
                    />
                    <span className="font-medium">
                      Autoriser la création libre d’établissement depuis la page d’accueil publique
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Bouton type="submit" variante="principal" taille="sm">
                  <Save className="w-4 h-4" />
                  <span>Enregistrer la configuration plateforme</span>
                </Bouton>
              </div>
            </Carte>
          </form>

          {/* Aperçu temps réel */}
          <Carte className="lg:col-span-4 space-y-4">
            <div className="text-xs font-semibold text-slate-400">
              Aperçu en direct (Barre latérale & Page d’accueil)
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 bg-slate-50/70 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
                <LogoPlateforme configuration={ebauche} taille="moyen" />
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm truncate">
                    {ebauche.nom_plateforme || 'Nom Plateforme'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {ebauche.accroche_courte}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  {ebauche.slogan}
                </span>
                <div className="text-sm font-display font-bold leading-snug">
                  {ebauche.titre_banniere}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-500">
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  {ebauche.entite_legale}
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{ebauche.courriel_support}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{ebauche.telephone_support}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{ebauche.adresse_siege}</span>
                </div>
              </div>
            </div>
          </Carte>
        </div>
      )}

      <Modale
        ouverte={Boolean(cible_details)}
        sur_fermeture={() => definir_cible_details(null)}
        titre="Détails client"
        sous_titre={cible_details?.nom}
        classe_largeur_max="max-w-3xl"
      >
        {cible_details && (
          <div className="space-y-5 text-xs">
            <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {cible_details.proprietaire_nom ||
                        cible_details.nom_direction ||
                        'Responsable à renseigner'}
                    </h3>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        utilisateur_actif.affiliations.some(
                          (affiliation) =>
                            affiliation.id_etablissement === cible_details.id
                        )
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {utilisateur_actif.affiliations.some(
                        (affiliation) =>
                          affiliation.id_etablissement === cible_details.id
                      )
                        ? 'Votre compte'
                        : 'Client'}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 text-slate-600 dark:text-slate-300">
                    <div className="flex min-w-0 items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {cible_details.proprietaire_courriel ||
                          cible_details.courriel ||
                          'Courriel non renseigné'}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>
                        {cible_details.proprietaire_telephone ||
                          cible_details.telephone ||
                          'Téléphone non renseigné'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {[cible_details.ville, cible_details.nom_pays]
                          .filter(Boolean)
                          .join(', ') || 'Localisation non renseignée'}
                      </span>
                    </div>
                    {cible_details.cree_le && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Clock3 className="h-3.5 w-3.5 shrink-0" />
                        <span>Créé le {formater_date_fr(cible_details.cree_le)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Responsables affiliés
                </h3>
                <span className="text-[11px] text-slate-500">
                  {cible_details.administrateurs_affilies?.length ?? 0}
                </span>
              </div>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {(cible_details.administrateurs_affilies ?? []).length > 0 ? (
                  cible_details.administrateurs_affilies?.map((administrateur) => (
                    <div
                      key={`${administrateur.role}-${administrateur.courriel}`}
                      className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {administrateur.nom}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {administrateur.courriel}
                        </div>
                      </div>
                      <span className="w-fit rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {administrateur.role === 'DIRECTEUR'
                          ? 'Directeur'
                          : 'Administrateur'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    Aucun directeur ou administrateur affilié.
                  </p>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                Forfait SaaS
              </h3>
              <div className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-800">
                <div>
                  <div className="text-[11px] text-slate-500">Offre actuelle</div>
                  <div className="mt-0.5 font-semibold">{cible_details.offre_saas}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Statut</div>
                  <div className="mt-0.5 font-semibold">
                    {resoudre_statut_abonnement_saas(cible_details)}
                  </div>
                </div>
                {cible_details.date_fin_essai_saas && (
                  <div>
                    <div className="text-[11px] text-slate-500">Fin d’essai</div>
                    <div className="mt-0.5">
                      {formater_date_fr(cible_details.date_fin_essai_saas)}
                    </div>
                  </div>
                )}
                {cible_details.reference_paiement_saas && (
                  <div>
                    <div className="text-[11px] text-slate-500">Référence de paiement</div>
                    <div className="mt-0.5 font-mono">
                      {cible_details.reference_paiement_saas}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <Clock3 className="h-3.5 w-3.5 text-indigo-600" />
                Historique du forfait
              </h3>
              {chargement_historique ? (
                <p className="text-slate-500 dark:text-slate-400">
                  Chargement de l’historique…
                </p>
              ) : erreur_historique ? (
                <p role="alert" className="text-red-600 dark:text-red-400">
                  {erreur_historique}
                </p>
              ) : historique_forfaits.length > 0 ? (
                <ol className="space-y-2">
                  {historique_forfaits.map((entree) => (
                    <li
                      key={entree.id}
                      className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">{entree.offre_saas}</span>
                        <span className="text-[11px] text-slate-500">
                          {formater_date_fr(entree.cree_le)}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {entree.statut_abonnement_saas || 'Statut non précisé'}
                        {entree.date_fin_essai_saas
                          ? ` · Fin d’essai : ${formater_date_fr(entree.date_fin_essai_saas)}`
                          : ''}
                        {entree.modifie_par ? ` · Modifié par ${entree.modifie_par}` : ''}
                      </div>
                      {entree.reference_paiement_saas && (
                        <div className="mt-1 font-mono text-[10px] text-slate-500">
                          Réf. {entree.reference_paiement_saas}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">
                  Aucun changement de forfait enregistré.
                </p>
              )}
            </section>
          </div>
        )}
      </Modale>

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression)}
        sur_fermeture={() => definir_cible_suppression(null)}
        sur_confirmation={() =>
          cible_suppression ? supprimer_etablissement(cible_suppression.id) : false
        }
        tonalite="danger"
        titre={`Supprimer définitivement ${cible_suppression?.nom_court ?? ''}`}
        sous_titre={`${cible_suppression?.nom ?? ''} · Code ${cible_suppression?.code ?? ''}`}
        description="Cette opération supprime l’établissement du réseau SaaS et purge l’intégralité de ses dossiers apprenants, paiements et documents."
        elements_impact={
          cible_suppression
            ? [
                {
                  libelle: 'Pays & Devise',
                  valeur: `${cible_suppression.nom_pays} (${cible_suppression.devise_defaut})`,
                },
                {
                  libelle: 'Apprenants supprimés',
                  valeur: tous_les_apprenants.filter(
                    (apprenant) => apprenant.id_etablissement === cible_suppression.id
                  ).length,
                },
                {
                  libelle: 'Transactions & Reçus',
                  valeur: tous_les_paiements.filter(
                    (paiement) => paiement.id_etablissement === cible_suppression.id
                  ).length,
                },
                {
                  libelle: 'Documents officiels',
                  valeur: tous_les_documents.filter(
                    (doc) => doc.id_etablissement === cible_suppression.id
                  ).length,
                },
              ]
            : undefined
        }
        note_irreversible="Suppression permanente et irréversible sur l’ensemble de la base multi-établissements."
        phrase_requise={cible_suppression?.code}
        libelle_phrase_requise="Pour confirmer la suppression, saisissez le code de l’établissement"
        libelle_confirmation="Supprimer définitivement"
      />

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suspension)}
        sur_fermeture={() => definir_cible_suspension(null)}
        sur_confirmation={() =>
          cible_suspension ? basculer_statut_etablissement(cible_suspension.id) : false
        }
        tonalite="avertissement"
        titre={`Suspendre ${cible_suspension?.nom_court ?? ''}`}
        sous_titre={`${cible_suspension?.nom ?? ''} · Code ${cible_suspension?.code ?? ''}`}
        description="Tous les utilisateurs de cet établissement (hors Super Admin) verront immédiatement un écran de blocage opérationnel jusqu’à réactivation."
        note_irreversible="Les données restent intégralement conservées et peuvent être réactivées à tout moment."
        libelle_confirmation="Suspendre l’établissement"
      />

      <ModaleConfirmationAction
        ouverte={confirmation_reinit_marque}
        sur_fermeture={() => definir_confirmation_reinit_marque(false)}
        sur_confirmation={reinitialiser_configuration_plateforme}
        tonalite="avertissement"
        titre="Réinitialiser l’identité marque blanche"
        sous_titre={configuration_plateforme.nom_plateforme}
        description="Le nom de la plateforme, le logo personnalisé, le slogan et les coordonnées opérateur seront remis à leurs valeurs par défaut."
        note_irreversible="Votre logo téléversé et vos textes personnalisés actuels seront perdus."
        libelle_confirmation="Réinitialiser la marque"
      />
    </div>
  );
};
