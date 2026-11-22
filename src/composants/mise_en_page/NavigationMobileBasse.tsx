import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  BarChart3,
  BookMarked,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  FileText,
  FileUp,
  Globe,
  GraduationCap,
  HeartHandshake,
  IdCard,
  Languages,
  Laptop,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  Newspaper,
  Package,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  UserCheck,
  UserCircle,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ElementNavigation,
  LIBELLES_GROUPES_NAVIGATION,
  obtenir_elements_navigation,
} from '../../configuration/navigation';
import { obtenir_libelle_role_etablissement } from '../../configuration/roles_permissions';
import { utiliserErp } from '../../contexte/ContexteErp';
import { IdentifiantRole, IdentifiantRoute } from '../../modeles/erp';
import { BadgeTypeEtablissement } from '../interface/BadgeTypeEtablissement';
import { LogoEtablissement } from '../interface/LogoEtablissement';
import { ModaleConfirmationAction } from '../interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../interface/theme_etablissement';

const CARTE_ICONES: Record<ElementNavigation['nom_icone'], React.FC<{ className?: string }>> = {
  TableauDeBord: LayoutDashboard,
  Utilisateurs: Users,
  Couches: Layers,
  Langues: Languages,
  BouclierValidation: ShieldCheck,
  AjoutUtilisateur: UserPlus,
  ChapeauDiplome: GraduationCap,
  Calendrier: Calendar,
  Mallette: Briefcase,
  Portefeuille: Wallet,
  PaieBadge: BadgeDollarSign,
  DocumentTexte: FileText,
  BulleMessage: MessageSquare,
  Colis: Package,
  GraphiqueBarres: BarChart3,
  Parametres: Settings,
  CoeurPartenaire: HeartHandshake,
  ValidationUtilisateur: UserCheck,
  LivreOuvert: BookOpen,
  OrdinateurPortable: Laptop,
  Globe,
  JournalActualites: Newspaper,
  Discussion: MessagesSquare,
  CarteIdentite: IdCard,
  ImportFichier: FileUp,
  GestionUtilisateur: UserCog,
  Bouclier: Shield,
  CercleUtilisateur: UserCircle,
  Bibliotheque: BookMarked,
};

const LIBELLES_COURTS_ONGLETS: Partial<Record<IdentifiantRoute, string>> = {
  tableau_de_bord: 'Accueil',
  portail_apprenant: 'Accueil',
  portail_parent: 'Accueil',
  portail_enseignant: 'Accueil',
  plateforme: 'Console',
  pedagogie: 'Notes',
  emplois_du_temps: 'Horaires',
  finances: 'Finances',
  admissions: 'Inscriptions',
  documents: 'Documents',
  communication: 'Annonces',
  messagerie: 'Messages',
  actualites: 'Actualités',
  badges: 'Badges',
  importations: 'Imports',
  comptes: 'Comptes',
  rgpd: 'RGPD',
  profil: 'Profil',
  campus_numerique: 'Cours',
  stages: 'Stages',
  bibliotheque_materiels: 'Biblio & Mat.',
  services: 'Services',
  rapports: 'Rapports',
  ressources_humaines: 'RH & Paie',
  parametres: 'Paramètres',
};

const ROUTES_PRINCIPALES_PAR_ROLE: Record<IdentifiantRole, IdentifiantRoute[]> = {
  SUPER_ADMIN: ['plateforme', 'tableau_de_bord', 'apprenants', 'finances'],
  DIRECTEUR: ['tableau_de_bord', 'apprenants', 'pedagogie', 'finances'],
  ADMIN_ETAB: ['tableau_de_bord', 'apprenants', 'structure', 'parametres'],
  SCOLARITE: ['tableau_de_bord', 'admissions', 'apprenants', 'documents'],
  ECONOME: ['tableau_de_bord', 'finances', 'apprenants', 'ressources_humaines'],
  DIR_ETUDES: ['tableau_de_bord', 'pedagogie', 'emplois_du_temps', 'apprenants'],
  ENSEIGNANT: ['portail_enseignant', 'apprenants', 'pedagogie', 'emplois_du_temps'],
  RESP_STAGES: ['tableau_de_bord', 'stages', 'apprenants', 'documents'],
  SERVICES_ANNEXES: ['tableau_de_bord', 'services', 'apprenants', 'communication'],
  PARENT: ['portail_parent', 'emplois_du_temps', 'campus_numerique', 'documents'],
  APPRENANT: ['portail_apprenant', 'emplois_du_temps', 'campus_numerique', 'documents'],
  AUDITEUR: ['tableau_de_bord', 'finances', 'rapports', 'apprenants'],
};

