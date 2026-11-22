// Service de stockage persistant des fichiers téléversés (IndexedDB + repli mémoire)
// Permet aux enseignants et apprenants de déposer de vrais fichiers (PDF, DOCX, images, ZIP...)
// sans saturer le quota limité de localStorage.

import { requeteApi, requeteApiBinaire } from './clientApi';

export interface FichierLocalStocke {
  id: string;
  nom_fichier: string;
  type_mime: string;
  taille_octets: number;
  blob: Blob;
  enregistre_le: string;
}

const NOM_BASE_INDEXEDDB = 'klasik_erp_fichiers';
const VERSION_BASE = 1;
const NOM_MAGASIN = 'fichiers';
const TAILLE_MAX_OCTETS = 25 * 1024 * 1024; // 25 Mo par fichier
const SOURCE_API = import.meta.env.PROD || import.meta.env.VITE_SOURCE_DONNEES === 'api';

const memoire_repli = new Map<string, FichierLocalStocke>();

function ouvrir_base_fichiers(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const requete = indexedDB.open(NOM_BASE_INDEXEDDB, VERSION_BASE);
      requete.onupgradeneeded = () => {
        const db = requete.result;
        if (!db.objectStoreNames.contains(NOM_MAGASIN)) {
          db.createObjectStore(NOM_MAGASIN, { keyPath: 'id' });
        }
      };
      requete.onsuccess = () => resolve(requete.result);
      requete.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function formater_taille_fichier(octets?: number): string {
  if (!octets || octets <= 0) return '';
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export async function enregistrer_fichier_local(
  fichier: File,
  id_etablissement?: string
): Promise<{
  ok: boolean;
  erreur?: string;
  id_fichier_local?: string;
  nom_fichier?: string;
  type_mime?: string;
  taille_octets?: number;
}> {
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return {
      ok: false,
      erreur: `Le fichier « ${fichier.name} » dépasse la limite autorisée de 25 Mo.`,
    };
  }

  if (SOURCE_API) {
    if (!id_etablissement) {
      return {
        ok: false,
        erreur: 'L’établissement actif est requis pour téléverser ce fichier.',
      };
    }
    const corps = new FormData();
    corps.append('fichier', fichier);
    const resultat = await requeteApi<{
      id: string;
      nom_fichier: string;
      type_mime: string;
      taille_octets: number;
    }>(`/etablissements/${encodeURIComponent(id_etablissement)}/fichiers/`, {
      method: 'POST',
      body: corps,
    });
    return {
      ok: true,
      id_fichier_local: resultat.id,
      nom_fichier: resultat.nom_fichier,
      type_mime: resultat.type_mime,
      taille_octets: resultat.taille_octets,
    };
  }

  const id = `fic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const enregistrement: FichierLocalStocke = {
    id,
    nom_fichier: fichier.name,
    type_mime: fichier.type || 'application/octet-stream',
    taille_octets: fichier.size,
    blob: fichier,
    enregistre_le: new Date().toISOString(),
  };

  memoire_repli.set(id, enregistrement);

  const db = await ouvrir_base_fichiers();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(NOM_MAGASIN, 'readwrite');
        tx.objectStore(NOM_MAGASIN).put(enregistrement);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  return {
    ok: true,
    id_fichier_local: id,
    nom_fichier: fichier.name,
    type_mime: enregistrement.type_mime,
    taille_octets: fichier.size,
  };
}

export async function lire_fichier_local(id_fichier: string): Promise<FichierLocalStocke | null> {
  if (SOURCE_API) {
    const resultat = await requeteApiBinaire(`/fichiers/${encodeURIComponent(id_fichier)}/`);
    const fichier: FichierLocalStocke = {
      id: id_fichier,
      nom_fichier: resultat.nom_fichier,
      type_mime: resultat.blob.type || 'application/octet-stream',
      taille_octets: resultat.blob.size,
      blob: resultat.blob,
      enregistre_le: new Date().toISOString(),
    };
    memoire_repli.set(id_fichier, fichier);
    return fichier;
  }

  const en_memoire = memoire_repli.get(id_fichier);
  if (en_memoire) return en_memoire;

  const db = await ouvrir_base_fichiers();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(NOM_MAGASIN, 'readonly');
      const req = tx.objectStore(NOM_MAGASIN).get(id_fichier);
      req.onsuccess = () => {
        const resultat = req.result as FichierLocalStocke | undefined;
        if (resultat) memoire_repli.set(id_fichier, resultat);
        resolve(resultat ?? null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function telecharger_fichier_local(
  id_fichier: string,
  nom_repli?: string
): Promise<boolean> {
  const fichier = await lire_fichier_local(id_fichier);
  if (!fichier) return false;

  const url_objet = URL.createObjectURL(fichier.blob);
  const lien = document.createElement('a');
  lien.href = url_objet;
  lien.download = fichier.nom_fichier || nom_repli || 'document';
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  setTimeout(() => URL.revokeObjectURL(url_objet), 10000);
  return true;
}

export async function obtenir_url_apercu_fichier_local(
  id_fichier: string
): Promise<{ url: string; type_mime: string; nom_fichier: string } | null> {
  const fichier = await lire_fichier_local(id_fichier);
  if (!fichier) return null;
  const url = URL.createObjectURL(fichier.blob);
  return {
    url,
    type_mime: fichier.type_mime,
    nom_fichier: fichier.nom_fichier,
  };
}
