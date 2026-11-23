import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  DatabaseBackup,
  Landmark,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  Upload,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { LogoEtablissement } from '../../composants/interface/LogoEtablissement';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import {
  CATALOGUE_FORFAITS_SAAS,
  formater_statut_abonnement_saas,
  obtenir_definition_forfait,
  resoudre_statut_abonnement_saas,
} from '../../configuration/forfaits_saas';
import {
  INDICATIFS_INTERNATIONAUX,
  PROFILS_PAYS,
  TOUTES_LES_DEVISES,
} from '../../configuration/regions_devises';
import { utiliserErp } from '../../contexte/ContexteErp';
import {
  CodeDevise,
  CompteBancaire,
  ConfigurationEtablissement,
  PALETTES_COULEUR_ETABLISSEMENT,
} from '../../modeles/erp';
import { obtenir_comptes_bancaires_defaut_pays } from '../../utilitaires/echeancier';
import { traiter_image_logo } from '../../utilitaires/image_logo';
import {
  extraire_indicatif_et_local,
  formater_numero_local,
  valider_courriel,
  valider_telephone_pays,
} from '../../utilitaires/validation_metier';

export const VueParametres: React.FC = () => {
  const {
    etablissements,
    etablissement_actif,
    terminologie,
    mettre_a_jour_etablissement,
    supprimer_etablissement,
    promouvoir_annee_academique,
    reinitialiser_donnees_demo,
    apprenants_etablissement,
    unites_etablissement,
    paiements_etablissement,
    documents_etablissement,
    ajouter_toast,
    definir_route_active,
    a_permission,
    configuration_plateforme,
  } = utiliserErp();

  const theme = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const peut_gerer = a_permission('parametres:gerer');
  const [annee_suivante, definir_annee_suivante] = useState('2027–2028');

  // Formulaire complet d'édition de l'établissement
  const [nom, definir_nom] = useState(etablissement_actif.nom);
  const [nom_court, definir_nom_court] = useState(etablissement_actif.nom_court);
  const [code, definir_code] = useState(etablissement_actif.code);
  const [devise_etablissement, definir_devise_etablissement] = useState(
    etablissement_actif.devise_etablissement
  );
  const [ville, definir_ville] = useState(etablissement_actif.ville);
  const [adresse, definir_adresse] = useState(etablissement_actif.adresse);
  const tel_initial = extraire_indicatif_et_local(
    etablissement_actif.telephone,
    etablissement_actif.code_pays
  );
  const [indicatif_tel, definir_indicatif_tel] = useState(tel_initial.indicatif);
  const [telephone_local, definir_telephone_local] = useState(tel_initial.local);
  const [courriel, definir_courriel] = useState(etablissement_actif.courriel);
  const [site_web, definir_site_web] = useState(etablissement_actif.site_web ?? '');
  const [nom_direction, definir_nom_direction] = useState(etablissement_actif.nom_direction);
  const [titre_direction, definir_titre_direction] = useState(
    etablissement_actif.titre_direction
  );
  const [code_sceau, definir_code_sceau] = useState(etablissement_actif.code_sceau);
  const [autorite_tutelle, definir_autorite_tutelle] = useState(
    etablissement_actif.autorite_tutelle
  );
  const [note_passage, definir_note_passage] = useState(String(etablissement_actif.note_passage));
  const [couleur_accent, definir_couleur_accent] = useState<
    ConfigurationEtablissement['couleur_accent']
  >(etablissement_actif.couleur_accent);
  const [url_logo, definir_url_logo] = useState<string | undefined>(etablissement_actif.url_logo);
  const ref_champ_logo = useRef<HTMLInputElement>(null);

  // Formulaire ajout compte bancaire / caisse
  const [nouvelle_banque, definir_nouvelle_banque] = useState('');
  const [nouveau_numero_compte, definir_nouveau_numero_compte] = useState('');
  const [nouvelle_devise_banque, definir_nouvelle_devise_banque] = useState<CodeDevise>(
    etablissement_actif.devise_defaut
  );
  const [nouveau_titulaire, definir_nouveau_titulaire] = useState(
    etablissement_actif.nom_court
  );

  // Modales de confirmation
  const [confirmation_promotion_ouverte, definir_confirmation_promotion_ouverte] = useState(false);
  const [confirmation_reinit_demo_ouverte, definir_confirmation_reinit_demo_ouverte] =
    useState(false);
  const [confirmation_suppression_ouverte, definir_confirmation_suppression_ouverte] =
    useState(false);

  useEffect(() => {
    definir_nom(etablissement_actif.nom);
    definir_nom_court(etablissement_actif.nom_court);
    definir_code(etablissement_actif.code);
    definir_devise_etablissement(etablissement_actif.devise_etablissement);
    definir_ville(etablissement_actif.ville);
    definir_adresse(etablissement_actif.adresse);
    const extrait = extraire_indicatif_et_local(
      etablissement_actif.telephone,
      etablissement_actif.code_pays
    );
    definir_indicatif_tel(extrait.indicatif);
    definir_telephone_local(extrait.local);
    definir_courriel(etablissement_actif.courriel);
    definir_site_web(etablissement_actif.site_web ?? '');
    definir_nom_direction(etablissement_actif.nom_direction);
    definir_titre_direction(etablissement_actif.titre_direction);
    definir_code_sceau(etablissement_actif.code_sceau);
    definir_autorite_tutelle(etablissement_actif.autorite_tutelle);
    definir_note_passage(String(etablissement_actif.note_passage));
    definir_couleur_accent(etablissement_actif.couleur_accent);
    definir_url_logo(etablissement_actif.url_logo);
    definir_nouvelle_devise_banque(etablissement_actif.devise_defaut);
    definir_nouveau_titulaire(etablissement_actif.nom_court);
  }, [etablissement_actif]);

  const gerer_televersement_logo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    if (!fichier || !peut_gerer) return;
    try {
      const url_donnees = await traiter_image_logo(fichier, 256);
      definir_url_logo(url_donnees);
      mettre_a_jour_etablissement(etablissement_actif.id, { url_logo: url_donnees });
    } catch (erreur) {
      ajouter_toast({
        titre: erreur instanceof Error ? erreur.message : 'Impossible de charger ce logo',
        variante: 'error',
      });
    } finally {
      if (ref_champ_logo.current) ref_champ_logo.current.value = '';
    }
  };

  const gerer_suppression_logo = () => {
    if (!peut_gerer) return;
    definir_url_logo(undefined);
    mettre_a_jour_etablissement(etablissement_actif.id, { url_logo: undefined });
  };

  const profil_pays_actif = PROFILS_PAYS[etablissement_actif.code_pays];
  const validation_telephone = valider_telephone_pays(
    etablissement_actif.code_pays,
    telephone_local,
    indicatif_tel
  );

  const gerer_enregistrement_identite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!peut_gerer) return;
    if (!validation_telephone.valide) {
      ajouter_toast({
        titre: 'Numéro de téléphone invalide',
        description: validation_telephone.erreur,
        variante: 'error',
      });
      return;
    }
    if (!valider_courriel(courriel)) {
      ajouter_toast({
        titre: 'Courriel officiel invalide',
        description: 'Saisissez une adresse courriel valide (ex. direction@etablissement.org).',
        variante: 'error',
      });
      return;
    }
    const note_analysee = Number(note_passage);
    const note_valide =
      !Number.isNaN(note_analysee) &&
      note_analysee > 0 &&
      note_analysee <= etablissement_actif.echelle_notation
        ? note_analysee
        : etablissement_actif.note_passage;

    mettre_a_jour_etablissement(etablissement_actif.id, {
      nom: nom.trim() || etablissement_actif.nom,
      nom_court: nom_court.trim() || etablissement_actif.nom_court,
      code: (code.trim() || etablissement_actif.code).toUpperCase(),
      devise_etablissement:
        devise_etablissement.trim() || etablissement_actif.devise_etablissement,
      url_logo,
      ville: ville.trim() || etablissement_actif.ville,
      adresse: adresse.trim() || etablissement_actif.adresse,
      telephone: validation_telephone.numero_normalise,
      courriel: courriel.trim() || etablissement_actif.courriel,
      site_web: site_web.trim() || undefined,
      nom_direction: nom_direction.trim() || etablissement_actif.nom_direction,
      titre_direction: titre_direction.trim() || etablissement_actif.titre_direction,
      code_sceau: code_sceau.trim() || etablissement_actif.code_sceau,
      autorite_tutelle: autorite_tutelle.trim() || etablissement_actif.autorite_tutelle,
      note_passage: note_valide,
      couleur_accent,
    });
  };

  const comptes_bancaires_effectifs: CompteBancaire[] =
    etablissement_actif.comptes_bancaires && etablissement_actif.comptes_bancaires.length > 0
      ? etablissement_actif.comptes_bancaires
      : obtenir_comptes_bancaires_defaut_pays(
          etablissement_actif.code_pays,
          etablissement_actif.nom_court,
          etablissement_actif.devise_defaut
        );

  const gerer_ajout_compte_bancaire = (e: React.FormEvent) => {
    e.preventDefault();
    if (!peut_gerer || !nouvelle_banque.trim() || !nouveau_numero_compte.trim()) return;
    const cree: CompteBancaire = {
      id: `ba-${Date.now()}`,
      nom_banque: nouvelle_banque.trim(),
      numero_compte: nouveau_numero_compte.trim(),
      devise: nouvelle_devise_banque,
      titulaire: nouveau_titulaire.trim() || etablissement_actif.nom_court,
      par_defaut: comptes_bancaires_effectifs.length === 0,
      actif: true,
    };
    mettre_a_jour_etablissement(etablissement_actif.id, {
      comptes_bancaires: [...comptes_bancaires_effectifs, cree],
    });
    definir_nouvelle_banque('');
    definir_nouveau_numero_compte('');
  };

  const gerer_bascule_compte_actif = (id_compte: string) => {
    if (!peut_gerer) return;
    mettre_a_jour_etablissement(etablissement_actif.id, {
      comptes_bancaires: comptes_bancaires_effectifs.map((compte) =>
        compte.id === id_compte ? { ...compte, actif: !compte.actif } : compte
      ),
    });
  };

  const gerer_definition_compte_defaut = (id_compte: string) => {
    if (!peut_gerer) return;
    mettre_a_jour_etablissement(etablissement_actif.id, {
      comptes_bancaires: comptes_bancaires_effectifs.map((compte) => ({
        ...compte,
        par_defaut: compte.id === id_compte,
      })),
    });
  };

  const gerer_suppression_compte_bancaire = (id_compte: string) => {
    if (!peut_gerer || comptes_bancaires_effectifs.length <= 1) return;
    const filtres = comptes_bancaires_effectifs.filter((compte) => compte.id !== id_compte);
    if (!filtres.some((compte) => compte.par_defaut) && filtres[0]) {
      filtres[0] = { ...filtres[0], par_defaut: true };
    }
    mettre_a_jour_etablissement(etablissement_actif.id, { comptes_bancaires: filtres });
  };

  const basculer_service = (cle: keyof typeof etablissement_actif.services_actifs) => {
    if (!peut_gerer) return;
    mettre_a_jour_etablissement(etablissement_actif.id, {
      services_actifs: {
        ...etablissement_actif.services_actifs,
        [cle]: !etablissement_actif.services_actifs[cle],
      },
    });
  };

  const gerer_sauvegarde_json = () => {
    const charge_utile = {
      exporte_le: new Date().toISOString(),
      etablissement: etablissement_actif,
      unites: unites_etablissement,
      apprenants: apprenants_etablissement,
      paiements: paiements_etablissement,
    };
    const blob = new Blob([JSON.stringify(charge_utile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `sauvegarde_${etablissement_actif.code}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(url);
    ajouter_toast({ titre: 'Sauvegarde JSON téléchargée', variante: 'success' });
  };

  const nombre_eligibles_promotion = apprenants_etablissement.filter(
    (apprenant) =>
      apprenant.moyenne_generale >= etablissement_actif.note_passage && apprenant.indice_etape < 5
  ).length;

  const est_dernier_etablissement = etablissements.length <= 1;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
          Paramètres de l’établissement, Identité & Cycle académique
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Administration complète de {etablissement_actif.nom} ({etablissement_actif.code}).
        </p>
      </div>

      {/* Formulaire d'édition complète de l'établissement */}
      <Carte className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <div>
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                Identité, Coordonnées & Gouvernance de l’école
              </h3>
              <p className="text-[11px] text-slate-500">
                Ces informations apparaissent sur les en-têtes de documents, reçus, badges QR et
                portails.
              </p>
            </div>
          </div>
          {!peut_gerer && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
              Lecture seule (droit requis : parametres:gerer)
            </span>
          )}
        </div>

        <form onSubmit={gerer_enregistrement_identite} className="space-y-4 text-xs">
          {/* Logo officiel de l'établissement */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30">
            <LogoEtablissement
              type={etablissement_actif.type}
              code={code || etablissement_actif.code}
              url_logo={url_logo}
              nom={nom || etablissement_actif.nom}
              taille="grand"
            />
            <div className="flex-1 space-y-2">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Logo officiel de l’établissement
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={ref_champ_logo}
                  type="file"
                  accept="image/*"
                  disabled={!peut_gerer}
                  onChange={gerer_televersement_logo}
                  className="hidden"
                />
                <Bouton
                  type="button"
                  variante="secondaire"
                  taille="sm"
                  disabled={!peut_gerer}
                  onClick={() => ref_champ_logo.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{url_logo ? 'Changer le logo' : 'Importer un logo'}</span>
                </Bouton>
                {url_logo && peut_gerer && (
                  <Bouton
                    type="button"
                    variante="fantome"
                    taille="sm"
                    onClick={gerer_suppression_logo}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Retirer</span>
                  </Bouton>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                PNG, SVG, JPG ou WebP (max 5 Mo). Affiché dans la barre de navigation, les reçus,
                les fiches d’inscription, les badges QR et les documents officiels. En l’absence
                d’image, le sigle ({(code || etablissement_actif.code).slice(0, 3)}) est utilisé.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Nom officiel complet *</label>
              <input
                type="text"
                required
                disabled={!peut_gerer}
                value={nom}
                onChange={(e) => definir_nom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Nom court / Sigle *</label>
              <input
                type="text"
                required
                disabled={!peut_gerer}
                value={nom_court}
                onChange={(e) => definir_nom_court(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Code établissement *</label>
              <input
                type="text"
                required
                disabled={!peut_gerer}
                value={code}
                onChange={(e) => definir_code(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Devise / Slogan de l’établissement</label>
              <input
                type="text"
                disabled={!peut_gerer}
                value={devise_etablissement}
                onChange={(e) => definir_devise_etablissement(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Ville / Département</label>
              <input
                type="text"
                disabled={!peut_gerer}
                value={ville}
                onChange={(e) => definir_ville(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Adresse physique</label>
              <input
                type="text"
                disabled={!peut_gerer}
                value={adresse}
                onChange={(e) => definir_adresse(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Téléphone ({validation_telephone.indicatif})
              </label>
              <div className="flex items-stretch rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950">
                {etablissement_actif.code_pays === 'INTL' ? (
                  <select
                    disabled={!peut_gerer}
                    value={indicatif_tel}
                    onChange={(e) => definir_indicatif_tel(e.target.value)}
                    className="px-2 py-2 font-mono font-semibold bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 disabled:opacity-60"
                  >
                    {INDICATIFS_INTERNATIONAUX.map((item) => (
                      <option key={item.indicatif} value={item.indicatif}>
                        {item.indicatif}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="px-2.5 py-2 font-mono font-semibold bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 select-none">
                    {validation_telephone.indicatif}
                  </span>
                )}
                <input
                  type="tel"
                  inputMode="numeric"
                  disabled={!peut_gerer}
                  value={telephone_local}
                  onChange={(e) => {
                    const chiffres = e.target.value.replace(/\D/g, '').slice(0, 12);
                    definir_telephone_local(formater_numero_local(chiffres));
                  }}
                  placeholder={profil_pays_actif.validation_telephone.exemple_local}
                  className="flex-1 min-w-0 px-3 py-2 font-mono bg-transparent disabled:opacity-60 focus:outline-none"
                />
              </div>
              {!validation_telephone.valide && (
                <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                  {validation_telephone.erreur}
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold mb-1">Courriel officiel</label>
              <input
                type="email"
                disabled={!peut_gerer}
                value={courriel}
                onChange={(e) => definir_courriel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Site web</label>
              <input
                type="text"
                disabled={!peut_gerer}
                value={site_web}
                onChange={(e) => definir_site_web(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Nom du responsable / signataire</label>
              <input
                type="text"
                disabled={!peut_gerer}
                value={nom_direction}
                onChange={(e) => definir_nom_direction(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Titre du signataire</label>
              <input
                type="text"
                disabled={!peut_gerer}
                value={titre_direction}
                onChange={(e) => definir_titre_direction(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Code sceau officiel</label>
              <input
                type="text"
                disabled={!peut_gerer}
                value={code_sceau}
                onChange={(e) => definir_code_sceau(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Autorité / Norme de tutelle</label>
              <input
                type="text"
                disabled={!peut_gerer}
                value={autorite_tutelle}
                onChange={(e) => definir_autorite_tutelle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Seuil de réussite (/{etablissement_actif.echelle_notation})
              </label>
              <input
                type="number"
                step="0.5"
                min={1}
                max={etablissement_actif.echelle_notation}
                disabled={!peut_gerer}
                value={note_passage}
                onChange={(e) => definir_note_passage(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              />
            </div>

            <fieldset>
              <legend className="font-semibold mb-2">Thème couleur établissement</legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PALETTES_COULEUR_ETABLISSEMENT.map((palette) => (
                  <button
                    key={palette.valeur}
                    type="button"
                    disabled={!peut_gerer}
                    aria-pressed={couleur_accent === palette.valeur}
                    onClick={() => definir_couleur_accent(palette.valeur)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left text-xs font-medium transition-colors disabled:opacity-60 ${
                      couleur_accent === palette.valeur
                        ? 'border-slate-500 bg-slate-50 dark:border-slate-400 dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: palette.hex }}
                      aria-hidden="true"
                    />
                    {palette.libelle}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {peut_gerer && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <Bouton
                type="button"
                variante="fantome"
                taille="sm"
                onClick={() => definir_route_active('terminologie')}
              >
                Paramètres régionaux, devises & barèmes →
              </Bouton>
              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                classe_accent={theme.bouton_principal}
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les modifications</span>
              </Bouton>
            </div>
          )}
        </form>
      </Carte>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Passage d'année académique */}
        <Carte className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
            <span>Clôture & Passage à l’année suivante</span>
          </div>
          <p className="text-xs text-slate-500">
            Promeut en masse les {terminologie.apprenant_pluriel.toLowerCase()} ayant atteint le seuil
            de{' '}
            <strong className="font-mono">
              {etablissement_actif.note_passage}/{etablissement_actif.echelle_notation}
            </strong>{' '}
            vers l’étape suivante.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              disabled={!peut_gerer}
              value={annee_suivante}
              onChange={(e) => definir_annee_suivante(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
            />
            <Bouton
              variante="principal"
              taille="sm"
              disabled={!peut_gerer || !annee_suivante.trim()}
              classe_accent={theme.bouton_principal}
              onClick={() => definir_confirmation_promotion_ouverte(true)}
            >
              Lancer la promotion
            </Bouton>
          </div>
        </Carte>

        {/* Abonnement SaaS */}
        {(() => {
          const def_forfait = obtenir_definition_forfait(etablissement_actif.offre_saas);
          const statut_saas = resoudre_statut_abonnement_saas(etablissement_actif);
          const info_statut = formater_statut_abonnement_saas(statut_saas);
          return (
            <Carte className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Settings2 className="w-4 h-4 text-slate-400" />
                  <span>Abonnement SaaS {configuration_plateforme.nom_plateforme}</span>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${info_statut.classe_badge}`}
                >
                  {info_statut.libelle}
                </span>
              </div>
              <div className="text-xs space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500">Formule active</span>
                  <select
                    value={etablissement_actif.offre_saas}
                    disabled={!peut_gerer}
                    onChange={(e) => {
                      const nouvelle_offre = e.target
                        .value as ConfigurationEtablissement['offre_saas'];
                      mettre_a_jour_etablissement(etablissement_actif.id, {
                        offre_saas: nouvelle_offre,
                        statut_abonnement_saas:
                          nouvelle_offre === 'Gratuit' ? 'GRATUIT' : 'ESSAI_14J',
                        date_fin_essai_saas:
                          nouvelle_offre === 'Gratuit'
                            ? undefined
                            : new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
                      });
                    }}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-semibold text-xs disabled:opacity-60"
                  >
                    {CATALOGUE_FORFAITS_SAAS.map((f) => (
                      <option key={f.nom} value={f.nom}>
                        {f.nom} ({f.libelle_prix}/mois)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Quota {terminologie.apprenant_pluriel.toLowerCase()}
                  </span>
                  <span className="font-mono">
                    {apprenants_etablissement.length} /{' '}
                    {def_forfait.quota_apprenants !== null
                      ? def_forfait.quota_apprenants.toLocaleString('fr-FR')
                      : 'Illimité'}
                  </span>
                </div>
                {etablissement_actif.date_fin_essai_saas && statut_saas === 'ESSAI_14J' && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fin de la période d’essai</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">
                      {etablissement_actif.date_fin_essai_saas}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Isolation multi-établissements</span>
                  <span className="font-mono text-emerald-600">
                    id_etablissement = {etablissement_actif.id}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {peut_gerer && statut_saas !== 'GRATUIT' && statut_saas !== 'PAYE' && (
                  <>
                    <Bouton
                      variante="principal"
                      taille="sm"
                      classe_accent={theme.bouton_principal}
                      onClick={() =>
                        mettre_a_jour_etablissement(etablissement_actif.id, {
                          statut_abonnement_saas: 'PAYE',
                          date_fin_essai_saas: undefined,
                          reference_paiement_saas: `REG-${Date.now().toString().slice(-6)}`,
                        })
                      }
                    >
                      Confirmer le règlement ({def_forfait.libelle_prix}/mois)
                    </Bouton>
                    <Bouton
                      variante="secondaire"
                      taille="sm"
                      onClick={() =>
                        mettre_a_jour_etablissement(etablissement_actif.id, {
                          offre_saas: 'Gratuit',
                          statut_abonnement_saas: 'GRATUIT',
                          date_fin_essai_saas: undefined,
                        })
                      }
                    >
                      Passer au Gratuit (0 $)
                    </Bouton>
                  </>
                )}
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  onClick={() => definir_route_active('terminologie')}
                >
                  Paramètres généraux & Barèmes →
                </Bouton>
              </div>
            </Carte>
          );
        })()}
      </div>

      {/* Services complémentaires activables */}
      <Carte className="space-y-3">
        <h3 className="text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
          Modules complémentaires activés pour {etablissement_actif.nom_court}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {(
            [
              { cle: 'bibliotheque', libelle: 'Bibliothèque' },
              { cle: 'cantine', libelle: 'Cantine' },
              { cle: 'transport', libelle: 'Transport' },
              { cle: 'infirmerie', libelle: 'Infirmerie' },
              { cle: 'anciens', libelle: 'Alumni' },
            ] as const
          ).map((service) => (
            <label
              key={service.cle}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              <input
                type="checkbox"
                disabled={!peut_gerer}
                checked={etablissement_actif.services_actifs[service.cle]}
                onChange={() => basculer_service(service.cle)}
              />
              <span className="font-medium">{service.libelle}</span>
            </label>
          ))}
        </div>
      </Carte>

      {/* Multi-comptes bancaires & Caisses de l'établissement */}
      <Carte className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-indigo-500" />
            <div>
              <h3 className="text-sm font-display font-bold">
                Comptes bancaires & Caisses de l’établissement
              </h3>
              <p className="text-[11px] text-slate-500">
                Ces comptes apparaissent lors des encaissements à l’économat et sur les fiches
                d’inscription A4.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-slate-400">
            {comptes_bancaires_effectifs.length} compte(s)
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {comptes_bancaires_effectifs.map((compte) => (
            <div
              key={compte.id}
              className={`py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                !compte.actif ? 'opacity-55' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {compte.nom_banque}
                  </span>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {compte.devise}
                  </span>
                  {compte.par_defaut && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                      Par défaut
                    </span>
                  )}
                </div>
                <div className="text-slate-500 font-mono mt-0.5">
                  N° {compte.numero_compte} · Titulaire : {compte.titulaire}
                </div>
              </div>
              {peut_gerer && (
                <div className="flex items-center gap-1.5">
                  {!compte.par_defaut && (
                    <Bouton
                      type="button"
                      variante="fantome"
                      taille="sm"
                      onClick={() => gerer_definition_compte_defaut(compte.id)}
                    >
                      Définir défaut
                    </Bouton>
                  )}
                  <Bouton
                    type="button"
                    variante="secondaire"
                    taille="sm"
                    onClick={() => gerer_bascule_compte_actif(compte.id)}
                  >
                    {compte.actif ? 'Désactiver' : 'Activer'}
                  </Bouton>
                  {comptes_bancaires_effectifs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => gerer_suppression_compte_bancaire(compte.id)}
                      title="Supprimer ce compte"
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {peut_gerer && (
          <form
            onSubmit={gerer_ajout_compte_bancaire}
            className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs items-end"
          >
            <div className="sm:col-span-4">
              <label className="block font-semibold mb-1">Banque ou Caisse *</label>
              <input
                type="text"
                required
                value={nouvelle_banque}
                onChange={(e) => definir_nouvelle_banque(e.target.value)}
                placeholder="ex. Banque Principale / Caisse Annexe"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block font-semibold mb-1">N° Compte / IBAN *</label>
              <input
                type="text"
                required
                value={nouveau_numero_compte}
                onChange={(e) => definir_nouveau_numero_compte(e.target.value)}
                placeholder="ex. 204-8891-01"
                className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Devise</label>
              <select
                value={nouvelle_devise_banque}
                onChange={(e) => definir_nouvelle_devise_banque(e.target.value as CodeDevise)}
                className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {TOUTES_LES_DEVISES.map((devise) => (
                  <option key={devise} value={devise}>
                    {devise}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                classe_accent={theme.bouton_principal}
                className="w-full"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter compte</span>
              </Bouton>
            </div>
          </form>
        )}
      </Carte>

      {/* Sauvegarde & Restauration */}
      <Carte className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Sauvegarde & Réinitialisation
          </div>
          <p className="text-slate-500 mt-0.5">
            Exportez l’ensemble des données de l’établissement au format JSON ou restaurez les
            données initiales de démonstration.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Bouton variante="secondaire" taille="sm" onClick={gerer_sauvegarde_json}>
            <DatabaseBackup className="w-4 h-4" />
            <span>Sauvegarde JSON</span>
          </Bouton>
          {peut_gerer && (
            <Bouton
              variante="danger"
              taille="sm"
              onClick={() => definir_confirmation_reinit_demo_ouverte(true)}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Réinitialiser démo</span>
            </Bouton>
          )}
        </div>
      </Carte>

      {/* Zone de danger : Suppression définitive de l'école */}
      {peut_gerer && (
        <Carte className="border-red-200 dark:border-red-900/70 bg-red-50/40 dark:bg-red-950/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 text-sm font-display font-bold text-red-700 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Zone de danger — Suppression de l’établissement</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Supprime définitivement <strong>{etablissement_actif.nom}</strong> (
                {etablissement_actif.code}) et efface l’ensemble de ses données isolées (
                {apprenants_etablissement.length} {terminologie.apprenant_pluriel.toLowerCase()},{' '}
                {unites_etablissement.length} {terminologie.unite_pluriel.toLowerCase()},{' '}
                {paiements_etablissement.length} paiements, {documents_etablissement.length}{' '}
                documents). Cette opération est irréversible.
              </p>
              {est_dernier_etablissement && (
                <p className="text-amber-700 dark:text-amber-300 font-medium">
                  Action bloquée : c’est le dernier établissement actif sur la plateforme. Créez-en
                  un autre avant de pouvoir supprimer celui-ci.
                </p>
              )}
            </div>

            <Bouton
              variante="danger"
              taille="sm"
              disabled={est_dernier_etablissement}
              onClick={() => definir_confirmation_suppression_ouverte(true)}
              className="shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer mon établissement</span>
            </Bouton>
          </div>
        </Carte>
      )}

      {/* Modale 1 : Confirmation passage d'année académique */}
      <ModaleConfirmationAction
        ouverte={confirmation_promotion_ouverte}
        sur_fermeture={() => definir_confirmation_promotion_ouverte(false)}
        sur_confirmation={() => promouvoir_annee_academique(annee_suivante.trim())}
        tonalite="avertissement"
        titre="Confirmer la clôture et le passage d’année"
        sous_titre={etablissement_actif.nom}
        description={`Vous êtes sur le point de basculer l’année académique vers ${annee_suivante.trim()} et de promouvoir automatiquement les dossiers admissibles.`}
        elements_impact={[
          { libelle: 'Année actuelle', valeur: etablissement_actif.annee_academique },
          { libelle: 'Nouvelle année activée', valeur: annee_suivante.trim() },
          {
            libelle: `${terminologie.apprenant_pluriel} promus (≥ ${etablissement_actif.note_passage}/${etablissement_actif.echelle_notation})`,
            valeur: nombre_eligibles_promotion,
          },
        ]}
        note_irreversible="Cette transition modifie le niveau/étape des apprenants éligibles et reste consignée dans le journal d’audit."
        libelle_confirmation="Confirmer la promotion"
      />

      {/* Modale 2 : Confirmation réinitialisation des données démo */}
      <ModaleConfirmationAction
        ouverte={confirmation_reinit_demo_ouverte}
        sur_fermeture={() => definir_confirmation_reinit_demo_ouverte(false)}
        sur_confirmation={reinitialiser_donnees_demo}
        tonalite="danger"
        titre="Réinitialiser toutes les données de démonstration"
        sous_titre="Restauration complète d’usine"
        description="Toutes les créations d’établissements, inscriptions, paiements, notes et configurations locales enregistrées dans ce navigateur seront définitivement effacées."
        elements_impact={[
          { libelle: 'Établissement actif', valeur: etablissement_actif.nom_court },
          {
            libelle: 'Stockage local',
            valeur: 'Purge complète & restauration des jeux initiaux',
          },
        ]}
        note_irreversible="Action irréversible : exportez une sauvegarde JSON avant de poursuivre si vous souhaitez conserver vos données."
        phrase_requise="REINITIALISER"
        libelle_phrase_requise="Pour confirmer la remise à zéro, saisissez exactement"
        libelle_confirmation="Réinitialiser définitivement"
      />

      {/* Modale 3 : Confirmation suppression définitive de l'établissement */}
      <ModaleConfirmationAction
        ouverte={confirmation_suppression_ouverte}
        sur_fermeture={() => definir_confirmation_suppression_ouverte(false)}
        sur_confirmation={() => supprimer_etablissement(etablissement_actif.id)}
        tonalite="danger"
        titre={`Supprimer définitivement ${etablissement_actif.nom_court}`}
        sous_titre={`${etablissement_actif.nom} · Code ${etablissement_actif.code}`}
        description="Cette opération supprime l’établissement et purge l’intégralité de ses dossiers académiques, financiers, RH et documentaires."
        elements_impact={[
          { libelle: terminologie.apprenant_pluriel, valeur: apprenants_etablissement.length },
          { libelle: terminologie.unite_pluriel, valeur: unites_etablissement.length },
          { libelle: 'Transactions & Reçus', valeur: paiements_etablissement.length },
          { libelle: 'Documents officiels émis', valeur: documents_etablissement.length },
        ]}
        note_irreversible="Suppression permanente et irréversible : aucune restauration automatique n’est possible après validation."
        phrase_requise={etablissement_actif.code}
        libelle_phrase_requise={`Pour confirmer la suppression de ${etablissement_actif.nom_court}, saisissez son code`}
        libelle_confirmation="Supprimer définitivement l’école"
      />
    </div>
  );
};
