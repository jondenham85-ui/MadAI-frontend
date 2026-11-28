const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../lib/madsi-facebook-storage.ts'), 'utf8');

test('Neon Facebook storage accepts only validated PostgREST control parameters', () => {
  assert.ok(source.includes('const requestedColumns = params.get("select")'));
  assert.ok(source.includes('const limitRaw = params.get("limit")'));
  assert.ok(source.includes('const conflictTarget = params.get("on_conflict")'));
  assert.ok(source.includes('["select", "limit", "on_conflict"].includes(key)'));
  assert.ok(source.includes('table === "madsi_facebook_connections" && conflictTarget === "owner_user_id"'));
});

test('Neon Facebook storage bounds SQL limits and keeps filters parameterized', () => {
  assert.ok(source.includes('if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)'));
  assert.ok(source.includes('values.push(raw.slice(3))'));
  assert.ok(source.includes('const limitClause = " LIMIT " + limit'));
});
