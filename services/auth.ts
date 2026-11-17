import {
  clearSession,
  getAccessToken,
  refreshSession,
  signInWithPassword,
  signOut as supabaseSignOut,
  signUpWithPassword,
  SupabaseAuthError,
} from '@/lib/supabase';

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  createdAt?: string;
  updatedAt?: string;
};

type ErrorPayload = { error?: string; plan?: string; limit?: number | string | null };

export class ApiError extends Error {
  status: number;
  plan?: string;
  limit?: number | string | null;
  constructor(status: number, payload: ErrorPayload) {
    super(payload.error || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.plan = payload.plan;
    this.limit = payload.limit;
  }
}

const API_BASE = '/api/backend/api';

async function readPayload(response: Response): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(response.ok ? 502 : response.status, { error: 'The server returned an invalid response' });
  }
  return payload as Record<string, unknown>;
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const abortFromCaller = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timer = setTimeout(() => controller.abort(), 90000);

  const send = async (token: string): Promise<Response> => {
    const requestHeaders = new Headers(headers);
    requestHeaders.set('Authorization', `Bearer ${token}`);
    try {
      return await fetch(`${API_BASE}${path}`, {
        ...options,
        signal: controller.signal,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: requestHeaders,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
        throw new ApiError(504, { error: 'The request timed out. Check your conversation history before retrying.' });
      }
      throw new ApiError(503, { error: 'Cannot reach MADSI. Check your connection and try again.' });
    }
  };

  try {
    let token: string | null;
    try {
      token = await getAccessToken();
    } catch (error) {
      if (error instanceof SupabaseAuthError) throw new ApiError(error.status, { error: error.message });
      throw error;
    }
    if (!token) throw new ApiError(401, { error: 'Please sign in to continue.' });

    let response = await send(token);
    if (response.status === 401) {
      let renewed;
      try {
        renewed = await refreshSession(token);
      } catch (error) {
        if (error instanceof SupabaseAuthError) throw new ApiError(error.status, { error: error.message });
        throw error;
      }
      if (renewed?.access_token) response = await send(renewed.access_token);
      else clearSession();
    }

    const payload = await readPayload(response);
    if (!response.ok) {
      const body = payload as ErrorPayload;
      throw new ApiError(response.status, {
        error: typeof body.error === 'string' ? body.error : undefined,
        plan: body.plan,
        limit: body.limit,
      });
    }
    return payload as T;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

export async function login(email: string, password: string) {
  try {
    await signInWithPassword(email, password);
    const user = await getCurrentUser();
    if (!user) {
      clearSession();
      throw new ApiError(403, { error: 'Your account profile is not ready yet. Please try again shortly.' });
    }
    return { success: true, user };
  } catch (error) {
    if (error instanceof SupabaseAuthError) throw new ApiError(error.status, { error: error.message });
    throw error;
  }
}

export async function signup(name: string, email: string, password: string) {
  try {
    const session = await signUpWithPassword(name, email, password);
    if (!session) {
      throw new ApiError(202, { error: 'Your account was created. Check your email and confirm your address before signing in.' });
    }
    const user = await getCurrentUser();
    if (!user) {
      clearSession();
      throw new ApiError(403, { error: 'Your account was created, but its profile is not ready yet. Please try signing in shortly.' });
    }
    return { success: true, user };
  } catch (error) {
    if (error instanceof SupabaseAuthError) throw new ApiError(error.status, { error: error.message });
    throw error;
  }
}

export async function logout() {
  try {
    await supabaseSignOut();
  } catch (error) {
    if (!(error instanceof SupabaseAuthError && [400, 401, 403].includes(error.status))) throw error;
  } finally {
    clearSession();
  }
}

export async function getCurrentUser(): Promise<User | null> {
  if (!(await getAccessToken())) return null;
  try {
    const result = await apiRequest<{ user?: User }>('/auth/me');
    return result.user ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
