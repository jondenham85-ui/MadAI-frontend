const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../next.config.js');
const functions = 'https://lsbqmdpmaurhqlkuuldh.supabase.co/functions/v1';

test('browser calls use the same-origin API base in config and production environment', () => {
  assert.equal(config.env.NEXT_PUBLIC_API_URL, '/api/backend');
  const production = fs.readFileSync(path.join(__dirname, '../.env.production'), 'utf8');
  assert.match(production, /^NEXT_PUBLIC_API_URL=\/api\/backend\s*$/);
});

test('main API and agent requests target only the designated Supabase project', async () => {
  assert.deepEqual(await config.rewrites(), [
    { source: '/api/backend/:path*', destination: `${functions}/madsi-api/:path*` },
    { source: '/api/agents/:path*', destination: `${functions}/madsi-agents/:path*` },
  ]);
});

test('all existing application paths preserve the main function API prefix', async () => {
  const [route] = await config.rewrites();
  for (const endpoint of ['health','auth/signup','auth/login','auth/logout','auth/refresh','auth/me','synth','tasks','operations','conversations','memory','projects','analytics','revenue','billing/status','billing/checkout-link','billing/portal','stripe/webhook','admin/system','admin/users','admin/directives']) {
    assert.equal(route.destination.replace(':path*', `api/${endpoint}`), `${functions}/madsi-api/api/${endpoint}`);
  }
});

test('agent registry, task history and execution preserve the separate function path', async () => {
  const [,route] = await config.rewrites();
  for (const endpoint of ['registry','runs','runs/00000000-0000-4000-8000-000000000001/execute','runs/00000000-0000-4000-8000-000000000001/cancel']) {
    assert.equal(route.destination.replace(':path*', endpoint), `${functions}/madsi-agents/${endpoint}`);
  }
});

test('obsolete backend environment overrides cannot redirect application traffic', async () => {
  const original = process.env.MADSI_BACKEND_URL;
  try {
    process.env.MADSI_BACKEND_URL = 'https://untrusted.invalid';
    for (const route of await config.rewrites()) assert.ok(route.destination.startsWith(`${functions}/`));
  } finally {
    if (original === undefined) delete process.env.MADSI_BACKEND_URL;
    else process.env.MADSI_BACKEND_URL = original;
  }
});
