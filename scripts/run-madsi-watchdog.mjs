import { mkdir, writeFile } from 'node:fs/promises';
import { inspectSite, ensureIncident } from './madsi-watchdog.mjs';
const REPO = 'jondenham85-ui/MadAI-frontend';
if (process.env.GITHUB_REPOSITORY !== REPO || process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Watchdog is restricted to the designated repository main branch');
const report = await inspectSite();
await mkdir('watchdog-report', { recursive: true });
const evidence = { at: new Date().toISOString(), commit: process.env.GITHUB_SHA, ...report, scope: 'Homepage and anonymous API health only; not complete product acceptance', repairsExecuted: false };
await writeFile('watchdog-report/health.json', JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence));
if (!report.healthy) {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('Incident token unavailable');
  const api = async (method, path, body) => {
    if (!(method === 'GET' && /^\/issues\?state=open&per_page=100&page=\d+$/.test(path)) && !(method === 'POST' && path === '/issues')) throw new Error('Operation not allowed');
    const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new Error(`Incident API failed with HTTP ${response.status}`);
    return response.json();
  };
  const incident = await ensureIncident(report, api, `https://github.com/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}`);
  console.log(JSON.stringify(incident));
  process.exitCode = 1;
}
