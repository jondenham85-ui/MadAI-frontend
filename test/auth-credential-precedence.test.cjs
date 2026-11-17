const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../lib/supabase-proxy.mjs');
const req = headers => new Request('https://www.madmadisonai.com/api/backend/api/auth/me', { headers });
const reply = (body, status = 200, cookies = []) => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(JSON.stringify(body), { status, headers });
};
for (const kind of ['main', 'agents']) {
  for (const cookie of ['madsi_access=1', 'madsi_access=stale; madsi_refresh=old']) {
    test(`${kind}: bearer credentials cannot be shadowed by ${cookie}`, async () => {
      const { createApiProxy } = await load();
      let count = 0;
      const response = await createApiProxy(kind, async (url, options) => {
        count++;
        assert.equal(options.headers.get('Authorization'), 'Bearer real-access');
        assert.equal(options.headers.has('Cookie'), false);
        return reply({ authenticated: true });
      })(req({ Authorization: 'Bearer real-access', Cookie: cookie }), kind === 'main' ? ['api','auth','me'] : ['registry']);
      assert.equal(response.status, 200); assert.equal(count, 1);
    });
  }
  test(`${kind}: the navigation marker is not an API credential`, async () => {
    const { createApiProxy } = await load();
    let seen;
    const response = await createApiProxy(kind, async (url, options) => { seen = options.headers; return reply({ error: 'Please sign in' }, 401); })(req({ Cookie: 'madsi_access=1' }), ['registry']);
    assert.equal(seen.has('Cookie'), false); assert.equal(response.status, 401);
  });
  test(`${kind}: genuine cookie sessions remain supported`, async () => {
    const { createApiProxy } = await load();
    let seen;
    const response = await createApiProxy(kind, async (url, options) => { seen = options.headers; return reply({ ok: true }); })(req({ Cookie: 'madsi_access=real-cookie; tracking=discard' }), ['registry']);
    assert.equal(seen.get('Cookie'), 'madsi_access=real-cookie'); assert.equal(response.status, 200);
  });
}
test('cookie-only session refresh still preserves rotated cookies', async () => {
  const { createApiProxy } = await load();
  const cookies = ['madsi_access=new; Path=/; HttpOnly; Secure', 'madsi_refresh=new-refresh; Path=/; HttpOnly; Secure'];
  const responses = [reply({},401),reply({},200,cookies),reply({ok:true})];
  const seen = [];
  const response = await createApiProxy('main', async (url, options) => { seen.push(new Headers(options.headers).get('Cookie')); return responses.shift(); })(req({Cookie:'madsi_access=1; madsi_refresh=old'}),['api','auth','me']);
  assert.equal(seen[0],'madsi_refresh=old');
  assert.equal(seen[2],'madsi_access=new; madsi_refresh=new-refresh');
  assert.equal(response.status,200); assert.deepEqual(response.headers.getSetCookie(),cookies);
});
test('cross-site requests remain blocked',async()=>{
  const {createApiProxy}=await load(); let called=false;
  const response=await createApiProxy('main',async()=>{called=true;return reply({});})(req({Origin:'https://attacker.invalid'}),['api','auth','me']);
  assert.equal(response.status,403);assert.equal(called,false);
});
test('webhook bytes and signature are unchanged',async()=>{
  const {createApiProxy}=await load(); const body='{ "id": "evt_fixture" }'; let observed;
  const request=new Request('https://www.madmadisonai.com/api/backend/api/stripe/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':'fixture'},body});
  const response=await createApiProxy('main',async(url,options)=>{observed=options;return reply({received:true});})(request,['api','stripe','webhook']);
  assert.equal(response.status,200);assert.equal(new TextDecoder().decode(observed.body),body);assert.equal(observed.headers.get('Stripe-Signature'),'fixture');
});
