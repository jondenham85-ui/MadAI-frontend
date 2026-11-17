const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
for (const file of ['app/layout.tsx', 'app/page.tsx', 'components/layout/Header.tsx']) {
  test(`${file} uses the official spaced product name`, () => {
    const source = read(file);
    assert.match(source, /MAD SI/);
    assert.doesNotMatch(source, /MADSI|MADAI|Madison Synthetic Intelligence/);
    assert.match(source, /MAD Synthetic Intelligence/);
  });
}
test('metadata uses the official title and page-title suffix', () => {
  const source = read('app/layout.tsx');
  assert.ok(source.includes("default:'MAD SI — MAD Synthetic Intelligence',template:'%s | MAD SI'"));
  assert.ok(source.includes("siteName:'MAD SI'"));
});
test('metadata retains the existing production domain', () => {
  assert.ok(read('app/layout.tsx').includes("metadataBase:new URL('https://madmadisonai.com')"));
});
test('installable-app names follow the official brand', () => {
  const manifest = JSON.parse(read('public/manifest.json'));
  assert.equal(manifest.name, 'MAD SI — MAD Synthetic Intelligence');
  assert.equal(manifest.short_name, 'MAD SI');
  assert.equal(manifest.description, 'MAD Synthetic Intelligence');
});
test('manifest navigation and icon references remain unchanged', () => {
  const manifest = JSON.parse(read('public/manifest.json'));
  assert.equal(manifest.start_url, '/'); assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.icons.map(icon => icon.src), ['/icon-192.png', '/icon-512.png']);
});
test('the existing visual structure and account navigation remain present', () => {
  const page = read('app/page.tsx'), header = read('components/layout/Header.tsx');
  for (const name of ['hero-grid','orb-core','capability-strip','workspace-section','closing-card','site-footer']) assert.ok(page.includes(name));
  for (const target of ['href="/"','href="/pricing"','href="/admin"','href="/login"','href="/signup"']) assert.ok(header.includes(target));
});
