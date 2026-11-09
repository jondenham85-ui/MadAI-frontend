'use client';
import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { ApiError, apiRequest } from '@/services/auth';
const plans = [
  { id: 'free', name: 'Free', price: 0, description: '20 chats and 3 tasks per day', business: false },
  { id: 'chat', name: 'Chat', price: 9, description: '200 chats and 3 tasks per day', business: false },
  { id: 'tasks', name: 'Tasks', price: 19, description: '200 chats and 25 tasks per day', business: false },
  { id: 'premium', name: 'Premium', price: 49, description: 'Unlimited daily chat, 100 tasks/day, and website/code/game source generation', business: false },
  { id: 'business_team', name: 'Business Team', price: 99, description: 'Unlimited daily chat and 500 tasks per user per day', business: true },
  { id: 'business_scale', name: 'Business Scale', price: 299, description: 'Unlimited daily chat and 2,000 tasks per user per day', business: true },
];
export default function Pricing() {
  const { user } = useUser(); const [currentPlan, setCurrentPlan] = useState('free'); const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  useEffect(() => { if (!user) { setCurrentPlan('free'); return; } apiRequest<{ plan: string }>('/billing/status').then(data => setCurrentPlan(data.plan)).catch(() => setCurrentPlan(user.plan || 'free')); }, [user]);
  async function upgrade(plan: string) {
    if (!user) { window.location.assign('/signup'); return; } setBusy(plan); setError('');
    try { const data = await apiRequest<{ url: string }>(`/billing/checkout-link?plan=${encodeURIComponent(plan)}`); const url = new URL(data.url); if (url.protocol !== 'https:' || url.hostname !== 'buy.stripe.com') throw new Error('Invalid checkout response'); window.location.assign(url.toString()); }
    catch (error) { if (error instanceof ApiError && error.status === 401) { window.location.assign('/login'); return; } setError(error instanceof Error ? error.message : 'Checkout is unavailable'); setBusy(''); }
  }
  async function manage() {
    if (!user) { window.location.assign('/login'); return; } setBusy('portal'); setError('');
    try { const data = await apiRequest<{ url: string }>('/billing/portal', { method: 'POST' }); const url = new URL(data.url); if (url.protocol !== 'https:' || url.hostname !== 'billing.stripe.com') throw new Error('Invalid billing portal response'); window.location.assign(url.toString()); }
    catch (error) { setError(error instanceof Error ? error.message : 'The billing portal is unavailable'); setBusy(''); }
  }
  return <section className="mad-pricing"><h2>Choose your MAD AI plan</h2><p className="mad-muted">Daily limits reset at midnight UTC. Unlimited chat has no daily message quota; anti-abuse rate limits still apply.</p>{['Individual', 'Business'].map((group, index) => <section key={group}><h3>{group}</h3><div className="mad-plan-grid">{plans.filter(plan => plan.business === (index === 1)).map(plan => <article className="mad-card" key={plan.id}><h4>{plan.name}</h4><p className="mad-price">${plan.price}{plan.price > 0 && <small>/month</small>}</p><p>{plan.description}</p>{plan.id === currentPlan && user && <p className="mad-muted">Current plan</p>}{plan.id === 'free' ? <a className="mad-button" href={user ? '/' : '/signup'}>Use Free</a> : <button disabled={Boolean(busy)} onClick={() => upgrade(plan.id)}>{busy === plan.id ? 'Opening checkout…' : `Upgrade to ${plan.name}`}</button>}</article>)}</div></section>)}<p className="mad-muted">Building generates source code. It does not automatically execute or publish websites or games. Business limits are per user; shared team workspaces and seat management are not included in this release.</p>{user && <button className="mad-secondary" disabled={Boolean(busy)} onClick={manage}>{busy === 'portal' ? 'Opening portal…' : 'Manage subscription'}</button>}{error && <p className="mad-error" role="alert">{error}</p>}</section>;
}
