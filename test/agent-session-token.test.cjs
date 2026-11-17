const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../lib/owner-agents.mjs');
const ok = () => new Response(JSON.stringify({ runs: [] }));
test('agent client attaches the resolved Supabase bearer token', async () => {
  const { requestAgents } = await load(); let seen;
  await requestAgents('/runs', {}, async (url, options) => { seen = options.headers; return ok(); }, async () => 'fixture-token');
  assert.equal(seen.get('Authorization'), 'Bearer fixture-token');
});
test('explicit authorization is preserved without resolving another session', async () => {
  const { requestAgents } = await load(); let seen;
  await requestAgents('/runs', { headers: { Authorization: 'Bearer explicit' } }, async (url, options) => { seen = options.headers; return ok(); }, async () => { throw Error('must not resolve'); });
  assert.equal(seen.get('Authorization'), 'Bearer explicit');
});
test('authentication outages do not send an unauthenticated agent request or expose details', async () => {
  const { requestAgents } = await load(); let calls = 0;
  await assert.rejects(requestAgents('/runs', {}, async () => { calls++; return ok(); }, async () => { throw Error('private-provider-details'); }), error => error.status === 503 && !error.message.includes('private-provider-details'));
  assert.equal(calls, 0);
});
test('invalid stored sessions become an actionable 401 before execution', async () => {
  const { requestAgents } = await load(); let calls = 0;
  await assert.rejects(requestAgents('/runs', {}, async () => { calls++; return ok(); }, async () => { throw Object.assign(Error('expired'), { status: 401 }); }), error => error.status === 401);
  assert.equal(calls, 0);
});
test('cancellation while resolving authentication prevents the agent request', async () => {
  const { requestAgents } = await load(); const controller = new AbortController(); let calls = 0;
  await assert.rejects(requestAgents('/runs', { signal: controller.signal }, async () => { calls++; return ok(); }, async () => { controller.abort(); return 'fixture-token'; }), { name: 'AbortError' });
  assert.equal(calls, 0);
});
test('a rejected execution is not retried and cannot create duplicate work', async () => {
  const { requestAgents } = await load(); let calls = 0;
  await assert.rejects(requestAgents('/runs', { method: 'POST', body: JSON.stringify({ requestId: 'fixture' }) }, async () => { calls++; return new Response(JSON.stringify({ error: 'Expired session' }), { status: 401 }); }, async () => 'fixture-token'), error => error.status === 401);
  assert.equal(calls, 1);
});
test('browser requests without a session fail closed', async () => {
  const { requestAgents } = await load(); const previous = global.window; global.window = {}; let calls = 0;
  try { await assert.rejects(requestAgents('/runs', {}, async () => { calls++; return ok(); }, async () => null), error => error.status === 401); }
  finally { if (previous === undefined) delete global.window; else global.window = previous; }
  assert.equal(calls, 0);
});
test('authentication lookup is included in the existing request deadline', async () => {
  const { requestAgents } = await load(); const original = global.setTimeout; let calls = 0;
  try {
    global.setTimeout = callback => original(callback, 0);
    await assert.rejects(requestAgents('/runs', {}, async () => { calls++; return ok(); }, () => new Promise(() => {})), error => error.status === 504);
  } finally { global.setTimeout = original; }
  assert.equal(calls, 0);
});
