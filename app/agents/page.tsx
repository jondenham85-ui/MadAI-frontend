'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useUser } from '@/context/UserContext';
import { apiRequest } from '@/services/auth';
import { OWNER_COMMANDS, requestAgents, readRun, type Agent, type Run } from '@/lib/owner-agents.mjs';
type Registry = Record<string, { name: string; capabilities: string[] }>;
type Detail = { run: Run; events: unknown[] };
const explain = (error: unknown) => error instanceof Error ? error.message : 'Agent request failed';
export default function AgentCommandCenter() {
  const { user, loading } = useUser();
  const [verified, setVerified] = useState(false);
  const [registry, setRegistry] = useState<Registry>({});
  const [runs, setRuns] = useState<Run[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [agent, setAgent] = useState<Agent>('core');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    const result = await requestAgents<{ runs: unknown[] }>('/runs');
    if (!Array.isArray(result.runs)) throw new Error('Saved runs are unavailable');
    setRuns(result.runs.map(readRun));
  }, []);
  const inspect = useCallback(async (id: string) => {
    const result = await requestAgents<{run: unknown; events: unknown[]}>(`/runs/${id}`);
    if (!Array.isArray(result.events)) throw new Error('Execution logs are unavailable');
    setDetail({run: readRun(result.run), events: result.events});
  }, []);
  const connect = useCallback(async () => {
    setVerified(false); setError(''); setBusy(true);
    try {
      await apiRequest('/admin/system');
      const response = await requestAgents<{agents: Registry}>('/registry');
      if (!response.agents || ['core','revenue','funnel','task'].some(key => !response.agents[key] || typeof response.agents[key].name !== 'string' || !Array.isArray(response.agents[key].capabilities))) throw new Error('The four-agent registry is incomplete');
      await refresh(); setRegistry(response.agents); setVerified(true);
    } catch (failure) { setError(explain(failure)); }
    finally { setBusy(false); }
  }, [refresh]);
  useEffect(() => {
    setVerified(false); setRegistry({}); setRuns([]); setDetail(null);
    if (user?.role === 'OWNER') void connect();
  }, [user?.id, user?.role, connect]);
  useEffect(() => {
    if (!verified || !detail || !['PENDING','QUEUED','RUNNING'].includes(detail.run.status)) return;
    let pending = false;
    const timer = setInterval(() => {
      if (pending) return;
      pending = true;
      void inspect(detail.run.id).catch(failure => setError(explain(failure))).finally(() => { pending = false; });
    }, 5000);
    return () => clearInterval(timer);
  }, [verified, detail?.run.id, detail?.run.status, inspect]);
  async function execute(id: string) {
    setBusy(true); setError('');
    try { await requestAgents(`/runs/${id}/execute`, {method:'POST',body:'{}'}); await inspect(id); await refresh(); }
    catch (failure) { setError(explain(failure)); await inspect(id).catch(() => undefined); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!verified || busy || !prompt.trim()) return;
    setBusy(true); setError('');
    try {
      requestId.current ||= crypto.randomUUID();
      const result = await requestAgents<{run: unknown}>('/runs', {method:'POST',body:JSON.stringify({agent,prompt:prompt.trim(),requestId:requestId.current})});
      const run = readRun(result.run); requestId.current = null;
      setDetail({run,events:[]}); await refresh();
      if (['QUEUED','PENDING','FAILED'].includes(run.status)) await execute(run.id);
      else await inspect(run.id);
    } catch (failure) { setError(explain(failure)); }
    finally { setBusy(false); }
  }
  async function cancel(id: string) {
    setBusy(true); setError('');
    try { await requestAgents(`/runs/${id}/cancel`, {method:'POST',body:'{}'}); await inspect(id); await refresh(); }
    catch (failure) { setError(explain(failure)); }
    finally { setBusy(false); }
  }
  if (loading) return <main className="min-h-screen bg-black p-6 text-cyan-100" role="status">Restoring your account…</main>;
  if (!user || user.role !== 'OWNER') return <main className="min-h-screen bg-black p-6 text-cyan-100"><h1 className="text-3xl">Owner access required</h1><p>These commands require server-verified owner access.</p><a href={user?'/':'/login'} className="underline">{user?'Return to MADSI':'Sign in'}</a></main>;
  return <main className="min-h-screen bg-black p-4 text-cyan-100 sm:p-8"><div className="mx-auto max-w-6xl space-y-6">
    <header><p className="eyebrow">MADSI / OWNER COMMAND CENTER</p><h1 className="text-3xl font-bold text-cyan-300">Agent commands and execution history</h1><nav className="mt-3 flex flex-wrap gap-5"><a href="/admin" className="underline">Owner dashboard</a><a href="/synth" className="underline">Synth Console</a></nav></header>
    {error&&<p className="mad-error" role="alert">{error}</p>}
    {!verified?<section className="mad-card"><p>Waiting for server confirmation and the deployed agent registry.</p><button disabled={busy} onClick={()=>void connect()}>{busy?'Checking…':'Retry connection'}</button></section>:<>
      <section className="mad-card"><h2 className="text-xl">Current execution boundaries</h2><p>The connected backend runs AI analysis, generates artifacts and persists run state and logs. Proposed external actions are not executed. A recurring background worker and external repair tools are not installed yet. A saved or queued run is not proof that work is running.</p></section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Live agent registry">{(['core','revenue','funnel','task'] as const).map(key=><article className="mad-card" key={key}><h2>{registry[key].name}</h2><p className="break-words text-sm">{registry[key].capabilities.filter(value=>typeof value==='string').join(', ')}</p></article>)}</section>
      <section className="mad-card"><h2 className="text-xl">Owner command presets</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{OWNER_COMMANDS.map(command=><button type="button" key={command.id} disabled={busy} className="text-left" onClick={()=>{setAgent(command.agent);setPrompt(command.prompt);requestId.current=null;}}>{command.title}</button>)}</div><p className="mt-3 text-sm">Selecting a command fills the composer. Submitting runs only capabilities actually available on the backend; it does not grant new tool permissions.</p></section>
      <form onSubmit={submit} className="mad-card space-y-4"><label className="block">Agent<select className="mt-2 block w-full rounded bg-slate-950 p-3" value={agent} disabled={busy} onChange={event=>{setAgent(event.target.value as Agent);requestId.current=null;}}>{(['core','revenue','funnel','task'] as const).map(key=><option key={key} value={key}>{registry[key].name}</option>)}</select></label><label className="block">Directive<textarea className="mt-2 min-h-48 w-full rounded bg-slate-950 p-3" required maxLength={12000} value={prompt} disabled={busy} onChange={event=>{setPrompt(event.target.value);requestId.current=null;}}/></label><button disabled={busy||!prompt.trim()} type="submit">{busy?'Request in progress…':'Queue and run available agent capabilities'}</button></form>
      <section className="mad-card"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl">Saved executions</h2><button disabled={busy} onClick={()=>void refresh().catch(failure=>setError(explain(failure)))}>Refresh saved state</button></div>{runs.length===0?<p>No saved executions were returned.</p>:<ul className="mt-4 space-y-3">{runs.map(run=><li key={run.id} className="break-words border-b border-cyan-950 pb-3"><button disabled={busy} onClick={()=>void inspect(run.id).catch(failure=>setError(explain(failure)))}>{run.agent} · {run.status.replaceAll('_',' ')} · {run.id}</button><p>{run.prompt}</p></li>)}</ul>}</section>
      {detail&&<section className="mad-card space-y-3"><h2 className="text-xl">{detail.run.agent} · {detail.run.status.replaceAll('_',' ')}</h2><p className="break-all">Run ID: {detail.run.id}</p>{detail.run.error&&<p className="mad-error">{detail.run.error}</p>}<div className="flex flex-wrap gap-3">{['PENDING','QUEUED','FAILED'].includes(detail.run.status)&&<button disabled={busy} onClick={()=>void execute(detail.run.id)}>Run / bounded retry</button>}{['PENDING','QUEUED','RUNNING','WAITING_FOR_AUTHORIZATION'].includes(detail.run.status)&&<button disabled={busy} onClick={()=>void cancel(detail.run.id)}>Cancel saved execution</button>}<button disabled={busy} onClick={()=>void inspect(detail.run.id).catch(failure=>setError(explain(failure)))}>Refresh this run</button></div><h3>Stored result</h3><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm">{detail.run.result===undefined||detail.run.result===null?'No stored result yet.':JSON.stringify(detail.run.result,null,2)}</pre><h3>Execution logs</h3><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm">{JSON.stringify(detail.events,null,2)}</pre></section>}
    </>}
  </div></main>;
}
