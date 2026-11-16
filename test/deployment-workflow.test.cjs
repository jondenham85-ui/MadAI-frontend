const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../.github/workflows/deploy-vercel-cli.yml'), 'utf8');
test('legacy deployment workflow is manual only', () => {
  assert.match(source, /on:\n  workflow_dispatch:\npermissions:/);
  assert.doesNotMatch(source, /^  (push|pull_request|schedule|workflow_run):/m);
});
test('validation cannot read deployment credentials or invoke deployment tooling', () => {
  assert.doesNotMatch(source, /VERCEL_TOKEN|secrets\s*\.|vercel\s+(pull|build|deploy)|--prod|api\.vercel\.com|prj_|team_/i);
});
test('validation checks out the event source without persisted git credentials', () => {
  assert.match(source, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(source, /persist-credentials: false/);
  assert.doesNotMatch(source, /ref:\s*[a-f0-9]{40}/);
});
test('validation retains actual frontend release checks', () => {
  for (const command of ['npm install', 'npm test', 'npm run build', 'npm run typecheck']) assert.ok(source.includes('run: ' + command), command);
});
test('workflow explicitly withholds deployment and live acceptance claims', () => {
  assert.ok(source.includes('Production deployment is blocked.'));
  assert.ok(source.includes('No deployment requested. No live acceptance or launch readiness claimed.'));
  assert.match(source, /if: always\(\)/);
});
