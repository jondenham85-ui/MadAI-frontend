'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiRequest, type User } from '@/services/auth';
import { useUser } from '@/context/UserContext';

type KnowledgeItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  status: 'draft' | 'approved' | 'archived';
  version: number;
  freshnessDays: number;
  reviewedAt?: string | null;
  updatedAt?: string;
  isStale?: boolean;
};
type Health = { status?: string; database?: string };
type AIConfig = { primaryProvider?: string; inferenceEndpointConfigured?: boolean; modelName?: string };

export default function OperationsDashboard() {
  const { user, loading: sessionLoading } = useUser();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [ai, setAi] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [freshnessDays, setFreshnessDays] = useState(90);

  const refresh = useCallback(async () => {
    if (user?.role !== 'OWNER') return;
    setLoading(true); setError(''); setNotice('');
    const results = await Promise.allSettled([
      apiRequest<{ knowledge: KnowledgeItem[] }>('/admin/knowledge'),
      apiRequest<Health>('/health'),
      apiRequest<AIConfig>('/admin/config'),
    ]);
    if (results[0].status === 'fulfilled') setItems(results[0].value.knowledge || []);
    else setError(results[0].reason instanceof Error ? results[0].reason.message : 'Knowledge library unavailable');
    setHealth(results[1].status === 'fulfilled' ? results[1].value : null);
    setAi(results[2].status === 'fulfilled' ? results[2].value : null);
    setLoading(false);
  }, [user?.role]);

  useEffect(() => { if (user?.role === 'OWNER') void refresh(); }, [refresh, user?.role]);

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await apiRequest('/admin/knowledge', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), category, content, sourceUrl: sourceUrl.trim() || null, freshnessDays, status: 'draft' }),
      });
      setTitle(''); setCategory('GENERAL'); setContent(''); setSourceUrl('');
      setNotice('Saved as a draft. Review it and approve it before MADSI uses it.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this knowledge item');
    } finally { setSaving(false); }
  }

  async function changeStatus(item: KnowledgeItem, status: KnowledgeItem['status']) {
    setError(''); setNotice('');
    try {
      await apiRequest('/admin/knowledge/' + item.id, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice(status === 'approved' ? 'Approved. MADSI can now use this entry.' : 'Knowledge entry updated.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update this entry');
    }
  }

  if (sessionLoading) return <section className="rounded-2xl border border-cyan-500/20 bg-black p-6 text-cyan-100">Checking owner access…</section>;
  if (!user) return <section className="rounded-2xl border border-cyan-500/20 bg-black p-6 text-cyan-100"><h2 className="text-xl font-semibold">Sign in required</h2><p className="mt-2 text-sm text-cyan-100/70">Sign in with an authorized MADSI owner account to open Operations Center.</p><a className="mt-4 inline-block underline" href="/login">Sign in</a></section>;
  if (user.role !== 'OWNER') return <section className="rounded-2xl border border-cyan-500/20 bg-black p-6 text-cyan-100"><h2 className="text-xl font-semibold">Owner access required</h2><p className="mt-2 text-sm text-cyan-100/70">This operations workspace is restricted to authorized owners.</p></section>;

  const approved = items.filter(item => item.status === 'approved').length;
  const stale = items.filter(item => item.status === 'approved' && item.isStale).length;
  return (
    <div className="space-y-6 text-cyan-50">
      <section className="rounded-2xl border border-cyan-500/30 bg-black p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs tracking-[.2em] text-cyan-400">MADSI / INTELLIGENCE CORE</p><h2 className="mt-2 text-2xl font-bold">Intelligence & Operations</h2><p className="mt-2 max-w-2xl text-sm text-cyan-100/70">A controlled source of approved procedures and product knowledge for MADSI. New material stays in draft until an owner approves it.</p></div>
          <button onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-cyan-400/50 px-4 py-2 text-sm disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh status'}</button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-cyan-500/20 p-4"><p className="text-xs text-cyan-200/60">Database</p><p className="mt-2 font-semibold">{health?.database || 'Unverified'}</p></div>
          <div className="rounded-xl border border-cyan-500/20 p-4"><p className="text-xs text-cyan-200/60">AI provider</p><p className="mt-2 font-semibold">{ai?.primaryProvider || 'Unverified'}</p></div>
          <div className="rounded-xl border border-cyan-500/20 p-4"><p className="text-xs text-cyan-200/60">Approved entries</p><p className="mt-2 text-2xl font-bold">{approved}</p></div>
          <div className="rounded-xl border border-cyan-500/20 p-4"><p className="text-xs text-cyan-200/60">Needs review</p><p className="mt-2 text-2xl font-bold">{stale}</p></div>
        </div>
        <p className="mt-4 text-xs text-cyan-100/50">Provider configuration is not proof of a successful AI request. Live provider tests and automated alerting are the next monitoring layer.</p>
      </section>

      {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-sm text-emerald-200">{notice}</p>}

      <section className="rounded-2xl border border-cyan-500/30 bg-black p-5 md:p-7">
        <p className="text-xs tracking-[.2em] text-cyan-400">OWNER-CONTROLLED KNOWLEDGE</p><h3 className="mt-2 text-xl font-bold">Add a procedure or trusted source</h3>
        <form onSubmit={createItem} className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm">Title<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} className="rounded-lg border border-cyan-500/30 bg-slate-950 px-3 py-3 text-white" placeholder="e.g. MADSI workspace save and preview procedure"/></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm">Category<input maxLength={60} value={category} onChange={e=>setCategory(e.target.value.toUpperCase())} className="rounded-lg border border-cyan-500/30 bg-slate-950 px-3 py-3 text-white"/></label>
            <label className="grid gap-1 text-sm">Review interval (days)<input type="number" min={1} max={3650} value={freshnessDays} onChange={e=>setFreshnessDays(Number(e.target.value))} className="rounded-lg border border-cyan-500/30 bg-slate-950 px-3 py-3 text-white"/></label>
          </div>
          <label className="grid gap-1 text-sm">Source URL (optional)<input type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} className="rounded-lg border border-cyan-500/30 bg-slate-950 px-3 py-3 text-white" placeholder="https://official-documentation.example"/></label>
          <label className="grid gap-1 text-sm">Procedure / knowledge<textarea required maxLength={200000} rows={7} value={content} onChange={e=>setContent(e.target.value)} className="rounded-lg border border-cyan-500/30 bg-slate-950 px-3 py-3 text-white" placeholder="Write the verified process, requirements, exceptions and recovery steps…"/></label>
          <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={saving || !title.trim() || !content.trim()} className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{saving ? 'Saving…' : 'Save as draft'}</button><span className="text-xs text-cyan-100/50">Drafts are never added to AI context until approved.</span></div>
        </form>
      </section>

      <section className="rounded-2xl border border-cyan-500/30 bg-black p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs tracking-[.2em] text-cyan-400">KNOWLEDGE LIBRARY</p><h3 className="mt-2 text-xl font-bold">Approved sources & procedures</h3></div><span className="text-xs text-cyan-100/50">{items.length} entries</span></div>
        <div className="mt-5 space-y-3">
          {items.map(item=><article key={item.id} className="rounded-xl border border-cyan-500/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{item.title}</h4><span className="rounded-full border border-cyan-500/30 px-2 py-1 text-[10px] uppercase tracking-wide">{item.status}</span>{item.isStale&&<span className="rounded-full border border-amber-400/40 px-2 py-1 text-[10px] text-amber-200">Review overdue</span>}</div><p className="mt-1 text-xs text-cyan-100/50">{item.category} · Version {item.version} · Review every {item.freshnessDays} days</p>{item.sourceUrl&&<a className="mt-2 inline-block break-all text-xs text-cyan-300 underline" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel || item.sourceUrl}</a>}<p className="mt-3 whitespace-pre-wrap text-sm text-cyan-50/80">{item.content.length>500?item.content.slice(0,500)+'…':item.content}</p></div>
            <div className="flex gap-2">{item.status==='draft'&&<button onClick={()=>void changeStatus(item,'approved')} className="rounded-lg border border-emerald-400/50 px-3 py-2 text-xs text-emerald-200">Approve</button>}{item.status==='approved'&&<button onClick={()=>void changeStatus(item,'archived')} className="rounded-lg border border-amber-400/40 px-3 py-2 text-xs text-amber-100">Archive</button>}{item.status==='archived'&&<button onClick={()=>void changeStatus(item,'draft')} className="rounded-lg border border-cyan-400/40 px-3 py-2 text-xs">Restore draft</button>}</div>
            </div>
          </article>)}
          {!items.length&&!loading&&<p className="rounded-xl border border-dashed border-cyan-500/20 p-6 text-center text-sm text-cyan-100/50">No knowledge entries yet. Add your first verified procedure above.</p>}
        </div>
      </section>
    </div>
  );
}
