'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NexusWorkspace from '@/components/layout/NexusWorkspace';
import { useUser } from '@/context/UserContext';
import { getAccessToken } from '@/lib/supabase';

type Connection = {
  page_id: string;
  page_name: string;
  granted_scopes: string[];
  page_tasks: string[];
  status: string;
  token_expires_at: string | null;
  last_verified_at: string | null;
};
type Post = { id: string; message?: string; created_time?: string; permalink_url?: string; is_published?: boolean };
type Insight = { name: string; title?: string; values?: Array<{ value: number | string; end_time?: string }> };

export default function FacebookIntegrationPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const search = useSearchParams();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [message, setMessage] = useState('');
  const [approvalId, setApprovalId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const request = useCallback(async (action: string, method: 'GET' | 'POST' = 'GET', body?: Record<string, unknown>) => {
    const token = await getAccessToken();
    if (!token) throw new Error('Your MADSI session expired. Sign in again.');
    const response = await fetch('/api/facebook/' + action, {
      method,
      headers: { Authorization: 'Bearer ' + token, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'MADSI could not complete the Facebook request.');
    return data;
  }, []);

  const load = useCallback(async () => {
    const status = await request('status');
    setConnection(status.connected ? status.connection : null);
    if (!status.connected) { setPosts([]); setInsights([]); return; }
    const [postResult, insightResult] = await Promise.allSettled([request('posts'), request('insights')]);
    if (postResult.status === 'fulfilled') setPosts(Array.isArray(postResult.value.posts) ? postResult.value.posts : []);
    else setError(postResult.reason instanceof Error ? postResult.reason.message : 'Could not load Facebook posts.');
    if (insightResult.status === 'fulfilled') setInsights(Array.isArray(insightResult.value.insights) ? insightResult.value.insights : []);
    else setError(insightResult.reason instanceof Error ? insightResult.reason.message : 'Could not load Facebook insights.');
  }, [request]);

  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);
  useEffect(() => {
    const result = search.get('facebook');
    if (result === 'connected') setNotice('Your Facebook Page is securely connected to MADSI.');
    else if (result && result !== 'authorization_cancelled') {
      const messages: Record<string, string> = {
        setup_required: 'The Meta app credentials and encryption key must be configured on the Cloudflare Worker.',
        permissions_missing: 'Meta did not grant every permission MADSI needs. Review the requested Page permissions and reconnect.',
        page_selection_required: 'More than one eligible Page was found. Set META_FACEBOOK_PAGE_ID in Cloudflare to select the intended Page.',
        target_page_not_available: 'The configured Facebook Page was not returned with publishing and insights access. Check Page roles and META_FACEBOOK_PAGE_ID.',
        expired: 'The Facebook connection request expired. Start again.',
        token_exchange_failed: 'Meta could not complete the authorization exchange.',
        invalid_authorization: 'The Facebook authorization response was incomplete. Try again.',
        connection_failed: 'MADSI could not securely save the Facebook connection.',
      };
      setError(messages[result] || 'Facebook authorization did not finish. Please try again.');
    }
  }, [search]);
  useEffect(() => {
    if (!loading && user && ['OWNER', 'ADMIN'].includes(user.role || '')) {
      void load().catch(e => setError(e instanceof Error ? e.message : 'Could not load Facebook status.'));
    }
  }, [loading, user, load]);

  async function connect() {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request('connect', 'POST');
      if (!result.authorization_url) throw new Error('MADSI did not receive a Facebook authorization URL.');
      window.location.assign(result.authorization_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Facebook authorization.');
      setBusy(false);
    }
  }
  async function approvePost() {
    setBusy(true); setError(''); setNotice(''); setApprovalId('');
    try {
      const result = await request('approval', 'POST', { message, confirm: confirmed });
      setApprovalId(result.approval_id);
      setNotice('Your exact post text has been saved as a one-time approval. It expires in 10 minutes.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the publishing approval.');
    } finally { setBusy(false); }
  }
  async function publishPost() {
    if (!approvalId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request('posts', 'POST', { approval_id: approvalId });
      setNotice('Facebook confirmed publication. Post ID: ' + result.post_id);
      setApprovalId(''); setMessage(''); setConfirmed(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish the approved post.');
      setApprovalId('');
    } finally { setBusy(false); }
  }

  if (loading || !user) return <main className="p-8 text-cyan-100">Checking your MADSI account…</main>;
  if (!['OWNER', 'ADMIN'].includes(user.role || '')) {
    return <NexusWorkspace><section className="mx-auto max-w-3xl rounded-2xl border border-cyan-900 bg-slate-950 p-6 text-cyan-100"><h1 className="text-2xl font-semibold">Owner access required</h1><p className="mt-2 text-slate-300">Facebook Page connections and publishing are restricted to MADSI owners.</p></section></NexusWorkspace>;
  }
  return <NexusWorkspace><section className="mx-auto max-w-6xl space-y-6 text-cyan-50">
    <header className="rounded-2xl border border-cyan-900/70 bg-gradient-to-br from-slate-950 to-teal-950/40 p-6 sm:p-8">
      <p className="text-xs font-semibold tracking-[.25em] text-teal-300">MADSI / SOCIAL CONNECTIONS</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold sm:text-4xl">Facebook Page</h1><p className="mt-2 max-w-2xl text-slate-300">Connect the official Page so MADSI can review posts, read Page insights, and prepare content for your approval.</p></div>
        <span className="rounded-full border border-cyan-700 px-3 py-1 text-xs">{connection ? 'CONNECTED' : 'NOT CONNECTED'}</span>
      </div>
    </header>
    {notice && <p role="status" className="rounded-xl border border-teal-800 bg-teal-950/40 p-4 text-teal-200">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/40 p-4 text-rose-200">{error}</p>}
    <section className="rounded-2xl border border-cyan-900 bg-slate-950 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs tracking-widest text-slate-400">META AUTHORIZATION</p><h2 className="mt-1 text-xl font-semibold">{connection?.page_name || 'Connect your Facebook Business Page'}</h2><p className="mt-1 text-sm text-slate-400">{connection ? 'Page ID: ' + connection.page_id : 'MADSI will request Page access through Meta’s official authorization screen.'}</p></div><button type="button" onClick={() => void connect()} disabled={busy} className="rounded-lg bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60">{busy ? 'Working securely…' : connection ? 'Reconnect Page' : 'Connect Facebook'}</button></div>
      {connection && <p className="mt-4 text-xs text-slate-500">Permissions: {connection.granted_scopes.join(', ')} · Token expiry: {connection.token_expires_at ? new Date(connection.token_expires_at).toLocaleString() : 'Not supplied by Meta'}</p>}
    </section>
    {connection && <>
      <section className="rounded-2xl border border-cyan-900 bg-slate-950 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs tracking-widest text-slate-400">PAGE CONTENT</p><h2 className="mt-1 text-xl font-semibold">Recent posts</h2></div><button type="button" onClick={() => void load().catch(e => setError(e.message))} className="rounded-lg border border-cyan-800 px-4 py-2 text-sm">Refresh</button></div>
        <div className="mt-4 space-y-3">{posts.length ? posts.map(post => <article key={post.id} className="border-b border-cyan-950 pb-3"><p className="whitespace-pre-wrap text-sm">{post.message || '(No text)'}</p><div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500"><span>{post.created_time ? new Date(post.created_time).toLocaleString() : 'Date unavailable'}</span><span>{post.is_published ? 'Published' : 'Not marked published'}</span>{post.permalink_url && <a href={post.permalink_url} target="_blank" rel="noreferrer" className="text-teal-300 underline">View on Facebook</a>}</div></article>) : <p className="text-sm text-slate-400">No Page posts were returned.</p>}</div>
      </section>
      <section className="rounded-2xl border border-cyan-900 bg-slate-950 p-5 sm:p-6">
        <p className="text-xs tracking-widest text-slate-400">PAGE PERFORMANCE</p><h2 className="mt-1 text-xl font-semibold">Recent insights</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">{insights.map(item => <div key={item.name} className="rounded-xl border border-cyan-950 p-4"><p className="text-sm text-slate-400">{item.title || item.name}</p><strong className="mt-2 block text-2xl">{item.values?.[item.values.length - 1]?.value ?? '—'}</strong></div>)}</div>
        {!insights.length && <p className="mt-3 text-sm text-slate-400">No insights were returned for the current reporting period.</p>}
      </section>
      <section className="rounded-2xl border border-cyan-900 bg-slate-950 p-5 sm:p-6">
        <p className="text-xs tracking-widest text-slate-400">HUMAN APPROVAL REQUIRED</p><h2 className="mt-1 text-xl font-semibold">Prepare a Facebook post</h2>
        <p className="mt-2 text-sm text-slate-400">MADSI never publishes automatically. Review the exact text, create a one-time approval, then press Publish yourself. Approval expires after 10 minutes.</p>
        <label htmlFor="facebook-post" className="mt-4 block text-sm font-medium">Post text</label><textarea id="facebook-post" value={message} onChange={e => { setMessage(e.target.value); setApprovalId(''); }} maxLength={5000} rows={5} className="mt-2 w-full rounded-xl border border-cyan-900 bg-slate-900 p-3 text-sm text-cyan-50 outline-none focus:border-teal-400" placeholder="Write the post you want MADSI to publish…" />
        <label className="mt-3 flex items-start gap-3 text-sm text-slate-300"><input type="checkbox" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setApprovalId(''); }} className="mt-1" /><span>I reviewed this exact text and authorize MADSI to publish it to the connected Facebook Page.</span></label>
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => void approvePost()} disabled={busy || !confirmed || !message.trim() || Boolean(approvalId)} className="rounded-lg border border-teal-700 px-4 py-3 text-sm font-semibold disabled:opacity-50">Save one-time approval</button><button type="button" onClick={() => void publishPost()} disabled={busy || !approvalId} className="rounded-lg bg-teal-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">Publish approved post</button></div>
      </section>
    </>}
  </section></NexusWorkspace>;
}
