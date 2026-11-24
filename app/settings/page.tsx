'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import NexusWorkspace from '@/components/layout/NexusWorkspace';
import {useUser} from '@/context/UserContext';
import {logout} from '@/services/auth';
import {getAccessToken} from '@/lib/supabase';

const GITHUB_CONNECT_URL = 'https://rcetiocftggebqzfuncd.supabase.co/functions/v1/madsi-github-connect';

export default function SettingsPage(){
 const {user,loading,setUser}=useUser();
 const router=useRouter();
 const [signingOut,setSigningOut]=useState(false);
 const [connecting,setConnecting]=useState(false);
 const [githubMessage,setGithubMessage]=useState('');
 const [error,setError]=useState('');
 useEffect(()=>{if(!loading&&!user)router.replace('/login');},[loading,user,router]);
 useEffect(()=>{
  const status=new URLSearchParams(window.location.search).get('github');
  if(status==='verification_required')setGithubMessage('GitHub app created and installation received. Repository access is being verified before publishing is enabled.');
  else if(status==='exchange_failed'||status==='secure_storage_failed'||status==='save_failed')setError('GitHub setup did not finish securely. Please try Connect GitHub again.');
  else if(status==='expired'||status==='invalid')setError('That GitHub setup link expired. Start again from this page.');
 },[]);
 async function handleConnectGitHub(){
  setConnecting(true);setError('');setGithubMessage('');
  try{
   const token=await getAccessToken();
   if(!token)throw new Error('Please sign in again before connecting GitHub.');
   const response=await fetch(GITHUB_CONNECT_URL+'/start',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store'});
   const data=await response.json().catch(()=>({}));
   if(!response.ok||!data.registrationUrl||!data.manifest)throw new Error(data.error||'Could not start the secure GitHub connection.');
   const form=document.createElement('form');
   form.method='POST';form.action=data.registrationUrl;
   const manifest=document.createElement('input');manifest.type='hidden';manifest.name='manifest';manifest.value=JSON.stringify(data.manifest);
   form.appendChild(manifest);document.body.appendChild(form);form.submit();
  }catch(e){setError(e instanceof Error?e.message:'GitHub connection could not be started.');setConnecting(false);}
 }
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
  {user.role==='OWNER'&&<section className="nx-settings-card"><div className="nx-settings-card-title"><span>03 / PUBLISHING</span><h2>Connect GitHub</h2><p>Give MADSI narrowly scoped access to the MADSI frontend repository so it can prepare and publish verified project updates.</p></div><button type="button" onClick={handleConnectGitHub} disabled={connecting}>{connecting?'Opening secure GitHub setup…':'Connect GitHub'}</button>{githubMessage&&<p role="status">{githubMessage}</p>}<p className="nx-settings-foot">GitHub will ask you to create MADSI Publishing and install it. Choose only the MadAI-frontend repository. MADSI will not publish generated changes directly to production until verification is complete.</p></section>}
  <section className="nx-settings-card nx-settings-security"><div className="nx-settings-card-title"><span>04 / SECURITY</span><h2>Session access</h2><p>Sign out of this device when you are finished.</p></div><button type="button" onClick={handleSignOut} disabled={signingOut}>{signingOut?'Signing out…':'Sign out of MADSI'}</button>{error&&<p role="alert">{error}</p>}</section>
  <p className="nx-settings-foot">Profile and subscription details are shown from your existing account. Changes to billing and account credentials are not available on this screen.</p>
 </section></NexusWorkspace>;
}
