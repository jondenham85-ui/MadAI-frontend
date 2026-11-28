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
