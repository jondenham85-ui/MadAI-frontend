'use client';
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { apiRequest } from '@/services/auth';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationCenter() {
  const { user, loading } = useUser();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await apiRequest<{ notifications: Notification[] }>('/notifications');
      setNotifications(Array.isArray(result.notifications) ? result.notifications : []);
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Notifications are temporarily unavailable.');
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 30000);
    return () => clearInterval(timer);
  }, [userId, refresh]);

  async function markRead(id: string) {
    try {
      await apiRequest('/notifications/' + encodeURIComponent(id) + '/read', { method: 'PATCH' });
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not update notification.');
    }
  }

  const unread = notifications.filter(item => !item.readAt).length;

  return (
    <section className="w-full rounded-xl border border-cyan-500/30 bg-black/60 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-cyan-300">NOTIFICATION CENTER</h2>
        {userId && <span className="rounded-full border border-cyan-500/30 px-3 py-1 text-xs text-cyan-200">{unread} unread</span>}
      </div>
      {loading ? <p className="text-sm text-cyan-100/70">Loading notifications…</p>
        : !userId ? <p className="text-sm text-cyan-100/70">Sign in to see your account notifications.</p>
        : error ? <p role="alert" className="text-sm text-red-300">{error}</p>
        : notifications.length === 0 ? <p className="text-sm text-cyan-100/70">You’re all caught up. New automation approvals and account alerts will appear here.</p>
        : <div className="max-h-96 space-y-3 overflow-y-auto">
          {notifications.map(item => (
            <article key={item.id} className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold text-cyan-100">{item.title}</h3>
                <time className="text-xs text-cyan-100/50">{new Date(item.createdAt).toLocaleString()}</time>
              </div>
              <p className="mt-1 text-sm text-cyan-100/75">{item.message}</p>
              {item.id.startsWith('automation_approval_') && <a href="/automations" className="mt-2 inline-block text-sm text-cyan-200 underline">Review automation run</a>}
              {!item.readAt && <button type="button" onClick={() => void markRead(item.id)} className="mt-2 block text-xs text-cyan-200/70 underline">Mark as read</button>}
            </article>
          ))}
        </div>}
    </section>
  );
}
