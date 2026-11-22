import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { utiliserErp } from '../../contexte/ContexteErp';

export const ConteneurNotificationsToast: React.FC = () => {
  const { notifications_toast, fermer_toast } = utiliserErp();

  if (notifications_toast.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto z-50 flex flex-col gap-2 md:max-w-sm md:w-full pointer-events-none"
      aria-live="polite"
    >
      {notifications_toast.map((toast) => {
        const Icone =
          toast.variante === 'success'
            ? CheckCircle2
            : toast.variante === 'warning'
              ? AlertTriangle
              : toast.variante === 'error'
                ? XCircle
                : Info;

        const couleur_icone =
          toast.variante === 'success'
            ? 'text-emerald-600 dark:text-emerald-400'
            : toast.variante === 'warning'
              ? 'text-amber-600 dark:text-amber-400'
              : toast.variante === 'error'
                ? 'text-red-600 dark:text-red-400'
                : 'text-indigo-600 dark:text-indigo-400';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg dark:border-slate-700 dark:bg-slate-900 flex items-start gap-3"
          >
            <Icone className={`w-5 h-5 shrink-0 mt-0.5 ${couleur_icone}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {toast.titre}
              </p>
              {toast.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => fermer_toast(toast.id)}
              aria-label="Fermer la notification"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
