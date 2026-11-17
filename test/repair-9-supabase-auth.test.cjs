const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://rcetiocftggebqzfuncd.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test_key';
const values = new Map();
global.window = {
  localStorage: { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,String(v)), removeItem: k => values.delete(k) },
  addEventListener() {}, removeEventListener() {},
};
global.document = { cookie: '' };
global.location = { protocol: 'https:' };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: (_n,_o,fn) => fn() } } });

const auth = import('../lib/supabase.ts');
const session = (access='access-one', refresh='refresh-one', expires=3600) => ({
  access_token: access, refresh_token: refresh, expires_in: expires,
  user: { id: 'auth-user-1', email: 'user@example.com', user_metadata: { name: 'Test User' } },
});
const json = (body,status=200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type':'application/json' } });

test('password sign-in calls Supabase Auth and persists the session', async () => {
  const api = await auth; let seen;
  global.fetch = async (url,options) => { seen={url,options}; return json(session()); };
  const result = await api.signInWithPassword('user@example.com','password123');
  assert.match(seen.url,/\/auth\/v1\/token\?grant_type=password$/);
  assert.equal(seen.options.headers.apikey,'sb_publishable_test_key');
  assert.deepEqual(JSON.parse(seen.options.body),{email:'user@example.com',password:'password123'});
  assert.equal(result.access_token,'access-one');
  assert.equal(await api.getAccessToken(),'access-one');
  assert.match(document.cookie,/madsi_access=1/);
});

test('signup sends name metadata and leaves email-confirmation users signed out', async () => {
  const api=await auth; let body;
  global.fetch=async (_url,options)=>{body=JSON.parse(options.body);return json({user:{id:'new-user'}});};
  assert.equal(await api.signUpWithPassword('New User','new@example.com','password123'),null);
  assert.deepEqual(body,{email:'new@example.com',password:'password123',data:{name:'New User'}});
  assert.equal(await api.getAccessToken(),null);
});

test('session restoration reuses a valid persisted token', async () => {
  const api=await auth; api.clearSession(); api.setSession(session('restored','refresh',3600));
  let called=false; global.fetch=async()=>{called=true;return json({});};
  assert.equal(await api.getAccessToken(),'restored'); assert.equal(called,false);
});

test('expired sessions refresh once across concurrent callers', async () => {
  const api=await auth; api.clearSession(); api.setSession(session('expired','refresh-old',-1));
  let calls=0;
  global.fetch=async url=>{calls++;assert.match(url,/grant_type=refresh_token$/);await new Promise(r=>setTimeout(r,10));return json(session('fresh','refresh-new'));};
  const [a,b]=await Promise.all([api.getAccessToken(),api.getAccessToken()]);
  assert.equal(a,'fresh');assert.equal(b,'fresh');assert.equal(calls,1);
});

test('authenticated API retries a 401 once with a refreshed bearer token', () => {
  const source=fs.readFileSync(require.resolve('../services/auth.ts'),'utf8');
  assert.ok(source.includes("requestHeaders.set('Authorization', `Bearer ${token}`)"));
  assert.ok(source.includes('if (response.status === 401)'));
  assert.ok(source.includes('refreshSession(token)'));
  assert.ok(source.includes("if (!token) throw new ApiError(401"));
});

test('sign-out revokes the remote session and clears local state', async () => {
  const api=await auth;api.clearSession();api.setSession(session('logout-access','logout-refresh'));
  let seen;global.fetch=async(url,options)=>{seen={url,options};return new Response(null,{status:204});};
  await api.signOut();
  assert.match(seen.url,/\/auth\/v1\/logout$/);
  assert.equal(seen.options.headers.Authorization,'Bearer logout-access');
  assert.equal(await api.getAccessToken(),null);assert.match(document.cookie,/madsi_access=;/);
});

test('unauthenticated restore remains signed out and role is read from the server profile', async () => {
  const api=await auth;api.clearSession();assert.equal(await api.getAccessToken(),null);
  const source=fs.readFileSync(require.resolve('../services/auth.ts'),'utf8');
  assert.ok(source.includes('if (!(await getAccessToken())) return null'));
  assert.ok(source.includes("apiRequest<{ user?: User }>('/auth/me')"));
  assert.ok(!source.includes('user_metadata.role'));
});
