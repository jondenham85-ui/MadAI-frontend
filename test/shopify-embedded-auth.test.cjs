const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');

const CLIENT_ID = 'madsi-test-client-id';
const CLIENT_SECRET = 'madsi-test-client-secret';
const NOW = 1_800_000_000;

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function makeToken(overrides = {}, secret = CLIENT_SECRET) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    aud: CLIENT_ID,
    dest: 'https://example-store.myshopify.com',
    iss: 'https://example-store.myshopify.com/admin',
    sub: '123456789',
    iat: NOW - 10,
    nbf: NOW - 10,
    exp: NOW + 50,
    ...overrides,
  }));
  const data = header + '.' + claims;
  const key = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return data + '.' + Buffer.from(signature).toString('base64url');
}

test('accepts a correctly signed embedded Shopify ID token', async () => {
  const { validateShopifyIdToken } = await import('../supabase/functions/madsi-shopify/shopify-auth.js');
  const token = await makeToken();
  assert.deepEqual(await validateShopifyIdToken(token, CLIENT_ID, CLIENT_SECRET, NOW), {
    shop: 'example-store.myshopify.com',
    subject: '123456789',
  });
});

test('rejects an expired Shopify ID token', async () => {
  const { validateShopifyIdToken } = await import('../supabase/functions/madsi-shopify/shopify-auth.js');
  const token = await makeToken({ exp: NOW - 1 });
  await assert.rejects(() => validateShopifyIdToken(token, CLIENT_ID, CLIENT_SECRET, NOW), /INVALID_SHOPIFY_SESSION/);
});

test('rejects a token issued for a different app client ID', async () => {
  const { validateShopifyIdToken } = await import('../supabase/functions/madsi-shopify/shopify-auth.js');
  const token = await makeToken({ aud: 'another-app' });
  await assert.rejects(() => validateShopifyIdToken(token, CLIENT_ID, CLIENT_SECRET, NOW), /INVALID_SHOPIFY_SESSION/);
});

test('rejects a token with a mismatched issuer and destination store', async () => {
  const { validateShopifyIdToken } = await import('../supabase/functions/madsi-shopify/shopify-auth.js');
  const token = await makeToken({ iss: 'https://other-store.myshopify.com/admin' });
  await assert.rejects(() => validateShopifyIdToken(token, CLIENT_ID, CLIENT_SECRET, NOW), /INVALID_SHOPIFY_SESSION/);
});

test('rejects a token signed with a different client secret', async () => {
  const { validateShopifyIdToken } = await import('../supabase/functions/madsi-shopify/shopify-auth.js');
  const token = await makeToken({}, 'not-the-real-secret');
  await assert.rejects(() => validateShopifyIdToken(token, CLIENT_ID, CLIENT_SECRET, NOW), /INVALID_SHOPIFY_SESSION/);
});
