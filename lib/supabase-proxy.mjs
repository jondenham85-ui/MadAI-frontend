const ROOT = 'https://lsbqmdpmaurhqlkuuldh.supabase.co/functions/v1';
const NAMES = new Set(['madsi_access', 'madsi_refresh']);
const LIMIT = 1048576;
function cookieMap(header = '') {
  const result = new Map();
  for (const part of (header || '').split(';')) {
    const at = part.indexOf('=');
    const name = part.slice(0, at).trim();
    if (at > 0 && NAMES.has(name) && part.slice(at + 1).trim()) result.set(name, part.slice(at + 1).trim());
  }
  return result;
}
export function hasSessionCookie(header) { return cookieMap(header).size > 0; }
function sessionCookies(response) {
  return response.headers.getSetCookie().filter(value => NAMES.has(value.slice(0, value.indexOf('='))));
}
function output(payload, status, cookies = []) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Cookie, Authorization', 'X-Content-Type-Options': 'nosniff' });
  const latest = new Map(cookies.map(value => [value.slice(0, value.indexOf('=')), value]));
  for (const value of latest.values()) headers.append('Set-Cookie', value);
  return new Response(status === 204 ? null : JSON.stringify(payload), { status, headers });
}
async function relay(response, cookies = []) {
  const combined = [...cookies, ...sessionCookies(response)];
  if (response.status === 204) return output(null, 204, combined);
  let payload;
  try { payload = await response.json(); } catch { return output({ error: 'The backend returned an invalid response' }, response.ok ? 502 : response.status, combined); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return output({ error: 'The backend returned an invalid response' }, response.ok ? 502 : response.status, combined);
  return output(payload, response.status, combined);
}
async function readLimited(request) {
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > LIMIT) { await reader.cancel(); throw Object.assign(new Error('Request body exceeds 1 MiB'), { status: 413 }); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}
export function createApiProxy(kind = 'main', fetcher = fetch) {
  if (!['main', 'agents'].includes(kind)) throw new Error('Unknown API target');
  return async function proxy(request, segments) {
    try {
      if (!Array.isArray(segments) || !segments.length || segments.some(part => typeof part !== 'string' || !/^[A-Za-z0-9_-]+$/.test(part))) return output({ error: 'Invalid API path' }, 400);
      const incoming = new URL(request.url);
      const origin = request.headers.get('Origin');
      if ((origin && new URL(origin).origin !== incoming.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') return output({ error: 'Cross-site API requests are not allowed' }, 403);
      if (request.method === 'OPTIONS') return output(null, 204);
      const headers = new Headers({ Accept: 'application/json' });
      for (const name of ['Content-Type', 'Authorization', 'Idempotency-Key', 'Stripe-Signature']) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
      }
      const session = cookieMap(request.headers.get('Cookie'));
      if (session.size) headers.set('Cookie', [...session].map(([name, value]) => `${name}=${value}`).join('; '));
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(85000)]);
      const method = request.method === 'HEAD' ? 'GET' : request.method;
      const body = ['GET', 'HEAD'].includes(method) ? undefined : await readLimited(request);
      const target = `${ROOT}/${kind === 'main' ? 'madsi-api' : 'madsi-agents'}/${segments.join('/')}${incoming.search}`;
      const options = { method, headers, body, signal, cache: 'no-store', redirect: 'error' };
      const response = await fetcher(target, options);
      const logicalPath = (segments[0] === 'api' ? segments.slice(1) : segments).join('/');
      const authOperation = kind === 'main' && (logicalPath.startsWith('auth/') && logicalPath !== 'auth/me' || logicalPath === 'stripe/webhook');
      if (response.status !== 401 || !session.has('madsi_refresh') || headers.has('Authorization') || authOperation) return relay(response);
      const renewed = await fetcher(`${ROOT}/madsi-api/api/auth/refresh`, { method: 'POST', headers: { Cookie: headers.get('Cookie'), 'Content-Type': 'application/json', Accept: 'application/json' }, body: '{}', signal, cache: 'no-store', redirect: 'error' });
      if (!renewed.ok) return relay(renewed);
      const rotated = sessionCookies(renewed);
      const fresh = cookieMap(rotated.map(value => value.split(';', 1)[0]).join('; '));
      if (!fresh.has('madsi_access') || !fresh.has('madsi_refresh')) return output({ error: 'Session renewal did not return secure session cookies' }, 502);
      headers.set('Cookie', [...fresh].map(([name, value]) => `${name}=${value}`).join('; '));
      const retried = await fetcher(target, { ...options, headers });
      return relay(retried, rotated);
    } catch (error) {
      const status = error?.status === 413 ? 413 : error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 504 : 503;
      return output({ error: status === 413 ? 'Request body exceeds 1 MiB' : status === 504 ? 'The API request timed out. Check history before retrying.' : 'Cannot reach MADSI. Please retry shortly.' }, status);
    }
  };
}
