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
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  const deadline = new Promise<never>((_, reject) => {
    cancel = () => {
      reject(new DOMException('Request cancelled', 'AbortError'));
      controller.abort();
    };
    if (options.signal?.aborted) { cancel(); return; }
    options.signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => {
      reject(new ApiError(504, { error: 'The request timed out. Check your conversation history before retrying.' }));
      controller.abort();
    }, 90000);
  });
  const request = async (): Promise<T> => {
    if (controller.signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, { ...options, signal: controller.signal, credentials: 'include', cache: 'no-store', headers });
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new ApiError(503, { error: 'Cannot reach MADSI. Check your connection and try again.' });
    }
    let payload: unknown;
    try { payload = await response.json(); }
    catch { throw new ApiError(response.ok ? 502 : response.status, { error: 'The server returned an invalid response' }); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ApiError(response.ok ? 502 : response.status, { error: 'The server returned an invalid response' });
    }
    if (!response.ok) {
      const body = payload as ErrorPayload;
      throw new ApiError(response.status, { error: typeof body.error === 'string' ? body.error : undefined, plan: body.plan, limit: body.limit });
    }
    return payload as T;
  };
  try { return await Promise.race([deadline, request()]); }
  finally {
    if (timer !== undefined) clearTimeout(timer);
    if (cancel) options.signal?.removeEventListener('abort', cancel);
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
