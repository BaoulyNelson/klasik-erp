import React, { useEffect, useState } from 'react';
import { CloudOff, Download, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { utiliserErp } from '../../contexte/ContexteErp';
import { Bouton } from '../interface/Bouton';
import { Modale } from '../interface/Modale';

// Interface technique de l'événement navigateur beforeinstallprompt
interface EvenementInstallationPwa extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const BoutonInstallationPwa: React.FC = () => {
  const { configuration_plateforme } = utiliserErp();
  const [invite_differee, definir_invite_differee] =
    useState<EvenementInstallationPwa | null>(null);
  const [est_installe, definir_est_installe] = useState(false);
  const [est_ios, definir_est_ios] = useState(false);
  const [afficher_guide_ios, definir_afficher_guide_ios] = useState(false);

  useEffect(() => {
    const mode_autonome =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    definir_est_installe(mode_autonome);

    const agent_utilisateur = window.navigator.userAgent.toLowerCase();
    definir_est_ios(/iphone|ipad|ipod/.test(agent_utilisateur));

    const avant_installation = (evenement: Event) => {
      evenement.preventDefault();
      definir_invite_differee(evenement as EvenementInstallationPwa);
    };
    const apres_installation = () => {
      definir_est_installe(true);
      definir_invite_differee(null);
    };
    window.addEventListener('beforeinstallprompt', avant_installation);
    window.addEventListener('appinstalled', apres_installation);
    return () => {
      window.removeEventListener('beforeinstallprompt', avant_installation);
      window.removeEventListener('appinstalled', apres_installation);
    };
  }, []);

  if (est_installe) return null;

  if (invite_differee) {
    return (
      <Bouton
        variante="secondaire"
        taille="sm"
        onClick={async () => {
          await invite_differee.prompt();
          const { outcome } = await invite_differee.userChoice;
          if (outcome === 'accepted') {
            definir_est_installe(true);
            definir_invite_differee(null);
          }
        }}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden xl:inline">Installer l’app</span>
      </Bouton>
    );
  }

  if (est_ios) {
    return (
      <>
        <Bouton
          variante="secondaire"
          taille="sm"
          onClick={() => definir_afficher_guide_ios(true)}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Installer (iOS)</span>
        </Bouton>
        <Modale
          ouverte={afficher_guide_ios}
          sur_fermeture={() => definir_afficher_guide_ios(false)}
          titre={`Installer ${configuration_plateforme.nom_plateforme} sur iPhone / iPad`}
          classe_largeur_max="max-w-sm"
          pied_page={
            <Bouton variante="secondaire" onClick={() => definir_afficher_guide_ios(false)}>
              Fermer
            </Bouton>
          }
        >
          <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal pl-4">
            <li>
              Appuyez sur le bouton <strong>Partager</strong> dans la barre Safari.
            </li>
            <li>
              Faites défiler vers le bas et choisissez <strong>Sur l’écran d’accueil</strong>.
            </li>
          </ol>
        </Modale>
      </>
    );
  }

  return null;
};

export const ControleSynchroHorsLigne: React.FC = () => {
  const {
    navigateur_en_ligne,
    hors_ligne_simule,
    definir_hors_ligne_simule,
    file_hors_ligne,
    synchroniser_file_hors_ligne,
  } = utiliserErp();

  const effectivement_en_ligne = navigateur_en_ligne && !hors_ligne_simule;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => definir_hors_ligne_simule(!hors_ligne_simule)}
        title={
          effectivement_en_ligne
            ? 'Connexion active — Cliquer pour simuler une coupure réseau (mode hors-ligne / faible connectivité)'
            : 'Mode hors-ligne actif — Cliquer pour rétablir la connexion'
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
          effectivement_en_ligne
            ? 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
        }`}
      >
        {effectivement_en_ligne ? (
          <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        )}
        <span className="hidden xl:inline">
          {effectivement_en_ligne ? 'En ligne' : 'Hors-ligne'}
        </span>
      </button>

      {file_hors_ligne.length > 0 && (
        <button
          type="button"
          onClick={synchroniser_file_hors_ligne}
          title="Synchroniser la file locale"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer whitespace-nowrap"
        >
          {effectivement_en_ligne ? (
            <RefreshCw className="w-3.5 h-3.5" />
          ) : (
            <CloudOff className="w-3.5 h-3.5" />
          )}
          <span className="font-mono tabular-nums">Synchro ({file_hors_ligne.length})</span>
        </button>
      )}
    </div>
  );
};
