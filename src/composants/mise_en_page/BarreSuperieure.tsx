import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Clock,
  Globe,
  HelpCircle,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sun,
  UserCircle,
  UserCog,
} from 'lucide-react';
import {
  DICTIONNAIRE_I18N,
  formater_heure_fuseau,
  LangueSupportee,
  OPTIONS_LANGUES,
} from '../../configuration/internationalisation';
import { TOUTES_LES_DEVISES } from '../../configuration/regions_devises';
import { obtenir_elements_navigation } from '../../configuration/navigation';
import { obtenir_libelle_role_etablissement, ROLES } from '../../configuration/roles_permissions';
import { utiliserErp } from '../../contexte/ContexteErp';
import { AvatarUtilisateur } from '../interface/AvatarUtilisateur';
import { BadgeTypeEtablissement } from '../interface/BadgeTypeEtablissement';
import { LogoEtablissement } from '../interface/LogoEtablissement';
import { Modale } from '../interface/Modale';
import { ModaleConfirmationAction } from '../interface/ModaleConfirmationAction';
import { BoutonInstallationPwa, ControleSynchroHorsLigne } from '../pwa/ControlesPwa';

export const BarreSuperieure: React.FC = () => {
  const {
    etablissement_actif,
    utilisateur_actif,
    id_role_actif,
    devise_active,
    definir_devise_active,
    langue_active,
    definir_langue_active,
    theme,
    basculer_theme,
    barre_laterale_reduite,
    definir_barre_laterale_reduite,
    route_active,
    definir_route_active,
    notifications,
    marquer_toutes_notifications_lues,
    definir_palette_commandes_ouverte,
    definir_ecran_connexion_ouvert,
    definir_modale_nouvel_etablissement_ouverte,
    definir_mode_affichage,
    deconnecter,
    configuration_plateforme,
  } = utiliserErp();

  const [notifications_ouvertes, definir_notifications_ouvertes] = useState(false);
  const [profil_ouvert, definir_profil_ouvert] = useState(false);
  const [aide_ouverte, definir_aide_ouverte] = useState(false);
  const [confirmation_deconnexion_ouverte, definir_confirmation_deconnexion_ouverte] =
    useState(false);
  const [horloge_en_direct, definir_horloge_en_direct] = useState(() =>
    formater_heure_fuseau(etablissement_actif.fuseau_horaire, langue_active)
  );

  const ref_notifications = useRef<HTMLDivElement>(null);
  const ref_profil = useRef<HTMLDivElement>(null);

  useEffect(() => {
    definir_horloge_en_direct(
      formater_heure_fuseau(etablissement_actif.fuseau_horaire, langue_active)
    );
    const minuteur = window.setInterval(() => {
      definir_horloge_en_direct(
        formater_heure_fuseau(etablissement_actif.fuseau_horaire, langue_active)
      );
    }, 1000);
    return () => window.clearInterval(minuteur);
  }, [etablissement_actif.fuseau_horaire, langue_active]);

  useEffect(() => {
    const sur_clic_document = (evenement: MouseEvent) => {
      if (ref_notifications.current && !ref_notifications.current.contains(evenement.target as Node)) {
        definir_notifications_ouvertes(false);
      }
      if (ref_profil.current && !ref_profil.current.contains(evenement.target as Node)) {
        definir_profil_ouvert(false);
      }
    };
    document.addEventListener('mousedown', sur_clic_document);
    return () => document.removeEventListener('mousedown', sur_clic_document);
  }, []);

  const trad = DICTIONNAIRE_I18N[langue_active];
  const elements_nav = obtenir_elements_navigation(etablissement_actif.type);
  const libelle_nav_defaut =
    elements_nav.find((element) => element.id === route_active)?.libelle ?? 'Tableau de bord';
  const libelle_nav_courant = trad.routes[route_active] ?? libelle_nav_defaut;
  const nb_non_lues = notifications.filter((notif) => !notif.lue).length;

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Zone gauche : Logo mobile / Réduction bureau + Fil d'Ariane */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="md:hidden shrink-0">
            <LogoEtablissement
              type={etablissement_actif.type}
              code={etablissement_actif.code}
              url_logo={etablissement_actif.url_logo}
              nom={etablissement_actif.nom}
              taille="petit"
            />
          </div>

          <button
            type="button"
            onClick={() => definir_barre_laterale_reduite(!barre_laterale_reduite)}
            aria-label={
              barre_laterale_reduite ? 'Déplier la barre latérale' : 'Réduire la barre latérale'
            }
            className="hidden md:inline-flex p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {barre_laterale_reduite ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="hidden sm:inline font-medium text-slate-500 dark:text-slate-400 truncate">
              {etablissement_actif.nom_court}
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
              /
            </span>
            <h1 className="font-display font-semibold text-slate-900 dark:text-slate-100 truncate">
              {libelle_nav_courant}
            </h1>
            <span className="hidden md:inline-flex">
              <BadgeTypeEtablissement type={etablissement_actif.type} compact />
            </span>
          </div>
        </div>

        {/* Zone droite : Recherche Ctrl+K, Hors-ligne/PWA, Devise, Thème, Notifications, Aide, Profil */}
        <div className="flex items-center gap-2 shrink-0">
          <ControleSynchroHorsLigne />
          <BoutonInstallationPwa />

          {/* Recherche globale Ctrl+K */}
          <button
            type="button"
            onClick={() => definir_palette_commandes_ouverte(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:inline whitespace-nowrap">{trad.recherche_rapide}</span>
            <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500">
              Ctrl+K
            </kbd>
          </button>

          {/* Horloge fuseau */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-mono text-slate-600 dark:text-slate-300"
            title={`Fuseau actif : ${etablissement_actif.fuseau_horaire}`}
          >
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="tabular-nums">{horloge_en_direct}</span>
          </div>

          {/* Sélecteur de langue FR / EN / HT / ES */}
          <div className="hidden sm:flex items-center">
            <select
              aria-label="Langue de l'interface"
              value={langue_active}
              onChange={(evenement) =>
                definir_langue_active(evenement.target.value as LangueSupportee)
              }
              className="px-2 py-1.5 text-[11px] font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              {OPTIONS_LANGUES.map((langue) => (
                <option key={langue.code} value={langue.code}>
                  {langue.code_court}
                </option>
              ))}
            </select>
          </div>

          {/* Sélecteur de devise mondial */}
          <div className="hidden sm:flex items-center">
            <select
              aria-label="Devise d'affichage"
              value={devise_active}
              onChange={(evenement) =>
                definir_devise_active(evenement.target.value as typeof devise_active)
              }
              className="px-2.5 py-1.5 text-[11px] font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              {TOUTES_LES_DEVISES.map((devise) => (
                <option key={devise} value={devise}>
                  {devise === etablissement_actif.devise_defaut ? `${devise} (Locale)` : devise}
                </option>
              ))}
            </select>
          </div>

          {/* Mode clair / sombre */}
          <button
            type="button"
            onClick={basculer_theme}
            aria-label={theme === 'sombre' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            title={theme === 'sombre' ? 'Mode clair' : 'Mode sombre'}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {theme === 'sombre' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={ref_notifications}>
            <button
              type="button"
              onClick={() => definir_notifications_ouvertes((precedent) => !precedent)}
              aria-label="Notifications"
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {nb_non_lues > 0 && (
                <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-red-600 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                  {nb_non_lues}
                </span>
              )}
            </button>

            {notifications_ouvertes && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 p-3 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Alertes ({etablissement_actif.nom_court})
                  </span>
                  {nb_non_lues > 0 && (
                    <button
                      type="button"
                      onClick={marquer_toutes_notifications_lues}
                      className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto mt-1">
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500">
                      Aucune alerte pour cet établissement.
                    </p>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => {
                          if (notif.route_cible) definir_route_active(notif.route_cible);
                          definir_notifications_ouvertes(false);
                        }}
                        className={`w-full text-left py-2.5 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                          notif.lue ? 'opacity-65' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {notif.titre}
                          </span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {notif.cree_le}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {notif.description}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Aide */}
          <button
            type="button"
            onClick={() => definir_aide_ouverte(true)}
            aria-label="Aide et raccourcis"
            title="Aide"
            className="hidden sm:inline-flex p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Menu utilisateur */}
          <div className="relative" ref={ref_profil}>
            <button
              type="button"
              onClick={() => definir_profil_ouvert((precedent) => !precedent)}
              className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <AvatarUtilisateur utilisateur={utilisateur_actif} taille="sm" />
              <div className="hidden md:block text-left leading-tight">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 max-w-[130px] truncate">
                  {utilisateur_actif.nom_complet}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[130px] truncate">
                  {(ROLES[id_role_actif] ?? ROLES.DIRECTEUR).libelle_court}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profil_ouvert && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 p-2 z-50">
                <div className="px-2.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                  <AvatarUtilisateur utilisateur={utilisateur_actif} taille="md" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {utilisateur_actif.nom_complet}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {utilisateur_actif.courriel}
                    </div>
                    <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                      {obtenir_libelle_role_etablissement(id_role_actif, etablissement_actif.type)}
                    </div>
                  </div>
                </div>

                <div className="py-1.5 border-b border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      definir_route_active('profil');
                      definir_profil_ouvert(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <UserCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{trad.mon_profil}</span>
                  </button>
                </div>

                <div className="pt-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      definir_profil_ouvert(false);
                      definir_modale_nouvel_etablissement_ouverte(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{trad.creer_etablissement}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      definir_profil_ouvert(false);
                      definir_ecran_connexion_ouvert(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <UserCog className="w-3.5 h-3.5 text-slate-500" />
                    <span>{trad.changer_compte}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      definir_profil_ouvert(false);
                      definir_mode_affichage('accueil');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    <span>Page d’accueil (rester connecté)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      definir_profil_ouvert(false);
                      definir_confirmation_deconnexion_ouverte(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{trad.deconnexion_accueil}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <Modale
        ouverte={aide_ouverte}
        sur_fermeture={() => definir_aide_ouverte(false)}
        titre={`Aide & Raccourcis ${configuration_plateforme.nom_plateforme}`}
        sous_titre={configuration_plateforme.accroche_courte}
        classe_largeur_max="max-w-lg"
      >
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            {configuration_plateforme.nom_plateforme} adapte automatiquement l’ensemble des
            libellés, menus, barèmes et processus selon l’établissement sélectionné en haut de la
            barre latérale.
          </p>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span>Recherche globale instantanée</span>
              <kbd className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                Ctrl + K
              </kbd>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span>Fermer une fenêtre modale</span>
              <kbd className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                Échap
              </kbd>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span>Pays & Fuseau actif</span>
              <span className="font-mono text-xs text-slate-500">
                {etablissement_actif.nom_pays} · {etablissement_actif.fuseau_horaire}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span>Devise locale & Conversion</span>
              <span className="font-mono text-xs text-slate-500">
                {etablissement_actif.devise_defaut} · {TOUTES_LES_DEVISES.length} devises mondiales actives
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <span>Support plateforme</span>
              <span className="font-mono text-xs text-slate-500 text-right truncate">
                {configuration_plateforme.courriel_support} ·{' '}
                {configuration_plateforme.telephone_support}
              </span>
            </div>
          </div>
        </div>
      </Modale>

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
        note_irreversible="Vérifiez que vos saisies de notes, encaissements ou formulaires en cours ont bien été enregistrés avant de quitter."
        libelle_confirmation="Oui, me déconnecter"
        libelle_annulation="Rester connecté"
      />
    </>
  );
};
