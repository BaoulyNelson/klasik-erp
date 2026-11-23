type OptionsRequeteApi = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

const URL_API = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const CLE_SESSION_API = 'klasik_api_session';

export class ErreurApi extends Error {
  constructor(
    message: string,
    readonly statut?: number
  ) {
    super(message);
    this.name = 'ErreurApi';
  }
}

let renouvellement_en_cours: Promise<void> | null = null;
let csrf_en_cours: Promise<string> | null = null;
let jeton_csrf: string | null = null;

export function sessionApiPresente(): boolean {
  return typeof window !== 'undefined' &&
    window.sessionStorage.getItem(CLE_SESSION_API) === '1';
}

export function installer_session_api(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(CLE_SESSION_API, '1');
  }
}

function notifier_deconnexion(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(CLE_SESSION_API);
  jeton_csrf = null;
  window.dispatchEvent(new CustomEvent('klasik-api-session-expiree'));
}

function message_erreur(contenu: unknown, statut: number): string {
  if (contenu && typeof contenu === 'object') {
    const objet = contenu as Record<string, unknown>;
    if (typeof objet.message === 'string') {
      if (statut === 400 && objet.details !== undefined) {
        const details = formater_details_erreur(objet.details);
        if (details) return `${objet.message} ${details}`;
      }
      return objet.message;
    }
    if (typeof objet.detail === 'string') return objet.detail;
    const premier = Object.values(objet).find((valeur) => typeof valeur === 'string');
    if (typeof premier === 'string') return premier;
  }
  if (statut === 401) return 'Votre session a expiré. Veuillez vous reconnecter.';
  if (statut === 403) return 'Vous n’avez pas la permission d’effectuer cette action.';
  return 'La requête n’a pas pu être traitée par le serveur.';
}

function formater_details_erreur(details: unknown, champ_parent = ''): string {
  if (typeof details === 'string') {
    return champ_parent ? `${champ_parent.replaceAll('_', ' ')} : ${details}` : details;
  }
  if (Array.isArray(details)) {
    return details
      .map((detail) => formater_details_erreur(detail, champ_parent))
      .filter(Boolean)
      .join(' ');
  }
  if (!details || typeof details !== 'object') return '';

  return Object.entries(details)
    .map(([champ, valeur]) =>
      formater_details_erreur(valeur, champ_parent ? `${champ_parent}.${champ}` : champ)
    )
    .filter(Boolean)
    .join(' ');
}

async function lire_reponse(reponse: Response): Promise<unknown> {
  if (reponse.status === 204 || reponse.status === 205) return null;
  const texte = await reponse.text();
  if (!texte) return null;
  try {
    return JSON.parse(texte) as unknown;
  } catch {
    return texte;
  }
}

async function fetch_json(
  chemin: string,
  options: OptionsRequeteApi
): Promise<Response> {
  const entetes = new Headers(options.headers);
  const methode = (options.method ?? 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(methode)) {
    entetes.set('X-CSRFToken', await obtenir_jeton_csrf());
  }
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    entetes.set('Content-Type', 'application/json');
  }
  let corps: BodyInit | undefined;
  if (options.body instanceof FormData || typeof options.body === 'string') {
    corps = options.body;
  } else if (options.body !== undefined) {
    corps = JSON.stringify(options.body);
  }
  try {
    return await fetch(`${URL_API}${chemin}`, {
      ...options,
      credentials: 'include',
      headers: entetes,
      body: corps,
    });
  } catch (erreur: unknown) {
    if (erreur instanceof Error && erreur.name === 'AbortError') throw erreur;
    throw new ErreurApi('Impossible de joindre le serveur. Vérifiez votre connexion réseau.');
  }
}

