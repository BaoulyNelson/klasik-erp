import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Printer,
  UserPlus,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import {
  declencher_impression_ciblee,
  FicheInscriptionImprimable,
} from '../../composants/interface/FicheInscriptionImprimable';
import { Modale } from '../../composants/interface/Modale';
import {
  ColonneTableauDonnees,
  TableauDonnees,
} from '../../composants/interface/TableauDonnees';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { PROFILS_PAYS } from '../../configuration/regions_devises';
import { utiliserErp } from '../../contexte/ContexteErp';
import { Apprenant, ContactTuteur } from '../../modeles/erp';
import { formater_montant } from '../../services/service_donnees';
import { VueDossier360 } from '../apprenants/VueDossier360';

export const VueAnnuaireApprenants: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    devise_active,
    definir_route_active,
    apprenants_etablissement,
    inscriptions_etablissement,
    unites_etablissement,
    id_apprenant_selectionne,
    ouvrir_dossier_apprenant,
    inscrire_apprenant,
    a_permission,
  } = utiliserErp();

  const [filtre_paiement, definir_filtre_paiement] = useState<
    'TOUS' | Apprenant['statut_paiement']
  >('TOUS');
  const [filtre_unite, definir_filtre_unite] = useState<string>('TOUTES');

  // Modale permanente de fiche d'inscription
  const [apprenant_fiche, definir_apprenant_fiche] = useState<Apprenant | null>(null);
  const [format_fiche, definir_format_fiche] = useState<'a4' | '80mm'>('a4');

  // Modale d'ajout direct depuis le répertoire
  const profil_pays = PROFILS_PAYS[etablissement_actif.code_pays] ?? PROFILS_PAYS.INTL;
  const [modale_ajout_ouverte, definir_modale_ajout_ouverte] = useState(false);
  const [aj_prenom, definir_aj_prenom] = useState('');
  const [aj_nom, definir_aj_nom] = useState('');
  const [aj_sexe, definir_aj_sexe] = useState<'F' | 'M'>('F');
  const [aj_date_naissance, definir_aj_date_naissance] = useState('2006-01-15');
  const [aj_lieu_naissance, definir_aj_lieu_naissance] = useState(profil_pays.ville_defaut);
  const [aj_telephone, definir_aj_telephone] = useState(`${profil_pays.indicatif_telephonique} `);
  const [aj_courriel, definir_aj_courriel] = useState('');
  const [aj_adresse, definir_aj_adresse] = useState(
    `${profil_pays.ville_defaut}, ${profil_pays.nom}`
  );
  const [aj_id_unite, definir_aj_id_unite] = useState(unites_etablissement[0]?.id ?? '');
  const [aj_bourse, definir_aj_bourse] = useState(0);
  const [aj_nationalite, definir_aj_nationalite] = useState(profil_pays.nom);
  const [aj_tuteur_nom, definir_aj_tuteur_nom] = useState('');
  const [aj_tuteur_lien, definir_aj_tuteur_lien] = useState<ContactTuteur['lien_parente']>(
    terminologie.etape_tuteurs_active ? 'Mère' : 'Proche / Urgence'
  );
  const [aj_tuteur_telephone, definir_aj_tuteur_telephone] = useState(
    `${profil_pays.indicatif_telephonique} `
  );

  const theme = obtenir_theme_etablissement(etablissement_actif.type);

  const carte_unites = useMemo(() => {
    const dictionnaire = new Map<string, string>();
    unites_etablissement.forEach((unite) => dictionnaire.set(unite.id, unite.nom));
    return dictionnaire;
  }, [unites_etablissement]);

  const donnees_filtrees = useMemo(() => {
    return apprenants_etablissement.filter((apprenant) => {
      if (filtre_paiement !== 'TOUS' && apprenant.statut_paiement !== filtre_paiement)
        return false;
      if (filtre_unite !== 'TOUTES' && apprenant.id_unite !== filtre_unite) return false;
      return true;
    });
  }, [apprenants_etablissement, filtre_paiement, filtre_unite]);

  const inscription_pour_fiche = useMemo(() => {
    if (!apprenant_fiche) return undefined;
    const associees = inscriptions_etablissement.filter(
      (i) => i.id_apprenant === apprenant_fiche.id
    );
    return associees.find((i) => i.statut_inscription === 'VALIDEE') ?? associees[0];
  }, [apprenant_fiche, inscriptions_etablissement]);

  if (id_apprenant_selectionne) {
    return <VueDossier360 id_apprenant={id_apprenant_selectionne} />;
  }

  const gerer_ajout_direct = (e: React.FormEvent) => {
    e.preventDefault();
    const unite = unites_etablissement.find((u) => u.id === aj_id_unite) ?? unites_etablissement[0];
    if (!aj_prenom.trim() || !aj_nom.trim() || !unite) return;
    const seq = String(apprenants_etablissement.length + 1).padStart(3, '0');
    const brut = unite.frais_inscription_htg + unite.frais_scolarite_htg;
    const remise = Math.round((unite.frais_scolarite_htg * aj_bourse) / 100);
    const net = Math.max(0, brut - remise);

    const nouveau: Apprenant = {
      id: `lrn-${Date.now()}`,
      id_etablissement: etablissement_actif.id,
      matricule: etablissement_actif.format_matricule.replace('{SEQ}', seq),
      prenom: aj_prenom.trim(),
      nom: aj_nom.trim(),
      sexe: aj_sexe,
      date_naissance: aj_date_naissance,
      lieu_naissance: aj_lieu_naissance.trim() || profil_pays.ville_defaut,
      telephone: aj_telephone.trim() || etablissement_actif.telephone,
      courriel: aj_courriel.trim() || undefined,
      adresse: aj_adresse.trim() || profil_pays.ville_defaut,
      nationalite: aj_nationalite.trim() || profil_pays.nom,
      id_unite: unite.id,
      libelle_niveau: etablissement_actif.libelle_periode_courante,
      date_inscription: new Date().toISOString().slice(0, 10),
      indice_etape: 1,
      statut: 'ACTIF',
      total_du_htg: net,
      total_paye_htg: 0,
      statut_paiement: net === 0 ? 'A_JOUR' : 'EN_RETARD',
      moyenne_generale: 0,
      taux_assiduite: 100,
      pourcentage_bourse: aj_bourse,
      tuteurs: aj_tuteur_nom.trim()
        ? [
            {
              nom_complet: aj_tuteur_nom.trim(),
              lien_parente: aj_tuteur_lien,
              telephone: aj_tuteur_telephone.trim() || profil_pays.indicatif_telephonique,
              est_contact_urgence: true,
              retrait_autorise: true,
            },
          ]
        : undefined,
      dossier_complet: false,
      pieces_manquantes: terminologie.pieces_admission_requises,
    };

    const ok = inscrire_apprenant(nouveau, undefined, {
      type_inscription: 'NOUVELLE',
      montant_brut_htg: brut,
      pieces_fournies: [],
    });
    if (ok) {
      definir_aj_prenom('');
      definir_aj_nom('');
      definir_aj_courriel('');
      definir_aj_tuteur_nom('');
      definir_modale_ajout_ouverte(false);
    }
  };

  const colonnes: ColonneTableauDonnees<Apprenant>[] = [
    {
      cle: 'matricule',
      entete: 'Matricule',
      valeur_tri: (ligne) => ligne.matricule,
      rendu: (ligne) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
          {ligne.matricule}
        </span>
      ),
    },
    {
      cle: 'nom',
      entete: terminologie.apprenant_singulier,
      valeur_tri: (ligne) => `${ligne.nom} ${ligne.prenom}`,
      rendu: (ligne) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {ligne.nom.toUpperCase()} {ligne.prenom}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {ligne.telephone} {ligne.courriel ? `· ${ligne.courriel}` : `· ${ligne.adresse}`}
          </div>
        </div>
      ),
    },
    {
      cle: 'unite',
      entete: terminologie.unite_singulier,
      valeur_tri: (ligne) => carte_unites.get(ligne.id_unite) ?? '',
      rendu: (ligne) => (
        <div>
          <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
            {carte_unites.get(ligne.id_unite) ?? ligne.id_unite}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {ligne.libelle_niveau}
          </div>
        </div>
      ),
    },
    {
      cle: 'etape',
      entete: 'Progression',
      valeur_tri: (ligne) => ligne.indice_etape,
      rendu: (ligne) => {
        const etape = terminologie.etapes_parcours.find((s) => s.etape === ligne.indice_etape);
        return (
          <div className="text-xs">
            <span className={`font-semibold ${theme.texte_accent}`}>{ligne.indice_etape}/5</span>{' '}
            <span className="text-slate-600 dark:text-slate-300">{etape?.libelle_court}</span>
          </div>
        );
      },
    },
    {
      cle: 'moyenne',
      entete: 'Moyenne',
      alignement: 'right',
      valeur_tri: (ligne) => ligne.moyenne_generale,
      rendu: (ligne) => (
        <span className="font-mono text-xs font-semibold">
          {ligne.moyenne_generale}/{etablissement_actif.echelle_notation}
        </span>
      ),
    },
    {
      cle: 'solde',
      entete: 'Solde dû',
      alignement: 'right',
      valeur_tri: (ligne) => ligne.total_du_htg - ligne.total_paye_htg,
      rendu: (ligne) => {
        const solde = Math.max(0, ligne.total_du_htg - ligne.total_paye_htg);
        return (
          <div className="text-right">
            <div className="font-mono text-xs font-semibold tabular-nums">
              {formater_montant(solde, devise_active, etablissement_actif.taux_change_usd)}
            </div>
            <div
              className={`text-[11px] inline-flex items-center gap-1 justify-end ${
                ligne.statut_paiement === 'A_JOUR'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : ligne.statut_paiement === 'PARTIEL'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400'
              }`}
            >
              {ligne.statut_paiement === 'A_JOUR' ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : ligne.statut_paiement === 'PARTIEL' ? (
                <Clock className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              <span>
                {ligne.statut_paiement === 'A_JOUR'
                  ? 'À jour'
                  : ligne.statut_paiement === 'PARTIEL'
                    ? 'Partiel'
                    : 'En retard'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      cle: 'actions',
      entete: 'Fiche',
      alignement: 'right',
      rendu: (ligne) => (
        <Bouton
          type="button"
          variante="fantome"
          taille="sm"
          onClick={(e) => {
            e.stopPropagation();
            definir_format_fiche('a4');
            definir_apprenant_fiche(ligne);
          }}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Fiche PDF</span>
        </Bouton>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Répertoire des {terminologie.apprenant_pluriel.toLowerCase()} (
            {apprenants_etablissement.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cliquez sur une ligne pour ouvrir le Dossier 360° ou consultez la fiche d’inscription à
            tout moment.
          </p>
        </div>
        {a_permission('admissions:gerer') && (
          <div className="flex flex-wrap items-center gap-2">
            {unites_etablissement.length > 0 && (
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => {
                  definir_aj_id_unite(unites_etablissement[0]?.id ?? '');
                  definir_modale_ajout_ouverte(true);
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Ajout rapide</span>
              </Bouton>
            )}
            <Bouton
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
              onClick={() => definir_route_active('admissions')}
            >
              <UserPlus className="w-4 h-4" />
              <span>Assistant d’inscription</span>
            </Bouton>
          </div>
        )}
      </div>

      <TableauDonnees
        donnees={donnees_filtrees}
        colonnes={colonnes}
        extracteur_cle={(ligne) => ligne.id}
        taille_page={10}
        sur_clic_ligne={(ligne) => ouvrir_dossier_apprenant(ligne.id)}
        placeholder_recherche={`Rechercher par nom, matricule (${etablissement_actif.code}-26-...) ou téléphone...`}
        filtre_recherche={(ligne, requete) =>
          `${ligne.prenom} ${ligne.nom} ${ligne.matricule} ${ligne.telephone} ${ligne.courriel ?? ''} ${ligne.adresse}`
            .toLowerCase()
            .includes(requete)
        }
        barre_outils_extra={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtre_unite}
              onChange={(e) => definir_filtre_unite(e.target.value)}
              aria-label={`Filtrer par ${terminologie.unite_singulier}`}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              <option value="TOUTES">Toutes ({terminologie.unite_pluriel.toLowerCase()})</option>
              {unites_etablissement.map((unite) => (
                <option key={unite.id} value={unite.id}>
                  {unite.nom}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(
                [
                  { id: 'TOUS', libelle: 'Tous' },
                  { id: 'A_JOUR', libelle: 'À jour' },
                  { id: 'PARTIEL', libelle: 'Partiel' },
                  { id: 'EN_RETARD', libelle: 'En retard' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => definir_filtre_paiement(option.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    filtre_paiement === option.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {option.libelle}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Modale Permanente : Fiche d'Inscription PDF / Impression */}
      <Modale
        ouverte={Boolean(apprenant_fiche)}
        sur_fermeture={() => definir_apprenant_fiche(null)}
        titre={`Fiche d’inscription — ${apprenant_fiche?.prenom ?? ''} ${apprenant_fiche?.nom ?? ''}`}
        sous_titre={`${etablissement_actif.nom_court} · ${apprenant_fiche?.matricule ?? ''}`}
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
              <Bouton variante="fantome" onClick={() => definir_apprenant_fiche(null)}>
                Fermer
              </Bouton>
              <Bouton
                variante="principal"
                classe_accent={theme.bouton_principal}
                onClick={declencher_impression_ciblee}
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer / Télécharger PDF</span>
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
          apprenant={apprenant_fiche}
          unite={unites_etablissement.find((u) => u.id === apprenant_fiche?.id_unite)}
          inscription={inscription_pour_fiche}
        />
      </Modale>

      {/* Modale Ajout Direct Apprenant */}
      <Modale
        ouverte={modale_ajout_ouverte}
        sur_fermeture={() => definir_modale_ajout_ouverte(false)}
        titre={`Ajout rapide d’un ${terminologie.apprenant_singulier.toLowerCase()}`}
        sous_titre={etablissement_actif.nom_court}
        classe_largeur_max="max-w-lg"
      >
        <form onSubmit={gerer_ajout_direct} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Prénom *</label>
              <input
                type="text"
                required
                value={aj_prenom}
                onChange={(e) => definir_aj_prenom(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Nom *</label>
              <input
                type="text"
                required
                value={aj_nom}
                onChange={(e) => definir_aj_nom(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Sexe</label>
              <select
                value={aj_sexe}
                onChange={(e) => definir_aj_sexe(e.target.value as 'F' | 'M')}
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
                value={aj_date_naissance}
                onChange={(e) => definir_aj_date_naissance(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Téléphone</label>
              <input
                type="text"
                value={aj_telephone}
                onChange={(e) => definir_aj_telephone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Courriel</label>
              <input
                type="email"
                value={aj_courriel}
                onChange={(e) => definir_aj_courriel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{terminologie.unite_singulier}</label>
              <select
                value={aj_id_unite}
                onChange={(e) => definir_aj_id_unite(e.target.value)}
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
              <label className="block font-semibold mb-1">Bourse (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={aj_bourse}
                onChange={(e) => definir_aj_bourse(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold mb-1">
                Lieu de naissance, Nationalité & Adresse
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={aj_lieu_naissance}
                  onChange={(e) => definir_aj_lieu_naissance(e.target.value)}
                  placeholder="Lieu de naissance"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="text"
                  value={aj_nationalite}
                  onChange={(e) => definir_aj_nationalite(e.target.value)}
                  placeholder="Nationalité"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="text"
                  value={aj_adresse}
                  onChange={(e) => definir_aj_adresse(e.target.value)}
                  placeholder="Adresse"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block font-semibold mb-1">
                Responsable / Contact d’urgence
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={aj_tuteur_lien}
                  onChange={(e) =>
                    definir_aj_tuteur_lien(e.target.value as ContactTuteur['lien_parente'])
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="Mère">Mère</option>
                  <option value="Père">Père</option>
                  <option value="Tuteur">Tuteur</option>
                  <option value="Tutrice">Tutrice</option>
                  <option value="Conjoint(e)">Conjoint(e)</option>
                  <option value="Proche / Urgence">Proche / Urgence</option>
                </select>
                <input
                  type="text"
                  value={aj_tuteur_nom}
                  onChange={(e) => definir_aj_tuteur_nom(e.target.value)}
                  placeholder="Nom du responsable"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="text"
                  value={aj_tuteur_telephone}
                  onChange={(e) => definir_aj_tuteur_telephone(e.target.value)}
                  placeholder="Téléphone urgence"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => definir_modale_ajout_ouverte(false)}
            >
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              classe_accent={theme.bouton_principal}
            >
              Créer le dossier
            </Bouton>
          </div>
        </form>
      </Modale>
    </div>
  );
};
