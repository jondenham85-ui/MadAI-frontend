'use client';
import { useState, type FormEvent } from 'react';
import Pricing from '@/components/billing/Pricing';
import { ApiError, apiRequest } from '@/services/auth';
type Message = { role: string; content: string };
type ChatResponse = { answer: string; conversationId: string };
type TaskResponse = { directive: { result?: string | null }; note: string };
export default function SynthConsole() {
  const [prompt, setPrompt] = useState(''); const [mode, setMode] = useState('chat'); const [messages, setMessages] = useState<Message[]>([]); const [conversationId, setConversationId] = useState<string>(); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [paywall, setPaywall] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); const submitted = prompt.trim(); if (!submitted || busy) return; setBusy(true); setError(''); setPaywall(false);
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 90000);
    try {
      let answer: string;
      if (mode === 'chat') { const result = await apiRequest<ChatResponse>('/synth', { method: 'POST', signal: controller.signal, body: JSON.stringify({ prompt: submitted, conversationId }) }); answer = result.answer; setConversationId(result.conversationId); }
      else { const result = await apiRequest<TaskResponse>('/tasks', { method: 'POST', signal: controller.signal, body: JSON.stringify({ prompt: submitted, build: mode === 'build' }) }); answer = result.directive?.result || result.note; }
      setMessages(previous => [...previous, { role: 'You', content: submitted }, { role: 'MADSI', content: answer }]); setPrompt('');
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) { setPaywall(true); setError('Your daily limit was reached, or this feature requires Premium.'); }
      else if (error instanceof ApiError && error.status === 401) setError('Please sign in to use MADSI.');
      else if (error instanceof ApiError && error.status === 504) setError('The AI provider timed out. Please retry.');
      else if (error instanceof Error && error.name === 'AbortError') setError('The request timed out. The backend may be starting. Check health and retry.');
      else setError(error instanceof Error ? error.message : 'The service is unavailable.');
    } finally { clearTimeout(timer); setBusy(false); }
  }
  function newConversation() { setConversationId(undefined); setMessages([]); setError(''); setPaywall(false); }
  return <section className="mad-card"><div className="mad-console-heading"><h2>Synth Console</h2><button className="mad-secondary" onClick={newConversation} disabled={busy}>New conversation</button></div><p className="mad-muted">Chat with MADSI, save a directive, or generate source code with Premium. Saved directives are not automatically executed.</p><div className="mad-messages" aria-live="polite">{messages.length === 0 && <p className="mad-muted">Ready for your request.</p>}{messages.map((message, index) => <article key={index}><h3>{message.role}</h3><pre>{message.content}</pre></article>)}</div><form onSubmit={submit} className="mad-form"><label>Mode<select value={mode} onChange={event => setMode(event.target.value)} disabled={busy}><option value="chat">Chat</option><option value="task">Submit a task</option><option value="build">Build source code — Premium</option></select></label><label>Your request<textarea value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={16000} disabled={busy} required /></label><button type="submit" disabled={busy || !prompt.trim()}>{busy ? 'Processing…' : 'Send'}</button></form>{error && <p className="mad-error" role="alert">{error} <a href="/login">Sign in</a></p>}{paywall && <section className="mad-paywall"><a className="mad-button" href="/pricing">Upgrade</a><Pricing /></section>}</section>;
}
