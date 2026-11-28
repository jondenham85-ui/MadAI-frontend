const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'app/business/page.tsx'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/madsi-cloudflare-preview.yml'), 'utf8');

test('Cloudflare preview blocks live Shopify requests and connection actions', () => {
  assert.match(page, /NEXT_PUBLIC_MADSI_PREVIEW_MODE === 'true'/);
  assert.match(page, /if\(IS_PREVIEW\) return path==='\/status'/);
  assert.match(page, /if\(IS_PREVIEW\)\{setError\('Live Shopify connection is disabled/);
  assert.match(page, /disabled=\{IS_PREVIEW\|\|busy\|\|!bridgeReady\}/);
});

test('Cloudflare preview build explicitly enables Shopify isolation', () => {
  assert.match(workflow, /NEXT_PUBLIC_MADSI_PREVIEW_MODE: "true"/);
});
