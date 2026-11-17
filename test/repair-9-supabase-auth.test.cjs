const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://rcetiocftggebqzfuncd.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test_key';

const values = new Map();
const listeners = new Map();
global.window = {
  localStorage: {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  },
  addEventListener: (name, callback) => listeners.set(name, callback),
  removeEventListener: (name) => listeners.delete(name),
};
global.document = { cookie: '' };
global.location = { protocol: 'https:' };
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { locks: { request: async (_name, _options, callback) => callback() } },
});

const auth = import('../lib/supabase.ts');
const session = (access = 'access-one', refresh = 'refresh-one', expires = 3600) => ({
  access_token: access,
  refresh_token: refresh,
  expires_in: expires,
  user: { id: 'auth-user-1', email: 'user@example.com', user_metadata: { name: 'Test User' } },
});
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

test('password sign-in uses Supabase Auth and persists the returned session', async () => {
  const api = await auth;
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return json(session());
  };
  const result = await api.signInWithPassword('user@example.com', 'password123');
  assert.match(request.url, /\/auth\/v1\/token\?grant_type=password$/);
  assert.equal(request.options.headers.apikey, 'sb_publishable_test_key');
  assert.deepEqual(JSON.parse(request.options.body), { email: 'user@example.com', password: 'password123' });
  assert.equal(result.access_token, 'access-one');
  assert.equal(await api.getAccessToken(), 'access-one');
  assert.match(document.cookie, /madsi_access=1/);
});

test('signup sends the display name as user metadata and handles email confirmation', async () => {
  const api = await auth;
  let body;
  global.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return json({ user: { id: 'new-user', email: 'new@example.com' } });
  };
  const result = await api.signUpWithPassword('New User', 'new@example.com', 'password123');
  assert.equal(result, null);
  assert.deepEqual(body, {
    email: 'new@example.com',
    password: 'password123',
    data: { name: 'New User' },
  });
  assert.equal(await api.getAccessToken(), null);
});

test('session restoration reads a still-valid persisted access token', async () => {
  const api = await auth;
  api.clearSession();
  api.setSession(session('restored-access', 'restored-refresh', 3600));
  let called = false;
  global.fetch = async () => { called = true; return json({}); };
  assert.equal(await api.getAccessToken(), 'restored-access');
  assert.equal(called, false);
});

test('expired sessions refresh once when concurrent requests race', async () => {
  const api = await auth;
  api.clearSession();
  api.setSession(session('expired-access', 'refresh-old', -1));
  let calls = 0;
  global.fetch = async (url, options) => {
    calls += 1;
    assert.match(url, /grant_type=refresh_token$/);
    assert.deepEqual(JSON.parse(options.body), { refresh_token: 'refresh-old' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    return json(session('refreshed-access', 'refresh-new', 3600));
  };
  const [first, second] = await Promise.all([api.getAccessToken(), api.getAccessToken()]);
  assert.equal(first, 'refreshed-access');
  assert.equal(second, 'refreshed-access');
  assert.equal(calls, 1);
});

test('401 recovery refreshes the current token and retries once with a bearer token', () => {
  const source = fs.readFileSync(require.resolve('../services/auth.ts'), 'utf8');
  assert.match(source, /response\.status === 401/);
  assert.match(source, /refreshSession\(token\)/);
  assert.match(source, /requestHeaders\.set\('Authorization', `Bearer \\?\$\{token\}`\)/);
  assert.match(source, /if \(!token\) throw new ApiError\(401/);
});

test('sign-out revokes the Supabase session and clears local state', async () => {
  const api = await auth;
  api.clearSession();
  api.setSession(session('logout-access', 'logout-refresh'));
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(null, { status: 204 });
  };
  await api.signOut();
  assert.match(request.url, /\/auth\/v1\/logout$/);
  assert.equal(request.options.headers.Authorization, 'Bearer logout-access');
  assert.equal(await api.getAccessToken(), null);
  assert.match(document.cookie, /madsi_access=;/);
});

test('unauthenticated restoration stays signed out and owner privileges are never read from metadata', async () => {
  const api = await auth;
  api.clearSession();
  assert.equal(await api.getAccessToken(), null);
  const service = fs.readFileSync(require.resolve('../services/auth.ts'), 'utf8');
  assert.match(service, /if \(!\(await getAccessToken\(\)\)\) return null/);
  assert.match(service, /apiRequest<\{ user\?: User \}>\('\/auth\/me'\)/);
  assert.doesNotMatch(service, /user_metadata\.role|metadata\.role/);
});
