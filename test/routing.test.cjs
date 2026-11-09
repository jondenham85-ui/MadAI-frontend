const { test } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../next.config.js');
test('browser API calls use a same-origin proxy', () => { assert.equal(config.env.NEXT_PUBLIC_API_URL, '/api/backend'); });
test('proxy targets the corrected Render backend', async () => { const routes = await config.rewrites(); assert.deepEqual(routes, [{ source: '/api/backend/:path*', destination: 'https://madai-backend-clean-1.onrender.com/:path*' }]); });
test('health and auth requests keep their API paths', async () => { const [route] = await config.rewrites(); for (const path of ['api/health', 'api/auth/login', 'api/synth', 'api/billing/portal']) { const destination = new URL(route.destination.replace(':path*', path)); assert.equal(destination.origin, 'https://madai-backend-clean-1.onrender.com'); assert.equal(destination.pathname, `/${path}`); } });
