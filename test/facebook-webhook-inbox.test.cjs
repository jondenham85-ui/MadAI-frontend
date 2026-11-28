const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const storage = fs.readFileSync(path.join(__dirname, '../lib/madsi-facebook-storage.ts'), 'utf8');
const route = fs.readFileSync(path.join(__dirname, '../app/api/facebook/[action]/route.ts'), 'utf8');
test('Facebook webhook events are durably stored and deduplicated', () => {
 assert.ok(route.includes("db('madsi_facebook_webhook_events'"));
 assert.ok(route.includes('event_hash: await hash(identity)'));
 assert.ok(storage.includes('ON CONFLICT (event_hash) DO NOTHING RETURNING event_hash'));
 assert.ok(storage.includes('madsi_facebook_webhook_events:'));
});
test('Facebook webhook signature is verified before JSON parsing and content is minimized', () => {
 assert.ok(route.indexOf('if (mismatch !== 0)') < route.indexOf('JSON.parse(new TextDecoder().decode(raw))'));
 assert.ok(route.includes('never store post/comment text or access tokens'));
 assert.ok(route.includes('Meta should retry delivery'));
});
test('Webhook inbox migration has retryable processing states', () => {
 const sql=fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261128000300_madsi_facebook_webhook_inbox.sql'),'utf8');
 assert.ok(sql.includes("status text not null default 'pending'"));
 assert.ok(sql.includes('event_hash text primary key'));
});

test('Facebook event processor uses protected triage and retryable leases', () => {
 const processor = fs.readFileSync(path.join(__dirname, '../lib/madsi-facebook-event-processor.ts'), 'utf8');
 assert.ok(route.includes("if (action === 'process') return processWebhookEvents(request)"));
 assert.ok(route.includes('MADSI_FACEBOOK_PROCESSOR_SECRET'));
 assert.ok(route.includes("mode: 'triage_only'"));
 assert.ok(route.includes('Recovered expired processing lease'));
 assert.ok(processor.includes('owner_review'));
 assert.ok(storage.includes('table === "madsi_facebook_webhook_events" && method === "PATCH"'));
});

test('Failed Facebook event triage is retried with a bounded attempt count', () => {
 assert.ok(route.includes("status=eq.failed&attempts=lt.5"));
 assert.ok(route.includes("attempts=lt.5"));
 assert.ok(route.includes("up to five total claims"));
});

test('Event processor storage readiness is independent of Meta OAuth credentials', () => {
 assert.ok(route.includes("if (!storageReady()) return json({ error: 'Facebook storage is not configured.' }, 503)"));
 const processor=route.slice(route.indexOf('async function processWebhookEvents'),route.indexOf('function failure'));
 assert.ok(!processor.includes('if (!ready())'));
 assert.ok(route.includes("backend === 'neon' ? Boolean(value('MADSI_DATABASE_URL'))"));
});
test('Neon event storage has exactly one GET implementation and supports PATCH claims', () => {
 const getBranches=(storage.match(/table === "madsi_facebook_webhook_events" && method === "GET"/g)||[]).length;
 assert.equal(getBranches,1);
 assert.ok(storage.includes('method === "PATCH"'));
});

test('Cloudflare scheduled processor is enabled only for production Worker builds', () => {
 const config=fs.readFileSync(path.join(__dirname, '../cloudflare.config.ts'),'utf8');
 const entry=fs.readFileSync(path.join(__dirname, '../worker/index.ts'),'utf8');
 assert.ok(config.includes('entrypoint: "./worker/index.ts"'));
 assert.ok(config.includes('isPreview ? [] : [triggers.scheduled({ schedule: "*/5 * * * *" })]'));
 assert.ok(entry.includes('handler.fetch(request, env, ctx)'));
 assert.ok(entry.includes('/api/facebook/process'));
 assert.ok(entry.includes('MADSI_FACEBOOK_PROCESSOR_SECRET'));
});

test('Cloudflare custom Worker entrypoint is not overwritten by the default Vinext entrypoint', () => {
 const config=fs.readFileSync(path.join(__dirname, '../cloudflare.config.ts'),'utf8');
 const entrypoints=[...config.matchAll(/entrypoint:\s*["']([^"']+)["']/g)].map(match=>match[1]);
 assert.deepEqual(entrypoints,['./worker/index.ts']);
});
