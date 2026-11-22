import { FirebaseOptions, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const configurationFirebase: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
const configuration_firebase_complete = Boolean(
  configurationFirebase.apiKey &&
    configurationFirebase.authDomain &&
    configurationFirebase.projectId &&
    configurationFirebase.appId &&
    import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
);
const application_firebase = configuration_firebase_complete
  ? initializeApp(configurationFirebase)
  : null;
export const base_firestore: Firestore | null = application_firebase
  ? getFirestore(application_firebase, import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID)
  : null;
export const auth_firebase: Auth | null = application_firebase
  ? getAuth(application_firebase)
  : null;

function exiger_configuration_firebase(): {
  auth: Auth;
  firestore: Firestore;
} {
  if (!auth_firebase || !base_firestore) {
    throw new Error(
      'La connexion Google n’est pas configurée. Renseignez les paramètres Firebase dans le fichier .env.'
    );
  }
  return { auth: auth_firebase, firestore: base_firestore };
}

const fournisseur_google = new GoogleAuthProvider();
fournisseur_google.setCustomParameters({ prompt: 'select_account' });

export enum TypeOperationFirestore {
  CREATION = 'create',
  MISE_A_JOUR = 'update',
  SUPPRESSION = 'delete',
  LISTE = 'list',
  LECTURE = 'get',
  ECRITURE = 'write',
}

export interface InfoErreurFirestore {
  erreur: string;
  type_operation: TypeOperationFirestore;
  chemin: string | null;
  info_authentification: {
    id_utilisateur?: string | null;
    courriel?: string | null;
    courriel_verifie?: boolean | null;
    est_anonyme?: boolean | null;
    id_locataire?: string | null;
    fournisseurs: {
      id_fournisseur?: string | null;
      courriel?: string | null;
    }[];
  };
}

export function gerer_erreur_firestore(
  erreur: unknown,
  type_operation: TypeOperationFirestore,
  chemin: string | null
): never {
  const info_erreur: InfoErreurFirestore = {
    erreur: erreur instanceof Error ? erreur.message : String(erreur),
    info_authentification: {
      id_utilisateur: auth_firebase?.currentUser?.uid,
      courriel: auth_firebase?.currentUser?.email,
      courriel_verifie: auth_firebase?.currentUser?.emailVerified,
      est_anonyme: auth_firebase?.currentUser?.isAnonymous,
      id_locataire: auth_firebase?.currentUser?.tenantId,
      fournisseurs:
        auth_firebase?.currentUser?.providerData?.map((fournisseur) => ({
          id_fournisseur: fournisseur.providerId,
          courriel: fournisseur.email,
        })) || [],
    },
    type_operation,
    chemin,
  };
  console.error('Erreur Firestore : ', JSON.stringify(info_erreur));
  throw new Error(JSON.stringify(info_erreur));
}

async function tester_connexion_firestore() {
  if (!base_firestore) return;
  try {
    await getDocFromServer(doc(base_firestore, 'test', 'connection'));
  } catch (erreur) {
    if (erreur instanceof Error && erreur.message.includes('the client is offline')) {
      console.error('Veuillez vérifier votre configuration Firebase.');
    }
  }
}
void tester_connexion_firestore();

export interface IdentiteAuthentificationGoogle {
  uid: string;
  courriel: string;
  nom_affiche: string;
  url_photo?: string;
}

export async function connecter_avec_popup_google(): Promise<IdentiteAuthentificationGoogle> {
  const { auth, firestore } = exiger_configuration_firebase();
  const resultat = await signInWithPopup(auth, fournisseur_google);
  const utilisateur_fb = resultat.user;
  if (!utilisateur_fb.email) {
    throw new Error('Aucune adresse courriel associée à ce compte Google.');
  }

  const nom_affiche = (
    utilisateur_fb.displayName ||
    utilisateur_fb.email.split('@')[0] ||
    'Utilisateur'
  ).slice(0, 120);
  const url_photo =
    utilisateur_fb.photoURL && utilisateur_fb.photoURL.length <= 1024
      ? utilisateur_fb.photoURL
      : undefined;

  const chemin_utilisateur = `users/${utilisateur_fb.uid}`;
  try {
    // Les clés du document Firestore respectent strictement le schéma validé dans firestore.rules
    const charge_utile: Record<string, unknown> = {
      uid: utilisateur_fb.uid,
      email: utilisateur_fb.email,
      displayName: nom_affiche,
      updatedAt: serverTimestamp(),
    };
    if (url_photo) {
      charge_utile.photoUrl = url_photo;
    }

    const doc_existant = await getDocFromServer(
      doc(firestore, 'users', utilisateur_fb.uid)
    ).catch(() => null);
    if (!doc_existant || !doc_existant.exists()) {
      charge_utile.createdAt = serverTimestamp();
      await setDoc(doc(firestore, 'users', utilisateur_fb.uid), charge_utile);
    } else {
      await setDoc(doc(firestore, 'users', utilisateur_fb.uid), charge_utile, { merge: true });
    }
  } catch (erreur) {
    // Repli non bloquant si hors-ligne ou latence réseau après la fenêtre Google
    try {
      gerer_erreur_firestore(erreur, TypeOperationFirestore.ECRITURE, chemin_utilisateur);
    } catch {
      // Authentification Google réussie ; la session locale reste opérationnelle
    }
  }

  return {
    uid: utilisateur_fb.uid,
    courriel: utilisateur_fb.email,
    nom_affiche,
    url_photo,
  };
}

export function abonner_etat_authentification_firebase(
  rappel: (utilisateur: User | null) => void
) {
  if (!auth_firebase) {
    rappel(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth_firebase, rappel);
}

export async function deconnecter_firebase(): Promise<void> {
  try {
    if (auth_firebase?.currentUser) {
      await signOut(auth_firebase);
    }
  } catch {
    // Ignorer si déjà déconnecté
  }
}
