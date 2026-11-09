'use client';
import { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { logout } from '@/services/auth';
export default function Header() {
  const { user, setUser, loading } = useUser(); const [error, setError] = useState('');
  async function signOut() { setError(''); try { await logout(); setUser(null); window.location.assign('/'); } catch { setError('Unable to sign out. Please retry.'); } }
  return <header className="mad-header"><div className="mad-header-inner"><a className="mad-brand" href="/">MAD AI<small>Powered by MADSI</small></a><nav aria-label="Main navigation"><a href="/">Console</a><a href="/pricing">Pricing</a>{loading ? <span>Checking session…</span> : user ? <><span>{user.name}</span><button onClick={signOut}>Sign out</button></> : <><a href="/login">Sign in</a><a href="/signup">Create account</a></>}</nav></div>{error && <p role="alert">{error}</p>}</header>;
}
