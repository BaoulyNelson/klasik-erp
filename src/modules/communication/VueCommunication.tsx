import React, { useState } from 'react';
import { Mail, MessageSquare, Send, Smartphone } from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { PROFILS_PAYS } from '../../configuration/regions_devises';
import { utiliserErp } from '../../contexte/ContexteErp';
import { MessageCommunication } from '../../modeles/erp';

const MODELES_MESSAGES = [
  {
    libelle: 'Rappel de paiement',
    titre: 'Rappel d’échéance scolarité',
    contenu:
      'Bonjour, nous vous rappelons qu’une tranche de scolarité arrive à échéance cette semaine. Paiement possible par carte bancaire, mobile money, virement ou à l’économat.',
  },
  {
    libelle: 'Convocation parents / tuteurs',
    titre: 'Convocation rencontre pédagogique',
    contenu:
      'Chers parents/tuteurs, la direction vous prie de bien vouloir vous présenter au secrétariat ce vendredi entre 9h00 et 13h00.',
  },
  {
    libelle: 'Absence signalée',
    titre: 'Notification d’absence',
    contenu:
      'Absence constatée ce jour. Merci de transmettre un justificatif auprès de la direction des études.',
  },
  {
    libelle: 'Publication résultats',
    titre: 'Résultats disponibles sur le portail',
    contenu:
      'Les notes et bulletins de la période en cours sont désormais consultables depuis votre portail en ligne.',
  },
];

export const VueCommunication: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    unites_etablissement,
    apprenants_etablissement,
    communications_etablissement,
    envoyer_communication,
    a_permission,
  } = utiliserErp();

  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type);
  const profil_pays = PROFILS_PAYS[etablissement_actif.code_pays] ?? PROFILS_PAYS.HT;
  const [titre, definir_titre] = useState(MODELES_MESSAGES[0].titre);
  const [contenu, definir_contenu] = useState(MODELES_MESSAGES[0].contenu);
  const [canal, definir_canal] = useState<MessageCommunication['canal']>('WhatsApp');
  const [audience, definir_audience] = useState(
    `Tous les ${terminologie.apprenant_pluriel.toLowerCase()}`
  );

  const gerer_envoi = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!titre.trim() || !contenu.trim()) return;
    envoyer_communication({
      titre: titre.trim(),
      contenu: contenu.trim(),
      canal,
      audience,
      nombre_destinataires: apprenants_etablissement.length,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
          Communication, Annonces & Modèles multicanaux
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Diffusion interne, SMS, WhatsApp ({profil_pays.indicatif_telephonique} · {profil_pays.nom}
          ) et courriel avec modèles prêts à l’emploi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {a_permission('communication:envoyer') && (
          <Carte className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-display font-bold">Nouveau message / Annonce</h3>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {MODELES_MESSAGES.map((modele) => (
                <button
                  key={modele.libelle}
                  type="button"
                  onClick={() => {
                    definir_titre(modele.titre);
                    definir_contenu(modele.contenu);
                  }}
                  className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {modele.libelle}
                </button>
              ))}
            </div>

            <form onSubmit={gerer_envoi} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Canal</label>
                  <select
                    value={canal}
                    onChange={(e) =>
                      definir_canal(e.target.value as MessageCommunication['canal'])
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="WhatsApp">
                      WhatsApp ({profil_pays.indicatif_telephonique})
                    </option>
                    <option value="SMS">SMS ({profil_pays.indicatif_telephonique})</option>
                    <option value="Courriel">Courriel</option>
                    <option value="Interne">Annonce portail interne</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Public cible</label>
                  <select
                    value={audience}
                    onChange={(e) => definir_audience(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value={`Tous les ${terminologie.apprenant_pluriel.toLowerCase()}`}>
                      Tous ({apprenants_etablissement.length})
                    </option>
                    {etablissement_actif.type === 'SCOLAIRE' && (
                      <option value="Parents et tuteurs">Parents et tuteurs</option>
                    )}
                    <option value="Dossiers avec solde impayé">Dossiers avec solde impayé</option>
                    {unites_etablissement.map((unite) => (
                      <option key={unite.id} value={unite.nom}>
                        {unite.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Objet *</label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => definir_titre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Message *</label>
                <textarea
                  rows={4}
                  value={contenu}
                  onChange={(e) => definir_contenu(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <Bouton
                type="submit"
                variante="principal"
                taille="sm"
                classe_accent={theme_etab.bouton_principal}
                className="w-full"
              >
                <Send className="w-4 h-4" />
                <span>Envoyer la diffusion ({canal})</span>
              </Bouton>
            </form>
          </Carte>
        )}

        <Carte
          rembourrage="aucun"
          className={a_permission('communication:envoyer') ? 'lg:col-span-7' : 'lg:col-span-12'}
        >
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-display font-bold">
              Journal des communications envoyées ({communications_etablissement.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {communications_etablissement.map((communication) => (
              <div key={communication.id} className="px-5 py-3.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    {communication.canal === 'Courriel' ? (
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{communication.titre}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0">
                    {communication.envoye_le}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{communication.contenu}</p>
                <div className="text-[11px] text-slate-400">
                  {communication.canal} · Cible : {communication.audience} (
                  {communication.nombre_destinataires} destinataires) · Par{' '}
                  {communication.envoye_par}
                </div>
              </div>
            ))}
          </div>
        </Carte>
      </div>
    </div>
  );
};
