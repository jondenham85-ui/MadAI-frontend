const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('homepage presents MADSI as a synthetic-intelligence command environment, not a chat-first landing page', () => {
  const source = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');
  assert.match(source, /MADSI · SYNTHETIC INTELLIGENCE/);
  assert.match(source, /Intelligence in motion/);
  assert.match(source, /THE MADSI SYSTEM/);
  assert.match(source, /Cognitive core/);
  assert.match(source, /Directive engine/);
  assert.match(source, /Creation studio/);
  assert.doesNotMatch(source, /<SynthConsole/);
  assert.match(source, /href="\/synth"/);
});
test('homepage keeps its live backend connection check and production health endpoint', () => {
  const source = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');
  assert.match(source, /apiRequest<Health>\('\/health'/);
  assert.match(source, /CORE CONNECTION ONLINE/);
  assert.match(source, /CONNECTION UNVERIFIED/);
});
