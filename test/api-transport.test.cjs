const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../services/auth.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const transport = new Module(filename, module);
transport.filename = filename;
transport.paths = module.paths;
transport._compile(compiled, filename);
const api = Promise.resolve(transport.exports);

test('API transport regression coverage', async t => {
  const { apiRequest, ApiError, getCurrentUser } = await api;
  const originalFetch = global.fetch;
  const originalTimeout = global.setTimeout;
  try {
    await t.test('preserves headers and same-origin session cookies', async () => {
      global.fetch = async (url, options) => {
        assert.equal(url, '/api/backend/api/synth');
        assert.equal(options.credentials, 'include');
        assert.equal(options.cache, 'no-store');
        assert.equal(options.headers.get('X-Request-ID'), 'test');
        assert.equal(options.headers.get('Content-Type'), 'application/json');
        return new Response(JSON.stringify({ answer: 'ok' }));
      };
      assert.deepEqual(await apiRequest('/synth', { method: 'POST', body: '{}', headers: new Headers({ 'X-Request-ID': 'test' }) }), { answer: 'ok' });
    });
    await t.test('invalid successful responses are errors, not successes', async () => {
      for (const value of ['<html>Error</html>', 'null', '[]']) {
        global.fetch = async () => new Response(value);
        await assert.rejects(apiRequest('/synth'), error => error instanceof ApiError && error.status === 502);
      }
    });
    await t.test('preserves quota and upgrade metadata', async () => {
      global.fetch = async () => new Response(JSON.stringify({ error: 'Daily limit reached', plan: 'free', limit: 20 }), { status: 402 });
      await assert.rejects(apiRequest('/synth'), error => error.status === 402 && error.plan === 'free' && error.limit === 20);
    });
    await t.test('network errors have an actionable service error', async () => {
      global.fetch = async () => { throw new TypeError('Failed to fetch'); };
      await assert.rejects(apiRequest('/auth/me'), error => error.status === 503);
    });
    await t.test('provider failures do not silently sign users out', async () => {
      global.fetch = async () => new Response('{}', { status: 503 });
      await assert.rejects(getCurrentUser(), error => error.status === 503);
      global.fetch = async () => new Response('{}', { status: 401 });
      assert.equal(await getCurrentUser(), null);
    });
    await t.test('deadline covers hung responses and body parsing', async () => {
      global.setTimeout = callback => originalTimeout(callback, 0);
      for (const fetcher of [async () => new Promise(() => {}), async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) })]) {
        global.fetch = fetcher;
        await assert.rejects(apiRequest('/synth'), error => error.status === 504);
      }
      global.setTimeout = originalTimeout;
    });
    await t.test('caller cancellation prevents a request', async () => {
      const controller = new AbortController();
      controller.abort();
      global.fetch = async () => { throw new Error('must not fetch'); };
      await assert.rejects(apiRequest('/synth', { signal: controller.signal }), { name: 'AbortError' });
    });
  } finally {
    global.fetch = originalFetch;
    global.setTimeout = originalTimeout;
  }
});
