const { test } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../next.config.js');
const legacy = 'https://madai-backend-clean-1.onrender.com';
const supabase = 'https://lsbqmdpmaurhqlkuuldh.supabase.co/functions/v1/madsi-api';

test('browser API calls use a same-origin proxy', () => {
  assert.equal(config.env.NEXT_PUBLIC_API_URL, '/api/backend');
});

test('backend routing supports staged migration and rollback', async () => {
  const original = process.env.MADSI_BACKEND_URL;
  try {
    delete process.env.MADSI_BACKEND_URL;
    assert.deepEqual(await config.rewrites(), [{ source: '/api/backend/:path*', destination: `${legacy}/:path*` }]);
    for (const target of [legacy, supabase, `${supabase}/`]) {
      process.env.MADSI_BACKEND_URL = target;
      const [route] = await config.rewrites();
      for (const path of ['api/health', 'api/auth/login', 'api/auth/refresh', 'api/synth', 'api/billing/portal', 'api/stripe/webhook']) {
        assert.equal(route.destination.replace(':path*', path), `${target.replace(/\/+$/, '')}/${path}`);
      }
    }
    for (const target of ['http://example.com', 'https://user:password@example.com', 'https://example.com?key=value', 'https://example.com#fragment', 'not-a-url']) {
      process.env.MADSI_BACKEND_URL = target;
      await assert.rejects(config.rewrites());
    }
  } finally {
    if (original === undefined) delete process.env.MADSI_BACKEND_URL;
    else process.env.MADSI_BACKEND_URL = original;
  }
});
