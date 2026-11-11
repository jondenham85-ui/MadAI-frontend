const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = () => import('../lib/supabase-proxy.mjs');
const base = 'https://lsbqmdpmaurhqlkuuldh.supabase.co/functions/v1';
const request = (headers = {}, options = {}) => new Request('https://www.madmadisonai.com/api/backend/api/auth/me', { headers, ...options });
const json = (payload, status = 200, cookies = []) => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(JSON.stringify(payload), { status, headers });
};
const fresh = ['madsi_access=new-access; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600', 'madsi_refresh=new-refresh; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800'];
test('only account session cookies reach the fixed main API', async () => {
  const { createApiProxy } = await load(); let seen;
  const result = await createApiProxy('main', async (url, options) => { seen = { url, options }; return json({ success: true }); })(request({ Cookie: 'tracking=private; madsi_access=valid', apikey: 'never-forward' }), ['api','auth','me']);
  assert.equal(result.status, 200); assert.equal(seen.url, `${base}/madsi-api/api/auth/me`);
  assert.equal(seen.options.headers.get('Cookie'), 'madsi_access=valid'); assert.equal(seen.options.headers.has('apikey'), false);
  assert.equal(result.headers.get('Cache-Control'), 'no-store'); assert.equal(seen.options.redirect, 'error');
});
test('refresh-only sessions recover and both rotated cookies are preserved', async () => {
  const { createApiProxy } = await load(); const calls = [];
  const responses = [json({ error: 'Please sign in' }, 401), json({ success: true }, 200, fresh), json({ user: { id: 'verified-user' } })];
  const response = await createApiProxy('main', async (url, options) => { calls.push({ url, cookie: new Headers(options.headers).get('Cookie') }); return responses.shift(); })(request({ Cookie: 'madsi_refresh=old-refresh' }), ['api','auth','me']);
  assert.equal(calls.length, 3); assert.equal(calls[1].url, `${base}/madsi-api/api/auth/refresh`);
  assert.equal(calls[2].cookie, 'madsi_access=new-access; madsi_refresh=new-refresh');
  assert.deepEqual(response.headers.getSetCookie(), fresh); assert.equal((await response.json()).user.id, 'verified-user');
});
test('expired access tokens refresh once and do not recurse on another 401', async () => {
  const { createApiProxy } = await load(); let count = 0;
  const responses = [json({},401), json({success:true},200,fresh), json({error:'Invalid session'},401)];
  const result = await createApiProxy('main', async () => { count++; return responses.shift(); })(request({ Cookie:'madsi_access=expired; madsi_refresh=old' }), ['api','auth','me']);
  assert.equal(count,3); assert.equal(result.status,401); assert.deepEqual(result.headers.getSetCookie(),fresh);
});
test('service outages do not refresh or clear session cookies', async () => {
  const { createApiProxy } = await load(); let count = 0;
  const result = await createApiProxy('main',async () => { count++; return json({error:'Unavailable'},503); })(request({Cookie:'madsi_refresh=old'}),['api','auth','me']);
  assert.equal(result.status,503); assert.equal(count,1); assert.deepEqual(result.headers.getSetCookie(),[]);
});
test('refresh-provider outage remains a 503 rather than a logout', async () => {
  const { createApiProxy } = await load(); const responses = [json({},401),json({error:'Auth unavailable'},503)];
  const result = await createApiProxy('main',async () => responses.shift())(request({Cookie:'madsi_refresh=old'}),['api','auth','me']);
  assert.equal(result.status,503); assert.deepEqual(result.headers.getSetCookie(),[]);
});
test('cross-site requests and unsafe paths never reach a backend', async () => {
  const { createApiProxy } = await load(); let count = 0;
  const proxy = createApiProxy('main',async () => { count++; return json({}); });
  assert.equal((await proxy(request({Origin:'https://attacker.invalid'}),['api','tasks'])).status,403);
  assert.equal((await proxy(request({'Sec-Fetch-Site':'cross-site'}),['api','tasks'])).status,403);
  for (const segments of [['..','auth'],['https:','evil'],['api/auth'],['%2e%2e'],[]]) assert.equal((await proxy(request(),segments)).status,400);
  assert.equal(count,0);
});
test('invalid login credentials and explicit bearer credentials are not retried', async () => {
  const { createApiProxy } = await load(); let count = 0;
  const proxy = createApiProxy('main',async () => { count++; return json({error:'Invalid credentials'},401); });
  await proxy(request({Cookie:'madsi_refresh=old'}),['api','auth','login']);
  await proxy(request({Cookie:'madsi_refresh=old',Authorization:'Bearer explicit'}),['api','auth','me']);
  assert.equal(count,2);
});
test('malformed backend responses are rejected', async () => {
  const { createApiProxy } = await load();
  for (const response of [new Response('<html>error</html>'),json(null),json([])]) {
    assert.equal((await createApiProxy('main',async () => response)(request(),['api','health'])).status,502);
  }
});
test('incomplete refresh cookies cannot masquerade as a renewed session', async () => {
  const { createApiProxy } = await load(); const responses = [json({},401),json({success:true},200,[fresh[0]])];
  const result = await createApiProxy('main',async () => responses.shift())(request({Cookie:'madsi_refresh=old'}),['api','auth','me']);
  assert.equal(result.status,502); assert.equal(responses.length,0);
});
test('webhook payload bytes and signatures remain compatible', async () => {
  const { createApiProxy } = await load(); const raw = '{ "id" : "evt_test", "test":true }'; let observed; let signature;
  await createApiProxy('main',async (url,options) => { observed = new TextDecoder().decode(options.body); signature = options.headers.get('Stripe-Signature'); return json({received:true}); })(request({'Content-Type':'application/json','Stripe-Signature':'t=1,v1=test-signature'},{method:'POST',body:raw}),['api','stripe','webhook']);
  assert.equal(observed,raw); assert.equal(signature,'t=1,v1=test-signature');
});
test('agent requests use the separate function and retain idempotency keys', async () => {
  const { createApiProxy } = await load(); let seen;
  await createApiProxy('agents',async (url,options) => { seen={url,options}; return json({runs:[]}); })(request({'Idempotency-Key':'run-1'}),['runs']);
  assert.equal(seen.url,`${base}/madsi-agents/runs`); assert.equal(seen.options.headers.get('Idempotency-Key'),'run-1');
});
test('middleware recognizes actual account cookies without treating presence as authorization', async () => {
  const { hasSessionCookie } = await load();
  assert.equal(hasSessionCookie('madsi_access=token'),true); assert.equal(hasSessionCookie('madsi_refresh=token'),true);
  assert.equal(hasSessionCookie('madsi_session=obsolete'),false); assert.equal(hasSessionCookie(null),false);
  assert.equal(hasSessionCookie('madsi_access='),false);
  const middleware=fs.readFileSync(path.join(__dirname,'../middleware.ts'),'utf8');
  assert.ok(middleware.includes('hasSessionCookie')); assert.ok(!middleware.includes('madsi_session'));
});
test('oversized requests are refused before contacting the API',async () => {
  const { createApiProxy }=await load(); let called=false;
  const result=await createApiProxy('main',async()=>{called=true; return json({});})(request({}, {method:'POST',body:'x'.repeat(1048577)}),['api','tasks']);
  assert.equal(result.status,413); assert.equal(called,false);
});
test('timeouts become actionable API errors without exposing upstream details',async () => {
  const { createApiProxy }=await load();
  const result=await createApiProxy('main',async()=>{throw new DOMException('private-details','TimeoutError');})(request(),['api','health']);
  assert.equal(result.status,504); assert.ok(!(await result.text()).includes('private-details'));
});
