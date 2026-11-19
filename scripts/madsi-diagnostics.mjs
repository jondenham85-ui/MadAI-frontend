const HTTP_RULES = Object.freeze({
  401: ['AUTH_OR_ACCESS_FAILURE', 'high', 'Inspect authentication and access logs; do not alter credentials automatically.'],
  403: ['AUTH_OR_ACCESS_FAILURE', 'high', 'Inspect authorization and origin policy; do not weaken access controls.'],
  404: ['ROUTE_NOT_FOUND', 'high', 'Compare the deployed route map with the expected endpoint; do not rewrite routes automatically.'],
  429: ['RATE_LIMIT_OR_CAPACITY', 'medium', 'Apply bounded backoff and inspect provider quota/capacity before retrying.'],
  500: ['SERVER_ERROR', 'high', 'Collect application logs and identify the failing component before proposing a repair.'],
  502: ['UPSTREAM_UNAVAILABLE', 'high', 'Inspect upstream health and recent deploys; retry only with bounded backoff.'],
  503: ['UPSTREAM_UNAVAILABLE', 'high', 'Inspect provider availability and capacity; retry only with bounded backoff.'],
  504: ['UPSTREAM_TIMEOUT', 'high', 'Compare upstream latency and timeout logs; avoid increasing traffic during recovery.'],
});
function findingFor(check) {
  const status = Number(check.status);
  if (HTTP_RULES[status]) {
    const [code, severity, recommendation] = HTTP_RULES[status];
    return { target: check.name, code, severity, status, recommendation, retryable: [429, 500, 502, 503, 504].includes(status) };
  }
  if (check.reason === 'NETWORK_TIMEOUT_OR_INVALID_BODY') return {
    target: check.name, code: 'NETWORK_OR_TIMEOUT', severity: 'high',
    recommendation: 'Compare DNS, TLS, network and service latency evidence; repeat a bounded probe before escalating.',
    retryable: true,
  };
  if (check.reason === 'CONTENT_OR_HEALTH_CONTRACT') return {
    target: check.name, code: 'HEALTH_CONTRACT_MISMATCH', severity: 'high',
    recommendation: 'Inspect the response content type and documented health contract; do not treat an unknown response as healthy.',
    retryable: false,
  };
  if (!check.status) return {
    target: check.name, code: 'UNCLASSIFIED_PROBE_FAILURE', severity: 'high',
    recommendation: 'Collect sanitized response and platform logs before choosing a repair.',
    retryable: false,
  };
  return {
    target: check.name, code: 'UNEXPECTED_HTTP_STATUS', severity: 'high', status,
    recommendation: 'Inspect the endpoint response and deployment logs; do not make an automatic production change.',
    retryable: false,
  };
}
export function diagnoseReport(report) {
  const failures = (Array.isArray(report?.checks) ? report.checks : []).filter(check => check && check.ok !== true);
  const findings = failures.map(findingFor);
  return {
    status: findings.length ? 'investigation_required' : 'healthy',
    summary: findings.length ? `${findings.length} production probe failure(s) require investigation.` : 'All monitored endpoints passed their latest probe round.',
    findings,
    automaticRepairAllowed: false,
    ownerApprovalRequiredForProductionChanges: true,
  };
}
