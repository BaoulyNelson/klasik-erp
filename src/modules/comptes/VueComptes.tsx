import React, { useMemo, useState } from 'react';
import {
  Copy,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  UserCheck,
  UserCog,
  UserX,
} from 'lucide-react';
import { AvatarUtilisateur } from '../../composants/interface/AvatarUtilisateur';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { ChampMotDePasse } from '../../composants/interface/ChampMotDePasse';
import { JaugeForceMotDePasse } from '../../composants/interface/JaugeForceMotDePasse';
import { Modale } from '../../composants/interface/Modale';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { obtenir_libelle_role_etablissement, ROLES } from '../../configuration/roles_permissions';
import { utiliserErp } from '../../contexte/ContexteErp';
import { CompteUtilisateur, IdentifiantRole } from '../../modeles/erp';
import { valider_politique_mot_de_passe } from '../../services/service_mots_de_passe';

export const VueComptes: React.FC = () => {
  const {
    etablissement_actif,
    utilisateur_actif,
    utilisateurs_etablissement,
    creer_utilisateur_etablissement,
    modifier_utilisateur_etablissement,
    supprimer_utilisateur_etablissement,
    mettre_a_jour_role_utilisateur,
    basculer_actif_utilisateur,
    basculer_2fa_utilisateur,
    reinitialiser_mot_de_passe_utilisateur,
    deverrouiller_compte_utilisateur,
    ajouter_toast,
    definir_route_active,
  } = utiliserErp();

  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const source_api = import.meta.env.PROD || import.meta.env.VITE_SOURCE_DONNEES === 'api';

  const [nom_complet, definir_nom_complet] = useState('');
  const [courriel, definir_courriel] = useState('');
  const [telephone, definir_telephone] = useState('');
  const [id_role, definir_id_role] = useState<IdentifiantRole>('SCOLARITE');
  const [fonction_locale, definir_fonction_locale] = useState('');
  const [mot_de_passe_demo, definir_mot_de_passe_demo] = useState('');
  const [double_facteur_actif, definir_double_facteur_actif] = useState(true);
  const [changement_obligatoire_creation, definir_changement_obligatoire_creation] = useState(true);
  const [creation_en_cours, definir_creation_en_cours] = useState(false);

  const [id_utilisateur_edition_mdp, definir_id_utilisateur_edition_mdp] = useState<string | null>(null);
  const [nouveau_mot_de_passe, definir_nouveau_mot_de_passe] = useState('');
  const [changement_obligatoire_reinit, definir_changement_obligatoire_reinit] = useState(true);
  const [reinitialisation_en_cours, definir_reinitialisation_en_cours] = useState(false);

  const [utilisateur_en_edition, definir_utilisateur_en_edition] = useState<CompteUtilisateur | null>(null);
  const [edition_en_cours, definir_edition_en_cours] = useState(false);
  const [edit_nom_complet, definir_edit_nom_complet] = useState('');
  const [edit_courriel, definir_edit_courriel] = useState('');
  const [edit_telephone, definir_edit_telephone] = useState('');
  const [edit_fonction_locale, definir_edit_fonction_locale] = useState('');
  const [cible_suppression, definir_cible_suppression] = useState<CompteUtilisateur | null>(null);

  const roles_attribuables = useMemo(
    () =>
      Object.values(ROLES).filter(
        (role) =>
          role.id !== 'SUPER_ADMIN' &&
          (role.types_applicables === 'TOUS' ||
            role.types_applicables.includes(etablissement_actif.type))
      ),
    [etablissement_actif.type]
  );

  const statistiques = useMemo(() => {
    const nombre_actifs = utilisateurs_etablissement.filter((u) => u.est_actif !== false).length;
    const nombre_2fa = utilisateurs_etablissement.filter((u) => u.double_facteur_actif).length;
    return {
      total: utilisateurs_etablissement.length,
      nombre_actifs,
      pourcentage_2fa: utilisateurs_etablissement.length
        ? Math.round((nombre_2fa / utilisateurs_etablissement.length) * 100)
        : 0,
    };
  }, [utilisateurs_etablissement]);

  const gerer_copie_mot_de_passe = async (mot_de_passe: string) => {
    try {
      await navigator.clipboard.writeText(mot_de_passe);
      ajouter_toast({
        titre: 'Mot de passe copié dans le presse-papiers',
        variante: 'info',
      });
    } catch {
      ajouter_toast({
        titre: 'Copie impossible dans ce navigateur',
        variante: 'warning',
      });
    }
  };

  const gerer_creation_utilisateur = async (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (creation_en_cours || !nom_complet.trim() || !courriel.trim()) return;
    const politique_mot_de_passe =
      source_api && !mot_de_passe_demo
        ? { valide: true, message: '' }
        : valider_politique_mot_de_passe(mot_de_passe_demo);
    if (!politique_mot_de_passe.valide) {
      ajouter_toast({
        titre: 'Mot de passe non conforme',
        description: politique_mot_de_passe.message,
        variante: 'warning',
      });
      return;
    }
    definir_creation_en_cours(true);
    try {
      const succes = await creer_utilisateur_etablissement({
        nom_complet,
        courriel,
        telephone: telephone || etablissement_actif.telephone,
        id_role,
        fonction_locale,
        mot_de_passe_demo,
        double_facteur_actif,
        doit_changer_mot_de_passe: changement_obligatoire_creation,
      });
      if (succes) {
        definir_nom_complet('');
        definir_courriel('');
        definir_telephone('');
        definir_fonction_locale('');
        definir_mot_de_passe_demo('');
      }
    } finally {
      definir_creation_en_cours(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Comptes Utilisateurs, Invitations & Sécurité 2FA
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestion des accès nominatifs sur {etablissement_actif.nom} : création de comptes,
            réinitialisation, suspension et double authentification.
          </p>
        </div>

        <Bouton
          variante="secondaire"
          taille="sm"
          onClick={() => definir_route_active('roles_audit')}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Matrice RBAC & Audit</span>
        </Bouton>
      </div>

      {/* Indicateurs de sécurité */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Carte>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Comptes autorisés</span>
            <UserCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-display font-bold tabular-nums">
            {statistiques.nombre_actifs}{' '}
            <span className="text-sm font-normal text-slate-400">/ {statistiques.total}</span>
          </div>
        </Carte>

        <Carte>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Protection 2FA activée</span>
            <Lock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-display font-bold tabular-nums">
            {statistiques.pourcentage_2fa}%
          </div>
        </Carte>

        <Carte>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Isolation multi-tenant</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-sm font-display font-bold text-slate-800 dark:text-slate-200">
            Cloisonnement strict ({etablissement_actif.code})
          </div>
        </Carte>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Création / Invitation de compte */}
        <Carte className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <UserCog className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-display font-bold">Inviter un utilisateur</h3>
          </div>

          <form onSubmit={gerer_creation_utilisateur} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Nom complet *</label>
              <input
                type="text"
                required
                value={nom_complet}
                onChange={(e) => definir_nom_complet(e.target.value)}
                placeholder="Ex: Nadia François"
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
                placeholder="nadia@etablissement.org"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Téléphone</label>
                <input
                  type="text"
                  value={telephone}
                  onChange={(e) => definir_telephone(e.target.value)}
                  placeholder="+509 ..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  Mot de passe initial {source_api ? '(facultatif si compte existant)' : ''}
                </label>
                <ChampMotDePasse
                  value={mot_de_passe_demo}
                  onChange={(e) => definir_mot_de_passe_demo(e.target.value)}
                  className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
            </div>
            <JaugeForceMotDePasse
              compact
              mot_de_passe={mot_de_passe_demo}
              sur_generation={(genere) => definir_mot_de_passe_demo(genere)}
            />
            {source_api && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Si ce courriel possède déjà un compte, ses identifiants sont conservés et seul
                l’accès à {etablissement_actif.nom_court} sera ajouté.
              </p>
            )}

            <div>
              <label className="block font-semibold mb-1">
                Rôle RBAC dans {etablissement_actif.nom_court}
              </label>
              <select
                value={id_role}
                onChange={(e) => definir_id_role(e.target.value as IdentifiantRole)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {roles_attribuables.map((role) => (
                  <option key={role.id} value={role.id}>
                    {obtenir_libelle_role_etablissement(role.id, etablissement_actif.type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Fonction affichée (optionnel)</label>
              <input
                type="text"
                value={fonction_locale}
                onChange={(e) => definir_fonction_locale(e.target.value)}
                placeholder="Ex: Secrétaire académique"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={double_facteur_actif}
                  onChange={(e) => definir_double_facteur_actif(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="font-medium">Exiger la double authentification (2FA)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={changement_obligatoire_creation}
                  onChange={(e) => definir_changement_obligatoire_creation(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="font-medium">
                  Exiger le changement de mot de passe à la 1ère connexion
                </span>
              </label>
            </div>

            <Bouton
              type="submit"
              variante="principal"
              taille="sm"
              disabled={creation_en_cours}
              classe_accent={theme_etab.bouton_principal}
              className="w-full"
            >
              <Plus className="w-4 h-4" />
              <span>{creation_en_cours ? 'Création…' : 'Créer et activer le compte'}</span>
            </Bouton>
          </form>
        </Carte>

        {/* Répertoire des comptes */}
        <Carte rembourrage="aucun" className="lg:col-span-8">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold">
              Comptes rattachés ({utilisateurs_etablissement.length})
            </h3>
            <span className="text-[11px] text-slate-400">
              Modifications effectives immédiatement à la connexion
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {utilisateurs_etablissement.map((utilisateur) => {
              const affiliation = utilisateur.affiliations.find(
                (aff) => aff.id_etablissement === etablissement_actif.id
              );
              const est_suspendu = utilisateur.est_actif === false;
              const est_soi_meme = utilisateur.id === utilisateur_actif.id;
              const est_edition_mdp = id_utilisateur_edition_mdp === utilisateur.id;
              const est_verrouille =
                Boolean(utilisateur.verrouille_jusqua) &&
                new Date(utilisateur.verrouille_jusqua ?? '').getTime() > Date.now();

              return (
                <div key={utilisateur.id} className="px-5 py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarUtilisateur utilisateur={utilisateur} taille="md" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {utilisateur.nom_complet}
                          </span>
                          {est_soi_meme && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              Vous
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              est_suspendu
                                ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {est_suspendu ? 'Suspendu' : 'Actif'}
                          </span>
                          {utilisateur.double_facteur_actif && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              2FA
                            </span>
                          )}
                          {utilisateur.doit_changer_mot_de_passe && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                              MDP à changer
                            </span>
                          )}
                          {est_verrouille && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                              Verrouillé (tentatives)
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {utilisateur.courriel} · {utilisateur.telephone}
                          {utilisateur.mot_de_passe_mis_a_jour_le
                            ? ` · MDP ${utilisateur.mot_de_passe_mis_a_jour_le}`
                            : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {utilisateur.est_super_admin_plateforme ? (
                        <span className="px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                          Super-administrateur Plateforme
                        </span>
                      ) : (
                        <select
                          value={affiliation?.id_role ?? 'AUDITEUR'}
                          onChange={(e) =>
                            mettre_a_jour_role_utilisateur(
                              utilisateur.id,
                              e.target.value as IdentifiantRole
                            )
                          }
                          aria-label={`Rôle de ${utilisateur.nom_complet}`}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium"
                        >
                          {roles_attribuables.map((role) => (
                            <option key={role.id} value={role.id}>
                              {obtenir_libelle_role_etablissement(
                                role.id,
                                etablissement_actif.type
                              )}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Bouton
                        variante="secondaire"
                        taille="sm"
                        onClick={() => basculer_2fa_utilisateur(utilisateur.id)}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>
                          {utilisateur.double_facteur_actif ? 'Désactiver 2FA' : 'Activer 2FA'}
                        </span>
                      </Bouton>

                      <Bouton
                        variante="secondaire"
                        taille="sm"
                        onClick={() => {
                          definir_id_utilisateur_edition_mdp(
                            est_edition_mdp ? null : utilisateur.id
                          );
                          definir_nouveau_mot_de_passe(utilisateur.mot_de_passe_demo);
                        }}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Mot de passe</span>
                      </Bouton>

                      {est_verrouille && (
                        <Bouton
                          variante="secondaire"
                          taille="sm"
                          onClick={() => deverrouiller_compte_utilisateur(utilisateur.id)}
                        >
                          <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Débloquer</span>
                        </Bouton>
                      )}

                      <Bouton
                        variante="secondaire"
                        taille="sm"
                        onClick={() => {
                          definir_utilisateur_en_edition(utilisateur);
                          definir_edit_nom_complet(utilisateur.nom_complet);
                          definir_edit_courriel(utilisateur.courriel);
                          definir_edit_telephone(utilisateur.telephone ?? '');
                          definir_edit_fonction_locale(affiliation?.fonction_locale ?? '');
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </Bouton>

                      {!utilisateur.est_super_admin_plateforme && !est_soi_meme && (
                        <>
                          <Bouton
                            variante={est_suspendu ? 'secondaire' : 'danger'}
                            taille="sm"
                            onClick={() => basculer_actif_utilisateur(utilisateur.id)}
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>{est_suspendu ? 'Réactiver' : 'Suspendre'}</span>
                          </Bouton>
                          <Bouton
                            variante="danger"
                            taille="sm"
                            title="Supprimer définitivement ce compte"
                            onClick={() => definir_cible_suppression(utilisateur)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </Bouton>
                        </>
                      )}
                    </div>

                    <span className="font-mono text-[11px] text-slate-400">
                      {utilisateur.affiliations.length} établissement(s)
                    </span>
                  </div>

                  {est_edition_mdp && (
                    <div className="space-y-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <ChampMotDePasse
                          value={nouveau_mot_de_passe}
                          onChange={(e) => definir_nouveau_mot_de_passe(e.target.value)}
                          placeholder="Nouveau mot de passe (min. 8 car.)..."
                          classe_conteneur="min-w-[230px] flex-1 sm:flex-initial"
                          className="w-full py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs"
                        />
                        <Bouton
                          type="button"
                          variante="secondaire"
                          taille="sm"
                          onClick={() => gerer_copie_mot_de_passe(nouveau_mot_de_passe)}
                          title="Copier le mot de passe"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier</span>
                        </Bouton>
                        <Bouton
                          variante="principal"
                          taille="sm"
                          disabled={reinitialisation_en_cours}
                          classe_accent={theme_etab.bouton_principal}
                          onClick={async () => {
                            if (reinitialisation_en_cours) return;
                            definir_reinitialisation_en_cours(true);
                            try {
                              const succes = await reinitialiser_mot_de_passe_utilisateur(
                                utilisateur.id,
                                nouveau_mot_de_passe,
                                { doit_changer_mot_de_passe: changement_obligatoire_reinit }
                              );
                              if (succes) definir_id_utilisateur_edition_mdp(null);
                            } finally {
                              definir_reinitialisation_en_cours(false);
                            }
                          }}
                        >
                          {reinitialisation_en_cours ? 'Enregistrement…' : 'Enregistrer'}
                        </Bouton>
                        <Bouton
                          variante="fantome"
                          taille="sm"
                          disabled={reinitialisation_en_cours}
                          onClick={() => definir_id_utilisateur_edition_mdp(null)}
                        >
                          Annuler
                        </Bouton>
                      </div>
                      <JaugeForceMotDePasse
                        compact
                        mot_de_passe={nouveau_mot_de_passe}
                        sur_generation={(genere) => definir_nouveau_mot_de_passe(genere)}
                      />
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={changement_obligatoire_reinit}
                          onChange={(e) => definir_changement_obligatoire_reinit(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        <span>
                          Exiger un nouveau mot de passe personnel à la prochaine connexion
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Carte>
      </div>

      {/* Modale d'édition du compte utilisateur */}
      <Modale
        ouverte={Boolean(utilisateur_en_edition)}
        sur_fermeture={() => {
          if (!edition_en_cours) definir_utilisateur_en_edition(null);
        }}
        titre="Modifier les informations du compte"
        sous_titre={utilisateur_en_edition?.nom_complet}
        classe_largeur_max="max-w-lg"
      >
        {utilisateur_en_edition && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                edition_en_cours ||
                !edit_nom_complet.trim() ||
                !edit_courriel.trim()
              ) {
                return;
              }
              definir_edition_en_cours(true);
              try {
                const succes = await modifier_utilisateur_etablissement(utilisateur_en_edition.id, {
                  nom_complet: edit_nom_complet.trim(),
                  courriel: edit_courriel.trim(),
                  telephone: edit_telephone.trim(),
                  fonction_locale: edit_fonction_locale.trim(),
                });
                if (succes) definir_utilisateur_en_edition(null);
              } finally {
                definir_edition_en_cours(false);
              }
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1">Nom complet *</label>
              <input
                type="text"
                required
                value={edit_nom_complet}
                onChange={(e) => definir_edit_nom_complet(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Courriel professionnel *</label>
              <input
                type="email"
                required
                value={edit_courriel}
                onChange={(e) => definir_edit_courriel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Téléphone</label>
                <input
                  type="text"
                  value={edit_telephone}
                  onChange={(e) => definir_edit_telephone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Fonction affichée</label>
                <input
                  type="text"
                  value={edit_fonction_locale}
                  onChange={(e) => definir_edit_fonction_locale(e.target.value)}
                  placeholder="Ex: Responsable scolarité"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Bouton
                type="button"
                variante="fantome"
                taille="sm"
                disabled={edition_en_cours}
                onClick={() => definir_utilisateur_en_edition(null)}
              >
                Annuler
              </Bouton>
              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                disabled={edition_en_cours}
                classe_accent={theme_etab.bouton_principal}
              >
                {edition_en_cours ? 'Enregistrement…' : 'Enregistrer'}
              </Bouton>
            </div>
          </form>
        )}
      </Modale>

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression)}
        sur_fermeture={() => definir_cible_suppression(null)}
        sur_confirmation={() =>
          cible_suppression
            ? supprimer_utilisateur_etablissement(cible_suppression.id)
            : false
        }
        tonalite="danger"
        titre="Supprimer ce compte utilisateur ?"
        sous_titre={cible_suppression?.courriel}
        description={`Le compte de « ${cible_suppression?.nom_complet ?? ''} » sera supprimé ou dissocié de ${etablissement_actif.nom_court}.`}
        elements_impact={
          cible_suppression
            ? [
                { libelle: 'Collaborateur', valeur: cible_suppression.nom_complet },
                { libelle: 'Courriel', valeur: cible_suppression.courriel },
              ]
            : undefined
        }
        note_irreversible="La personne ne pourra plus accéder à cet établissement avec ses identifiants."
        libelle_confirmation="Confirmer la suppression"
      />
    </div>
  );
};
