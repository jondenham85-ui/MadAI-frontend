export type SupabaseSession = { access_token: string; refresh_token: string; expires_at: number; user?: { id: string; email?: string } };
type AuthPayload = Partial<SupabaseSession> & { expires_in?: number; msg?: string; message?: string; error_description?: string; error?: string };
const URL_BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\\/+$/, '');
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const STORAGE_KEY = 'madsi.supabase.auth.v1';
const listeners = new Set<(session: SupabaseSession | null) => void>();
let refreshing: Promise<SupabaseSession | null> | null = null;

export class SupabaseAuthError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'SupabaseAuthError'; }
}
function config() {
  if (!URL_BASE || !API_KEY) throw new SupabaseAuthError(503, 'Authentication is not configured for this deployment.');
  return { url: URL_BASE, key: API_KEY };
}
function storage(): Storage | null { return typeof window === 'undefined' ? null : window.localStorage; }
function read(): SupabaseSession | null {
  const store = storage(); if (!store) return null;
  try {
    const value = JSON.parse(store.getItem(STORAGE_KEY) || 'null');
    if (!value || typeof value.access_token !== 'string' || typeof value.refresh_token !== 'string' || typeof value.expires_at !== 'number') {
      store.removeItem(STORAGE_KEY); return null;
    }
    return value as SupabaseSession;
  } catch { store.removeItem(STORAGE_KEY); return null; }
}
function marker(active: boolean) {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = active ? `madsi_access=1; Path=/; SameSite=Lax; Max-Age=3600${secure}` : `madsi_access=; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}
function emit(session: SupabaseSession | null) { for (const listener of listeners) { try { listener(session); } catch { /* isolate observers */ } } }
export function setSession(payload: AuthPayload): SupabaseSession {
  if (!payload.access_token || !payload.refresh_token) throw new SupabaseAuthError(502, 'Supabase did not return a complete sign-in session.');
  const session: SupabaseSession = {
    access_token: payload.access_token, refresh_token: payload.refresh_token,
    expires_at: payload.expires_at ?? Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600),
    ...(payload.user ? { user: payload.user } : {}),
  };
  const store = storage(); if (!store) throw new SupabaseAuthError(500, 'Sign-in is only available in a browser.');
  store.setItem(STORAGE_KEY, JSON.stringify(session)); marker(true); emit(session); return session;
}
export function clearSession() { storage()?.removeItem(STORAGE_KEY); marker(false); emit(null); }

async function request(path: string, body?: Record<string, unknown>, token?: string): Promise<AuthPayload> {
  const { url, key } = config();
  let response: Response;
  try {
    response = await fetch(`${url}/auth/v1${path}`, {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store',
    });
  } catch { throw new SupabaseAuthError(503, 'Cannot reach Supabase authentication. Please try again.'); }
  const payload = await response.json().catch(() => ({})) as AuthPayload;
  if (!response.ok) throw new SupabaseAuthError(response.status, payload.msg || payload.message || payload.error_description || payload.error || 'Supabase authentication failed.');
  return payload;
}
export async function signInWithPassword(email: string, password: string) {
  return setSession(await request('/token?grant_type=password', { email, password }));
}
export async function signUpWithPassword(name: string, email: string, password: string) {
  const payload = await request('/signup', { email, password, data: { name } });
  return payload.access_token && payload.refresh_token ? setSession(payload) : null;
}
async function refreshStored(expected?: string): Promise<SupabaseSession | null> {
  const current = read(); if (!current) return null;
  if (expected && current.access_token !== expected) return current;
  try { return setSession(await request('/token?grant_type=refresh_token', { refresh_token: current.refresh_token })); }
  catch (error) {
    if (error instanceof SupabaseAuthError && [400, 401, 403].includes(error.status)) { clearSession(); return null; }
    throw error;
  }
}
export function refreshSession(expected?: string): Promise<SupabaseSession | null> {
  if (refreshing) return refreshing;
  const run = () => {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return locks?.request ? locks.request('madsi-supabase-auth-refresh', { mode: 'exclusive' }, () => refreshStored(expected)) : refreshStored(expected);
  };
  refreshing = run().finally(() => { refreshing = null; });
  return refreshing;
}
export async function getAccessToken(): Promise<string | null> {
  const session = read(); if (!session) return null;
  if (session.expires_at > Math.floor(Date.now() / 1000) + 60) return session.access_token;
  return (await refreshSession(session.access_token))?.access_token ?? null;
}
export async function signOut() {
  const session = read();
  try { if (session?.access_token) await request('/logout', undefined, session.access_token); }
  finally { clearSession(); }
}
export function onAuthStateChange(listener: (session: SupabaseSession | null) => void): () => void {
  listeners.add(listener);
  if (typeof window === 'undefined') return () => { listeners.delete(listener); };
  const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) listener(read()); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}
