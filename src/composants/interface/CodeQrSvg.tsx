import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ProprietesCodeQrSvg {
  valeur: string;
  taille?: number;
}

/**
 * Générateur de code QR ISO scannable (via qrcode.react)
 * pour badges d'accès, reçus 80 mm, fiches d'inscription et diplômes officiels.
 */
export const CodeQrSvg: React.FC<ProprietesCodeQrSvg> = ({ valeur, taille = 76 }) => {
  return (
    <div
      className="inline-flex items-center justify-center bg-white p-1.5 rounded border border-slate-200 shrink-0"
      aria-label={`Code QR vérifiable ${valeur}`}
    >
      <QRCodeSVG
        value={valeur || 'KLASIK-ERP'}
        size={taille}
        level="M"
        bgColor="#ffffff"
        fgColor="#0f172a"
      />
    </div>
  );
};
