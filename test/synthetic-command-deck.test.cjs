const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('homepage presents MADSI as a synthetic-intelligence workspace, not a chat-first landing page', () => {
  const source = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');
  assert.match(source, /MADSI · SYNTHETIC INTELLIGENCE/);
  assert.match(source, /One intelligence\. More momentum\./);
  assert.match(source, /Stop juggling AI tools\./);
  assert.match(source, /THE MADSI SYSTEM/);
  assert.match(source, /Think with MADSI/);
  assert.match(source, /Move work forward/);
  assert.match(source, /Create real things/);
  assert.match(source, /Keep your momentum/);
  assert.doesNotMatch(source, /<SynthConsole/);
  assert.match(source, /href="\/synth"/);
});

test('homepage keeps its live backend connection check and production health endpoint', () => {
  const source = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');
  assert.match(source, /fetch\('\/api\/madsi-inference'/);
  assert.match(source, /health\?\.status==='ready'/);
  assert.match(source, /CHECKING SYSTEM/);
  assert.match(source, /INTELLIGENCE ONLINE/);
  assert.match(source, /INTELLIGENCE UNVERIFIED/);
});
