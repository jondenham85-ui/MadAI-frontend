'use client';
import {useState} from 'react';
import {useUser} from '@/context/UserContext';
import {logout} from '@/services/auth';
export default function Header(){
  const {user,setUser,loading}=useUser();const [open,setOpen]=useState(false);const [error,setError]=useState('');
  async function signOut(){setError('');try{await logout();setUser(null);window.location.assign('/');}catch{setError('Sign out failed. Please retry.');}}
  return <header className="mad-header"><div className="mad-header-inner"><a className="mad-brand" href="/" aria-label="MAD SI home"><span className="brand-symbol" aria-hidden="true">M</span><span>MAD SI<small>Your AI workspace</small></span></a><button className="nav-toggle mad-secondary" aria-expanded={open} aria-controls="primary-nav" aria-label={open?'Close navigation':'Open navigation'} onClick={()=>setOpen(!open)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{open?<path d="m6 6 12 12M18 6 6 18"/>:<path d="M4 6h16M4 12h16M4 18h16"/>}</svg></button><nav id="primary-nav" className={`mad-navigation ${open?'is-open':''}`} aria-label="Main navigation" onClick={()=>setOpen(false)}><a href="/#console">Workspace</a><a href="/pricing">Pricing</a>{user?.role==='OWNER'&&<a href="/admin">Owner dashboard</a>}{loading?<span className="mad-muted">Checking session…</span>:user?<><span className="account-label">{user.name||'Account'}{user.role==='OWNER'&&<small className="role-badge">OWNER</small>}</span><button className="mad-secondary" onClick={signOut}>Sign out</button></>:<><a href="/login">Sign in</a><a className="mad-button" href="/signup">Get started</a></>}</nav></div>{error&&<p className="mad-error" role="alert">{error}</p>}</header>;
}
