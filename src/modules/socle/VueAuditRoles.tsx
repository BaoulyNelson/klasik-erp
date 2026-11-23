import React, { useMemo, useState } from 'react';
import { History, ShieldCheck, Users } from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import {
  CATALOGUE_PERMISSIONS,
  obtenir_libelle_role_etablissement,
  ROLES,
} from '../../configuration/roles_permissions';
import { utiliserErp } from '../../contexte/ContexteErp';
import { IdentifiantRole } from '../../modeles/erp';

export const VueAuditRoles: React.FC = () => {
  const {
    etablissement_actif,
    id_role_actif,
    obtenir_permissions_role,
    basculer_permission_role,
    journaux_audit,
    a_permission,
    utilisateurs,
  } = utiliserErp();

  const [onglet, definir_onglet] = useState<'matrice' | 'utilisateurs' | 'audit'>('matrice');
  const [role_selectionne, definir_role_selectionne] = useState<IdentifiantRole>('SCOLARITE');
  const [recherche_audit, definir_recherche_audit] = useState('');

  const theme = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const peut_modifier_roles = a_permission('roles:gerer');

  const roles_applicables = (Object.keys(ROLES) as IdentifiantRole[]).filter((r) => {
    const definition = ROLES[r];
    return (
      definition.types_applicables === 'TOUS' ||
      definition.types_applicables.includes(etablissement_actif.type)
    );
  });

  const permissions_par_module = useMemo(() => {
    const groupes = new Map<string, typeof CATALOGUE_PERMISSIONS>();
    CATALOGUE_PERMISSIONS.forEach((perm) => {
      const liste = groupes.get(perm.module) ?? [];
      liste.push(perm);
      groupes.set(perm.module, liste);
    });
    return Array.from(groupes.entries());
  }, []);

  const permissions_role_courant = obtenir_permissions_role(
    etablissement_actif.id,
    role_selectionne
  );
  const utilisateurs_etablissement = useMemo(
    () =>
      utilisateurs.filter((utilisateur) =>
        utilisateur.est_super_admin_plateforme
          ? true
          : utilisateur.affiliations.some(
              (affiliation) => affiliation.id_etablissement === etablissement_actif.id
            )
      ),
    [utilisateurs, etablissement_actif.id]
  );

  const journaux_filtres = useMemo(() => {
    if (!recherche_audit.trim()) return journaux_audit;
    const requete = recherche_audit.trim().toLowerCase();
    return journaux_audit.filter((entree) =>
      `${entree.nom_acteur} ${entree.action} ${entree.cible} ${entree.categorie}`
        .toLowerCase()
        .includes(requete)
    );
  }, [journaux_audit, recherche_audit]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Sécurité RBAC, Utilisateurs & Audit
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Permissions granulaires personnalisables pour {etablissement_actif.nom_court} ·{' '}
            {roles_applicables.length} rôles actifs
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => definir_onglet('matrice')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              onglet === 'matrice'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Matrice RBAC</span>
          </button>
          <button
            type="button"
            onClick={() => definir_onglet('utilisateurs')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              onglet === 'utilisateurs'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Utilisateurs ({utilisateurs_etablissement.length})</span>
          </button>
          <button
            type="button"
            onClick={() => definir_onglet('audit')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              onglet === 'audit'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Journal d’audit ({journaux_audit.length})</span>
          </button>
        </div>
      </div>

      {onglet === 'matrice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Liste des rôles */}
          <Carte rembourrage="petit" className="lg:col-span-4 space-y-1">
            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Rôles configurés ({roles_applicables.length})
            </div>
            {roles_applicables.map((id_role) => {
              const est_selectionne = role_selectionne === id_role;
              const nombre_permissions = obtenir_permissions_role(
                etablissement_actif.id,
                id_role
              ).length;
              return (
                <button
                  key={id_role}
                  type="button"
                  onClick={() => definir_role_selectionne(id_role)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    est_selectionne
                      ? theme.nav_active
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">
                      {obtenir_libelle_role_etablissement(id_role, etablissement_actif.type)}
                    </span>
                    <span className="font-mono text-[11px] opacity-75 tabular-nums">
                      {nombre_permissions}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-75 mt-0.5 line-clamp-1">
                    {ROLES[id_role].description}
                  </p>
                </button>
              );
            })}
          </Carte>

          {/* Permissions du rôle sélectionné */}
          <Carte className="lg:col-span-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
                  {obtenir_libelle_role_etablissement(role_selectionne, etablissement_actif.type)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {ROLES[role_selectionne].description}
                </p>
              </div>
            </div>

            {role_selectionne === 'SUPER_ADMIN' && (
              <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200">
                <p className="font-semibold">
                  Séparation stricte des privilèges (SaaS Plateforme vs Exécution Établissement)
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  Par sécurité et bonne pratique multi-tenant, le Super-administrateur Plateforme ne
                  détient aucune permission d’écriture métier quotidienne (saisie de notes, appel
                  numérique, verrouillage ou émission de bulletins, encaissements). Ces actes
                  restent exclusivement attribués aux rôles internes de chaque établissement.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {permissions_par_module.map(([nom_module, liste_perms]) => (
                <div
                  key={nom_module}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
                    {nom_module}
                  </div>
                  <div className="mt-2 space-y-2">
                    {liste_perms.map((perm) => {
                      const cochee = permissions_role_courant.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={cochee}
                            disabled={!peut_modifier_roles || role_selectionne === 'SUPER_ADMIN'}
                            onChange={() =>
                              basculer_permission_role(
                                etablissement_actif.id,
                                role_selectionne,
                                perm.id
                              )
                            }
                            className="mt-0.5 rounded border-slate-300"
                          />
                          <span>{perm.libelle}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Carte>
        </div>
      )}

      {onglet === 'utilisateurs' && (
        <Carte rembourrage="aucun">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-2.5 text-left font-semibold">Utilisateur</th>
                  <th className="px-4 py-2.5 text-left font-semibold">
                    Rôle dans cet établissement
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold">Contacts</th>
                  <th className="px-4 py-2.5 text-left font-semibold">
                    Appartenance multi-établissements
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {utilisateurs_etablissement.map((utilisateur) => {
                  const affiliation = utilisateur.affiliations.find(
                    (a) => a.id_etablissement === etablissement_actif.id
                  );
                  return (
                    <tr
                      key={utilisateur.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {utilisateur.nom_complet}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {affiliation?.fonction_locale}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">
                        {affiliation
                          ? obtenir_libelle_role_etablissement(
                              affiliation.id_role,
                              etablissement_actif.type
                            )
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                        <div>{utilisateur.courriel}</div>
                        <div>{utilisateur.telephone}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {utilisateur.affiliations.length} établissement
                        {utilisateur.affiliations.length > 1 ? 's' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Carte>
      )}

      {onglet === 'audit' && (
        <div className="space-y-3">
          <div className="max-w-md">
            <input
              type="text"
              value={recherche_audit}
              onChange={(e) => definir_recherche_audit(e.target.value)}
              placeholder="Filtrer le journal d’audit (acteur, action, cible)..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
          <Carte rembourrage="aucun">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-2.5 text-left font-semibold">Horodatage</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Acteur</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Catégorie</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Action</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Cible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {journaux_filtres.map((entree) => (
                    <tr
                      key={entree.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                        {entree.horodatage}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {entree.nom_acteur}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {entree.role_acteur}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {entree.categorie}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200">
                        {entree.action}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                        {entree.cible}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Carte>
        </div>
      )}
    </div>
  );
};
