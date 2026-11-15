const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
for (const file of ['app/layout.tsx', 'app/page.tsx', 'components/layout/Header.tsx']) {
  test(`${file} displays MADSI without the old spaced name`, () => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(source, /MADSI/);
    assert.doesNotMatch(source, /MAD SI/);
  });
}
test('metadata retains the production domain', () => {
  const source = fs.readFileSync(path.join(root, 'app/layout.tsx'), 'utf8');
  assert.match(source, /metadataBase:new URL\('https:\/\/madmadisonai\.com'\)/);
  assert.match(source, /title:\{default:'MADSI',template:'%s \| MADSI'\}/);
});
