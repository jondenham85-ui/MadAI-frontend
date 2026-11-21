'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import NexusWorkspace from '@/components/layout/NexusWorkspace';
import {useUser} from '@/context/UserContext';
import {logout} from '@/services/auth';

export default function SettingsPage(){
 const {user,loading,setUser}=useUser();
 const router=useRouter();
 const [signingOut,setSigningOut]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{if(!loading&&!user)router.replace('/login');},[loading,user,router]);
 async function handleSignOut(){
  setSigningOut(true);setError('');
  try{await logout();setUser(null);router.replace('/login');}
  catch(e){setError(e instanceof Error?e.message:'Could not sign out. Please try again.');setSigningOut(false);}
 }
 if(loading||!user)return <main className="nx-content"><p className="nx-settings-muted">Checking your MADSI account…</p></main>;
 return <NexusWorkspace><section className="nx-settings">
  <div className="nx-settings-heading"><div><small>ACCOUNT CONTROL</small><h1>Settings</h1><p>Manage your account details and access to MADSI.</p></div><span>PERSONAL WORKSPACE</span></div>
  <section className="nx-settings-card"><div className="nx-settings-card-title"><span>01 / PROFILE</span><h2>Your account</h2><p>Your current MADSI identity.</p></div><dl><div><dt>Name</dt><dd>{user.name||'Not provided'}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Account role</dt><dd>{user.role||'Member'}</dd></div></dl></section>
  <section className="nx-settings-card"><div className="nx-settings-card-title"><span>02 / PLAN</span><h2>Subscription</h2><p>Your current account plan.</p></div><div className="nx-plan-row"><div><small>CURRENT PLAN</small><strong>{user.plan||'Free'}</strong></div><a href="/pricing">View plans <b>↗</b></a></div></section>
  <section className="nx-settings-card nx-settings-security"><div className="nx-settings-card-title"><span>03 / SECURITY</span><h2>Session access</h2><p>Sign out of this device when you are finished.</p></div><button type="button" onClick={handleSignOut} disabled={signingOut}>{signingOut?'Signing out…':'Sign out of MADSI'}</button>{error&&<p role="alert">{error}</p>}</section>
  <p className="nx-settings-foot">Profile and subscription details are shown from your existing account. Changes to billing and account credentials are not available on this screen.</p>
 </section></NexusWorkspace>;
}
