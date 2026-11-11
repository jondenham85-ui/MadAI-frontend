export const OWNER_COMMANDS = Object.freeze([
  {
    "id": "repair",
    "title": "Full system repair",
    "agent": "core",
    "prompt": "CORE, perform a complete system-wide inspection of MADSI. Find every unfinished feature, broken connection, failed API, database problem, AI execution issue, and deployment problem. Assign repairs to the appropriate agents. Fix everything you are authorized to fix, run tests, and report unresolved blockers."
  },
  {
    "id": "revenue",
    "title": "Revenue growth",
    "agent": "revenue",
    "prompt": "REVENUE, analyze the entire MADSI business. Inspect verified Stripe revenue, subscriptions, pricing, customer activity, operating costs, and conversion metrics. Build a measurable growth strategy toward $500,000 in monthly recurring revenue. Identify problems, recommend improvements, and create execution tasks for the Task Agent."
  },
  {
    "id": "funnels",
    "title": "Build and repair sales funnels",
    "agent": "funnel",
    "prompt": "FUNNEL, inspect the MADSI website and customer journey. Identify every conversion problem. Improve onboarding, signup, pricing, upgrade opportunities, and customer retention. Create marketing funnels and measurable campaigns. Coordinate implementation with CORE and TASK."
  },
  {
    "id": "tasks",
    "title": "Autonomous task execution",
    "agent": "task",
    "prompt": "TASK, inspect all unfinished MADSI development tasks. Prioritize production blockers. Assign subtasks, execute all authorized repairs, coordinate specialized agents, preserve progress, and continue until all achievable tasks are completed."
  },
  {
    "id": "collaboration",
    "title": "Multi-agent collaboration",
    "agent": "core",
    "prompt": "CORE, activate the full MADSI agent team. Have REVENUE analyze business performance, FUNNEL improve customer conversion, and TASK execute the resulting implementation work. Coordinate their work, monitor failures, and provide me with one consolidated report."
  },
  {
    "id": "launch",
    "title": "Final production launch",
    "agent": "core",
    "prompt": "CORE, verify the complete MADSI application. Test authentication, Supabase, OpenAI, Synth Console, directive execution, all four agents, Stripe, administration, and mobile functionality. Repair any remaining issues. Deploy the verified application and confirm its public production status."
  },
  {
    "id": "unfinished",
    "title": "Complete previous unfinished work",
    "agent": "core",
    "prompt": "CORE, identify every unfinished item, failed implementation, unresolved error, missing feature, and blocked task left by previous development sessions. Do not repeat completed work. Inspect the actual code and system state. Delegate every repair to the appropriate agent. Use authorized integrations and tools to complete work that previous development sessions could not finish. If an operation is blocked by missing access, credentials, or permissions, identify the exact blocker and continue all independent work. Save progress and produce a verified completion report."
  }
].map(command => Object.freeze(command)));
export class AgentApiError extends Error {
  constructor(status, message) { super(message); this.name = 'AgentApiError'; this.status = status; }
}
export async function requestAgents(path, options = {}, fetcher = fetch) {
  const id = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  if (!new RegExp(`^/(registry|runs(/${id}(/(execute|cancel))?)?)$`, 'i').test(path)) throw new AgentApiError(400, 'Invalid agent API path');
  const controller = new AbortController();
  let timer, cancel;
  const deadline = new Promise((_, reject) => {
    cancel = () => { reject(new DOMException('Request cancelled', 'AbortError')); controller.abort(); };
    if (options.signal?.aborted) { cancel(); return; }
    options.signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => { reject(new AgentApiError(504, 'Execution response timed out. Refresh the saved run before retrying; do not create a duplicate.')); controller.abort(); }, 90000);
  });
  const perform = async () => {
    if (controller.signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    let response;
    try { response = await fetcher('/api/agents' + path, { ...options, headers, signal: controller.signal, credentials: 'include', cache: 'no-store' }); }
    catch (error) { if (controller.signal.aborted) throw error; throw new AgentApiError(503, 'Agent service cannot be reached. Refresh saved runs before retrying.'); }
    let value;
    try { value = await response.json(); } catch { throw new AgentApiError(response.ok ? 502 : response.status, 'Agent service returned invalid JSON'); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AgentApiError(response.ok ? 502 : response.status, 'Agent service returned an invalid response');
    if (!response.ok) throw new AgentApiError(response.status, typeof value.error === 'string' ? value.error : 'Agent request failed');
    return value;
  };
  try { return await Promise.race([deadline, perform()]); }
  finally { if (timer !== undefined) clearTimeout(timer); if (cancel) options.signal?.removeEventListener('abort', cancel); }
}
export function readRun(value) {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id) || typeof row.status !== 'string' || typeof row.agent !== 'string') throw new AgentApiError(502, 'Agent service did not return a valid saved run');
  return row;
}
