import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Briefcase,
  Building2,
  Camera,
  CheckCircle2,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Phone,
  Save,
  Shield,
  ShieldCheck,
  Sun,
  Trash2,
  User,
} from 'lucide-react';
import { AvatarUtilisateur } from '../../composants/interface/AvatarUtilisateur';
import { BadgeTypeEtablissement } from '../../composants/interface/BadgeTypeEtablissement';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { ChampMotDePasse } from '../../composants/interface/ChampMotDePasse';
import { JaugeForceMotDePasse } from '../../composants/interface/JaugeForceMotDePasse';
import { LogoEtablissement } from '../../composants/interface/LogoEtablissement';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { obtenir_libelle_role_etablissement } from '../../configuration/roles_permissions';
import { utiliserErp } from '../../contexte/ContexteErp';
import {
  CompteUtilisateur,
  CouleurAccentEtablissement,
  PreferencesNotificationsUtilisateur,
} from '../../modeles/erp';

const DEGRADES_BANNIERE: Record<CouleurAccentEtablissement, string> = {
  blue: 'from-blue-600/20 via-indigo-500/10 to-slate-100 dark:from-blue-900/35 dark:via-slate-900 dark:to-slate-900',
  teal: 'from-teal-500/20 via-emerald-500/10 to-slate-100 dark:from-teal-900/35 dark:via-slate-900 dark:to-slate-900',
  violet:
    'from-violet-600/20 via-purple-500/10 to-slate-100 dark:from-violet-900/35 dark:via-slate-900 dark:to-slate-900',
  orange:
    'from-orange-500/20 via-amber-500/10 to-slate-100 dark:from-orange-900/35 dark:via-slate-900 dark:to-slate-900',
  red: 'from-red-500/20 via-rose-500/10 to-slate-100 dark:from-red-900/35 dark:via-slate-900 dark:to-slate-900',
  navy: 'from-indigo-700/20 via-blue-900/10 to-slate-100 dark:from-indigo-950/70 dark:via-slate-900 dark:to-slate-900',
};

function redimensionner_avatar(fichier: File): Promise<string> {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => rejeter(new Error('Lecture impossible'));
    lecteur.onload = () => {
      const image = new Image();
      image.onerror = () => rejeter(new Error('Format image invalide'));
      image.onload = () => {
        const dimension = 256;
        const canevas = document.createElement('canvas');
        canevas.width = dimension;
        canevas.height = dimension;
        const contexte = canevas.getContext('2d');
        if (!contexte) {
          resoudre(String(lecteur.result));
          return;
        }
        const cote_min = Math.min(image.width, image.height);
        const decalage_x = (image.width - cote_min) / 2;
        const decalage_y = (image.height - cote_min) / 2;
        contexte.drawImage(
          image,
          decalage_x,
          decalage_y,
          cote_min,
          cote_min,
          0,
          0,
          dimension,
          dimension
        );
        resoudre(canevas.toDataURL('image/jpeg', 0.86));
      };
      image.src = String(lecteur.result);
    };
    lecteur.readAsDataURL(fichier);
  });
}

