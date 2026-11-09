const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../next.config.js'), 'utf8');
function load(env = {}) {
  const sandbox = { module: { exports: {} }, process: { env }, URL };
  vm.runInNewContext(source, sandbox);
  return sandbox.module.exports;
}
test('browser API calls keep the same-origin proxy', () => {
  assert.equal(load({ NEXT_PUBLIC_API_URL: 'https://untrusted.example' }).env.NEXT_PUBLIC_API_URL, '/api/backend');
});
test('unset BACKEND_URL preserves the existing Render destination', async () => {
  const routes = JSON.parse(JSON.stringify(await load().rewrites()));
  assert.deepEqual(routes, [{ source: '/api/backend/:path*', destination: 'https://madai-backend-clean-1.onrender.com/:path*' }]);
});
test('Render API paths remain unchanged', async () => {
  const [route] = await load().rewrites();
  for (const routePath of ['api/health', 'api/auth/login', 'api/synth', 'api/billing/portal']) {
    const target = new URL(route.destination.replace(':path*', routePath));
    assert.equal(target.origin, 'https://madai-backend-clean-1.onrender.com');
    assert.equal(target.pathname, '/' + routePath);
  }
});
test('trailing slashes and outer whitespace are normalized', async () => {
  const [route] = await load({ BACKEND_URL: ' https://madai-backend-clean-1.onrender.com/// ' }).rewrites();
  assert.equal(route.destination, 'https://madai-backend-clean-1.onrender.com/:path*');
});
test('Supabase function prefix is preserved without duplicating api', async () => {
  const [route] = await load({ BACKEND_URL: 'https://rcetiocftggebqzfuncd.supabase.co/functions/v1/madsi-api-candidate/' }).rewrites();
  for (const routePath of ['api/health', 'api/auth/login', 'api/synth', 'api/billing/portal']) {
    const target = new URL(route.destination.replace(':path*', routePath));
    assert.equal(target.pathname, '/functions/v1/madsi-api-candidate/' + routePath);
  }
});
test('production browser setting matches the proxy', () => {
  assert.equal(fs.readFileSync(path.join(__dirname, '../.env.production'), 'utf8').trim(), 'NEXT_PUBLIC_API_URL=/api/backend');
});
for (const value of [
  'http://madai-backend-clean-1.onrender.com',
  'https://user:password@madai-backend-clean-1.onrender.com',
  'https://madai-backend-clean-1.onrender.com?token=private',
  'https://madai-backend-clean-1.onrender.com#fragment',
  'https://untrusted.example',
  'https://rcetiocftggebqzfuncd.supabase.co/functions/v1/madsi-migration-check',
  'https://rcetiocftggebqzfuncd.supabase.co/functions/v1/madsi-api-candidate/api',
  'https://madai-backend-clean-1.onrender.com:8443',
]) test('unsafe or incorrect backend target is rejected: ' + value.replace(/user:password|token=private/g, 'redacted'), () => {
  assert.throws(() => load({ BACKEND_URL: value }), /BACKEND_URL/);
});
