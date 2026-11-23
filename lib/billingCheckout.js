const paidPlans = new Set(['chat', 'tasks', 'premium', 'business_team', 'business_scale']);
const billingIntervals = new Set(['month', 'year']);

/** @typedef {'chat'|'tasks'|'premium'|'business_team'|'business_scale'} PaidPlan */
/** @typedef {'month'|'year'} BillingInterval */

/**
 * @param {string} search
 * @returns {{plan: PaidPlan, interval: BillingInterval} | null}
 */
function parseCheckoutIntent(search = '') {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const plan = params.get('checkout') || params.get('plan') || '';
  const interval = params.get('interval') || 'month';
  if (!paidPlans.has(plan) || !billingIntervals.has(interval)) return null;
  return { plan, interval };
}

/** @param {string} plan @param {string} interval */
function buildSignupUrl(plan, interval) {
  if (!paidPlans.has(plan) || !billingIntervals.has(interval)) return '/signup';
  return '/signup?' + new URLSearchParams({ plan, interval }).toString();
}

/** @param {string} plan @param {string} interval */
function buildPricingCheckoutUrl(plan, interval) {
  if (!paidPlans.has(plan) || !billingIntervals.has(interval)) return '/pricing';
  return '/pricing?' + new URLSearchParams({ checkout: plan, interval }).toString();
}

/** @param {string} path @param {string} search */
function buildAuthSwitchUrl(path, search = '') {
  const intent = parseCheckoutIntent(search);
  if (!intent) return path;
  return path + '?' + new URLSearchParams({ plan: intent.plan, interval: intent.interval }).toString();
}

module.exports = { parseCheckoutIntent, buildSignupUrl, buildPricingCheckoutUrl, buildAuthSwitchUrl };