async function obtenir_jeton_csrf(): Promise<string> {
  if (jeton_csrf) return jeton_csrf;
  if (csrf_en_cours) return csrf_en_cours;

  csrf_en_cours = (async () => {
    let reponse: Response;
    try {
      reponse = await fetch(`${URL_API}/auth/csrf/`, { credentials: 'include' });
    } catch (erreur: unknown) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw erreur;
      throw new ErreurApi('Impossible d’obtenir le jeton de sécurité. Vérifiez le serveur.');
    }
    const contenu = await lire_reponse(reponse);
    if (!reponse.ok || !contenu || typeof contenu !== 'object') {
      throw new ErreurApi(message_erreur(contenu, reponse.status), reponse.status);
    }
    const csrf = (contenu as { csrf_token?: unknown }).csrf_token;
    if (typeof csrf !== 'string' || csrf.length === 0) {
      throw new ErreurApi('Le serveur n’a pas fourni le jeton de sécurité.', reponse.status);
    }
    jeton_csrf = csrf;
    return csrf;
  })();

  try {
    return await csrf_en_cours;
  } finally {
    csrf_en_cours = null;
  }
}

async function renouveler_jeton(): Promise<void> {
  if (renouvellement_en_cours) return renouvellement_en_cours;

  renouvellement_en_cours = (async () => {
    const reponse = await fetch_json('/auth/token/refresh/', { method: 'POST' });
    const contenu = await lire_reponse(reponse);
    if (!reponse.ok) {
      notifier_deconnexion();
      throw new ErreurApi(message_erreur(contenu, reponse.status), reponse.status);
    }
  })();

  try {
    return await renouvellement_en_cours;
  } finally {
    renouvellement_en_cours = null;
  }
}

export async function requeteApi<T>(
  chemin: string,
  options: OptionsRequeteApi = {}
): Promise<T> {
  let reponse = await fetch_json(chemin, options);
  if (reponse.status === 401 && !chemin.startsWith('/auth/token/')) {
    try {
      await renouveler_jeton();
      reponse = await fetch_json(chemin, options);
    } catch (erreur: unknown) {
      if (erreur instanceof ErreurApi && erreur.statut === 401) notifier_deconnexion();
      throw erreur;
    }
  }

  const contenu = await lire_reponse(reponse);
  if (!reponse.ok) {
    if (reponse.status === 401) notifier_deconnexion();
    throw new ErreurApi(message_erreur(contenu, reponse.status), reponse.status);
  }
  return contenu as T;
}

export async function requeteApiBinaire(
  chemin: string,
  signal?: AbortSignal
): Promise<{ blob: Blob; nom_fichier: string }> {
  const options: OptionsRequeteApi = { method: 'GET', signal };
  let reponse = await fetch_json(chemin, options);
  if (reponse.status === 401 && !chemin.startsWith('/auth/token/')) {
    try {
      await renouveler_jeton();
      reponse = await fetch_json(chemin, options);
    } catch (erreur: unknown) {
      if (erreur instanceof ErreurApi && erreur.statut === 401) notifier_deconnexion();
      throw erreur;
    }
  }
  if (!reponse.ok) {
    const contenu = await lire_reponse(reponse);
    if (reponse.status === 401) notifier_deconnexion();
    throw new ErreurApi(message_erreur(contenu, reponse.status), reponse.status);
  }
  const disposition = reponse.headers.get('Content-Disposition') ?? '';
  const nomUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const nomAscii = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const nom_fichier = nomUtf8
    ? decodeURIComponent(nomUtf8)
    : nomAscii ?? 'document';
  return { blob: await reponse.blob(), nom_fichier };
}

export async function connecterApi(courriel: string, mot_de_passe: string): Promise<void> {
  await requeteApi('/auth/token/', {
    method: 'POST',
    body: { courriel, password: mot_de_passe },
  });
  installer_session_api();
}

export async function connecterGoogleApi(id_token: string): Promise<void> {
  await requeteApi('/auth/google/', {
    method: 'POST',
    body: { id_token },
  });
  installer_session_api();
}

export async function envoyerMessageContactApi(demande: {
  nom: string;
  courriel: string;
  sujet: string;
  message: string;
}): Promise<void> {
  await requeteApi('/contact/', {
    method: 'POST',
    body: demande,
  });
}

export async function deconnecterApi(): Promise<void> {
  try {
    await requeteApi<null>('/auth/logout/', { method: 'POST' });
  } finally {
    notifier_deconnexion();
  }
}
