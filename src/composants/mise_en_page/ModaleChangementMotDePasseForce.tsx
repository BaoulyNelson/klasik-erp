import React, { useState } from 'react';
import { Lock, LogOut, ShieldAlert } from 'lucide-react';
import { utiliserErp } from '../../contexte/ContexteErp';
import { Bouton } from '../interface/Bouton';
import { ChampMotDePasse } from '../interface/ChampMotDePasse';
import { JaugeForceMotDePasse } from '../interface/JaugeForceMotDePasse';
import { Modale } from '../interface/Modale';

export const ModaleChangementMotDePasseForce: React.FC = () => {
  const {
    mode_affichage,
    utilisateur_actif,
    finaliser_changement_mot_de_passe_obligatoire,
    deconnecter,
  } = utiliserErp();

  const [nouveau_mot_de_passe, definir_nouveau_mot_de_passe] = useState('');
  const [confirmation_mot_de_passe, definir_confirmation_mot_de_passe] = useState('');
  const [erreur, definir_erreur] = useState<string | null>(null);
  const [en_cours, definir_en_cours] = useState(false);

  const est_ouverte =
    mode_affichage === 'espace_travail' && utilisateur_actif.doit_changer_mot_de_passe === true;

  const gerer_soumission = async (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (nouveau_mot_de_passe !== confirmation_mot_de_passe) {
      definir_erreur('Les deux mots de passe saisis ne correspondent pas.');
      return;
    }
    definir_en_cours(true);
    try {
      const resultat = await finaliser_changement_mot_de_passe_obligatoire(nouveau_mot_de_passe);
      if (!resultat.ok) {
        definir_erreur(resultat.erreur ?? 'Mot de passe non valide.');
        return;
      }
      definir_erreur(null);
      definir_nouveau_mot_de_passe('');
      definir_confirmation_mot_de_passe('');
    } catch (erreur: unknown) {
      definir_erreur(
        erreur instanceof Error ? erreur.message : 'Le changement de mot de passe a échoué.'
      );
    } finally {
      definir_en_cours(false);
    }
  };

  return (
    <Modale
      ouverte={est_ouverte}
      sur_fermeture={() => {}}
      titre="Renouvellement de mot de passe obligatoire"
      sous_titre={`Compte : ${utilisateur_actif.nom_complet} (${utilisateur_actif.courriel})`}
      classe_largeur_max="max-w-md"
    >
      <form onSubmit={gerer_soumission} className="space-y-4 text-xs">
        <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
            Votre administrateur exige le changement de votre mot de passe temporaire avant
            d’accéder à l’espace de travail.
          </p>
        </div>

        <div>
          <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Nouveau mot de passe personnel *
          </label>
          <ChampMotDePasse
            required
            icone_gauche={<Lock className="w-4 h-4" />}
            value={nouveau_mot_de_passe}
            onChange={(evenement) => definir_nouveau_mot_de_passe(evenement.target.value)}
            placeholder="Minimum 8 caractères (lettre + chiffre)"
            className="w-full py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
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
          <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Confirmer le nouveau mot de passe *
          </label>
          <ChampMotDePasse
            required
            icone_gauche={<Lock className="w-4 h-4" />}
            value={confirmation_mot_de_passe}
            onChange={(evenement) => definir_confirmation_mot_de_passe(evenement.target.value)}
            placeholder="Saisir à nouveau le mot de passe"
            className="w-full py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>

        {erreur && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-2.5">
            {erreur}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <Bouton type="button" variante="fantome" taille="sm" onClick={deconnecter}>
            <LogOut className="w-3.5 h-3.5" />
            <span>Se déconnecter</span>
          </Bouton>
          <Bouton type="submit" variante="principal" taille="sm" disabled={en_cours}>
            <Lock className="w-3.5 h-3.5" />
            <span>{en_cours ? 'Enregistrement…' : 'Valider et accéder'}</span>
          </Bouton>
        </div>
      </form>
    </Modale>
  );
};
