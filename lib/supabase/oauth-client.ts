'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { clearSession, setSession, type SupabaseSession } from '@/lib/supabase';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\\/+$/, '');
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const STORAGE_KEY = 'madsi.supabase.auth.v1';

type StoredAuthSession = SupabaseSession & {
  token_type?: string;
  expires_in?: number;
  provider_token?: string;
  provider_refresh_token?: string;
};

let client: SupabaseClient | null = null;

/**
 * Bridges Supabase JS OAuth methods to MADSI's existing localStorage session.
 * This avoids introducing a second, disconnected sign-in state while the app's
 * existing auth flow is still the source of truth.
 */
export function getOAuthSupabaseClient(): SupabaseClient {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase is not configured for this deployment.');
  }

  const storage = {
    getItem: async (_key: string): Promise<string | null> => {
      if (typeof window === 'undefined') return null;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      try {
        const session = JSON.parse(raw) as SupabaseSession;
        if (!session.access_token || !session.refresh_token || !session.expires_at) return null;
        const compatible: StoredAuthSession = {
          ...session,
          token_type: 'bearer',
          expires_in: Math.max(0, session.expires_at - Math.floor(Date.now() / 1000)),
        };
        return JSON.stringify(compatible);
      } catch {
        return null;
      }
    },
    setItem: async (_key: string, value: string): Promise<void> => {
      if (typeof window === 'undefined') return;
      try {
        const session = JSON.parse(value) as StoredAuthSession;
        if (!session.access_token || !session.refresh_token) return;
        setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          user: session.user,
        });
      } catch {
        // Never replace a valid MADSI session with malformed SDK storage.
      }
    },
    removeItem: async (_key: string): Promise<void> => {
      if (typeof window !== 'undefined') clearSession();
    },
  };

  client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'madsi.supabase.oauth.bridge',
    },
  });
  return client;
}
