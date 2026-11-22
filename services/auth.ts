export type User = { id: string; name: string; email: string; role: string; plan: string; createdAt?: string; updatedAt?: string };
type ErrorPayload = { error?: string; plan?: string; limit?: number | string | null };
export class ApiError extends Error {
  status: number; plan?: string; limit?: number | string | null;
  constructor(status: number, payload: ErrorPayload) {
    super(payload.error || `Request failed (${status})`); this.name = 'ApiError';
    this.status = status; this.plan = payload.plan; this.limit = payload.limit;
  }
}
const API_BASE = '/api/backend/api';
const authClient = () => import('@/lib/supabase');
const isAuthError = (error: unknown): error is Error & { status: number } =>
  error instanceof Error && error.name === 'SupabaseAuthError' && typeof (error as Error & { status?: unknown }).status === 'number';

async function readPayload(response: Response): Promise<Record<string, unknown>> {
  const value: unknown = await response.json().catch(() => null);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(response.ok ? 502 : response.status, { error: 'The server returned an invalid response' });
  return value as Record<string, unknown>;
}
export type ApiRequestOptions = RequestInit & { public?: boolean };
export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { public: isPublic = false, ...requestOptions } = options;
  const controller = new AbortController(), headers = new Headers(requestOptions.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let timer: ReturnType<typeof setTimeout> | undefined, cancel: (() => void) | undefined;
  const requestMethod = (requestOptions.method || 'GET').toUpperCase();
  const isLongRunningAIRequest = requestMethod === 'POST' && (
    ['/tasks', '/operations'].includes(path) || /^\/projects\/[^/]+\/generate$/.test(path)
  );
  const requestTimeoutMs = isLongRunningAIRequest ? 140000 : 125000;
  const deadline = new Promise<never>((_, reject) => {
    cancel = () => { reject(new DOMException('Request cancelled', 'AbortError')); controller.abort(); };
    if (options.signal?.aborted) cancel();
    else options.signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => { reject(new ApiError(504, { error: 'The request timed out. Check your conversation history before retrying.' })); controller.abort(); }, requestTimeoutMs);
  });
  const work = async (): Promise<T> => {
    if (controller.signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
    let auth: Awaited<ReturnType<typeof authClient>> | null = null, token: string | null = null;
    if (typeof window !== 'undefined' && !isPublic) {
      try { auth = await authClient(); token = await auth.getAccessToken(); }
      catch (error) { if (isAuthError(error)) throw new ApiError(error.status, { error: error.message }); throw error; }
      if (!token) throw new ApiError(401, { error: 'Please sign in to continue.' });
    }
    const send = async (accessToken?: string) => {
      if (controller.signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
      const requestHeaders = new Headers(headers);
      if (accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`);
      try {
        return await fetch(`${API_BASE}${path}`, { ...requestOptions, signal: controller.signal, credentials: 'include', cache: 'no-store', headers: requestHeaders });
      } catch {
        if (controller.signal.aborted) {
          if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
          throw new ApiError(504, { error: 'The request timed out. Check your conversation history before retrying.' });
        }
        throw new ApiError(503, { error: 'Cannot reach MADSI. Check your connection and try again.' });
      }
    };
    let response = await send(token ?? undefined);
    if (response.status === 401 && token && auth) {
      let renewed;
      try { renewed = await auth.refreshSession(token); }
      catch (error) { if (isAuthError(error)) throw new ApiError(error.status, { error: error.message }); throw error; }
      if (renewed?.access_token) { response = await send(renewed.access_token); if (response.status === 401) auth.clearSession(); }
      else auth.clearSession();
    }
    const result = await readPayload(response);
    if (!response.ok) {
      const error = result as ErrorPayload;
      throw new ApiError(response.status, { error: typeof error.error === 'string' ? error.error : undefined, plan: error.plan, limit: error.limit });
    }
    return result as T;
  };
  try { return await Promise.race([deadline, work()]); }
  finally {
    if (timer !== undefined) clearTimeout(timer);
    if (cancel) options.signal?.removeEventListener('abort', cancel);
  }
}
export async function apiStreamRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'text/event-stream');
  const signal = options.signal;
  if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
  let auth: Awaited<ReturnType<typeof authClient>> | null = null, token: string | null = null;
  if (typeof window !== 'undefined') {
    try { auth = await authClient(); token = await auth.getAccessToken(); }
    catch (error) { if (isAuthError(error)) throw new ApiError(error.status, { error: error.message }); throw error; }
    if (!token) throw new ApiError(401, { error: 'Please sign in to continue.' });
  }
  const send = async (accessToken?: string) => {
    const requestHeaders = new Headers(headers);
    if (accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    try {
      return await fetch(`${API_BASE}${path}`, { ...options, signal, credentials: 'include', cache: 'no-store', headers: requestHeaders });
    } catch {
      if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
      throw new ApiError(503, { error: 'Cannot reach MADSI. Check your connection and try again.' });
    }
  };
  let response = await send(token ?? undefined);
  if (response.status === 401 && token && auth) {
    let renewed;
    try { renewed = await auth.refreshSession(token); }
    catch (error) { if (isAuthError(error)) throw new ApiError(error.status, { error: error.message }); throw error; }
    if (renewed?.access_token) { response = await send(renewed.access_token); if (response.status === 401) auth.clearSession(); }
    else auth.clearSession();
  }
  if (!response.ok) {
    const payload = await readPayload(response);
    throw new ApiError(response.status, { error: typeof payload.error === 'string' ? payload.error : undefined, plan: typeof payload.plan === 'string' ? payload.plan : undefined, limit: typeof payload.limit === 'number' || typeof payload.limit === 'string' ? payload.limit : undefined });
  }
  if (!response.headers.get('content-type')?.toLowerCase().includes('text/event-stream') || !response.body) {
    throw new ApiError(502, { error: 'MADSI returned an invalid streaming response.' });
  }
  return response;
}
export async function login(email: string, password: string) {
  const auth = await authClient();
  try {
    await auth.signInWithPassword(email, password);
    const user = await getCurrentUser();
    if (!user) { auth.clearSession(); throw new ApiError(403, { error: 'Your account profile is not ready yet. Please try again shortly.' }); }
    return { success: true, user };
  } catch (error) { if (isAuthError(error)) throw new ApiError(error.status, { error: error.message }); throw error; }
}
export async function signup(name: string, email: string, password: string) {
  const auth = await authClient();
  try {
    const session = await auth.signUpWithPassword(name, email, password);
    if (!session) throw new ApiError(202, { error: 'Your account was created. Check your email and confirm your address before signing in.' });
    const user = await getCurrentUser();
    if (!user) { auth.clearSession(); throw new ApiError(403, { error: 'Your account was created, but its profile is not ready yet. Please try signing in shortly.' }); }
    return { success: true, user };
  } catch (error) { if (isAuthError(error)) throw new ApiError(error.status, { error: error.message }); throw error; }
}
export async function logout() {
  const auth = await authClient();
  try { await auth.signOut(); }
  catch (error) { if (!(isAuthError(error) && [400, 401, 403].includes(error.status))) throw error; }
  finally { auth.clearSession(); }
}
export async function getCurrentUser(): Promise<User | null> {
  if (typeof window !== 'undefined' && !(await (await authClient()).getAccessToken())) return null;
  try { return (await apiRequest<{ user?: User }>('/auth/me')).user ?? null; }
  catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; }
}
