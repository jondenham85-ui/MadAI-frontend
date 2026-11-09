/** @param {Array<{plan?: string}>} users */
function summarizePlans(users) {
  const labels = {free:'Free',chat:'Chat',tasks:'Tasks',premium:'Premium',business_team:'Business Team',business_scale:'Business Scale',other:'Other / unknown'};
  const counts = Object.fromEntries(Object.keys(labels).map(key => [key, 0]));
  for (const user of users) counts[Object.prototype.hasOwnProperty.call(labels, user.plan || '') ? user.plan : 'other']++;
  return Object.entries(labels).map(([id,label]) => ({id,label,count:counts[id],percent:users.length ? counts[id]/users.length*100 : 0}));
}
/** @param {{name?:string,email?:string}} user @param {string} query */
function matchesAccount(user, query) { return `${user.name || ''} ${user.email || ''}`.toLowerCase().includes(query.trim().toLowerCase()); }
module.exports = {summarizePlans,matchesAccount};
