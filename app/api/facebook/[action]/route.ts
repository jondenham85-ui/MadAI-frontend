export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type Env = Record<string, string | undefined>;
type GraphError = { error?: { message?: string; code?: number } };
type FacebookPage = { id: string; name: string; access_token: string; tasks?: string[] };

const SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_read_user_content', 'pages_manage_posts', 'read_insights'];
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const env = (): Env => typeof process !== 'undefined' ? process.env as Env : {};
const value = (key: string) => env()[key]?.trim() || '';
const site = () => (value('MADSI_APP_URL') || 'https://www.madmadisonai.com').replace(/\/+$/, '');
const callback = () => site() + '/api/facebook/callback';
const version = () => /^v\d+\.\d+$/.test(value('META_GRAPH_API_VERSION')) ? value('META_GRAPH_API_VERSION') : 'v27.0';
const graphRoot = () => 'https://graph.facebook.com/' + version();
const ready = () => Boolean(value('SUPABASE_URL') && value('SUPABASE_SERVICE_ROLE_KEY') &&
  (value('SUPABASE_ANON_KEY') || value('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || value('NEXT_PUBLIC_SUPABASE_ANON_KEY')) &&
  value('META_APP_ID') && value('META_APP_SECRET') && value('MADSI_FACEBOOK_TOKEN_ENCRYPTION_KEY'));
const sbUrl = () => value('SUPABASE_URL').replace(/\/+$/, '');
const publicKey = () => value('SUPABASE_ANON_KEY') || value('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || value('NEXT_PUBLIC_SUPABASE_ANON_KEY');

async function db(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('apikey', value('SUPABASE_SERVICE_ROLE_KEY'));
  headers.set('Authorization', 'Bearer ' + value('SUPABASE_SERVICE_ROLE_KEY'));
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(sbUrl() + '/rest/v1/' + path, {
    ...init, headers, cache: 'no-store', signal: init.signal || AbortSignal.timeout(12_000),
  });
  const raw = await response.text();
  let data: any = null;
  if (raw) { try { data = JSON.parse(raw); } catch { data = null; } }
  if (!response.ok) throw new Error('DATABASE_REQUEST_FAILED');
  return data;
}
async function owner(request: Request) {
  const token = (request.headers.get('authorization') || '').match(/^Bearer\s+([A-Za-z0-9._~-]+)$/)?.[1];
  if (!token) throw new Error('AUTH_REQUIRED');
  const response = await fetch(sbUrl() + '/auth/v1/user', {
    headers: { apikey: publicKey(), Authorization: 'Bearer ' + token },
    cache: 'no-store', signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('AUTH_REQUIRED');
  const user = await response.json() as { id?: string };
  if (!user.id) throw new Error('AUTH_REQUIRED');
  const profiles = await db('profiles?id=eq.' + encodeURIComponent(user.id) + '&select=role&limit=1');
  if (!['OWNER', 'ADMIN'].includes(Array.isArray(profiles) ? profiles[0]?.role || '' : '')) throw new Error('OWNER_REQUIRED');
  return user.id;
}
function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
function randomHex(size = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(size)), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function hash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
function b64(bytes: Uint8Array) {
  let out = ''; for (const byte of bytes) out += String.fromCharCode(byte); return btoa(out);
}
function unb64(text: string) { return Uint8Array.from(atob(text), char => char.charCodeAt(0)); }
async function key() {
  const raw = unb64(value('MADSI_FACEBOOK_TOKEN_ENCRYPTION_KEY'));
  if (raw.byteLength !== 32) throw new Error('ENCRYPTION_KEY_INVALID');
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
async function encrypt(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), new TextEncoder().encode(token));
  return b64(iv) + '.' + b64(new Uint8Array(data));
}
async function decrypt(ciphertext: string) {
  const [iv, data] = ciphertext.split('.');
  if (!iv || !data) throw new Error('TOKEN_DECRYPT_FAILED');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await key(), unb64(data));
  return new TextDecoder().decode(plain);
}
async function graph(path: string, params: Record<string, string>, method: 'GET' | 'POST' = 'GET') {
  const url = new URL(graphRoot() + path);
  const body = new URLSearchParams();
  for (const [name, val] of Object.entries(params)) {
    if (method === 'GET') url.searchParams.set(name, val); else body.set(name, val);
  }
  const response = await fetch(url, {
    method, ...(method === 'POST' ? { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body } : {}),
    cache: 'no-store', signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => null) as (Record<string, any> & GraphError) | null;
  if (!response.ok || payload?.error) throw new Error(payload?.error?.code === 190 ? 'FACEBOOK_TOKEN_INVALID' : 'FACEBOOK_API_FAILED');
  return payload || {};
}
function redirect(result: string) {
  const url = new URL('/settings/integrations/facebook', site());
  url.searchParams.set('facebook', result);
  return Response.redirect(url.toString(), 303);
}
async function connect(request: Request) {
  if (!ready()) return json({ error: 'Facebook integration is not configured on this Worker yet.', code: 'FACEBOOK_SETUP_REQUIRED' }, 503);
  const ownerId = await owner(request);
  const state = randomHex();
  await db('madsi_facebook_oauth_states', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ state_hash: await hash(state), owner_user_id: ownerId, expires_at: new Date(Date.now() + 600_000).toISOString() }),
  });
  const url = new URL('https://www.facebook.com/' + version() + '/dialog/oauth');
  url.searchParams.set('client_id', value('META_APP_ID'));
  url.searchParams.set('redirect_uri', callback());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('scope', SCOPES.join(','));
  url.searchParams.set('auth_type', 'rerequest');
  return json({ authorization_url: url.toString() });
}
async function callbackGet(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has('error')) return redirect('authorization_cancelled');
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  if (!/^[a-f0-9]{64}$/.test(state) || !code) return redirect('invalid_authorization');
  if (!ready()) return redirect('setup_required');
  try {
    const stateHash = await hash(state);
    const found = await db('madsi_facebook_oauth_states?state_hash=eq.' + stateHash + '&select=owner_user_id,expires_at&limit=1');
    const pending = Array.isArray(found) ? found[0] : null;
    if (!pending || Date.parse(pending.expires_at) <= Date.now()) return redirect('expired');
    const deleted = await db('madsi_facebook_oauth_states?state_hash=eq.' + stateHash, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
    if (!Array.isArray(deleted) || deleted.length !== 1) return redirect('expired');

    const exchange = new URL(graphRoot() + '/oauth/access_token');
    exchange.searchParams.set('client_id', value('META_APP_ID'));
    exchange.searchParams.set('client_secret', value('META_APP_SECRET'));
    exchange.searchParams.set('redirect_uri', callback());
    exchange.searchParams.set('code', code);
    const shortRes = await fetch(exchange, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    const shortToken = await shortRes.json() as { access_token?: string };
    if (!shortRes.ok || !shortToken.access_token) return redirect('token_exchange_failed');

    const longUrl = new URL(graphRoot() + '/oauth/access_token');
    longUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longUrl.searchParams.set('client_id', value('META_APP_ID'));
    longUrl.searchParams.set('client_secret', value('META_APP_SECRET'));
    longUrl.searchParams.set('fb_exchange_token', shortToken.access_token);
    const longRes = await fetch(longUrl, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    const longToken = await longRes.json() as { access_token?: string; expires_in?: number };
    if (!longRes.ok || !longToken.access_token) return redirect('token_exchange_failed');

    const permissions = await graph('/me/permissions', { access_token: longToken.access_token });
    const granted = (Array.isArray(permissions.data) ? permissions.data : [])
      .filter((item: any) => item.status === 'granted').map((item: any) => String(item.permission));
    if (SCOPES.some(scope => !granted.includes(scope))) return redirect('permissions_missing');

    const pageResult = await graph('/me/accounts', { fields: 'id,name,access_token,tasks', limit: '100', access_token: longToken.access_token });
    const pages = (Array.isArray(pageResult.data) ? pageResult.data : []) as FacebookPage[];
    const targetId = value('META_FACEBOOK_PAGE_ID');
    const eligible = pages.filter(page => page.id && page.access_token && Array.isArray(page.tasks) &&
      (page.tasks.includes('CREATE_CONTENT') || page.tasks.includes('MANAGE')));
    const selected = targetId ? eligible.find(page => page.id === targetId) : eligible.length === 1 ? eligible[0] : null;
    if (!selected) return redirect(eligible.length > 1 ? 'page_selection_required' : 'target_page_not_available');

    const expiry = new Date(Date.now() + Math.max(0, Number(longToken.expires_in || 0)) * 1000).toISOString();
    await db('madsi_facebook_connections?on_conflict=owner_user_id', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        owner_user_id: pending.owner_user_id, page_id: selected.id, page_name: selected.name,
        page_access_token_ciphertext: await encrypt(selected.access_token),
        user_access_token_ciphertext: await encrypt(longToken.access_token),
        granted_scopes: granted, page_tasks: selected.tasks || [], status: 'connected',
        token_expires_at: expiry, updated_at: new Date().toISOString(),
      }),
    });
    return redirect('connected');
  } catch { return redirect('connection_failed'); }
}
async function getConnection(ownerId: string) {
  const rows = await db('madsi_facebook_connections?owner_user_id=eq.' + encodeURIComponent(ownerId) +
    '&status=eq.connected&select=page_id,page_name,page_access_token_ciphertext,granted_scopes,page_tasks,status,token_expires_at,last_verified_at&limit=1');
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error('FACEBOOK_NOT_CONNECTED');
  if (row.token_expires_at && Date.parse(row.token_expires_at) < Date.now()) throw new Error('FACEBOOK_TOKEN_EXPIRED');
  return { ...row, token: await decrypt(row.page_access_token_ciphertext) };
}
async function getStatus(ownerId: string) {
  const rows = await db('madsi_facebook_connections?owner_user_id=eq.' + encodeURIComponent(ownerId) +
    '&select=page_id,page_name,granted_scopes,page_tasks,status,token_expires_at,last_verified_at&limit=1');
  const row = Array.isArray(rows) ? rows[0] : null;
  return json({ connected: row?.status === 'connected', connection: row || null });
}
async function getPosts(ownerId: string) {
  const saved = await getConnection(ownerId);
  const data = await graph('/' + encodeURIComponent(saved.page_id) + '/feed', {
    fields: 'id,message,created_time,permalink_url,is_published', limit: '25', access_token: saved.token,
  });
  return json({ posts: Array.isArray(data.data) ? data.data : [] });
}
async function getInsights(ownerId: string) {
  const saved = await getConnection(ownerId);
  const data = await graph('/' + encodeURIComponent(saved.page_id) + '/insights', {
    metric: 'page_impressions,page_engaged_users,page_post_engagements', period: 'day', date_preset: 'last_7d', access_token: saved.token,
  });
  return json({ insights: Array.isArray(data.data) ? data.data : [] });
}
async function createApproval(request: Request, ownerId: string) {
  const body = await request.json().catch(() => null) as { message?: unknown; confirm?: unknown } | null;
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (body?.confirm !== true || !message || message.length > 5000) return json({ error: 'Confirm the exact post text before creating a one-time publishing approval.' }, 400);
  await getConnection(ownerId);
  const expires = new Date(Date.now() + 600_000).toISOString();
  const rows = await db('madsi_facebook_publish_approvals', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ owner_user_id: ownerId, message, status: 'approved', expires_at: expires }),
  });
  const item = Array.isArray(rows) ? rows[0] : null;
  if (!item?.id) return json({ error: 'MADSI could not save the publishing approval.' }, 503);
  return json({ approval_id: item.id, expires_at: expires }, 201);
}
async function publish(request: Request, ownerId: string) {
  const body = await request.json().catch(() => null) as { approval_id?: unknown } | null;
  const id = typeof body?.approval_id === 'string' ? body.approval_id : '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'A valid publishing approval is required.' }, 400);
  const saved = await getConnection(ownerId);
  const rows = await db('madsi_facebook_publish_approvals?id=eq.' + encodeURIComponent(id) +
    '&owner_user_id=eq.' + encodeURIComponent(ownerId) + '&status=eq.approved&expires_at=gt.' +
    encodeURIComponent(new Date().toISOString()) + '&consumed_at=is.null&select=id,message&limit=1');
  const approval = Array.isArray(rows) ? rows[0] : null;
  if (!approval) return json({ error: 'That publishing approval is expired or already used. Review the post and approve it again.' }, 409);
  const consumed = await db('madsi_facebook_publish_approvals?id=eq.' + encodeURIComponent(id) +
    '&owner_user_id=eq.' + encodeURIComponent(ownerId) + '&status=eq.approved&consumed_at=is.null', {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'consumed', consumed_at: new Date().toISOString() }),
    });
  if (!Array.isArray(consumed) || consumed.length !== 1) return json({ error: 'That approval has already been used.' }, 409);
  const result = await graph('/' + encodeURIComponent(saved.page_id) + '/feed', { message: approval.message, access_token: saved.token }, 'POST');
  if (!result.id) return json({ error: 'Facebook did not confirm that the post was published.' }, 502);
  return json({ published: true, post_id: String(result.id) }, 201);
}
async function webhookGet(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('hub.mode') === 'subscribe' &&
      url.searchParams.get('hub.verify_token') === value('META_WEBHOOK_VERIFY_TOKEN') &&
      url.searchParams.get('hub.challenge')) {
    return new Response(url.searchParams.get('hub.challenge'), { status: 200, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
  }
  return new Response('Forbidden', { status: 403 });
}
async function webhookPost(request: Request) {
  const secret = value('META_APP_SECRET');
  const signature = request.headers.get('x-hub-signature-256') || '';
  if (!secret || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return json({ error: 'Invalid webhook signature.' }, 401);
  const raw = await request.arrayBuffer();
  if (raw.byteLength > 1_000_000) return json({ error: 'Webhook payload too large.' }, 413);
  const hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, raw));
  const expected = 'sha256=' + Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  let mismatch = expected.length ^ signature.length;
  for (let i = 0; i < Math.min(expected.length, signature.length); i++) mismatch |= expected.charCodeAt(i) ^ signature.toLowerCase().charCodeAt(i);
  return mismatch === 0 ? json({ received: true }) : json({ error: 'Invalid webhook signature.' }, 401);
}
function failure(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'AUTH_REQUIRED') return json({ error: 'Sign in to MADSI again.' }, 401);
  if (code === 'OWNER_REQUIRED') return json({ error: 'Owner access is required for Facebook Page management.' }, 403);
  if (code === 'FACEBOOK_NOT_CONNECTED') return json({ error: 'Connect your Facebook Page first.' }, 409);
  if (code === 'FACEBOOK_TOKEN_EXPIRED' || code === 'FACEBOOK_TOKEN_INVALID') return json({ error: 'Facebook authorization expired or was revoked. Reconnect the Page.' }, 409);
  if (code === 'ENCRYPTION_KEY_INVALID') return json({ error: 'Facebook token encryption is not configured correctly.' }, 503);
  return json({ error: 'MADSI could not complete the Facebook request. Check the connection and try again.' }, 503);
}
export async function GET(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (action === 'callback') return callbackGet(request);
  if (action === 'webhooks') return webhookGet(request);
  try {
    if (!ready()) return json({ error: 'Facebook integration is not configured on this Worker yet.', code: 'FACEBOOK_SETUP_REQUIRED' }, 503);
    const ownerId = await owner(request);
    if (action === 'status') return await getStatus(ownerId);
    if (action === 'posts') return await getPosts(ownerId);
    if (action === 'insights') return await getInsights(ownerId);
    return json({ error: 'Not found.' }, 404);
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (action === 'webhooks') return webhookPost(request);
  if (!sameOrigin(request)) return json({ error: 'Cross-site requests are not allowed.' }, 403);
  if (Number(request.headers.get('content-length') || 0) > 12_000) return json({ error: 'Request body too large.' }, 413);
  try {
    if (!ready()) return json({ error: 'Facebook integration is not configured on this Worker yet.', code: 'FACEBOOK_SETUP_REQUIRED' }, 503);
    const ownerId = await owner(request);
    if (action === 'connect') return await connect(request);
    if (action === 'approval') return await createApproval(request, ownerId);
    if (action === 'posts') return await publish(request, ownerId);
    return json({ error: 'Not found.' }, 404);
  } catch (error) { return failure(error); }
}
