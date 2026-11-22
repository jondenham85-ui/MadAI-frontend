'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { ApiError, apiRequest } from '@/services/auth';

type RevenueSnapshot = {
  source: 'stripe_live' | string;
  asOf: string;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  mrr: Record<string, number>;
  paidRevenue: {
    day: Record<string, number>;
    week: Record<string, number>;
    month: Record<string, number>;
    allTime: Record<string, number>;
  };
  refunds: Record<string, number>;
  sampled: { subscriptions: number; paidInvoices: number; charges: number };
  pagination: string;
};

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function CurrencyValues({ values, emptyLabel = 'No matching paid invoices in this sample' }: {
  values: Record<string, number>;
  emptyLabel?: string;
}) {
  const entries = Object.entries(values);
  if (!entries.length) return <p className="mt-2 text-sm text-cyan-100/50">{emptyLabel}</p>;
  return <div className="mt-2 space-y-1">{entries.map(([currency, amount]) =>
    <p key={currency} className="text-2xl font-bold text-cyan-100">{money(amount, currency)}</p>
  )}</div>;
}

export default function RevenueDashboard() {
  const { user, loading: sessionLoading } = useUser();
  const [snapshot, setSnapshot] = useState<RevenueSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (user?.role !== 'OWNER') return;
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest<RevenueSnapshot>('/admin/revenue');
      if (result.source !== 'stripe_live') throw new Error('Stripe did not return verified live-mode data.');
      setSnapshot(result);
    } catch (reason) {
      setSnapshot(null);
      setError(reason instanceof ApiError
        ? `${reason.message} (HTTP ${reason.status})`
        : reason instanceof Error ? reason.message : 'Live Stripe reporting is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (user?.role === 'OWNER') void refresh();
    else setSnapshot(null);
  }, [refresh, user?.role]);

  if (sessionLoading) return <section className="rounded-xl border border-cyan-500/30 bg-black p-6 text-cyan-100" role="status">Checking owner access…</section>;
  if (!user) return <section className="rounded-xl border border-cyan-500/30 bg-black p-6 text-cyan-100"><h2 className="text-xl font-semibold">Sign in required</h2><p className="mt-2 text-sm text-cyan-100/70">Sign in with an authorized MADSI owner account to view financial reporting.</p><a className="mt-4 inline-block underline" href="/login">Sign in</a></section>;
  if (user.role !== 'OWNER') return <section className="rounded-xl border border-cyan-500/30 bg-black p-6 text-cyan-100"><h2 className="text-xl font-semibold">Owner access required</h2><p className="mt-2 text-sm text-cyan-100/70">Live financial reporting is restricted to authorized owners.</p></section>;

  const periods = [
    { key: 'day', label: 'Paid revenue · last 24 hours', values: snapshot?.paidRevenue.day },
    { key: 'week', label: 'Paid revenue · last 7 days', values: snapshot?.paidRevenue.week },
    { key: 'month', label: 'Paid revenue · this month', values: snapshot?.paidRevenue.month },
    { key: 'allTime', label: 'Paid invoices · latest 100 sample', values: snapshot?.paidRevenue.allTime },
  ] as const;

  return (
    <div className="space-y-6 text-cyan-50">
      <section className="rounded-2xl border border-cyan-500/30 bg-black p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs tracking-[.2em] text-cyan-400">STRIPE / LIVE MODE</p><h2 className="mt-2 text-2xl font-bold">Revenue Intelligence</h2><p className="mt-2 text-sm text-cyan-100/70">Live subscription and paid-invoice reporting from the connected Stripe account.</p></div>
          <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-cyan-400/50 px-4 py-2 text-sm disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh revenue'}</button>
        </div>
        {error && <p role="alert" className="mt-5 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
        {loading && !snapshot && <p className="mt-5 text-sm text-cyan-100/60" role="status">Loading verified Stripe financial data…</p>}
        {!loading && !snapshot && !error && <p className="mt-5 text-sm text-cyan-100/60">No live financial snapshot has been loaded yet.</p>}
        {snapshot && <>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-xl border border-cyan-500/20 p-4"><p className="text-xs text-cyan-200/60">Active subscriptions</p><p className="mt-2 text-3xl font-bold">{snapshot.activeSubscriptions.toLocaleString()}</p><p className="mt-1 text-xs text-cyan-100/50">{snapshot.trialingSubscriptions} trialing</p></article>
            {Object.entries(snapshot.mrr).map(([currency, amount]) => <article key={currency} className="rounded-xl border border-cyan-500/20 p-4"><p className="text-xs text-cyan-200/60">Monthly recurring revenue · {currency}</p><p className="mt-2 text-3xl font-bold">{money(amount, currency)}</p></article>)}
            {!Object.keys(snapshot.mrr).length && <article className="rounded-xl border border-cyan-500/20 p-4"><p className="text-xs text-cyan-200/60">Monthly recurring revenue</p><p className="mt-2 text-sm text-cyan-100/50">No active recurring-price amounts returned.</p></article>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {periods.map(period => <article key={period.key} className="rounded-xl border border-cyan-500/20 p-4"><p className="text-xs text-cyan-200/60">{period.label}</p><CurrencyValues values={period.values || {}} /></article>)}
          </div>
          <article className="rounded-xl border border-cyan-500/20 p-4"><p className="text-xs text-cyan-200/60">Refunds · latest 100 charges</p><CurrencyValues values={snapshot.refunds} emptyLabel="No refunds found in the latest charge sample" /></article>
          <div className="rounded-xl border border-cyan-500/20 p-4 text-xs text-cyan-100/60">
            <p>Records sampled: {snapshot.sampled.subscriptions} subscriptions · {snapshot.sampled.paidInvoices} paid invoices · {snapshot.sampled.charges} charges</p>
            <p className="mt-1">Last checked: {new Date(snapshot.asOf).toLocaleString()}</p>
            <p className="mt-2">{snapshot.pagination}</p>
            <p className="mt-2">Amounts remain grouped by currency. These figures are not cross-currency converted and the sampled totals are not a complete accounting export.</p>
          </div>
        </>}
      </section>
    </div>
  );
}