export const NavigationMobileBasse: React.FC = () => {
  const {
    etablissements_accessibles,
    etablissement_actif,
    utilisateur_actif,
    id_role_actif,
    route_active,
    definir_route_active,
    changer_etablissement,
    a_permission,
    definir_modale_nouvel_etablissement_ouverte,
    definir_mode_affichage,
    deconnecter,
    configuration_plateforme,
  } = utiliserErp();

  const [tiroir_ouvert, definir_tiroir_ouvert] = useState(false);
  const [confirmation_deconnexion_ouverte, definir_confirmation_deconnexion_ouverte] =
    useState(false);

  useEffect(() => {
    if (!tiroir_ouvert) return;
    const sur_touche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') definir_tiroir_ouvert(false);
    };
    window.addEventListener('keydown', sur_touche);
    return () => window.removeEventListener('keydown', sur_touche);
  }, [tiroir_ouvert]);

  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type);

  const elements_autorises = useMemo(
    () =>
      obtenir_elements_navigation(etablissement_actif.type).filter((element) =>
        a_permission(element.permission_requise)
      ),
    [etablissement_actif.type, a_permission]
  );

  // 4 liens prioritaires adaptés au rôle actif
  const onglets_principaux = useMemo(() => {
    const ordre_prefere =
      ROUTES_PRINCIPALES_PAR_ROLE[id_role_actif] ?? ROUTES_PRINCIPALES_PAR_ROLE.DIRECTEUR;
    const selection: ElementNavigation[] = [];

    for (const id_route of ordre_prefere) {
      const correspondance = elements_autorises.find((element) => element.id === id_route);
      if (correspondance && !selection.some((elt) => elt.id === correspondance.id)) {
        selection.push(correspondance);
      }
      if (selection.length === 4) break;
    }

    if (selection.length < 4) {
      for (const element of elements_autorises) {
        if (!selection.some((elt) => elt.id === element.id)) {
          selection.push(element);
        }
        if (selection.length === 4) break;
      }
    }

    return selection;
  }, [id_role_actif, elements_autorises]);

  const ids_principaux = useMemo(
    () => new Set(onglets_principaux.map((onglet) => onglet.id)),
    [onglets_principaux]
  );

  // Tous les autres modules secondaires disponibles dans le tiroir "Plus"
  const elements_secondaires = useMemo(
    () => elements_autorises.filter((element) => !ids_principaux.has(element.id)),
    [elements_autorises, ids_principaux]
  );

  const route_secondaire_active = !ids_principaux.has(route_active);

  const groupes: ElementNavigation['groupe'][] = [
    'SOCLE',
    'SCOLARITE_PEDAGOGIE',
    'GESTION',
    'PORTAILS',
  ];

  const gerer_navigation = (id_route: IdentifiantRoute) => {
    definir_route_active(id_route);
    definir_tiroir_ouvert(false);
  };

  return (
    <>
      {/* Barre de navigation fixe en bas sur mobile (< 768px) */}
      <nav
        aria-label="Navigation mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] no-print"
      >
        <div className="grid grid-cols-5 h-16">
          {onglets_principaux.map((element) => {
            const Icone = CARTE_ICONES[element.nom_icone];
            const est_actif = route_active === element.id && !tiroir_ouvert;
            const libelle_court = LIBELLES_COURTS_ONGLETS[element.id] ?? element.libelle;

            return (
              <button
                key={element.id}
                type="button"
                onClick={() => gerer_navigation(element.id)}
                className={`relative flex flex-col items-center justify-center gap-1 px-1 transition-colors cursor-pointer ${
                  est_actif
                    ? theme_etab.texte_accent + ' font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {est_actif && (
                  <span
                    className={`absolute top-0 w-7 h-0.5 rounded-b-full ${theme_etab.remplissage_progression}`}
                    aria-hidden="true"
                  />
                )}
                <Icone className="w-5 h-5 shrink-0" />
                <span className="text-[10px] leading-none truncate max-w-full">
                  {libelle_court}
                </span>
              </button>
            );
          })}

          {/* 5ème élément obligatoire tout à droite : "Plus" */}
          <button
            type="button"
            onClick={() => definir_tiroir_ouvert((precedent) => !precedent)}
            aria-expanded={tiroir_ouvert}
            aria-label="Plus de modules"
            className={`relative flex flex-col items-center justify-center gap-1 px-1 transition-colors cursor-pointer ${
              tiroir_ouvert || route_secondaire_active
                ? theme_etab.texte_accent + ' font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {(tiroir_ouvert || route_secondaire_active) && (
              <span
                className={`absolute top-0 w-7 h-0.5 rounded-b-full ${theme_etab.remplissage_progression}`}
                aria-hidden="true"
              />
            )}
            <Menu className="w-5 h-5 shrink-0" />
            <span className="text-[10px] leading-none">Plus</span>
          </button>
        </div>
      </nav>

      {/* Tiroir coulissant du bouton "Plus" */}
      <AnimatePresence>
        {tiroir_ouvert && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end no-print">
            {/* Arrière-plan cliquable pour fermer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => definir_tiroir_ouvert(false)}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
              aria-hidden="true"
            />

            {/* Panneau coulissant depuis le bas */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Menu complet des modules"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              className="relative z-10 max-h-[85vh] flex flex-col rounded-t-2xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl pb-[env(safe-area-inset-bottom)]"
            >
              {/* Poignée visuelle + en-tête avec bouton Fermer (X) */}
              <div className="px-4 pt-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LogoEtablissement
                      type={etablissement_actif.type}
                      code={etablissement_actif.code}
                      url_logo={etablissement_actif.url_logo}
                      nom={etablissement_actif.nom}
                      taille="petit"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-display font-bold text-slate-900 dark:text-slate-100 truncate">
                        {etablissement_actif.nom}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <BadgeTypeEtablissement type={etablissement_actif.type} compact />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {obtenir_libelle_role_etablissement(
                            id_role_actif,
                            etablissement_actif.type
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => definir_tiroir_ouvert(false)}
                    aria-label="Fermer le menu"
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Liste des modules secondaires + sélecteur d'établissement */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                {groupes.map((cle_groupe) => {
                  const elements_groupe = elements_secondaires.filter(
                    (element) => element.groupe === cle_groupe
                  );
                  if (elements_groupe.length === 0) return null;

                  return (
                    <div key={cle_groupe}>
                      <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2">
                        {LIBELLES_GROUPES_NAVIGATION[cle_groupe]}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {elements_groupe.map((element) => {
                          const Icone = CARTE_ICONES[element.nom_icone];
                          const est_active = route_active === element.id;
                          return (
                            <button
                              key={element.id}
                              type="button"
                              onClick={() => gerer_navigation(element.id)}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition-colors cursor-pointer ${
                                est_active
                                  ? theme_etab.nav_active
                                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <Icone className="w-4 h-4 shrink-0" />
                              <span className="truncate">{element.libelle}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Sélecteur d'établissement multi-tenant accessible sur mobile */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      Mes établissements ({etablissements_accessibles.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        definir_tiroir_ouvert(false);
                        definir_modale_nouvel_etablissement_ouverte(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nouvel établissement</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {etablissements_accessibles.map((etab) => {
                      const est_courant = etab.id === etablissement_actif.id;
                      return (
                        <button
                          key={etab.id}
                          type="button"
                          onClick={() => {
                            changer_etablissement(etab.id);
                            definir_tiroir_ouvert(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                            est_courant
                              ? 'border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <LogoEtablissement
                              type={etab.type}
                              code={etab.code}
                              url_logo={etab.url_logo}
                              nom={etab.nom}
                              taille="petit"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {etab.nom}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {etab.ville} · {etab.devise_defaut}
                              </div>
                            </div>
                          </div>
                          {est_courant && (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Retour page publique ou déconnexion depuis mobile */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      definir_tiroir_ouvert(false);
                      definir_mode_affichage('accueil');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Page d’accueil (rester connecté)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      definir_tiroir_ouvert(false);
                      definir_confirmation_deconnexion_ouverte(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 text-xs font-semibold text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Déconnexion ({utilisateur_actif.nom_complet})</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ModaleConfirmationAction
        ouverte={confirmation_deconnexion_ouverte}
        sur_fermeture={() => definir_confirmation_deconnexion_ouverte(false)}
        sur_confirmation={deconnecter}
        tonalite="avertissement"
        icone="deconnexion"
        titre="Confirmer la déconnexion"
        sous_titre={`Session ${configuration_plateforme.nom_plateforme}`}
        description="Vous êtes sur le point de fermer votre session active et de revenir vers l’accueil public."
        elements_impact={[
          { libelle: 'Compte connecté', valeur: utilisateur_actif.nom_complet },
          {
            libelle: 'Rôle actif',
            valeur: obtenir_libelle_role_etablissement(id_role_actif, etablissement_actif.type),
          },
          { libelle: 'Établissement actif', valeur: etablissement_actif.nom_court },
        ]}
        note_irreversible="Vérifiez que vos saisies en cours ont bien été enregistrées avant de quitter."
        libelle_confirmation="Oui, me déconnecter"
        libelle_annulation="Rester connecté"
      />
    </>
  );
};
