const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('services/auth.ts', 'utf8');
function client(fetch, extra = {}) {
  const exports = {};
  const context = { exports, fetch, Headers, AbortController, TypeError, setTimeout, clearTimeout, ...extra };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return exports;
}
test('sends same-origin requests with credentials and caller Headers', async () => {
  const api = client(async (url, options) => {
    assert.equal(url, '/api/backend/api/auth/login');
    assert.equal(options.credentials, 'include');
    assert.equal(options.headers.get('X-Test'), 'preserved');
    assert.equal(options.headers.get('Content-Type'), 'application/json');
    return Response.json({ success: true });
  });
  assert.equal((await api.apiRequest('/auth/login', { method: 'POST', body: '{}', headers: new Headers({ 'X-Test': 'preserved' }) })).success, true);
});
test('rejects HTML success responses instead of reporting success', async () => {
  const api = client(async () => new Response('<html>upstream failure</html>'));
  await assert.rejects(api.apiRequest('/synth'), error => error.status === 502);
});
test('preserves unauthorized status and restores anonymous sessions', async () => {
  const api = client(async () => Response.json({ error: 'Sign in' }, { status: 401 }));
  assert.equal(await api.getCurrentUser(), null);
});
test('network failures produce actionable errors', async () => {
  const api = client(async () => { throw new TypeError('Load failed'); });
  await assert.rejects(api.apiRequest('/auth/login'), /Unable to reach the MAD SI backend/);
});
test('rejects scalar JSON responses', async () => {
  const api = client(async () => Response.json('not an API object'));
  await assert.rejects(api.apiRequest('/synth'), error => error.status === 502);
});
test('request deadline aborts fetch and clears the timer', async () => {
  let deadline; let cleared = false;
  const api = client(async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    queueMicrotask(deadline);
  }), { setTimeout: callback => { deadline = callback; return 123; }, clearTimeout: id => { assert.equal(id, 123); cleared = true; } });
  await assert.rejects(api.apiRequest('/auth/login'), error => error.name === 'AbortError');
  assert.equal(cleared, true);
});
