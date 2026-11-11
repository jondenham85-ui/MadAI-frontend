export type User = { id: string; name: string; email: string; role: string; plan: string; createdAt?: string; updatedAt?: string };
type ErrorPayload = { error?: string; plan?: string; limit?: number | string | null };
export class ApiError extends Error {
  status: number; plan?: string; limit?: number | string | null;
  constructor(status: number, payload: ErrorPayload) {
    super(payload.error || `Request failed (${status})`); this.name = 'ApiError'; this.status = status; this.plan = payload.plan; this.limit = payload.limit;
  }
}
const API_BASE = '/api/backend/api';
export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, path === '/synth' || path === '/tasks' ? 90000 : 20000);
  try {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, { ...options, signal: controller.signal, credentials: 'include', cache: 'no-store', headers });
    } catch (error) {
      if (controller.signal.aborted) { const timeout = new Error('The request was cancelled or timed out. Please retry.'); timeout.name = 'AbortError'; throw timeout; }
      if (error instanceof TypeError) throw new Error('Unable to reach the MAD SI backend. Check your connection and try again.');
      throw error;
    }
    let payload: unknown;
    try { payload = await response.json(); }
    catch { throw new ApiError(response.ok ? 502 : response.status, { error: 'The backend returned an invalid response. Please retry.' }); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new ApiError(response.ok ? 502 : response.status, { error: 'The backend returned an invalid response. Please retry.' });
    if (!response.ok) {
      const data = payload as Record<string, unknown>;
      throw new ApiError(response.status, { error: typeof data.error === 'string' ? data.error : undefined, plan: typeof data.plan === 'string' ? data.plan : undefined, limit: typeof data.limit === 'number' || typeof data.limit === 'string' || data.limit === null ? data.limit : undefined });
    }
    return payload as T;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
export function login(email: string, password: string) {
  return apiRequest<{ success: boolean; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}
export function signup(name: string, email: string, password: string) {
  return apiRequest<{ success: boolean; user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
}
export function logout() { return apiRequest('/auth/logout', { method: 'POST' }); }
export async function getCurrentUser(): Promise<User | null> {
  try { return (await apiRequest<{ user: User }>('/auth/me')).user; }
  catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; }
}
