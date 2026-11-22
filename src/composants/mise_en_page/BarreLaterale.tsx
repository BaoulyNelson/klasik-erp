import React, { useEffect, useRef, useState } from 'react';
import {
  BadgeDollarSign,
  BarChart3,
  BookMarked,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronsUpDown,
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
} from 'lucide-react';
import { DICTIONNAIRE_I18N } from '../../configuration/internationalisation';
import {
  ElementNavigation,
  LIBELLES_GROUPES_NAVIGATION,
  obtenir_elements_navigation,
} from '../../configuration/navigation';
import { obtenir_libelle_role_etablissement } from '../../configuration/roles_permissions';
import { utiliserErp } from '../../contexte/ContexteErp';
import { IdentifiantRoute } from '../../modeles/erp';
import { AvatarUtilisateur } from '../interface/AvatarUtilisateur';
import { BadgeTypeEtablissement } from '../interface/BadgeTypeEtablissement';
import { LogoEtablissement } from '../interface/LogoEtablissement';
import { LogoPlateforme } from '../interface/LogoPlateforme';
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

export const BarreLaterale: React.FC = () => {
  const {
    etablissements_accessibles,
    etablissement_actif,
    utilisateur_actif,
    id_role_actif,
    langue_active,
    barre_laterale_reduite,
    route_active,
    definir_route_active,
    changer_etablissement,
    a_permission,
    definir_modale_nouvel_etablissement_ouverte,
    definir_mode_affichage,
    deconnecter,
    configuration_plateforme,
  } = utiliserErp();

  const [selecteur_ouvert, definir_selecteur_ouvert] = useState(false);
  const [confirmation_deconnexion_ouverte, definir_confirmation_deconnexion_ouverte] =
    useState(false);
  const ref_selecteur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sur_clic_document = (evenement: MouseEvent) => {
      if (ref_selecteur.current && !ref_selecteur.current.contains(evenement.target as Node)) {
        definir_selecteur_ouvert(false);
      }
    };
    document.addEventListener('mousedown', sur_clic_document);
    return () => document.removeEventListener('mousedown', sur_clic_document);
  }, []);

  const trad = DICTIONNAIRE_I18N[langue_active];
  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type);
  const elements_nav = obtenir_elements_navigation(etablissement_actif.type).filter((element) =>
    a_permission(element.permission_requise)
  );

  const groupes: ElementNavigation['groupe'][] = [
    'SOCLE',
    'SCOLARITE_PEDAGOGIE',
    'GESTION',
    'PORTAILS',
  ];

  const gerer_navigation = (route: IdentifiantRoute) => {
    definir_route_active(route);
  };

  const contenu_barre = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
      {/* En-tête marque + Sélecteur d'établissement (Multi-tenant) */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800" ref={ref_selecteur}>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <button
            type="button"
            onClick={() => definir_mode_affichage('accueil')}
            title="Aller à la page publique (sans vous déconnecter)"
            className="flex items-center gap-2 min-w-0 rounded-lg py-0.5 pr-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer text-left"
          >
            <LogoPlateforme configuration={configuration_plateforme} taille="petit" />
            {!barre_laterale_reduite && (
              <span className="font-display font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {configuration_plateforme.nom_plateforme}
              </span>
            )}
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => definir_selecteur_ouvert((precedent) => !precedent)}
            aria-expanded={selecteur_ouvert}
            aria-label="Changer d'établissement"
            className={`w-full flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left ${
              barre_laterale_reduite ? 'justify-center' : ''
            }`}
          >
            <LogoEtablissement
              type={etablissement_actif.type}
              code={etablissement_actif.code}
              url_logo={etablissement_actif.url_logo}
              nom={etablissement_actif.nom}
              taille="petit"
            />
            {!barre_laterale_reduite && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {etablissement_actif.nom_court}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <BadgeTypeEtablissement type={etablissement_actif.type} compact />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {etablissement_actif.annee_academique}
                    </span>
                  </div>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
              </>
            )}
          </button>

          {/* Menu déroulant du sélecteur d'établissement */}
          {selecteur_ouvert && (
            <div className="absolute left-0 top-full mt-1.5 w-76 z-50 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 p-2">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {trad.mes_etablissements} ({etablissements_accessibles.length})
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {etablissements_accessibles.map((etab) => {
                  const est_actif = etab.id === etablissement_actif.id;
                  const affiliation = utilisateur_actif.affiliations.find(
                    (aff) => aff.id_etablissement === etab.id
                  );
                  return (
                    <button
                      key={etab.id}
                      type="button"
                      onClick={() => {
                        changer_etablissement(etab.id);
                        definir_selecteur_ouvert(false);
                      }}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                        est_actif
                          ? 'bg-slate-100 dark:bg-slate-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <LogoEtablissement
                        type={etab.type}
                        code={etab.code}
                        url_logo={etab.url_logo}
                        nom={etab.nom}
                        taille="petit"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {etab.nom}
                          </span>
                          {etab.statut === 'SUSPENDU' ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 shrink-0">
                              Suspendu
                            </span>
                          ) : est_actif ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <BadgeTypeEtablissement type={etab.type} />
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {etab.ville}
                          </span>
                        </div>
                        {affiliation && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            Rôle : {obtenir_libelle_role_etablissement(affiliation.id_role, etab.type)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    definir_selecteur_ouvert(false);
                    definir_modale_nouvel_etablissement_ouverte(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>+ Nouvel Établissement</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation principale adaptée dynamiquement */}
      <nav
        className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5"
        aria-label="Navigation principale"
      >
        {groupes.map((cle_groupe) => {
          const elements_groupe = elements_nav.filter((element) => element.groupe === cle_groupe);
          if (elements_groupe.length === 0) return null;

          return (
            <div key={cle_groupe}>
              {!barre_laterale_reduite && (
                <div className="px-2.5 mb-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {trad.groupes[cle_groupe] ?? LIBELLES_GROUPES_NAVIGATION[cle_groupe]}
                </div>
              )}
              <div className="space-y-0.5">
                {elements_groupe.map((element) => {
                  const Icone = CARTE_ICONES[element.nom_icone];
                  const est_active = route_active === element.id;
                  const libelle_traduit = trad.routes[element.id] ?? element.libelle;
                  return (
                    <button
                      key={element.id}
                      type="button"
                      onClick={() => gerer_navigation(element.id)}
                      title={barre_laterale_reduite ? libelle_traduit : undefined}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
                        barre_laterale_reduite ? 'justify-center' : ''
                      } ${
                        est_active
                          ? theme_etab.nav_active
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <Icone className="w-4 h-4 shrink-0" />
                      {!barre_laterale_reduite && (
                        <span className="flex-1 text-left truncate">{libelle_traduit}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Pied de barre latérale : Création rapide, Profil, Accueil public & Déconnexion */}
      {!barre_laterale_reduite ? (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-xs space-y-2">
          <button
            type="button"
            onClick={() => {
              definir_modale_nouvel_etablissement_ouverte(true);
            }}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{trad.creer_etablissement}</span>
          </button>

          <button
            type="button"
            onClick={() => gerer_navigation('profil')}
            className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
          >
            <AvatarUtilisateur utilisateur={utilisateur_actif} taille="sm" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                {utilisateur_actif.nom_complet}
              </div>
              <div className="text-slate-400 dark:text-slate-500 text-[11px] truncate">
                {obtenir_libelle_role_etablissement(id_role_actif, etablissement_actif.type)}
              </div>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => definir_mode_affichage('accueil')}
              title="Voir la page d’accueil tout en restant connecté"
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Page d’accueil</span>
            </button>
            <button
              type="button"
              onClick={() => definir_confirmation_deconnexion_ouverte(true)}
              title="Fermer la session et se déconnecter"
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Déconnexion</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => definir_mode_affichage('accueil')}
            title="Page d’accueil (rester connecté)"
            aria-label="Page d’accueil (rester connecté)"
            className="w-full flex items-center justify-center p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => definir_confirmation_deconnexion_ouverte(true)}
            title="Se déconnecter"
            aria-label="Se déconnecter"
            className="w-full flex items-center justify-center p-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`hidden md:block shrink-0 transition-[width] duration-200 ${
          barre_laterale_reduite ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div className="sticky top-0 h-screen">{contenu_barre}</div>
      </aside>

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
    </>
  );
};
