'use client';

import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/supabase';

const BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
type Application = {
  id: string; application_name: string; organization_name: string; website_url: string;
  privacy_policy_url: string; redirect_uris: string[]; client_type: string;
  requested_scopes: string[]; use_case: string; security_contact: string;
  status: string; review_notes: string | null; created_at: string; applicant_user_id: string;
};

export default function OAuthApplicationReview() {
  const [items,setItems]=useState<Application[]>([]);
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState('');

  async function request(path:string,init?:RequestInit){
    const token=await getAccessToken();
    if(!token) throw new Error('Please sign in to the MADSI owner account.');
    const response=await fetch(`${BASE}/rest/v1/oauth_partner_applications${path}`,{
      ...init,headers:{apikey:KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(init?.headers||{})},cache:'no-store'
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok) throw new Error('Owner access was denied or the review request failed.');
    return data;
  }
  async function load(){
    setLoading(true);setError('');
    try{const data=await request('?select=*&order=created_at.desc');setItems(data||[]);}
    catch(e){setError(e instanceof Error?e.message:'Unable to load applications.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  async function update(item:Application,status:'under_review'|'approved'|'rejected'){
    setBusy(item.id);setError('');
    try{
      const token=await getAccessToken();
      if(!token) throw new Error('Please sign in again.');
      const response=await fetch(`${BASE}/rest/v1/oauth_partner_applications?id=eq.${encodeURIComponent(item.id)}`,{
        method:'PATCH',headers:{apikey:KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:'return=minimal'},
        body:JSON.stringify({status,review_notes:notes[item.id]??item.review_notes??null,reviewed_at:new Date().toISOString()})
      });
      if(!response.ok) throw new Error('The review update was rejected. Confirm you are signed in as a MADSI OWNER.');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Could not update review.');}
    finally{setBusy('');}
  }
  return <section className="dev-review-list">
    <div className="dev-review-toolbar"><p className="dev-muted">Only accounts with the OWNER role can view or update these records. Database row-level security enforces access.</p><button className="dev-secondary" onClick={()=>void load()} disabled={loading}>Refresh</button></div>
    {loading&&<p className="dev-muted">Loading applications…</p>}
    {error&&<p className="partner-error" role="alert">{error}</p>}
    {!loading&&items.length===0&&!error&&<p className="dev-muted">No partner applications have been submitted.</p>}
    {items.map(item=><article className="dev-review-card" key={item.id}>
      <div className="dev-review-heading"><div><p className="dev-eyebrow">{item.status.replace('_',' ').toUpperCase()} · {new Date(item.created_at).toLocaleString()}</p><h3>{item.application_name}</h3><p>{item.organization_name}</p></div><span className="dev-review-type">{item.client_type}</span></div>
      <div className="dev-review-details"><p><strong>Website:</strong> <a href={item.website_url} target="_blank" rel="noreferrer">{item.website_url}</a></p><p><strong>Privacy:</strong> <a href={item.privacy_policy_url} target="_blank" rel="noreferrer">Policy</a></p><p><strong>Contact:</strong> {item.security_contact}</p><p><strong>Scopes:</strong> {item.requested_scopes.join(', ')}</p><p><strong>Redirect URIs:</strong></p><ul>{item.redirect_uris.map(uri=><li key={uri}><code>{uri}</code></li>)}</ul><p><strong>Use case:</strong> {item.use_case}</p></div>
      <label className="dev-review-notes">Review notes<textarea rows={2} value={notes[item.id]??item.review_notes??''} onChange={e=>setNotes(current=>({...current,[item.id]:e.target.value}))} placeholder="Record security review findings or follow-up questions" /></label>
      <div className="dev-review-actions"><button className="dev-secondary" disabled={!!busy} onClick={()=>void update(item,'under_review')}>Mark reviewing</button><button className="dev-secondary" disabled={!!busy} onClick={()=>void update(item,'rejected')}>Reject</button><button className="dev-primary" disabled={!!busy} onClick={()=>void update(item,'approved')}>{busy===item.id?'Saving…':'Approve for manual client registration'}</button></div>
      <p className="partner-disclaimer">Approval here records review status only. It does not create OAuth credentials or authorize an app automatically.</p>
    </article>)}
  </section>;
}