export const VueProfil: React.FC = () => {
  const {
    etablissements,
    etablissement_actif,
    utilisateur_actif,
    id_role_actif,
    journaux_audit,
    theme: theme_interface,
    basculer_theme,
    changer_etablissement,
    mettre_a_jour_profil_utilisateur,
    modifier_mon_mot_de_passe,
    definir_mode_affichage,
    deconnecter,
    configuration_plateforme,
    ajouter_toast,
  } = utiliserErp();

  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const ref_fichier = useRef<HTMLInputElement>(null);

  const [onglet_actif, definir_onglet_actif] = useState<'infos' | 'securite' | 'etablissements'>(
    'infos'
  );
  const [confirmation_deconnexion_ouverte, definir_confirmation_deconnexion_ouverte] =
    useState(false);

  // Champs éditables du profil
  const affiliation_active = utilisateur_actif.affiliations.find(
    (affiliation) => affiliation.id_etablissement === etablissement_actif.id
  );
  const [nom_complet, definir_nom_complet] = useState(utilisateur_actif.nom_complet);
  const [poste, definir_poste] = useState(
    utilisateur_actif.poste ||
      affiliation_active?.fonction_locale ||
      obtenir_libelle_role_etablissement(id_role_actif, etablissement_actif.type)
  );
  const [departement, definir_departement] = useState(
    utilisateur_actif.departement || 'Direction & Administration'
  );
  const [courriel, definir_courriel] = useState(utilisateur_actif.courriel);
  const [telephone, definir_telephone] = useState(utilisateur_actif.telephone);
  const [ville, definir_ville] = useState(utilisateur_actif.ville || etablissement_actif.ville);
  const [pays, definir_pays] = useState(utilisateur_actif.pays || etablissement_actif.nom_pays);
  const [url_linkedin, definir_url_linkedin] = useState(utilisateur_actif.url_linkedin || '');
  const [langue_preferee, definir_langue_preferee] = useState<
    NonNullable<CompteUtilisateur['langue_preferee']>
  >(utilisateur_actif.langue_preferee || 'Français');
  const [biographie, definir_biographie] = useState(
    utilisateur_actif.biographie ||
      `Membre de l’équipe ${etablissement_actif.nom_court} (${obtenir_libelle_role_etablissement(id_role_actif, etablissement_actif.type)}).`
  );

  const [preferences_notifications, definir_preferences_notifications] =
    useState<PreferencesNotificationsUtilisateur>(
      utilisateur_actif.preferences_notifications ?? {
        courriel: true,
        sms_whatsapp: true,
        resume_hebdomadaire: true,
        alertes_securite: true,
      }
    );

  // Changement de mot de passe
  const [mot_de_passe_actuel, definir_mot_de_passe_actuel] = useState('');
  const [nouveau_mot_de_passe, definir_nouveau_mot_de_passe] = useState('');
  const [confirmation_mot_de_passe, definir_confirmation_mot_de_passe] = useState('');
  const [erreur_mot_de_passe, definir_erreur_mot_de_passe] = useState<string | null>(null);

  useEffect(() => {
    const affiliation = utilisateur_actif.affiliations.find(
      (element) => element.id_etablissement === etablissement_actif.id
    );
    definir_nom_complet(utilisateur_actif.nom_complet);
    definir_poste(
      utilisateur_actif.poste ||
        affiliation?.fonction_locale ||
        obtenir_libelle_role_etablissement(id_role_actif, etablissement_actif.type)
    );
    definir_departement(utilisateur_actif.departement || 'Direction & Administration');
    definir_courriel(utilisateur_actif.courriel);
    definir_telephone(utilisateur_actif.telephone);
    definir_ville(utilisateur_actif.ville || etablissement_actif.ville);
    definir_pays(utilisateur_actif.pays || etablissement_actif.nom_pays);
    definir_url_linkedin(utilisateur_actif.url_linkedin || '');
    definir_langue_preferee(utilisateur_actif.langue_preferee || 'Français');
    definir_biographie(
      utilisateur_actif.biographie ||
        `Membre de l’équipe ${etablissement_actif.nom_court} (${obtenir_libelle_role_etablissement(id_role_actif, etablissement_actif.type)}).`
    );
    definir_preferences_notifications(
      utilisateur_actif.preferences_notifications ?? {
        courriel: true,
        sms_whatsapp: true,
        resume_hebdomadaire: true,
        alertes_securite: true,
      }
    );
  }, [utilisateur_actif, etablissement_actif, id_role_actif]);

  const journaux_personnels = useMemo(
    () =>
      journaux_audit
        .filter((journal) => journal.nom_acteur === utilisateur_actif.nom_complet)
        .slice(0, 8),
    [journaux_audit, utilisateur_actif.nom_complet]
  );

  const etablissements_affilies = useMemo(() => {
    if (utilisateur_actif.est_super_admin_plateforme) {
      return etablissements.map((etab) => ({
        etablissement: etab,
        libelle_role: 'Super-administrateur Plateforme',
      }));
    }
    return utilisateur_actif.affiliations
      .map((affiliation) => {
        const etab = etablissements.find((element) => element.id === affiliation.id_etablissement);
        if (!etab) return null;
        return {
          etablissement: etab,
          libelle_role: obtenir_libelle_role_etablissement(affiliation.id_role, etab.type),
        };
      })
      .filter((element): element is NonNullable<typeof element> => element !== null);
  }, [utilisateur_actif, etablissements]);

  const gerer_televersement_photo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    if (!fichier.type.startsWith('image/')) {
      ajouter_toast({
        titre: 'Fichier non supporté',
        description: 'Veuillez sélectionner une image (JPG, PNG, WebP).',
        variante: 'error',
      });
      return;
    }
    try {
      const url_donnees = await redimensionner_avatar(fichier);
      mettre_a_jour_profil_utilisateur({ url_avatar: url_donnees });
    } catch {
      ajouter_toast({
        titre: 'Erreur lors du chargement de la photo',
        variante: 'error',
      });
    } finally {
      if (ref_fichier.current) ref_fichier.current.value = '';
    }
  };

  const gerer_enregistrement_profil = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom_complet.trim() || !courriel.trim()) return;
    mettre_a_jour_profil_utilisateur({
      nom_complet: nom_complet.trim(),
      poste: poste.trim(),
      departement: departement.trim(),
      courriel: courriel.trim(),
      telephone: telephone.trim(),
      ville: ville.trim(),
      pays: pays.trim(),
      url_linkedin: url_linkedin.trim(),
      langue_preferee,
      biographie: biographie.trim(),
    });
  };

  const gerer_soumission_mot_de_passe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nouveau_mot_de_passe !== confirmation_mot_de_passe) {
      definir_erreur_mot_de_passe('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    definir_erreur_mot_de_passe(null);
    const succes = await modifier_mon_mot_de_passe(
      mot_de_passe_actuel,
      nouveau_mot_de_passe
    );
    if (succes) {
      definir_mot_de_passe_actuel('');
      definir_nouveau_mot_de_passe('');
      definir_confirmation_mot_de_passe('');
    }
  };

  const basculer_preference_notification = (cle: keyof PreferencesNotificationsUtilisateur) => {
    const mis_a_jour = {
      ...preferences_notifications,
      [cle]: !preferences_notifications[cle],
    };
    definir_preferences_notifications(mis_a_jour);
    mettre_a_jour_profil_utilisateur({ preferences_notifications: mis_a_jour });
  };

  return (
    <div className="space-y-6">
      {/* Bannière & En-tête Profil Pro */}
      <Carte rembourrage="aucun" className="overflow-hidden">
        <div
          className={`h-28 sm:h-32 bg-gradient-to-r ${DEGRADES_BANNIERE[etablissement_actif.couleur_accent]} border-b border-slate-200 dark:border-slate-800 relative`}
        >
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/85 dark:bg-slate-900/85 backdrop-blur border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {utilisateur_actif.double_facteur_actif
                  ? 'Compte protégé 2FA'
                  : 'Compte vérifié'}
              </span>
            </span>
          </div>
        </div>

        <div className="px-5 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Avatar avec bouton appareil photo */}
              <div className="relative w-24 h-24 shrink-0">
                <AvatarUtilisateur
                  utilisateur={utilisateur_actif}
                  taille="xl"
                  className="ring-4 ring-white dark:ring-slate-900 shadow-lg"
                />
                <input
                  ref={ref_fichier}
                  type="file"
                  accept="image/*"
                  onChange={gerer_televersement_photo}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => ref_fichier.current?.click()}
                  title="Changer la photo de profil"
                  aria-label="Changer la photo de profil"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md cursor-pointer transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100">
                    {utilisateur_actif.nom_complet}
                  </h2>
                  <BadgeTypeEtablissement type={etablissement_actif.type} />
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {poste} · {departement}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {utilisateur_actif.courriel}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {utilisateur_actif.telephone}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {ville}, {pays}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => ref_fichier.current?.click()}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>
                  {utilisateur_actif.url_avatar ? 'Changer la photo' : 'Ajouter une photo'}
                </span>
              </Bouton>
              {utilisateur_actif.url_avatar && (
                <Bouton
                  variante="fantome"
                  taille="sm"
                  onClick={() => mettre_a_jour_profil_utilisateur({ url_avatar: undefined })}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Retirer</span>
                </Bouton>
              )}
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => definir_mode_affichage('accueil')}
                title="Voir la page d’accueil publique sans vous déconnecter"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Page d’accueil</span>
              </Bouton>
              <Bouton
                variante="danger"
                taille="sm"
                onClick={() => definir_confirmation_deconnexion_ouverte(true)}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Se déconnecter</span>
              </Bouton>
            </div>
          </div>

          {/* Barre d'onglets du profil */}
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Bouton
              variante={onglet_actif === 'infos' ? 'principal' : 'secondaire'}
              taille="sm"
              classe_accent={onglet_actif === 'infos' ? theme_etab.bouton_principal : undefined}
              onClick={() => definir_onglet_actif('infos')}
            >
              <User className="w-3.5 h-3.5" />
              <span>Informations & Bio</span>
            </Bouton>
            <Bouton
              variante={onglet_actif === 'securite' ? 'principal' : 'secondaire'}
              taille="sm"
              classe_accent={onglet_actif === 'securite' ? theme_etab.bouton_principal : undefined}
              onClick={() => definir_onglet_actif('securite')}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sécurité, Mot de passe & 2FA</span>
            </Bouton>
            <Bouton
              variante={onglet_actif === 'etablissements' ? 'principal' : 'secondaire'}
              taille="sm"
              classe_accent={
                onglet_actif === 'etablissements' ? theme_etab.bouton_principal : undefined
              }
              onClick={() => definir_onglet_actif('etablissements')}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Établissements ({etablissements_affilies.length}) & Préférences</span>
            </Bouton>
          </div>
        </div>
      </Carte>

      {/* Onglet 1 : Informations personnelles & Biographie */}
      {onglet_actif === 'infos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Carte className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-display font-bold">
                Identité professionnelle & Coordonnées
              </h3>
            </div>

            <form
              onSubmit={gerer_enregistrement_profil}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1">Nom complet *</label>
                <input
                  type="text"
                  required
                  value={nom_complet}
                  onChange={(e) => definir_nom_complet(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Titre / Fonction</label>
                <input
                  type="text"
                  value={poste}
                  onChange={(e) => definir_poste(e.target.value)}
                  placeholder="Ex: Directeur académique"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Département / Service</label>
                <input
                  type="text"
                  value={departement}
                  onChange={(e) => definir_departement(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Courriel professionnel *</label>
                <input
                  type="email"
                  required
                  value={courriel}
                  onChange={(e) => definir_courriel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Téléphone / WhatsApp</label>
                <input
                  type="text"
                  value={telephone}
                  onChange={(e) => definir_telephone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Langue de travail</label>
                <select
                  value={langue_preferee}
                  onChange={(e) =>
                    definir_langue_preferee(
                      e.target.value as NonNullable<CompteUtilisateur['langue_preferee']>
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="Français">Français</option>
                  <option value="Créole haïtien">Kreyòl ayisyen</option>
                  <option value="English">English</option>
                  <option value="Español">Español</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Ville</label>
                <input
                  type="text"
                  value={ville}
                  onChange={(e) => definir_ville(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Pays</label>
                <input
                  type="text"
                  value={pays}
                  onChange={(e) => definir_pays(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">
                  Lien LinkedIn ou Site personnel
                </label>
                <input
                  type="url"
                  value={url_linkedin}
                  onChange={(e) => definir_url_linkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Biographie professionnelle</label>
                <textarea
                  rows={4}
                  value={biographie}
                  onChange={(e) => definir_biographie(e.target.value)}
                  placeholder="Présentez votre parcours, vos spécialités et vos responsabilités..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <Bouton
                  type="submit"
                  variante="principal"
                  taille="sm"
                  classe_accent={theme_etab.bouton_principal}
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer le profil</span>
                </Bouton>
              </div>
            </form>
          </Carte>

          {/* Carte aperçu signature / badge personnel */}
          <Carte className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Globe className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-display font-bold">Aperçu carte professionnelle</h3>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <AvatarUtilisateur utilisateur={utilisateur_actif} taille="lg" />
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm truncate">{nom_complet}</div>
                  <div className="text-slate-500 dark:text-slate-400 truncate">{poste}</div>
                  <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                    {etablissement_actif.nom}
                  </div>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{biographie}</p>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 text-[11px] text-slate-500">
                <div>Langue préférée : {langue_preferee}</div>
                <div>
                  Localisation : {ville}, {pays}
                </div>
                {url_linkedin && (
                  <div className="truncate text-indigo-600 dark:text-indigo-400">
                    {url_linkedin}
                  </div>
                )}
              </div>
            </div>
          </Carte>
        </div>
      )}

      {/* Onglet 2 : Sécurité, Mot de passe & 2FA */}
      {onglet_actif === 'securite' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Carte className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-display font-bold">
                  {utilisateur_actif.a_mot_de_passe === false
                    ? 'Créer mon mot de passe'
                    : 'Modifier mon mot de passe'}
                </h3>
              </div>
              {utilisateur_actif.mot_de_passe_mis_a_jour_le && (
                <span className="text-[10px] font-mono text-slate-400">
                  MàJ : {utilisateur_actif.mot_de_passe_mis_a_jour_le}
                </span>
              )}
            </div>

            <form onSubmit={gerer_soumission_mot_de_passe} className="space-y-3 text-xs">
              {utilisateur_actif.a_mot_de_passe !== false ? (
                <div>
                  <label className="block font-semibold mb-1">Mot de passe actuel *</label>
                  <ChampMotDePasse
                    required
                    value={mot_de_passe_actuel}
                    onChange={(e) => definir_mot_de_passe_actuel(e.target.value)}
                    className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              ) : (
                <p className="rounded-lg border border-indigo-200 bg-indigo-50 p-2.5 text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300">
                  Votre compte Google n’a pas encore de mot de passe. Vous pouvez en créer un ici
                  sans perdre la connexion Google.
                </p>
              )}

              <div>
                <label className="block font-semibold mb-1">
                  Nouveau mot de passe (min. 8 car.) *
                </label>
                <ChampMotDePasse
                  required
                  value={nouveau_mot_de_passe}
                  onChange={(e) => definir_nouveau_mot_de_passe(e.target.value)}
                  className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <JaugeForceMotDePasse
                  mot_de_passe={nouveau_mot_de_passe}
                  sur_generation={(genere) => {
                    definir_nouveau_mot_de_passe(genere);
                    definir_confirmation_mot_de_passe(genere);
                  }}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Confirmer le nouveau mot de passe *
                </label>
                <ChampMotDePasse
                  required
                  value={confirmation_mot_de_passe}
                  onChange={(e) => definir_confirmation_mot_de_passe(e.target.value)}
                  className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              {erreur_mot_de_passe && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded-lg">
                  {erreur_mot_de_passe}
                </p>
              )}

              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                classe_accent={theme_etab.bouton_principal}
                className="w-full"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {utilisateur_actif.a_mot_de_passe === false
                    ? 'Créer le mot de passe'
                    : 'Mettre à jour le mot de passe'}
                </span>
              </Bouton>
            </form>
          </Carte>

          <div className="lg:col-span-7 space-y-6">
            <Carte className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h3 className="text-sm font-display font-bold">
                      Double Authentification (2FA)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Renforcez la protection de votre session multi-établissements.
                    </p>
                  </div>
                </div>

                <Bouton
                  variante={utilisateur_actif.double_facteur_actif ? 'secondaire' : 'principal'}
                  taille="sm"
                  classe_accent={
                    !utilisateur_actif.double_facteur_actif
                      ? theme_etab.bouton_principal
                      : undefined
                  }
                  onClick={() =>
                    mettre_a_jour_profil_utilisateur({
                      double_facteur_actif: !utilisateur_actif.double_facteur_actif,
                    })
                  }
                >
                  {utilisateur_actif.double_facteur_actif ? 'Désactiver 2FA' : 'Activer 2FA'}
                </Bouton>
              </div>

              {utilisateur_actif.double_facteur_actif && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Vérification à deux facteurs active (Application TOTP / SMS{' '}
                    {utilisateur_actif.telephone}).
                  </span>
                </div>
              )}
            </Carte>

            <Carte rembourrage="aucun">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-display font-bold">
                  Mes dernières actions d’audit ({journaux_personnels.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {journaux_personnels.length === 0 ? (
                  <div className="p-5 text-center text-slate-400">
                    Aucune action récente enregistrée dans cet établissement.
                  </div>
                ) : (
                  journaux_personnels.map((journal) => (
                    <div
                      key={journal.id}
                      className="px-5 py-3 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {journal.action}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {journal.cible} · {journal.categorie}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 shrink-0">
                        {journal.horodatage}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Carte>

            <Carte className="space-y-3 border-red-200/80 dark:border-red-900/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                    Session active & Déconnexion
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Connecté en tant que <strong>{utilisateur_actif.nom_complet}</strong> (
                    {utilisateur_actif.courriel}). Vous pouvez consulter la page d’accueil tout en
                    restant connecté ou fermer votre session.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Bouton
                    variante="secondaire"
                    taille="sm"
                    onClick={() => definir_mode_affichage('accueil')}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Voir la page d’accueil</span>
                  </Bouton>
                  <Bouton
                    variante="danger"
                    taille="sm"
                    onClick={() => definir_confirmation_deconnexion_ouverte(true)}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Se déconnecter</span>
                  </Bouton>
                </div>
              </div>
            </Carte>
          </div>
        </div>
      )}

      {/* Onglet 3 : Établissements affiliés & Préférences */}
      {onglet_actif === 'etablissements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Carte rembourrage="aucun" className="lg:col-span-7">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-display font-bold">
                Mes établissements & rôles attribués ({etablissements_affilies.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {etablissements_affilies.map(({ etablissement, libelle_role }) => {
                const est_courant = etablissement.id === etablissement_actif.id;
                return (
                  <div
                    key={etablissement.id}
                    className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <LogoEtablissement
                        type={etablissement.type}
                        code={etablissement.code}
                        url_logo={etablissement.url_logo}
                        nom={etablissement.nom}
                        taille="petit"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {etablissement.nom}
                          </span>
                          <BadgeTypeEtablissement type={etablissement.type} compact />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Rôle : {libelle_role} · {etablissement.ville} (
                          {etablissement.devise_defaut})
                        </div>
                      </div>
                    </div>

                    {est_courant ? (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        Session active
                      </span>
                    ) : (
                      <Bouton
                        variante="secondaire"
                        taille="sm"
                        onClick={() => changer_etablissement(etablissement.id)}
                      >
                        <span>Basculer</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Bouton>
                    )}
                  </div>
                );
              })}
            </div>
          </Carte>

          <Carte className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Bell className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-display font-bold">Préférences d’interface & alertes</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-semibold">Apparence de l’interface</div>
                  <div className="text-[11px] text-slate-400">
                    Mode {theme_interface === 'sombre' ? 'sombre' : 'clair'} actif
                  </div>
                </div>
                <Bouton variante="secondaire" taille="sm" onClick={basculer_theme}>
                  {theme_interface === 'sombre' ? (
                    <>
                      <Sun className="w-3.5 h-3.5" />
                      <span>Mode clair</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5" />
                      <span>Mode sombre</span>
                    </>
                  )}
                </Bouton>
              </div>

              {(
                [
                  [
                    'courriel',
                    'Notifications par courriel',
                    'Recevoir les alertes académiques et financières',
                  ],
                  [
                    'sms_whatsapp',
                    'Alertes SMS / WhatsApp',
                    'Rappels urgents sur votre téléphone mobile',
                  ],
                  [
                    'resume_hebdomadaire',
                    'Résumé hebdomadaire',
                    'Synthèse KPI envoyée chaque lundi matin',
                  ],
                  [
                    'alertes_securite',
                    'Alertes de sécurité',
                    'Notification lors d’une nouvelle connexion',
                  ],
                ] as const
              ).map(([cle, libelle, description]) => (
                <div
                  key={cle}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <div>
                    <div className="font-semibold">{libelle}</div>
                    <div className="text-[11px] text-slate-400">{description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => basculer_preference_notification(cle)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer shrink-0 ${
                      preferences_notifications[cle]
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900'
                        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    {preferences_notifications[cle] ? 'Activé' : 'Désactivé'}
                  </button>
                </div>
              ))}
            </div>
          </Carte>
        </div>
      )}

      <ModaleConfirmationAction
        ouverte={confirmation_deconnexion_ouverte}
        sur_fermeture={() => definir_confirmation_deconnexion_ouverte(false)}
        sur_confirmation={deconnecter}
        tonalite="avertissement"
        icone="deconnexion"
        titre="Confirmer la déconnexion"
        sous_titre={`Session ${configuration_plateforme.nom_plateforme}`}
        description="Vous êtes sur le point de fermer votre session active et de revenir vers l’accueil public de la plateforme."
        elements_impact={[
          { libelle: 'Compte connecté', valeur: utilisateur_actif.nom_complet },
          {
            libelle: 'Rôle actif',
            valeur: obtenir_libelle_role_etablissement(id_role_actif, etablissement_actif.type),
          },
          { libelle: 'Établissement actif', valeur: etablissement_actif.nom_court },
        ]}
        note_irreversible="Vérifiez que vos saisies ou formulaires en cours ont bien été enregistrés avant de quitter."
        libelle_confirmation="Oui, me déconnecter"
        libelle_annulation="Rester connecté"
      />
    </div>
  );
};
