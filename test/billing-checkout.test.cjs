const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseCheckoutIntent,
  buildSignupUrl,
  buildPricingCheckoutUrl,
  buildAuthSwitchUrl,
} = require('../lib/billingCheckout');

test('preserves a monthly plan through account creation', () => {
  assert.deepEqual(parseCheckoutIntent('?plan=chat&interval=month'), { plan: 'chat', interval: 'month' });
  assert.equal(buildSignupUrl('chat', 'month'), '/signup?plan=chat&interval=month');
});

test('preserves annual plan intent through signup and sign-in', () => {
  assert.equal(buildSignupUrl('premium', 'year'), '/signup?plan=premium&interval=year');
  assert.equal(buildAuthSwitchUrl('/login', '?plan=premium&interval=year'), '/login?plan=premium&interval=year');
  assert.equal(buildPricingCheckoutUrl('premium', 'year'), '/pricing?checkout=premium&interval=year');
});

test('supports every paid tier and rejects invalid plan or interval values', () => {
  for (const plan of ['chat', 'tasks', 'premium', 'business_team', 'business_scale']) {
    assert.deepEqual(parseCheckoutIntent('?checkout=' + plan + '&interval=month'), { plan, interval: 'month' });
  }
  assert.equal(parseCheckoutIntent('?plan=free&interval=month'), null);
  assert.equal(parseCheckoutIntent('?plan=chat&interval=weekly'), null);
  assert.equal(buildSignupUrl('not-a-plan', 'month'), '/signup');
  assert.equal(buildPricingCheckoutUrl('chat', 'quarter'), '/pricing');
});

test('does not carry arbitrary query strings or redirect destinations between auth pages', () => {
  assert.equal(buildAuthSwitchUrl('/login', '?next=https://example.com&plan=free'), '/login');
  assert.equal(buildAuthSwitchUrl('/signup', ''), '/signup');
});
