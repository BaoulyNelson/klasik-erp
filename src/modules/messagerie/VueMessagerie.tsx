import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessagesSquare, Plus, Search, Send, User } from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { EtatVide } from '../../composants/interface/EtatVide';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { utiliserErp } from '../../contexte/ContexteErp';
import { FilDiscussionDirecte } from '../../modeles/erp';

export const VueMessagerie: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    fils_discussion_etablissement,
    creer_fil_discussion,
    envoyer_message_direct,
    marquer_fil_lu,
  } = utiliserErp();

  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const [id_fil_selectionne, definir_id_fil_selectionne] = useState<string | null>(
    fils_discussion_etablissement[0]?.id ?? null
  );
  const [affichage_fil_mobile, definir_affichage_fil_mobile] = useState(false);
  const [recherche, definir_recherche] = useState('');
  const [texte_reponse, definir_texte_reponse] = useState('');
  const [afficher_nouveau_formulaire, definir_afficher_nouveau_formulaire] = useState(false);

  const [sujet, definir_sujet] = useState('');
  const [nom_interlocuteur, definir_nom_interlocuteur] = useState('');
  const [role_interlocuteur, definir_role_interlocuteur] = useState('');
  const [categorie, definir_categorie] =
    useState<FilDiscussionDirecte['categorie']>('Parent / Tuteur');
  const [message_initial, definir_message_initial] = useState('');

  useEffect(() => {
    if (!fils_discussion_etablissement.some((fil) => fil.id === id_fil_selectionne)) {
      definir_id_fil_selectionne(fils_discussion_etablissement[0]?.id ?? null);
    }
  }, [fils_discussion_etablissement, id_fil_selectionne]);

  const fils_filtres = useMemo(() => {
    const requete = recherche.trim().toLowerCase();
    return fils_discussion_etablissement.filter(
      (fil) =>
        !requete ||
        fil.sujet.toLowerCase().includes(requete) ||
        fil.nom_interlocuteur.toLowerCase().includes(requete)
    );
  }, [fils_discussion_etablissement, recherche]);

  const fil_actif = useMemo(
    () => fils_discussion_etablissement.find((fil) => fil.id === id_fil_selectionne) ?? null,
    [fils_discussion_etablissement, id_fil_selectionne]
  );

  const gerer_selection_fil = (id_fil: string) => {
    definir_id_fil_selectionne(id_fil);
    definir_affichage_fil_mobile(true);
    marquer_fil_lu(id_fil);
  };

  const gerer_envoi_reponse = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!fil_actif || !texte_reponse.trim()) return;
    envoyer_message_direct(fil_actif.id, texte_reponse);
    definir_texte_reponse('');
  };

  const gerer_creation_fil = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!sujet.trim() || !nom_interlocuteur.trim() || !message_initial.trim()) return;
    const nouvel_id = creer_fil_discussion({
      sujet,
      nom_interlocuteur,
      role_interlocuteur: role_interlocuteur || categorie,
      categorie,
      message_initial,
    });
    definir_sujet('');
    definir_nom_interlocuteur('');
    definir_role_interlocuteur('');
    definir_message_initial('');
    definir_afficher_nouveau_formulaire(false);
    definir_id_fil_selectionne(nouvel_id);
    definir_affichage_fil_mobile(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Messagerie Directe & Fils de Discussion
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Boîte de réception interne sécurisée entre direction, enseignants, parents et
            apprenants de {etablissement_actif.nom_court}.
          </p>
        </div>

        <Bouton
          variante="principal"
          taille="sm"
          classe_accent={theme_etab.bouton_principal}
          onClick={() => definir_afficher_nouveau_formulaire((prec) => !prec)}
        >
          <Plus className="w-4 h-4" />
          <span>{afficher_nouveau_formulaire ? 'Fermer' : 'Nouvelle discussion'}</span>
        </Bouton>
      </div>

      {afficher_nouveau_formulaire && (
        <Carte className="space-y-4">
          <h3 className="text-sm font-display font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
            Démarrer un fil de discussion
          </h3>
          <form onSubmit={gerer_creation_fil} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Destinataire *</label>
              <input
                type="text"
                required
                value={nom_interlocuteur}
                onChange={(e) => definir_nom_interlocuteur(e.target.value)}
                placeholder="Nom complet du destinataire"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Catégorie</label>
              <select
                value={categorie}
                onChange={(e) =>
                  definir_categorie(e.target.value as FilDiscussionDirecte['categorie'])
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Parent / Tuteur">
                  {terminologie.etape_tuteurs_active ? 'Parent / Tuteur' : 'Responsable / Contact'}
                </option>
                <option value="Enseignant">{terminologie.enseignant_singulier}</option>
                <option value="Apprenant">{terminologie.apprenant_singulier}</option>
                <option value="Administration">Administration</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">
                Fonction / {terminologie.unite_singulier}
              </label>
              <input
                type="text"
                value={role_interlocuteur}
                onChange={(e) => definir_role_interlocuteur(e.target.value)}
                placeholder={`Ex: ${terminologie.apprenant_singulier} · ${terminologie.unite_singulier}`}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block font-semibold mb-1">Objet de la discussion *</label>
              <input
                type="text"
                required
                value={sujet}
                onChange={(e) => definir_sujet(e.target.value)}
                placeholder={`Ex: Suivi pédagogique (${terminologie.periode_singulier.toLowerCase()})`}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block font-semibold mb-1">Premier message *</label>
              <textarea
                rows={3}
                required
                value={message_initial}
                onChange={(e) => definir_message_initial(e.target.value)}
                placeholder="Rédigez votre message..."
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2">
              <Bouton
                type="button"
                variante="secondaire"
                taille="sm"
                onClick={() => definir_afficher_nouveau_formulaire(false)}
              >
                Annuler
              </Bouton>
              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                classe_accent={theme_etab.bouton_principal}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Envoyer</span>
              </Bouton>
            </div>
          </form>
        </Carte>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Liste des fils de discussion */}
        <Carte
          rembourrage="aucun"
          className={`lg:col-span-4 flex flex-col ${affichage_fil_mobile ? 'hidden lg:flex' : 'flex'}`}
        >
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={recherche}
                onChange={(e) => definir_recherche(e.target.value)}
                placeholder="Rechercher un fil..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
            {fils_filtres.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Aucune conversation trouvée.
              </div>
            ) : (
              fils_filtres.map((fil) => {
                const est_selectionne = fil_actif?.id === fil.id;
                const dernier_message = fil.messages[fil.messages.length - 1];
                return (
                  <button
                    key={fil.id}
                    type="button"
                    onClick={() => gerer_selection_fil(fil.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer ${
                      est_selectionne
                        ? 'bg-slate-100 dark:bg-slate-800/80'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {fil.nom_interlocuteur}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {fil.mis_a_jour_le}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                        {fil.sujet}
                      </span>
                      {fil.messages_non_lus > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0">
                          {fil.messages_non_lus}
                        </span>
                      )}
                    </div>
                    {dernier_message && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                        {dernier_message.contenu}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </Carte>

        {/* Panneau de conversation */}
        <Carte
          rembourrage="aucun"
          className={`lg:col-span-8 flex flex-col min-h-[460px] ${
            affichage_fil_mobile ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {!fil_actif ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <EtatVide
                icone={<MessagesSquare className="w-5 h-5" />}
                titre="Sélectionnez une discussion"
                description="Choisissez un fil dans la colonne de gauche ou ouvrez une nouvelle discussion."
              />
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => definir_affichage_fil_mobile(false)}
                    className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    aria-label="Retour aux discussions"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-display font-bold truncate">{fil_actif.sujet}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {fil_actif.nom_interlocuteur} · {fil_actif.role_interlocuteur}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  {fil_actif.categorie}
                </span>
              </div>

              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[380px]">
                {fil_actif.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.est_de_moi ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs space-y-1 ${
                        message.est_de_moi
                          ? 'bg-slate-900 text-white dark:bg-indigo-600'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <div className="text-[10px] opacity-75 font-medium">
                        {message.nom_expediteur} ({message.role_expediteur})
                      </div>
                      <p className="leading-relaxed">{message.contenu}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {message.envoye_le}
                    </span>
                  </div>
                ))}
              </div>

              <form
                onSubmit={gerer_envoi_reponse}
                className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={texte_reponse}
                  onChange={(e) => definir_texte_reponse(e.target.value)}
                  placeholder="Écrire une réponse directe..."
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <Bouton
                  type="submit"
                  variante="principal"
                  taille="sm"
                  classe_accent={theme_etab.bouton_principal}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer</span>
                </Bouton>
              </form>
            </>
          )}
        </Carte>
      </div>
    </div>
  );
};
