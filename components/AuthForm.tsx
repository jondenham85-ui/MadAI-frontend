'use client';
import { useState, type FormEvent } from 'react';
import { useUser } from '@/context/UserContext';
import { login, signup } from '@/services/auth';
export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { setUser } = useUser(); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = mode === 'signup' ? await signup(name, email, password) : await login(email, password); setUser(result.user); window.location.assign('/'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Authentication failed'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mad-form mad-card"><h1>{mode === 'signup' ? 'Create your MAD AI account' : 'Sign in to MAD AI'}</h1>{mode === 'signup' && <label>Name<input value={name} onChange={event => setName(event.target.value)} maxLength={120} autoComplete="name" required /></label>}<label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>{mode === 'signup' && <p className="mad-muted">Use at least 8 characters and no more than 72 UTF-8 bytes.</p>}{error && <p className="mad-error" role="alert">{error}</p>}<button disabled={busy} type="submit">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button><a href={mode === 'signup' ? '/login' : '/signup'}>{mode === 'signup' ? 'Already registered? Sign in' : 'Need an account? Sign up'}</a></form>;
}
