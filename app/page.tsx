'use client';
import {useEffect,useState} from 'react';
import Header from '@/components/layout/Header';
import {useUser} from '@/context/UserContext';
type Health={status:string;service?:string;provider?:string;model?:string};
const features=[
 {n:'01',icon:'◉',title:'Think with MADSI',tag:'INTELLIGENCE',copy:'Get clear answers, explore decisions and turn complex questions into practical next steps.'},
 {n:'02',icon:'⌘',title:'Move work forward',tag:'TASKS & WORKFLOWS',copy:'Break goals into tasks and use recurring AI workflows to keep important work moving.'},
 {n:'03',icon:'◇',title:'Create real things',tag:'BUILD & CREATE',copy:'Generate website, code and game source, then refine your ideas inside one workspace.'},
 {n:'04',icon:'◎',title:'Keep your momentum',tag:'CONTINUITY',copy:'Return to conversations, projects and useful context without starting from zero.'}
];
const plans=[
 {name:'Chat',price:'$9.99',detail:'200 chats per day',id:'chat'},
 {name:'Tasks',price:'$19',detail:'25 tasks per day + recurring workflows',id:'tasks'},
 {name:'Premium',price:'$49',detail:'Unlimited chat + 100 tasks per day',id:'premium'},
 {name:'Business Team',price:'$99',detail:'500 tasks per user per day',id:'business_team'},
 {name:'Business Scale',price:'$299',detail:'2,000 tasks per user per day',id:'business_scale'}
];
export default function HomePage(){
 const {user}=useUser();const [health,setHealth]=useState<Health|null>(null);const [checked,setChecked]=useState(false);
 useEffect(()=>{let active=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);fetch('/api/madsi-inference',{method:'GET',signal:controller.signal,cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error('Inference health unavailable');return await response.json() as Health}).then(data=>{if(active)setHealth(data)}).catch(()=>{}).finally(()=>{clearTimeout(timer);if(active)setChecked(true)});return()=>{active=false;clearTimeout(timer);controller.abort()}},[]);
 const online=health?.status==='ready';
 const startHref=user?'/synth':'/signup';
 return <><Header/><main className="mad-main nx-home">
  <div className="nx-home-status"><span>MADSI · SYNTHETIC INTELLIGENCE</span><span>{!checked?'CHECKING SYSTEM':online?'INTELLIGENCE ONLINE':'INTELLIGENCE UNVERIFIED'}</span></div>
  <section className="nx-hero"><div className="nx-hero-copy">
   <small>MADSI · MAD SYNTHETIC INTELLIGENCE</small><p className="nx-home-kicker">One intelligence. More momentum.</p>
   {user&&<p className="nx-home-greeting">Welcome back, {user.name||'there'}. {user.role==='OWNER'&&<a href="/admin">Owner command ↗</a>}</p>}
   <h1>Stop juggling AI tools.<br/><span>Start getting work done.</span></h1>
   <p className="nx-hero-lede">MADSI brings intelligent chat, task workflows and creation tools into one connected workspace—so you can move from an idea to meaningful progress.</p>
   <div className="nx-hero-actions"><a className="nx-primary-cta" href={startHref}>{user?'Open your workspace':'Start free'} <b>↗</b></a><a className="nx-secondary-cta" href="/pricing">See plans & pricing ↓</a></div>
   <div className="nx-trust"><span>THINK</span><i/> <span>BUILD</span><i/> <span>MOVE FORWARD</span></div>
  </div><div className="nx-visual" aria-label="MADSI synthetic intelligence visual"><div className="nx-visual-grid"/><div className="nx-ring nx-ring-one"/><div className="nx-ring nx-ring-two"/><div className="nx-ring nx-ring-three"/><div className="nx-orb"><span>M</span><small>MADSI</small><em>SYNTHETIC INTELLIGENCE</em></div><div className="nx-orbit-tag nx-tag-a">◉ THINK</div><div className="nx-orbit-tag nx-tag-b">⌘ DIRECT</div><div className="nx-orbit-tag nx-tag-c">◇ CREATE</div><div className="nx-visual-caption">CONNECTED INTELLIGENCE <b>01 / 04</b></div></div></section>
  <section className="nx-home-banner"><div><small>START WITH THE FREE PLAN</small><h2>Bring one idea. Leave with a next step.</h2><p>Try MADSI, explore your workspace and upgrade when you need more capacity.</p></div><a href={startHref}>{user?'Launch workspace':'Create your free account'} <b>↗</b></a></section>
  <section id="systems" className="nx-capabilities"><div className="nx-section-title"><div><small>THE MADSI SYSTEM</small><h2>From first question<br/><span>to finished work.</span></h2></div><p>One connected workspace for the thinking, planning and creating that moves your goals forward.</p></div>
   <div className="nx-feature-grid">{features.map(f=><article key={f.n}><div className="nx-feature-meta"><span>{f.n} / MODULE</span><span>{f.tag}</span></div><div className="nx-feature-icon">{f.icon}</div><h3>{f.title}</h3><p>{f.copy}</p><a href={startHref}>Explore in MADSI ↗</a></article>)}</div>
  </section>
  <section className="nx-capabilities"><div className="nx-section-title"><div><small>SIMPLE, SCALABLE PLANS</small><h2>Start free.<br/><span>Scale when you're ready.</span></h2></div><p>Choose the capacity that fits your work. Monthly and annual billing options are available.</p></div>
   <div className="nx-feature-grid">{plans.map((plan,index)=><article key={plan.id}><div className="nx-feature-meta"><span>{index===2?'FULL CREATION':'MADSI PLAN'}</span><span>{index===4?'HIGH VOLUME':'MONTHLY'}</span></div><h3>{plan.name}</h3><p className="nx-plan-price">{plan.price}<span>/ month</span></p><p>{plan.detail}</p><a href="/pricing">View plan & checkout ↗</a></article>)}</div>
   <div className="nx-home-actions"><a className="nx-primary-cta" href="/pricing">Compare all plans <b>↗</b></a><a className="nx-secondary-cta" href={startHref}> {user?'Go to workspace':'Start with Free'} </a></div>
  </section>
  <section className="nx-home-bottom"><div><small>YOUR NEXT CHAPTER STARTS HERE</small><h2>Bring the ambition.<br/><span>Build the next step.</span></h2></div><a href={startHref}>{user?'Enter MADSI':'Get started free'} ↗</a></section>
  <footer className="nx-home-footer"><a href="/">MADSI <small>MAD SYNTHETIC INTELLIGENCE</small></a><div><a href="/synth">Workspace</a><a href="#systems">Capabilities</a><a href="/pricing">Plans</a><a href="/developers">Developers</a><a href="/login">Sign in</a></div></footer>
 </main></>;
}
