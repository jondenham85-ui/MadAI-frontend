const { test } = require('node:test');
const assert = require('node:assert/strict');

test('Cloudflare feature previews cannot proxy general API requests to production', async () => {
  const { createApiProxy } = await import('../lib/supabase-proxy.mjs');
  let called = false;
  const proxy = createApiProxy('main', async () => {
    called = true;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  const response = await proxy(
    new Request('https://madsi-facebook-cloudflare-mad-ai-frontend.madsi.workers.dev/api/backend/health'),
    ['health'],
  );
  assert.equal(response.status, 503);
  assert.equal(called, false);
  const payload = await response.json();
  assert.equal(payload.code, 'PREVIEW_BACKEND_DISABLED');
});

test('the production hostname continues to proxy to the existing MADSI backend', async () => {
  const { createApiProxy } = await import('../lib/supabase-proxy.mjs');
  let target = '';
  const proxy = createApiProxy('main', async (url) => {
    target = String(url);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  const response = await proxy(
    new Request('https://www.madmadisonai.com/api/backend/health'),
    ['health'],
  );
  assert.equal(response.status, 200);
  assert.match(target, /^https:\/\/rcetiocftggebqzfuncd\.supabase\.co\/functions\/v1\/madsi-api\/health$/);
});
