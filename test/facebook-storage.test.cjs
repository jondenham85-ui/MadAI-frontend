const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../lib/madsi-facebook-storage.ts'), 'utf8');

test('Neon Facebook storage accepts only validated PostgREST control parameters', () => {
  assert.match(source, /const requestedColumns = params\.get\('select'\)/);
  assert.match(source, /const limitRaw = params\.get\('limit'\)/);
  assert.match(source, /const conflictTarget = params\.get\('on_conflict'\)/);
  assert.match(source, /\["select", "limit", "on_conflict"\]\.includes\(key\)/);
  assert.match(source, /table === "madsi_facebook_connections" && conflictTarget === "owner_user_id"/);
});

test('Neon Facebook storage bounds SQL limits and keeps filters parameterized', () => {
  assert.match(source, /Number\.isSafeInteger\(limit\).*limit < 1 \|\| limit > 100/);
  assert.match(source, /where\.push\('\"' \+ key \+ '\" ' \+ operator \+ " \$" \+ values\.length\)/);
  assert.match(source, /const limitClause = " LIMIT " \+ limit/);
});
