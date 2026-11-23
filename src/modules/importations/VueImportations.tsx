import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  History,
  Upload,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { PROFILS_PAYS } from '../../configuration/regions_devises';
import { utiliserErp } from '../../contexte/ContexteErp';
import {
  Apprenant,
  LotImportation,
  NoteEvaluation,
  PaiementEnregistre,
  UniteAcademique,
} from '../../modeles/erp';
import {
  convertir_devise_vers_pivot,
  convertir_pivot_vers_devise,
  formater_montant,
} from '../../services/service_donnees';
import { telecharger_fichier_csv } from '../../utilitaires/export_csv';

type CibleImportation = LotImportation['cible'];

interface SpecificationModele {
  libelle: string;
  description: string;
  entetes: string[];
  lignes_exemple: string[][];
}

export const VueImportations: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    devise_active,
    unites_etablissement,
    elements_etablissement,
    apprenants_etablissement,
    journaux_import_etablissement,
    importer_donnees_lot,
  } = utiliserErp();

  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const profil_pays = PROFILS_PAYS[etablissement_actif.code_pays] ?? PROFILS_PAYS.INTL;
  const [cible, definir_cible] = useState<CibleImportation>('APPRENANTS');
  const [nom_fichier, definir_nom_fichier] = useState('import_manuel.csv');
  const [csv_brut, definir_csv_brut] = useState('');

  const modeles: Record<CibleImportation, SpecificationModele> = useMemo(() => {
    const premiere_unite = unites_etablissement[0]?.code ?? 'UNIT-01';
    const premier_element = elements_etablissement[0]?.code ?? 'ITEM-01';
    const premier_matricule =
      apprenants_etablissement[0]?.matricule ?? `${etablissement_actif.code}-2026-001`;
    const montant_exemple = String(
      convertir_pivot_vers_devise(5000, devise_active, etablissement_actif.taux_change_usd)
    );
    const mode_exemple =
      profil_pays.modes_paiement_preferes[0] ?? 'Carte bancaire (Stripe/Visa)';
    return {
      APPRENANTS: {
        libelle: terminologie.apprenant_pluriel,
        description: 'Importation en masse des dossiers d’inscription et coordonnées.',
        entetes: ['Prenom', 'Nom', 'Genre', 'Telephone', 'CodeUnite', 'Niveau'],
        lignes_exemple: [
          [
            'Lucas',
            'Martin',
            'M',
            `${profil_pays.indicatif_telephonique} 611223344`,
            premiere_unite,
            etablissement_actif.libelle_periode_courante,
          ],
          [
            'Nadia',
            'Diallo',
            'F',
            `${profil_pays.indicatif_telephonique} 655443322`,
            premiere_unite,
            etablissement_actif.libelle_periode_courante,
          ],
        ],
      },
      NOTES: {
        libelle: 'Notes & Évaluations',
        description: 'Importation des notes par matricule et code matière/module.',
        entetes: ['Matricule', 'CodeMatiere', 'TypeEvaluation', 'Note', 'NoteMax'],
        lignes_exemple: [
          [
            premier_matricule,
            premier_element,
            'Contrôle',
            String(Math.round(etablissement_actif.echelle_notation * 0.8)),
            String(etablissement_actif.echelle_notation),
          ],
        ],
      },
      PAIEMENTS: {
        libelle: 'Paiements & Encaissements',
        description: 'Intégration de relevés bancaires (SEPA/SWIFT), Stripe ou Mobile Money.',
        entetes: ['Matricule', `Montant_${devise_active}`, 'Mode', 'Libelle'],
        lignes_exemple: [
          [premier_matricule, montant_exemple, mode_exemple, 'Tranche scolarité importée'],
        ],
      },
      UNITES: {
        libelle: terminologie.unite_pluriel,
        description: `Création rapide de ${terminologie.unite_pluriel.toLowerCase()} avec tarifs associés.`,
        entetes: ['Code', 'Nom', 'Categorie', 'Niveau', 'Capacite', 'FraisScolarite'],
        lignes_exemple: [
          [
            etablissement_actif.type === 'PRO'
              ? 'FIL-NEW'
              : etablissement_actif.type === 'UNIVERSITE'
                ? 'LIC-NEW'
                : 'CL-NEW',
            etablissement_actif.type === 'PRO'
              ? 'Nouvelle Filière Professionnelle'
              : etablissement_actif.type === 'UNIVERSITE'
                ? 'Licence Sciences & Gestion'
                : 'Classe Secondaire 1',
            terminologie.libelle_categorie_unite,
            etablissement_actif.type === 'PRO'
              ? '6 mois'
              : etablissement_actif.type === 'UNIVERSITE'
                ? 'Semestriel'
                : 'Annuel',
            '35',
            String(
              convertir_pivot_vers_devise(28000, devise_active, etablissement_actif.taux_change_usd)
            ),
          ],
        ],
      },
    };
  }, [
    etablissement_actif.code,
    etablissement_actif.echelle_notation,
    etablissement_actif.libelle_periode_courante,
    etablissement_actif.taux_change_usd,
    devise_active,
    profil_pays.indicatif_telephonique,
    profil_pays.modes_paiement_preferes,
    elements_etablissement,
    apprenants_etablissement,
    unites_etablissement,
    terminologie,
  ]);

  const specification_courante = modeles[cible];

  const gerer_telechargement_modele = () => {
    telecharger_fichier_csv(
      `modele_${cible.toLowerCase()}_${etablissement_actif.code.toLowerCase()}.csv`,
      specification_courante.entetes,
      specification_courante.lignes_exemple
    );
  };

  const gerer_chargement_exemple = () => {
    const lignes = [
      specification_courante.entetes.join(';'),
      ...specification_courante.lignes_exemple.map((ligne) => ligne.join(';')),
    ];
    definir_nom_fichier(`exemple_${cible.toLowerCase()}.csv`);
    definir_csv_brut(lignes.join('\n'));
  };

  const gerer_televerser_fichier = (evenement: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = evenement.target.files?.[0];
    if (!fichier) return;
    definir_nom_fichier(fichier.name);
    const lecteur = new FileReader();
    lecteur.onload = () => {
      definir_csv_brut(String(lecteur.result ?? ''));
    };
    lecteur.readAsText(fichier, 'utf-8');
  };

  const apercu_analyse = useMemo(() => {
    const lignes = csv_brut
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lignes.length < 2) return { lignes: [], nombre_valides: 0 };

    const separateur = lignes[0].includes(';') ? ';' : ',';
    const lignes_donnees = lignes.slice(1);

    const lignes_parsees = lignes_donnees.map((ligne, index) => {
      const colonnes = ligne.split(separateur).map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cible === 'APPRENANTS') {
        const [prenom, nom, sexe_brut, telephone, code_unite, libelle_niveau] = colonnes;
        const unite =
          unites_etablissement.find(
            (u) => u.code.toLowerCase() === (code_unite || '').toLowerCase()
          ) ?? unites_etablissement[0];
        const valide = Boolean(prenom && nom && unite);
        return {
          index: index + 1,
          colonnes,
          valide,
          motif: valide ? `${prenom} ${nom} → ${unite?.code}` : 'Prénom, nom ou unité manquant',
          unite,
          sexe: (sexe_brut?.toUpperCase() === 'F' ? 'F' : 'M') as 'F' | 'M',
          telephone: telephone || etablissement_actif.telephone,
          libelle_niveau: libelle_niveau || etablissement_actif.libelle_periode_courante,
        };
      }
      if (cible === 'NOTES') {
        const [matricule, code_element, type_eval, chaine_note, chaine_note_max] = colonnes;
        const apprenant = apprenants_etablissement.find(
          (a) => a.matricule.toLowerCase() === (matricule || '').toLowerCase()
        );
        const element =
          elements_etablissement.find(
            (el) => el.code.toLowerCase() === (code_element || '').toLowerCase()
          ) ?? elements_etablissement[0];
        const note = Number(chaine_note);
        const note_maximale = Number(chaine_note_max) || etablissement_actif.echelle_notation;
        const valide = Boolean(apprenant && element && !Number.isNaN(note) && note >= 0);
        return {
          index: index + 1,
          colonnes,
          valide,
          motif: valide
            ? `${apprenant?.matricule} · ${element?.code} : ${note}/${note_maximale}`
            : 'Matricule introuvable ou note invalide',
          apprenant,
          element,
          type_evaluation: (type_eval as NoteEvaluation['type_evaluation']) || 'Contrôle',
          note,
          note_maximale,
        };
      }
      if (cible === 'PAIEMENTS') {
        const [matricule, chaine_montant, mode_brut, libelle] = colonnes;
        const apprenant = apprenants_etablissement.find(
          (a) => a.matricule.toLowerCase() === (matricule || '').toLowerCase()
        );
        const montant = Number(chaine_montant);
        const montant_pivot = convertir_devise_vers_pivot(
          montant,
          devise_active,
          etablissement_actif.taux_change_usd
        );
        const valide = Boolean(apprenant && !Number.isNaN(montant) && montant > 0);
        return {
          index: index + 1,
          colonnes,
          valide,
          motif: valide
            ? `${apprenant?.matricule} · +${formater_montant(
                montant_pivot,
                devise_active,
                etablissement_actif.taux_change_usd
              )}`
            : 'Matricule inconnu ou montant <= 0',
          apprenant,
          montant: montant_pivot,
          mode_paiement: (mode_brut as PaiementEnregistre['mode_paiement']) || 'Espèces',
          libelle: libelle || 'Encaissement importé',
        };
      }

      // UNITES
      const [code, nom, categorie, niveau_ou_duree, chaine_cap, chaine_scolarite] = colonnes;
      const valide = Boolean(code && nom);
      return {
        index: index + 1,
        colonnes,
        valide,
        motif: valide ? `${code} — ${nom}` : 'Code et nom obligatoires',
        code,
        nom,
        categorie: categorie || 'Filière générale',
        niveau_ou_duree: niveau_ou_duree || 'Annuel',
        capacite: Number(chaine_cap) || 35,
        frais_scolarite_htg:
          Number(chaine_scolarite) > 0
            ? convertir_devise_vers_pivot(
                Number(chaine_scolarite),
                devise_active,
                etablissement_actif.taux_change_usd
              )
            : 25000,
      };
    });

    return {
      lignes: lignes_parsees,
      nombre_valides: lignes_parsees.filter((r) => r.valide).length,
    };
  }, [
    csv_brut,
    cible,
    unites_etablissement,
    apprenants_etablissement,
    elements_etablissement,
    devise_active,
    etablissement_actif.telephone,
    etablissement_actif.libelle_periode_courante,
    etablissement_actif.echelle_notation,
    etablissement_actif.taux_change_usd,
  ]);

  const gerer_execution_importation = () => {
    const lignes_valides = apercu_analyse.lignes.filter((r) => r.valide);
    if (lignes_valides.length === 0) return;
    const aujourdhui = new Date().toISOString().slice(0, 10);

    if (cible === 'APPRENANTS') {
      const apprenants: Apprenant[] = lignes_valides.map((r, idx) => {
        const unite = (r as { unite: UniteAcademique }).unite;
        return {
          id: `lrn-imp-${Date.now()}-${idx}`,
          id_etablissement: etablissement_actif.id,
          matricule: `${etablissement_actif.code}-2026-${String(Math.floor(200 + Math.random() * 700))}`,
          prenom: r.colonnes[0],
          nom: r.colonnes[1],
          sexe: (r as { sexe: 'F' | 'M' }).sexe,
          date_naissance: '2004-01-15',
          lieu_naissance: etablissement_actif.ville,
          telephone: (r as { telephone: string }).telephone,
          adresse: etablissement_actif.ville,
          id_unite: unite.id,
          libelle_niveau: (r as { libelle_niveau: string }).libelle_niveau,
          date_inscription: aujourdhui,
          indice_etape: 2,
          statut: 'ACTIF',
          total_du_htg: unite.frais_scolarite_htg + unite.frais_inscription_htg,
          total_paye_htg: 0,
          statut_paiement: 'EN_RETARD',
          moyenne_generale: 0,
          taux_assiduite: 100,
          dossier_complet: false,
          pieces_manquantes: ['Pièce d’identité'],
        };
      });
      importer_donnees_lot({ cible, nom_fichier, apprenants });
    } else if (cible === 'NOTES') {
      const notes: Omit<NoteEvaluation, 'id' | 'id_etablissement'>[] = lignes_valides.map((r) => {
        const ligne = r as {
          apprenant: Apprenant;
          element: { id: string };
          type_evaluation: NoteEvaluation['type_evaluation'];
          note: number;
          note_maximale: number;
        };
        return {
          id_apprenant: ligne.apprenant.id,
          id_element: ligne.element.id,
          libelle_periode: etablissement_actif.libelle_periode_courante,
          type_evaluation: ligne.type_evaluation,
          note: ligne.note,
          note_maximale: ligne.note_maximale,
          verrouillee: false,
          enregistree_le: aujourdhui,
        };
      });
      importer_donnees_lot({ cible, nom_fichier, notes });
    } else if (cible === 'PAIEMENTS') {
      const paiements = lignes_valides.map((r) => {
        const ligne = r as {
          apprenant: Apprenant;
          montant: number;
          mode_paiement: PaiementEnregistre['mode_paiement'];
          libelle: string;
        };
        return {
          id_apprenant: ligne.apprenant.id,
          montant_htg: ligne.montant,
          mode_paiement: ligne.mode_paiement,
          libelle: ligne.libelle,
        };
      });
      importer_donnees_lot({ cible, nom_fichier, paiements });
    } else if (cible === 'UNITES') {
      const unites: UniteAcademique[] = lignes_valides.map((r, idx) => {
        const ligne = r as {
          code: string;
          nom: string;
          categorie: string;
          niveau_ou_duree: string;
          capacite: number;
          frais_scolarite_htg: number;
        };
        return {
          id: `unit-imp-${Date.now()}-${idx}`,
          id_etablissement: etablissement_actif.id,
          code: ligne.code,
          nom: ligne.nom,
          categorie: ligne.categorie,
          niveau_ou_duree: ligne.niveau_ou_duree,
          capacite: ligne.capacite,
          frais_scolarite_htg: ligne.frais_scolarite_htg,
          frais_inscription_htg: Math.round(ligne.frais_scolarite_htg * 0.1),
          repartition_facturation: 'Import CSV · 2 tranches',
          responsable_nom: etablissement_actif.nom_direction,
        };
      });
      importer_donnees_lot({ cible, nom_fichier, unites });
    }

    definir_csv_brut('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
          Centre d’Importation CSV / Excel en Masse
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Migrez rapidement vos données ({terminologie.apprenant_pluriel.toLowerCase()}, notes,
          encaissements, {terminologie.unite_pluriel.toLowerCase()}) avec validation ligne par ligne
          avant insertion.
        </p>
      </div>

      {/* Sélecteur de cible */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(modeles) as CibleImportation[]).map((cle) => {
          const actif = cible === cle;
          return (
            <button
              key={cle}
              type="button"
              onClick={() => {
                definir_cible(cle);
                definir_csv_brut('');
              }}
              className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                actif
                  ? theme_etab.nav_active
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2 font-display font-bold text-xs">
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>{modeles[cle].libelle}</span>
              </div>
              <p className="text-[11px] opacity-80 mt-1 line-clamp-2">
                {modeles[cle].description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Zone de chargement CSV */}
        <Carte className="lg:col-span-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileUp className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-display font-bold">
                Fichier source ({specification_courante.libelle})
              </h3>
            </div>
            <div className="flex gap-2">
              <Bouton variante="secondaire" taille="sm" onClick={gerer_telechargement_modele}>
                <Download className="w-3.5 h-3.5" />
                <span>Modèle .CSV</span>
              </Bouton>
              <Bouton variante="fantome" taille="sm" onClick={gerer_chargement_exemple}>
                <span>Charger exemple</span>
              </Bouton>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg font-mono overflow-x-auto">
            Colonnes attendues : {specification_courante.entetes.join(' ; ')}
          </div>

          <div>
            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs font-semibold cursor-pointer">
              <Upload className="w-4 h-4 text-slate-400" />
              <span>Sélectionner un fichier CSV / TXT depuis votre poste</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={gerer_televerser_fichier}
                className="hidden"
              />
            </label>
          </div>

          <div className="text-xs">
            <label className="block font-semibold mb-1">
              Ou collez directement vos lignes CSV :
            </label>
            <textarea
              rows={6}
              value={csv_brut}
              onChange={(e) => definir_csv_brut(e.target.value)}
              placeholder={`${specification_courante.entetes.join(';')}\n${specification_courante.lignes_exemple[0]?.join(';') ?? ''}`}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-[11px]"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              {apercu_analyse.nombre_valides} ligne(s) prête(s) à importer
            </span>
            <Bouton
              variante="principal"
              taille="sm"
              classe_accent={theme_etab.bouton_principal}
              disabled={apercu_analyse.nombre_valides === 0}
              onClick={gerer_execution_importation}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Importer ({apercu_analyse.nombre_valides})</span>
            </Bouton>
          </div>
        </Carte>

        {/* Prévisualisation + Historique */}
        <div className="lg:col-span-6 space-y-6">
          <Carte rembourrage="aucun">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-display font-bold">
                Prévisualisation & Validation ({apercu_analyse.lignes.length})
              </h3>
              <span className="font-mono text-[11px] text-slate-400">{nom_fichier}</span>
            </div>

            {apercu_analyse.lignes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Chargez un fichier ou cliquez sur « Charger exemple » pour prévisualiser les données
                avant insertion.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs max-h-64 overflow-y-auto">
                {apercu_analyse.lignes.map((ligne) => (
                  <div
                    key={ligne.index}
                    className="px-5 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-[11px] text-slate-400 mr-2">
                        #{ligne.index}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {ligne.motif}
                      </span>
                    </div>
                    {ligne.valide ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Valide
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Erreur
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Carte>

          <Carte rembourrage="aucun">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-display font-bold">
                Historique des imports ({journaux_import_etablissement.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {journaux_import_etablissement.length === 0 ? (
                <div className="p-5 text-center text-slate-400">
                  Aucun import CSV exécuté sur cet établissement.
                </div>
              ) : (
                journaux_import_etablissement.map((journal) => (
                  <div
                    key={journal.id}
                    className="px-5 py-3 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {journal.nom_fichier}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {journal.cible} · {journal.lignes_importees} ligne(s) · Par{' '}
                        {journal.importe_par}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 shrink-0">
                      {journal.importe_le}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Carte>
        </div>
      </div>
    </div>
  );
};
