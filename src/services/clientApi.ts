type JetonsApi = {
  access: string;
  refresh: string;
};

type OptionsRequeteApi = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

const URL_API = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const CLE_JETON_ACCES = 'klasik_api_access';
const CLE_JETON_RENOUVELLEMENT = 'klasik_api_refresh';

export class ErreurApi extends Error {
  constructor(
    message: string,
    readonly statut?: number
  ) {
    super(message);
    this.name = 'ErreurApi';
  }
}

let renouvellement_en_cours: Promise<string> | null = null;

function lire_jeton(cle: string): string | null {
  return typeof window === 'undefined' ? null : window.sessionStorage.getItem(cle);
}

function enregistrer_jetons(jetons: JetonsApi): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(CLE_JETON_ACCES, jetons.access);
  window.sessionStorage.setItem(CLE_JETON_RENOUVELLEMENT, jetons.refresh);
}

export function sessionApiPresente(): boolean {
  return lire_jeton(CLE_JETON_ACCES) !== null || lire_jeton(CLE_JETON_RENOUVELLEMENT) !== null;
}

function notifier_deconnexion(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(CLE_JETON_ACCES);
  window.sessionStorage.removeItem(CLE_JETON_RENOUVELLEMENT);
  window.dispatchEvent(new CustomEvent('klasik-api-session-expiree'));
}

function message_erreur(contenu: unknown, statut: number): string {
  if (contenu && typeof contenu === 'object') {
    const objet = contenu as Record<string, unknown>;
    if (typeof objet.message === 'string') return objet.message;
    if (typeof objet.detail === 'string') return objet.detail;
    const premier = Object.values(objet).find((valeur) => typeof valeur === 'string');
    if (typeof premier === 'string') return premier;
  }
  if (statut === 401) return 'Votre session a expiré. Veuillez vous reconnecter.';
  if (statut === 403) return 'Vous n’avez pas la permission d’effectuer cette action.';
  return 'La requête n’a pas pu être traitée par le serveur.';
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
  options: OptionsRequeteApi,
  jeton?: string
): Promise<Response> {
  const entetes = new Headers(options.headers);
  if (jeton) entetes.set('Authorization', `Bearer ${jeton}`);
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
    return await fetch(`${URL_API}${chemin}`, { ...options, headers: entetes, body: corps });
  } catch (erreur: unknown) {
    if (erreur instanceof Error && erreur.name === 'AbortError') throw erreur;
    throw new ErreurApi('Impossible de joindre le serveur. Vérifiez votre connexion réseau.');
  }
}

async function renouveler_jeton(): Promise<string> {
  if (renouvellement_en_cours) return renouvellement_en_cours;
  const jeton_renouvellement = lire_jeton(CLE_JETON_RENOUVELLEMENT);
  if (!jeton_renouvellement) {
    notifier_deconnexion();
    throw new ErreurApi('Votre session a expiré. Veuillez vous reconnecter.', 401);
  }

  renouvellement_en_cours = (async () => {
    const reponse = await fetch_json('/auth/token/refresh/', {
      method: 'POST',
      body: { refresh: jeton_renouvellement },
    });
    const contenu = await lire_reponse(reponse);
    if (!reponse.ok || !contenu || typeof contenu !== 'object') {
      notifier_deconnexion();
      throw new ErreurApi(message_erreur(contenu, reponse.status), reponse.status);
    }
    const nouveaux_jetons = contenu as Partial<JetonsApi>;
    if (typeof nouveaux_jetons.access !== 'string' || typeof nouveaux_jetons.refresh !== 'string') {
      notifier_deconnexion();
      throw new ErreurApi('Le serveur a renvoyé un jeton de session invalide.', reponse.status);
    }
    enregistrer_jetons(nouveaux_jetons as JetonsApi);
    return nouveaux_jetons.access;
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
  const jeton = lire_jeton(CLE_JETON_ACCES);
  let reponse = await fetch_json(chemin, options, jeton ?? undefined);
  if (reponse.status === 401 && !chemin.startsWith('/auth/token/')) {
    try {
      const nouveau_jeton = await renouveler_jeton();
      reponse = await fetch_json(chemin, options, nouveau_jeton);
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
  const jeton = lire_jeton(CLE_JETON_ACCES);
  let reponse = await fetch_json(chemin, options, jeton ?? undefined);
  if (reponse.status === 401 && !chemin.startsWith('/auth/token/')) {
    try {
      const nouveau_jeton = await renouveler_jeton();
      reponse = await fetch_json(chemin, options, nouveau_jeton);
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
  const jetons = await requeteApi<JetonsApi>('/auth/token/', {
    method: 'POST',
    body: { courriel, password: mot_de_passe },
  });
  enregistrer_jetons(jetons);
}

export async function connecterDemoApi(
  id_utilisateur: string,
  id_etablissement?: string
): Promise<void> {
  const jetons = await requeteApi<JetonsApi>('/auth/demo/', {
    method: 'POST',
    body: { id_utilisateur, id_etablissement },
  });
  enregistrer_jetons(jetons);
}

export async function deconnecterApi(): Promise<void> {
  const refresh = lire_jeton(CLE_JETON_RENOUVELLEMENT);
  if (!refresh) {
    notifier_deconnexion();
    return;
  }
  try {
    await requeteApi<null>('/auth/token/blacklist/', {
      method: 'POST',
      body: { refresh },
    });
  } finally {
    notifier_deconnexion();
  }
}
