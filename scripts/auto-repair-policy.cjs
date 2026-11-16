const POLICY = Object.freeze({ repository: 'jondenham85-ui/MadAI-frontend', maxFiles: 3, maxChangedLines: 100, action: 'OPEN_PR_ONLY', ownerReviewRequired: true, mergeAllowed: false, deploymentAllowed: false, requiredChecks: Object.freeze(['tests', 'build', 'typecheck']) });
function evaluateRepair({ repository, branch, files } = {}) {
  const reasons = [];
  if (repository !== POLICY.repository) reasons.push('WRONG_REPOSITORY');
  if (typeof branch !== 'string' || !/^madsi\/auto-repair\/[1-9][0-9]*-[a-z0-9-]+$/.test(branch)) reasons.push('DEDICATED_INCIDENT_BRANCH_REQUIRED');
  if (!Array.isArray(files) || files.length < 1 || files.length > POLICY.maxFiles) return { allowed: false, reasons: [...reasons, 'FILE_LIMIT'], policy: POLICY };
  let lines = 0, source = false, regression = false;
  const seen = new Set();
  for (const file of files) {
    if (!file || typeof file.path !== 'string') { reasons.push('INVALID_FILE'); continue; }
    const path = file.path;
    if (!/^[A-Za-z0-9_./-]+$/.test(path) || path.startsWith('/') || path.split('/').some(part => !part || part === '.' || part === '..') || seen.has(path)) { reasons.push('UNSAFE_OR_DUPLICATE_PATH'); continue; }
    seen.add(path);
    if (!['A','M'].includes(file.status) || file.newMode !== '100644' || !['000000','100644'].includes(file.oldMode) || (file.status === 'A') !== (file.oldMode === '000000')) reasons.push('ONLY_REGULAR_ADDITIONS_OR_MODIFICATIONS');
    if (!Number.isSafeInteger(file.additions) || !Number.isSafeInteger(file.deletions) || file.additions < 0 || file.deletions < 0) reasons.push('INVALID_OR_BINARY_DIFF');
    else lines += file.additions + file.deletions;
    const sensitive = /auth|session|cookie|permission|owner|agent|billing|stripe|payment|revenue|subscription|pricing|supabase|production|secret|token|constant|middleware|schema|database/i.test(path);
    const helper = /^(lib|hooks)\/[A-Za-z0-9_./-]+\.(js|cjs|mjs|ts)$/.test(path) && !sensitive;
    const newTest = /^test\/repair-[a-z0-9-]+\.test\.cjs$/.test(path) && file.status === 'A' && file.oldMode === '000000' && file.deletions === 0;
    if (!helper && !newTest) reasons.push('PROTECTED_OR_UNAPPROVED_PATH:' + path);
    source ||= helper; regression ||= newTest;
  }
  if (lines > POLICY.maxChangedLines) reasons.push('LINE_LIMIT');
  if (!source || !regression) reasons.push('HELPER_CHANGE_AND_NEW_REGRESSION_TEST_REQUIRED');
  return { allowed: reasons.length === 0, reasons, policy: POLICY };
}
module.exports = { POLICY, evaluateRepair };
if (require.main === module) {
  const { execFileSync } = require('node:child_process');
  try {
    const [base, head] = process.argv.slice(2);
    if (![base,head].every(value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value))) throw new Error('Exact commit SHAs required');
    const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1048576, timeout: 10000 });
    const stats = new Map(git(['diff','--numstat','-z','--no-renames',base,head]).split('\0').filter(Boolean).map(row => { const [a,d,...p] = row.split('\t'); return [p.join('\t'), { additions: /^\d+$/.test(a) ? Number(a) : null, deletions: /^\d+$/.test(d) ? Number(d) : null }]; }));
    const raw = git(['diff','--raw','-z','--no-renames',base,head]).split('\0').filter(Boolean);
    const files = [];
    for (let i=0; i<raw.length; i+=2) {
      const [oldMode,newMode,,,status] = raw[i].slice(1).split(' ');
      files.push({ path: raw[i+1], oldMode, newMode, status, ...stats.get(raw[i+1]) });
    }
    const result = evaluateRepair({ repository: process.env.GITHUB_REPOSITORY, branch: process.env.REPAIR_BRANCH, files });
    console.log(JSON.stringify({ base, head, ...result }, null, 2));
    if (!result.allowed) process.exitCode = 1;
  } catch { console.error('Repair policy could not verify the diff; refusing permission.'); process.exitCode = 1; }
}
