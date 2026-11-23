import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileWarning,
  Lock,
  Plus,
  Search,
  Shield,
  UserX,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { utiliserErp } from '../../contexte/ContexteErp';
import { DemandeRgpd } from '../../modeles/erp';

export const VueRgpd: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    apprenants_etablissement,
    notes_etablissement,
    paiements_etablissement,
    documents_etablissement,
    consentements_rgpd_etablissement,
    demandes_rgpd_etablissement,
    mettre_a_jour_consentement_rgpd,
    creer_demande_rgpd,
    traiter_demande_rgpd,
    anonymiser_apprenant_rgpd,
    ajouter_toast,
  } = utiliserErp();

  const theme = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const [onglet_actif, definir_onglet_actif] = useState<'consentements' | 'demandes'>(
    'consentements'
  );
  const [recherche, definir_recherche] = useState('');
  const [cible_anonymisation, definir_cible_anonymisation] = useState<{
    id_demande: string;
    id_apprenant: string;
    nom_apprenant: string;
    matricule: string;
  } | null>(null);

  const [id_apprenant_demande, definir_id_apprenant_demande] = useState<string>(
    apprenants_etablissement[0]?.id ?? ''
  );
  const [type_demande, definir_type_demande] =
    useState<DemandeRgpd['type_demande']>('EXPORT_DONNEES');
  const [observations_demande, definir_observations_demande] = useState('');

  const apprenants_filtres = useMemo(() => {
    const requete = recherche.trim().toLowerCase();
    return apprenants_etablissement.filter(
      (apprenant) =>
        !requete ||
        `${apprenant.prenom} ${apprenant.nom}`.toLowerCase().includes(requete) ||
        apprenant.matricule.toLowerCase().includes(requete)
    );
  }, [apprenants_etablissement, recherche]);

  const statistiques = useMemo(() => {
    const avec_droit_image = consentements_rgpd_etablissement.filter(
      (consentement) => consentement.droit_image
    ).length;
    const demandes_en_attente = demandes_rgpd_etablissement.filter(
      (demande) => demande.statut === 'EN_ATTENTE'
    ).length;
    return {
      total_consentements: consentements_rgpd_etablissement.length,
      avec_droit_image,
      demandes_en_attente,
    };
  }, [consentements_rgpd_etablissement, demandes_rgpd_etablissement]);

  const exporter_json_apprenant = (id_apprenant: string) => {
    const apprenant = apprenants_etablissement.find((element) => element.id === id_apprenant);
    if (!apprenant) return;
    const charge_utile = {
      exporte_le: new Date().toISOString(),
      reglementation: 'RGPD Art. 15 / Portabilité Art. 20',
      etablissement: {
        id: etablissement_actif.id,
        nom: etablissement_actif.nom,
        pays: etablissement_actif.nom_pays,
      },
      profil: apprenant,
      consentements:
        consentements_rgpd_etablissement.find(
          (consentement) => consentement.id_apprenant === id_apprenant
        ) ?? null,
      nombre_notes: notes_etablissement.filter((note) => note.id_apprenant === id_apprenant)
        .length,
      paiements: paiements_etablissement.filter(
        (paiement) => paiement.id_apprenant === id_apprenant
      ),
      documents: documents_etablissement.filter((doc) => doc.id_apprenant === id_apprenant),
    };
    const blob = new Blob([JSON.stringify(charge_utile, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.setAttribute('download', `rgpd_${apprenant.matricule}.json`);
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(url);
    ajouter_toast({
      titre: `Archive RGPD exportée (${apprenant.matricule})`,
      description: 'Fichier JSON conforme à l’Art. 15 & Art. 20 téléchargé.',
      variante: 'success',
    });
  };

  const gerer_creation_demande = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id_apprenant_demande || !observations_demande.trim()) return;
    creer_demande_rgpd({
      id_apprenant: id_apprenant_demande,
      type_demande,
      observations: observations_demande.trim(),
    });
    definir_observations_demande('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Conformité RGPD & Protection des Données Personnelles
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registre des consentements ({terminologie.apprenant_pluriel.toLowerCase()}), droit à
            l’image, portabilité JSON (Art. 15/20) et anonymisation (Art. 17).
          </p>
        </div>

        <div className="flex gap-2">
          <Bouton
            variante={onglet_actif === 'consentements' ? 'principal' : 'secondaire'}
            taille="sm"
            classe_accent={onglet_actif === 'consentements' ? theme.bouton_principal : undefined}
            onClick={() => definir_onglet_actif('consentements')}
          >
            Registre des consentements
          </Bouton>
          <Bouton
            variante={onglet_actif === 'demandes' ? 'principal' : 'secondaire'}
            taille="sm"
            classe_accent={onglet_actif === 'demandes' ? theme.bouton_principal : undefined}
            onClick={() => definir_onglet_actif('demandes')}
          >
            Requêtes & Oubli ({statistiques.demandes_en_attente})
          </Bouton>
        </div>
      </div>

      {/* Indicateurs RGPD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Carte>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Dossiers avec consentement tracé</span>
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-display font-bold tabular-nums">
            {statistiques.total_consentements}{' '}
            <span className="text-sm font-normal text-slate-400">
              / {apprenants_etablissement.length}
            </span>
          </div>
        </Carte>

        <Carte>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Droits à l’image autorisés</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-display font-bold tabular-nums">
            {statistiques.avec_droit_image}
          </div>
        </Carte>

        <Carte>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Requêtes RGPD en attente</span>
            <FileWarning className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-display font-bold tabular-nums">
            {statistiques.demandes_en_attente}
          </div>
        </Carte>
      </div>

      {onglet_actif === 'consentements' ? (
        <Carte rembourrage="aucun">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-display font-bold">
              Matrice des consentements par {terminologie.apprenant_singulier.toLowerCase()}
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={recherche}
                onChange={(e) => definir_recherche(e.target.value)}
                placeholder="Filtrer par nom ou matricule..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/70 dark:bg-slate-800/40">
                  <th className="py-2.5 px-4 font-semibold">
                    {terminologie.apprenant_singulier}
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center">Traitement données</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Droit à l’image</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Accord parental</th>
                  <th className="py-2.5 px-3 font-semibold text-center">SMS / WhatsApp</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Portabilité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {apprenants_filtres.map((apprenant) => {
                  const consentement = consentements_rgpd_etablissement.find(
                    (element) => element.id_apprenant === apprenant.id
                  );
                  const traitement_donnees = consentement?.traitement_donnees ?? true;
                  const droit_image = consentement?.droit_image ?? false;
                  const accord_parental = consentement?.accord_parental ?? true;
                  const consentement_sms_whatsapp = consentement?.consentement_sms_whatsapp ?? false;

                  return (
                    <tr
                      key={apprenant.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {apprenant.prenom} {apprenant.nom}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {apprenant.matricule}
                          {consentement ? ` · MAJ ${consentement.mis_a_jour_le}` : ' · Par défaut'}
                        </div>
                      </td>

                      {(
                        [
                          ['traitement_donnees', traitement_donnees],
                          ['droit_image', droit_image],
                          ['accord_parental', accord_parental],
                          ['consentement_sms_whatsapp', consentement_sms_whatsapp],
                        ] as const
                      ).map(([champ, valeur]) => (
                        <td key={champ} className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              mettre_a_jour_consentement_rgpd(apprenant.id, { [champ]: !valeur })
                            }
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                              valeur
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900'
                                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}
                          >
                            {valeur ? 'Accordé' : 'Refusé'}
                          </button>
                        </td>
                      ))}

                      <td className="py-2.5 px-4 text-right">
                        <Bouton
                          variante="secondaire"
                          taille="sm"
                          onClick={() => exporter_json_apprenant(apprenant.id)}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>JSON</span>
                        </Bouton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Carte>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Carte className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Lock className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-display font-bold">Enregistrer une requête RGPD</h3>
            </div>

            <form onSubmit={gerer_creation_demande} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  {terminologie.apprenant_singulier}
                </label>
                <select
                  value={id_apprenant_demande}
                  onChange={(e) => definir_id_apprenant_demande(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {apprenants_etablissement.map((apprenant) => (
                    <option key={apprenant.id} value={apprenant.id}>
                      {apprenant.prenom} {apprenant.nom} ({apprenant.matricule})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Type de droit exercé</label>
                <select
                  value={type_demande}
                  onChange={(e) =>
                    definir_type_demande(e.target.value as DemandeRgpd['type_demande'])
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="EXPORT_DONNEES">Accès & Portabilité (Art. 15 / 20)</option>
                  <option value="RECTIFICATION">Rectification de fiche (Art. 16)</option>
                  <option value="EFFACEMENT">Droit à l’oubli / Anonymisation (Art. 17)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Motif / Détails *</label>
                <textarea
                  rows={3}
                  required
                  value={observations_demande}
                  onChange={(e) => definir_observations_demande(e.target.value)}
                  placeholder="Ex: Demande écrite du responsable légal reçue au secrétariat..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                classe_accent={theme.bouton_principal}
                className="w-full"
              >
                <Plus className="w-4 h-4" />
                <span>Consigner la requête</span>
              </Bouton>
            </form>
          </Carte>

          <Carte rembourrage="aucun" className="lg:col-span-8">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-display font-bold">
                Journal des demandes d’exercice des droits ({demandes_rgpd_etablissement.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {demandes_rgpd_etablissement.map((demande) => {
                const apprenant = apprenants_etablissement.find(
                  (element) => element.id === demande.id_apprenant
                );

                return (
                  <div key={demande.id} className="px-5 py-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {demande.type_demande}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {apprenant ? `${apprenant.prenom} ${apprenant.nom}` : demande.id_apprenant}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          demande.statut === 'TRAITEE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {demande.statut === 'TRAITEE'
                          ? `Traitée le ${demande.traitee_le}`
                          : 'En attente'}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300">{demande.observations}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-400">
                        Demandée le {demande.demandee_le}
                      </span>

                      <div className="flex flex-wrap gap-2">
                        {apprenant && (
                          <Bouton
                            variante="secondaire"
                            taille="sm"
                            onClick={() => exporter_json_apprenant(apprenant.id)}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Exporter JSON</span>
                          </Bouton>
                        )}

                        {demande.type_demande === 'EFFACEMENT' &&
                          apprenant &&
                          demande.statut === 'EN_ATTENTE' && (
                            <Bouton
                              variante="danger"
                              taille="sm"
                              onClick={() =>
                                definir_cible_anonymisation({
                                  id_demande: demande.id,
                                  id_apprenant: apprenant.id,
                                  nom_apprenant: `${apprenant.prenom} ${apprenant.nom}`,
                                  matricule: apprenant.matricule,
                                })
                              }
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Anonymiser (Art. 17)</span>
                            </Bouton>
                          )}

                        {demande.statut === 'EN_ATTENTE' && (
                          <Bouton
                            variante="principal"
                            taille="sm"
                            classe_accent={theme.bouton_principal}
                            onClick={() => traiter_demande_rgpd(demande.id)}
                          >
                            Marquer traitée
                          </Bouton>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Carte>
        </div>
      )}

      <ModaleConfirmationAction
        ouverte={Boolean(cible_anonymisation)}
        sur_fermeture={() => definir_cible_anonymisation(null)}
        sur_confirmation={() => {
          if (!cible_anonymisation) return;
          anonymiser_apprenant_rgpd(cible_anonymisation.id_apprenant);
          traiter_demande_rgpd(cible_anonymisation.id_demande);
        }}
        tonalite="danger"
        titre="Confirmer l’anonymisation RGPD (Art. 17)"
        sous_titre={
          cible_anonymisation
            ? `${cible_anonymisation.nom_apprenant} · ${cible_anonymisation.matricule}`
            : ''
        }
        description="L’identité, les coordonnées personnelles et les liens familiaux de ce dossier seront définitivement effacés tout en préservant l’intégrité comptable."
        elements_impact={
          cible_anonymisation
            ? [
                {
                  libelle: terminologie.apprenant_singulier,
                  valeur: cible_anonymisation.nom_apprenant,
                },
                { libelle: 'Matricule', valeur: cible_anonymisation.matricule },
                { libelle: 'Statut final', valeur: 'Dossier anonymisé (irréversible)' },
              ]
            : undefined
        }
        note_irreversible="Action irréversible : les données nominatives supprimées ne peuvent plus être récupérées."
        phrase_requise="ANONYMISER"
        libelle_phrase_requise="Pour confirmer l’effacement nominatif, saisissez exactement"
        libelle_confirmation="Anonymiser définitivement"
      />
    </div>
  );
};
