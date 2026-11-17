export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user?: SupabaseUser;
};

type AuthPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: SupabaseUser;
  msg?: string;
  message?: string;
  error_description?: string;
  error?: string;
};

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\\/+$/, '');
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';
const STORAGE_KEY = 'madsi.supabase.auth.v1';
const listeners = new Set<(session: SupabaseSession | null) => void>();
let refreshInFlight: Promise<SupabaseSession | null> | null = null;

export class SupabaseAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'SupabaseAuthError';
    this.status = status;
  }
}

function configuration() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new SupabaseAuthError(503, 'Authentication is not configured for this deployment.');
  }
  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}

function browserStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function readStoredSession(): SupabaseSession | null {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SupabaseSession>;
    if (
      typeof value.access_token !== 'string' ||
      typeof value.refresh_token !== 'string' ||
      typeof value.expires_at !== 'number'
    ) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
    return value as SupabaseSession;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

function updateNavigationMarker(active: boolean) {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = active
    ? `madsi_access=1; Path=/; SameSite=Lax; Max-Age=3600${secure}`
    : `madsi_access=; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}

function notify(session: SupabaseSession | null) {
  for (const listener of listeners) listener(session);
}

export function setSession(payload: AuthPayload): SupabaseSession {
  if (!payload.access_token || !payload.refresh_token) {
    throw new SupabaseAuthError(502, 'Supabase did not return a complete sign-in session.');
  }
  const session: SupabaseSession = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: payload.expires_at ?? Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600),
    ...(payload.user ? { user: payload.user } : {}),
  };
  const storage = browserStorage();
  if (!storage) throw new SupabaseAuthError(500, 'Sign-in is only available in a browser.');
  storage.setItem(STORAGE_KEY, JSON.stringify(session));
  updateNavigationMarker(true);
  notify(session);
  return session;
}

export function clearSession() {
  browserStorage()?.removeItem(STORAGE_KEY);
  updateNavigationMarker(false);
  notify(null);
}

async function authRequest(path: string, body?: Record<string, unknown>, accessToken?: string): Promise<AuthPayload> {
  const { url, key } = configuration();
  let response: Response;
  try {
    response = await fetch(`${url}/auth/v1${path}`, {
      method: 'POST',
      headers: {
        apikey: key,
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    });
  } catch {
    throw new SupabaseAuthError(503, 'Cannot reach Supabase authentication. Please try again.');
  }
  const payload = (await response.json().catch(() => ({}))) as AuthPayload;
  if (!response.ok) {
    const message =
      payload.msg || payload.message || payload.error_description || payload.error ||
      (response.status === 400 ? 'The email or password was not accepted.' : 'Supabase authentication failed.');
    throw new SupabaseAuthError(response.status, message);
  }
  return payload;
}

export async function signInWithPassword(email: string, password: string): Promise<SupabaseSession> {
  const payload = await authRequest('/token?grant_type=password', { email, password });
  return setSession(payload);
}

export async function signUpWithPassword(name: string, email: string, password: string): Promise<SupabaseSession | null> {
  const payload = await authRequest('/signup', {
    email,
    password,
    data: { name },
  });
  if (!payload.access_token || !payload.refresh_token) return null;
  return setSession(payload);
}

async function refreshStoredSession(expectedAccessToken?: string): Promise<SupabaseSession | null> {
  const current = readStoredSession();
  if (!current) return null;
  if (expectedAccessToken && current.access_token !== expectedAccessToken) return current;
  if (!current.refresh_token) {
    clearSession();
    return null;
  }

  let payload: AuthPayload;
  try {
    payload = await authRequest('/token?grant_type=refresh_token', {
      refresh_token: current.refresh_token,
    });
  } catch (error) {
    if (error instanceof SupabaseAuthError && [400, 401, 403].includes(error.status)) {
      clearSession();
      return null;
    }
    throw error;
  }
  return setSession(payload);
}

export function refreshSession(expectedAccessToken?: string): Promise<SupabaseSession | null> {
  if (refreshInFlight) return refreshInFlight;
  const run = async () => {
    const lockManager = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    if (lockManager?.request) {
      return lockManager.request('madsi-supabase-auth-refresh', { mode: 'exclusive' }, () =>
        refreshStoredSession(expectedAccessToken),
      );
    }
    return refreshStoredSession(expectedAccessToken);
  };
  refreshInFlight = run().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function getAccessToken(): Promise<string | null> {
  const session = readStoredSession();
  if (!session) return null;
  if (session.expires_at > Math.floor(Date.now() / 1000) + 60) return session.access_token;
  const refreshed = await refreshSession(session.access_token);
  return refreshed?.access_token ?? null;
}

export async function signOut() {
  const session = readStoredSession();
  try {
    if (session?.access_token) {
      await authRequest('/logout', undefined, session.access_token);
    }
  } finally {
    clearSession();
  }
}

export function onAuthStateChange(listener: (session: SupabaseSession | null) => void): () => void {
  listeners.add(listener);
  if (typeof window === 'undefined') return () => listeners.delete(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener(readStoredSession());
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
