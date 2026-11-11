const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const forbidden = /onrender\.com|\bRENDER_[A-Z_]+\b|\bRender\b/;
const obsoleteBlueprint = ['render','yaml'].join('.');
const skipped = new Set(['.git','.next','node_modules','output','.vercel']);
function scan(root, directory = root) {
  const findings = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (filename === __filename) continue;
    if (entry.isDirectory()) { findings.push(...scan(root, filename)); continue; }
    if (!entry.isFile()) continue;
    const relative = path.relative(root, filename);
    if (entry.name === obsoleteBlueprint) { findings.push(relative); continue; }
    if (!/\.(?:[cm]?js|jsx|ts|tsx|json|md|ya?ml|txt|sh)$/.test(entry.name) && !/^\.env(?:\.|$)/.test(entry.name)) continue;
    if (forbidden.test(fs.readFileSync(filename, 'utf8'))) findings.push(relative);
  }
  return findings.sort();
}
test('repository source and configuration contain no obsolete hosting dependencies', () => {
  assert.deepEqual(scan(path.resolve(__dirname, '..')), []);
});
test('infrastructure scanner detects obsolete hosts, environment variables and blueprints', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'madsi-infra-'));
  try {
    fs.writeFileSync(path.join(directory, '.env.production'), 'API=https://example.on' + 'render.com');
    fs.writeFileSync(path.join(directory, 'service.js'), 'process.env.REN' + 'DER_SERVICE_ID');
    fs.writeFileSync(path.join(directory, obsoleteBlueprint), 'services: []');
    assert.deepEqual(scan(directory), ['.env.production',obsoleteBlueprint,'service.js'].sort());
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
module.exports = { scan };
