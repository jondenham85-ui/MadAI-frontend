'use client';

import { useState } from 'react';
import { getAccessToken } from '@/lib/supabase';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const scopes = ['openid', 'profile', 'email'];

export default function PartnerApplicationForm() {
  const [form, setForm] = useState({
    application_name: '', organization_name: '', website_url: '', privacy_policy_url: '',
    redirect_uris: '', client_type: 'public', requested_scopes: ['openid'],
    use_case: '', security_contact: '', website_trap: '',
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function update(key: string, value: string) { setForm(current => ({ ...current, [key]: value })); }
  function toggleScope(scope: string) {
    setForm(current => ({
      ...current,
      requested_scopes: current.requested_scopes.includes(scope)
        ? current.requested_scopes.filter(item => item !== scope)
        : [...current.requested_scopes, scope],
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Please sign in to MADSI before submitting a partner application.');
      const response = await fetch(`${SUPABASE_URL}/functions/v1/oauth-partner-application`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          redirect_uris: form.redirect_uris.split('\n').map(uri => uri.trim()).filter(Boolean),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Application could not be submitted.');
      setMessage(`Application received. Reference: ${payload.application.id}. Status: pending review.`);
      setForm({ application_name: '', organization_name: '', website_url: '', privacy_policy_url: '', redirect_uris: '', client_type: 'public', requested_scopes: ['openid'], use_case: '', security_contact: '', website_trap: '' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Application could not be submitted.'); }
    finally { setBusy(false); }
  }

  return <form className="partner-form" onSubmit={submit}>
    <div className="partner-form-grid">
      <label>Application name<input required minLength={2} maxLength={120} value={form.application_name} onChange={e=>update('application_name',e.target.value)} placeholder="Example: Acme Workspace" /></label>
      <label>Company / organization<input required minLength={2} maxLength={160} value={form.organization_name} onChange={e=>update('organization_name',e.target.value)} placeholder="Your company name" /></label>
      <label>Application website (HTTPS)<input required type="url" pattern="https://.+" value={form.website_url} onChange={e=>update('website_url',e.target.value)} placeholder="https://example.com" /></label>
      <label>Privacy policy (HTTPS)<input required type="url" pattern="https://.+" value={form.privacy_policy_url} onChange={e=>update('privacy_policy_url',e.target.value)} placeholder="https://example.com/privacy" /></label>
      <label className="partner-full">Exact redirect URI(s), one per line<textarea required rows={3} value={form.redirect_uris} onChange={e=>update('redirect_uris',e.target.value)} placeholder="https://example.com/auth/madsi/callback" /><small>Up to five exact HTTPS callback URLs. Wildcards are not accepted.</small></label>
      <label>Client type<select value={form.client_type} onChange={e=>update('client_type',e.target.value)}><option value="public">Public — mobile / browser app (PKCE, no secret)</option><option value="confidential">Confidential — server-side app (secret kept server-side)</option></select></label>
      <label>Security / technical contact<input required type="email" value={form.security_contact} onChange={e=>update('security_contact',e.target.value)} placeholder="security@example.com" /></label>
      <fieldset className="partner-full"><legend>Requested scopes</legend>{scopes.map(scope=><label className="partner-check" key={scope}><input type="checkbox" checked={form.requested_scopes.includes(scope)} onChange={()=>toggleScope(scope)} /> <code>{scope}</code></label>)}<small>Only request the information your app needs.</small></fieldset>
      <label className="partner-full">Describe your product and why it needs MADSI sign-in<textarea required minLength={20} maxLength={3000} rows={5} value={form.use_case} onChange={e=>update('use_case',e.target.value)} placeholder="What does your application do? How will people use Sign in with MADSI? Why are these scopes required?" /></label>
      <label className="partner-trap" aria-hidden="true">Leave this field empty<input tabIndex={-1} autoComplete="off" value={form.website_trap} onChange={e=>update('website_trap',e.target.value)} /></label>
    </div>
    {error&&<p className="partner-error" role="alert">{error}</p>}
    {message&&<p className="partner-success" role="status">{message}</p>}
    <button className="dev-primary" type="submit" disabled={busy}>{busy?'Submitting…':'Submit for partner review'}</button>
    <p className="partner-disclaimer">Submitting does not create an OAuth client or grant access. MADSI reviews each request first. Never submit passwords, access tokens or client secrets here.</p>
  </form>;
}
