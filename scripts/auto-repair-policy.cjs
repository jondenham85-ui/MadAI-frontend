const POLICY = Object.freeze({
  repository: 'jondenham85-ui/MadAI-frontend',
  maxFiles: 3,
  maxChangedLines: 100,
  action: 'OPEN_PR_ONLY',
  ownerReviewRequired: true,
  mergeAllowed: false,
  deploymentAllowed: false,
  requiredChecks: Object.freeze(['tests', 'build', 'typecheck'])
});

// Owner-approved exception for Issue #9 only. All other repairs retain the
// original three-file, 100-line, non-sensitive-helper restrictions.
const ISSUE_9_AUTH = Object.freeze({
  branch: 'madsi/auto-repair/9-supabase-auth-contract',
  maxFiles: 5,
  maxChangedLines: 500,
  sourcePaths: Object.freeze([
    'services/auth.ts',
    'hooks/useAuth.ts',
    'context/UserContext.tsx',
    'lib/supabase.ts'
  ]),
  testPath: 'test/repair-9-supabase-auth.test.cjs'
});

function evaluateRepair({ repository, branch, files } = {}) {
  const reasons = [];
  if (repository !== POLICY.repository) reasons.push('WRONG_REPOSITORY');

  const incidentException = branch === ISSUE_9_AUTH.branch;
  const branchParts = typeof branch === 'string' ? branch.split('/') : [];
  const validStandardBranch = branchParts.length === 3 &&
    branchParts[0] === 'madsi' &&
    branchParts[1] === 'auto-repair' &&
    /^[1-9][0-9]*-[a-z0-9-]+$/.test(branchParts[2]);
  if (!incidentException && !validStandardBranch) reasons.push('DEDICATED_INCIDENT_BRANCH_REQUIRED');

  const maxFiles = incidentException ? ISSUE_9_AUTH.maxFiles : POLICY.maxFiles;
  const maxChangedLines = incidentException ? ISSUE_9_AUTH.maxChangedLines : POLICY.maxChangedLines;
  if (!Array.isArray(files) || files.length < 1 || files.length > maxFiles) {
    return { allowed: false, reasons: [...reasons, 'FILE_LIMIT'], policy: POLICY };
  }

  let lines = 0, source = false, regression = false;
  const seen = new Set();
  for (const file of files) {
    if (!file || typeof file.path !== 'string') { reasons.push('INVALID_FILE'); continue; }
    const path = file.path;
    if (!/^[A-Za-z0-9_./-]+$/.test(path) || path.startsWith('/') ||
        path.split('/').some(part => !part || part === '.' || part === '..') || seen.has(path)) {
      reasons.push('UNSAFE_OR_DUPLICATE_PATH');
      continue;
    }
    seen.add(path);
    if (!['A','M'].includes(file.status) || file.newMode !== '100644' ||
        !['000000','100644'].includes(file.oldMode) ||
        (file.status === 'A') !== (file.oldMode === '000000')) {
      reasons.push('ONLY_REGULAR_ADDITIONS_OR_MODIFICATIONS');
    }
    if (!Number.isSafeInteger(file.additions) || !Number.isSafeInteger(file.deletions) ||
        file.additions < 0 || file.deletions < 0) {
      reasons.push('INVALID_OR_BINARY_DIFF');
    } else lines += file.additions + file.deletions;

    const incidentSource = incidentException && ISSUE_9_AUTH.sourcePaths.includes(path);
    const incidentTest = incidentException && path === ISSUE_9_AUTH.testPath &&
      file.status === 'A' && file.oldMode === '000000' && file.deletions === 0;
    const sensitive = /auth|session|cookie|permission|owner|agent|billing|stripe|payment|revenue|subscription|pricing|supabase|production|secret|token|constant|middleware|schema|database/i.test(path);
    const helper = (path.startsWith('lib/') || path.startsWith('hooks/')) &&
      ['.js','.cjs','.mjs','.ts'].some(ext => path.endsWith(ext)) && !sensitive;
    const newTest = path.startsWith('test/repair-') && path.endsWith('.test.cjs') &&
      file.status === 'A' && file.oldMode === '000000' && file.deletions === 0;

    if (incidentException ? (!incidentSource && !incidentTest) : (!helper && !newTest)) {
      reasons.push('PROTECTED_OR_UNAPPROVED_PATH:' + path);
    }
    source ||= incidentException ? incidentSource : helper;
    regression ||= incidentException ? incidentTest : newTest;
  }

  if (lines > maxChangedLines) reasons.push('LINE_LIMIT');
  if (!source || !regression) reasons.push('SOURCE_CHANGE_AND_NEW_REGRESSION_TEST_REQUIRED');
  return { allowed: reasons.length === 0, reasons, policy: POLICY, incidentException };
}

module.exports = { POLICY, ISSUE_9_AUTH, evaluateRepair };

if (require.main === module) {
  const { execFileSync } = require('node:child_process');
  try {
    const [base, head] = process.argv.slice(2);
    if (![base,head].every(value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value))) throw new Error('Exact commit SHAs required');
    const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1048576, timeout: 10000 });
    const stats = new Map(git(['diff','--numstat','-z','--no-renames',base,head]).split('\0').filter(Boolean).map(row => {
      const [a,d,...p] = row.split('\t');
      return [p.join('\t'), { additions: /^[0-9]+$/.test(a) ? Number(a) : null, deletions: /^[0-9]+$/.test(d) ? Number(d) : null }];
    }));
    const raw = git(['diff','--raw','-z','--no-renames',base,head]).split('\0').filter(Boolean);
    const files = [];
    for (let i=0; i<raw.length; i+=2) {
      const [oldMode,newMode,,,status] = raw[i].slice(1).split(' ');
      files.push({ path: raw[i+1], oldMode, newMode, status, ...stats.get(raw[i+1]) });
    }
    const result = evaluateRepair({ repository: process.env.GITHUB_REPOSITORY, branch: process.env.REPAIR_BRANCH, files });
    console.log(JSON.stringify({ base, head, ...result }, null, 2));
    if (!result.allowed) process.exitCode = 1;
  } catch {
    console.error('Repair policy could not verify the diff; refusing permission.');
    process.exitCode = 1;
  }
}
