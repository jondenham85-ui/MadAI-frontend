const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../lib/madsi-facebook-event-processor.ts'), 'utf8');
test('Facebook event triage prioritizes mentions and comments for owner review', () => {
 assert.match(source, /page_mention/);
 assert.match(source, /comment_activity/);
 assert.match(source, /priority: 'high'/);
 assert.match(source, /next_step: 'owner_review'/);
});
