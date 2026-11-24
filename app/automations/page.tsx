'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useUser } from '@/context/UserContext';
import { getAccessToken } from '@/lib/supabase';

type Automation = { id:string; name:string; description:string; agent:string; prompt:string; trigger_type:'manual'|'schedule'; schedule_cron:string|null; timezone:string; next_run_at:string|null; enabled:boolean; approval_required:boolean; created_at:string; last_run_at:string|null };
type Run = { id:string; status:string; trigger_source:string; result:unknown; error:string|null; created_at:string; completed_at:string|null };
const AGENTS = [{id:'automation',name:'Automation Agent'},{id:'task',name:'Task Agent'},{id:'revenue',name:'Revenue Agent'},{id:'funnel',name:'Funnel Agent'},{id:'monitoring',name:'Monitoring Agent'},{id:'integration',name:'Integration Agent'}];
export default function AutomationsPage(){
 const {user,loading}=useUser();
 const [items,setItems]=useState<Automation[]>([]),[runs,setRuns]=useState<Record<string,Run[]>>({});
 const [name,setName]=useState(''),[description,setDescription]=useState(''),[prompt,setPrompt]=useState('');
 const [agent,setAgent]=useState('automation'),[trigger,setTrigger]=useState<'manual'|'schedule'>('manual'),[cron,setCron]=useState('0 9 * * 1-5'),[timezone,setTimezone]=useState('America/Chicago');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const request=useCallback(async(path:string,method='GET',body?:unknown)=>{
   const token=await getAccessToken();if(!token)throw new Error('Please sign in again.');
   const response=await fetch('/api/agents'+path,{method,credentials:'include',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Accept':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'Automation request failed');
   return data;
 },[]);
 const refresh=useCallback(async()=>{
   const data=await request('/automations');
   const list=Array.isArray(data.automations)?data.automations:[];
   setItems(list);
   const history=await Promise.all(list.slice(0,25).map(async(a:Automation)=>[a.id,(await request('/automations/'+a.id+'/runs')).runs||[]] as const));
   setRuns(Object.fromEntries(history));
 },[request]);
 useEffect(()=>{if(user)void refresh().catch(e=>setError(e.message));},[user?.id,refresh]);
 useEffect(()=>{if(!user)return;const timer=setInterval(()=>{void refresh().catch(()=>undefined);},30000);return()=>clearInterval(timer);},[user?.id,refresh]);
 async function create(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');setNotice('');
  try{await request('/automations','POST',{name,description,prompt,agent,triggerType:trigger,scheduleCron:trigger==='schedule'?cron:null,timezone});setName('');setDescription('');setPrompt('');setNotice('Workflow saved. It is not active yet. Review it, then run and approve it.');await refresh();}
  catch(e){setError(e instanceof Error?e.message:'Could not save workflow');}finally{setBusy(false);}
 }
 async function run(id:string){
  setBusy(true);setError('');setNotice('');
  try{const result=await request('/automations/'+id+'/run','POST',{});setNotice(result.message||'Run queued for approval.');await refresh();}
  catch(e){setError(e instanceof Error?e.message:'Could not queue workflow');}finally{setBusy(false);}
 }
 async function approve(id:string,runId:string){
  setBusy(true);setError('');setNotice('');
  try{await request('/automations/'+id+'/approve','POST',{runId});setNotice('Approved. MADSI is executing the workflow.');await refresh();}
  catch(e){setError(e instanceof Error?e.message:'Could not approve workflow');}finally{setBusy(false);}
 }
 async function toggle(a:Automation){
  setBusy(true);setError('');setNotice('');
  try{const action=a.enabled?'disable':'enable';await request('/automations/'+a.id+'/'+action,'POST',{});setNotice(a.enabled?'Schedule paused.':'Schedule marked enabled. Scheduled runs create approval requests; approve each run before execution.');await refresh();}
  catch(e){setError(e instanceof Error?e.message:'Could not update schedule');}finally{setBusy(false);}
 }
 if(loading)return <main className="min-h-screen bg-[#031b1e] p-6 text-teal-100">Loading MADSI…</main>;
 if(!user)return <main className="min-h-screen bg-[#031b1e] p-6 text-teal-100"><h1 className="text-3xl">Sign in to use MADSI Automations</h1><a className="underline" href="/login">Sign in</a></main>;
 return <main className="min-h-screen bg-[#031b1e] p-4 text-teal-50 sm:p-8"><div className="mx-auto max-w-6xl space-y-6">
  <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs tracking-[.25em] text-teal-300">MADSI / AUTOMATION STUDIO</p><h1 className="mt-2 text-3xl font-bold text-teal-200 sm:text-4xl">Automation agents</h1><p className="mt-2 max-w-2xl text-sm text-teal-100/75">Build repeatable AI workflows, review each run, and keep an execution history.</p></div><nav className="flex gap-4 text-sm underline"><a href="/synth">Synth Console</a><a href="/agents">Agent Command Center</a></nav></header>
  {error&&<p role="alert" className="rounded-xl border border-red-400/40 bg-red-950/40 p-3 text-red-200">{error}</p>}{notice&&<p role="status" className="rounded-xl border border-teal-400/30 bg-teal-950/40 p-3 text-teal-100">{notice}</p>}
  <section className="rounded-2xl border border-teal-400/20 bg-[#062629] p-5"><h2 className="text-xl font-semibold">Create an automation</h2><p className="mt-1 text-sm text-teal-100/70">Every new workflow starts disabled and requires approval before its first execution.</p>
   <form onSubmit={create} className="mt-4 grid gap-4 sm:grid-cols-2">
    <label className="text-sm">Workflow name<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Weekly customer insights" className="mt-1 block w-full rounded-lg border border-teal-400/20 bg-[#031b1e] p-3 text-base"/></label>
    <label className="text-sm">Agent<select value={agent} onChange={e=>setAgent(e.target.value)} className="mt-1 block w-full rounded-lg border border-teal-400/20 bg-[#031b1e] p-3 text-base">{AGENTS.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label className="text-sm sm:col-span-2">What should it do?<textarea required maxLength={12000} rows={5} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe the repeatable analysis or content task…" className="mt-1 block w-full rounded-lg border border-teal-400/20 bg-[#031b1e] p-3 text-base"/></label>
    <label className="text-sm">Description (optional)<input maxLength={4000} value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 block w-full rounded-lg border border-teal-400/20 bg-[#031b1e] p-3 text-base"/></label>
    <label className="text-sm">Trigger<select value={trigger} onChange={e=>setTrigger(e.target.value as 'manual'|'schedule')} className="mt-1 block w-full rounded-lg border border-teal-400/20 bg-[#031b1e] p-3 text-base"><option value="manual">Run manually</option><option value="schedule">Recurring schedule (approval-gated)</option></select></label>
    {trigger==='schedule'&&<><label className="text-sm">Cron schedule<input value={cron} onChange={e=>setCron(e.target.value)} placeholder="0 9 * * 1-5" className="mt-1 block w-full rounded-lg border border-teal-400/20 bg-[#031b1e] p-3 text-base"/><span className="text-xs text-teal-100/60">Five-field cron format, e.g. weekdays at 9:00 AM. Runs must be at least five minutes apart.</span></label><label className="text-sm">Timezone<input value={timezone} onChange={e=>setTimezone(e.target.value)} className="mt-1 block w-full rounded-lg border border-teal-400/20 bg-[#031b1e] p-3 text-base"/></label></>}
    <div className="sm:col-span-2"><button disabled={busy||!name.trim()||!prompt.trim()} className="rounded-lg bg-teal-300 px-5 py-3 font-semibold text-[#031b1e] disabled:opacity-50">{busy?'Saving…':'Save workflow draft'}</button></div>
   </form>
  </section>
  <section className="space-y-3"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Your workflows</h2><button disabled={busy} onClick={()=>void refresh().catch(e=>setError(e.message))} className="rounded-lg border border-teal-400/30 px-3 py-2 text-sm">Refresh</button></div>
   {items.length===0?<div className="rounded-2xl border border-teal-400/20 bg-[#062629] p-5 text-teal-100/70">No automations yet. Create your first workflow above.</div>:items.map(a=><article key={a.id} className="rounded-2xl border border-teal-400/20 bg-[#062629] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-teal-100">{a.name}</h3><p className="mt-1 text-sm text-teal-100/65">{a.agent} · {a.trigger_type==='schedule'?'Scheduled':'Manual'} · {a.enabled?'Enabled':'Draft / paused'}</p>{a.description&&<p className="mt-2 text-sm">{a.description}</p>}</div><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void run(a.id)} className="rounded-lg bg-teal-300 px-4 py-2 font-semibold text-[#031b1e]">Run workflow</button>{a.trigger_type==='schedule'&&<button disabled={busy} onClick={()=>void toggle(a)} className="rounded-lg border border-teal-300/40 px-4 py-2">{a.enabled?'Pause schedule':'Enable schedule'}</button>}</div></div>
    {a.trigger_type==='schedule'&&<p className="mt-3 text-xs text-amber-200">Schedule: {a.schedule_cron} ({a.timezone}). Next run: {a.next_run_at?new Date(a.next_run_at).toLocaleString():'Not scheduled'}. Each occurrence creates an approval request.</p>}
    <div className="mt-4 space-y-2">{(runs[a.id]||[]).map(r=><div key={r.id} className="rounded-lg border border-teal-400/10 bg-[#031b1e] p-3"><div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{r.status.replaceAll('_',' ')}</strong><span className="text-teal-100/60">{new Date(r.created_at).toLocaleString()}</span></div>{r.error&&<p className="mt-2 text-sm text-red-300">{r.error}</p>}{r.status==='approval_required'&&<button disabled={busy} onClick={()=>void approve(a.id,r.id)} className="mt-3 rounded-lg bg-teal-300 px-3 py-2 text-sm font-semibold text-[#031b1e]">Approve and execute</button>}{r.result!==null&&r.result!==undefined&&<details className="mt-2"><summary className="cursor-pointer text-sm text-teal-200">View execution result</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(r.result,null,2)}</pre></details>}</div>)}</div>
   </article>)}
  </section>
  <aside className="rounded-xl border border-amber-300/20 bg-amber-950/20 p-4 text-sm text-amber-100/80"><strong>Current capability boundary:</strong> The deployed runner performs AI analysis and generates workflow output. Recurring schedules are checked every minute and create approval-required runs. The agent executes after a signed-in user approves each run. External email, app integrations, payments, and deployment actions are not connected yet and remain unavailable.</aside>
 </div></main>;
}
