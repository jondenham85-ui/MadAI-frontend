export const TARGETS = Object.freeze([
  Object.freeze({ name: 'homepage', url: 'https://www.madmadisonai.com/', kind: 'html' }),
  Object.freeze({ name: 'api-health', url: 'https://www.madmadisonai.com/api/backend/api/health', kind: 'json' }),
  Object.freeze({ name: 'inference-worker-health', url: 'https://madsi-inference.madsi.workers.dev/health', kind: 'worker-json' }),
]);
async function readBody(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1048576) { await reader.cancel(); throw new Error('Oversized response'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
export async function probe(target, fetcher = fetch) {
  try {
    const response = await fetcher(target.url, { method: 'GET', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { Accept: target.kind === 'html' ? 'text/html' : 'application/json' } });
    if (response.status !== 200) return { name: target.name, ok: false, status: response.status, reason: 'HTTP_STATUS' };
    const text = await readBody(response);
    let ok = false;
    if (target.kind === 'html') ok = /text\/html/i.test(response.headers.get('content-type') || '') && /MADSI|MAD\s+Madison\s+AI/i.test(text);
    else if (/application\/json/i.test(response.headers.get('content-type') || '')) {
      const value = JSON.parse(text);
      ok = !!value && !Array.isArray(value) && typeof value === 'object' && !value.error && value.ok !== false && value.success !== false && (value.ok === true || value.success === true || ['ok','healthy'].includes(value.status));
      if (target.kind === 'worker-json') ok = value?.status === 'ready' && value?.provider === 'Cloudflare Workers AI' && typeof value?.model === 'string' && value.model.length > 0;
    }
    return { name: target.name, ok, status: response.status, reason: ok ? 'PASS' : 'CONTENT_OR_HEALTH_CONTRACT' };
  } catch { return { name: target.name, ok: false, reason: 'NETWORK_TIMEOUT_OR_INVALID_BODY' }; }
}
export async function inspectSite(fetcher = fetch, pause = () => new Promise(resolve => setTimeout(resolve, 2000))) {
  const first = await Promise.all(TARGETS.map(target => probe(target, fetcher)));
  if (first.every(check => check.ok)) return { healthy: true, transient: false, checks: first };
  await pause();
  const second = await Promise.all(TARGETS.map(target => probe(target, fetcher)));
  return { healthy: second.every(check => check.ok), transient: second.every(check => check.ok), checks: second, previousChecks: first };
}
export const INCIDENT_MARKER = '<!-- madsi-production-watchdog-v1 -->';
export async function ensureIncident(report, api, runUrl) {
  if (report.healthy) return { action: 'none' };
  for (let page = 1; page <= 10; page++) {
    const rows = await api('GET', `/issues?state=open&per_page=100&page=${page}`);
    if (!Array.isArray(rows)) throw new Error('Invalid incident-list response');
    const existing = rows.find(row => !row.pull_request && row.body?.startsWith(INCIDENT_MARKER));
    if (existing) return { action: 'existing', number: existing.number };
    if (rows.length < 100) {
      const created = await api('POST', '/issues', { title: '[MADSI] Production health incident - investigation required', body: `${INCIDENT_MARKER}\nRepeated production probes failed.\n\n${JSON.stringify(report, null, 2)}\n\nEvidence: ${runUrl}\n\nTask: diagnose the failed checks, inspect deployment and backend logs, prepare a tested repair, and obtain approval before production changes.\n\nThis watchdog has not executed a repair, deployed code, or verified login, AI, billing or data persistence.` });
      if (!Number.isInteger(created.number)) throw new Error('Incident creation was not confirmed');
      return { action: 'created', number: created.number };
    }
  }
  throw new Error('Incident scan limit exceeded; refusing to create a possible duplicate');
}
