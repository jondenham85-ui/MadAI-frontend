'use client';
import {useEffect,useState} from 'react';
import Header from '@/components/layout/Header';
import {apiRequest} from '@/services/auth';
import {useUser} from '@/context/UserContext';
type Health={status:string;database:string};
const systems=[
  {index:'01',name:'Cognitive core',tag:'CONVERSE',description:'Work through complex questions, explore ideas and turn uncertainty into a clear next move.',href:'/synth',action:'Open intelligence'},
  {index:'02',name:'Directive engine',tag:'ORGANIZE',description:'Shape goals into structured tasks, keep important work in view and pick up where you left off.',href:'/synth',action:'Create a directive'},
  {index:'03',name:'Creation studio',tag:'CREATE',description:'Generate useful starting points for websites, tools and software—then refine the result.',href:'/synth',action:'Start creating'},
  {index:'04',name:'Continuity layer',tag:'REMEMBER',description:'Return to saved conversations and carry useful context forward instead of starting over.',href:'/synth',action:'Continue a session'}
] as const;
export default function HomePage(){
  const {user}=useUser();const [health,setHealth]=useState<Health|null>(null);const [checked,setChecked]=useState(false);
  useEffect(()=>{let active=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);apiRequest<Health>('/health',{signal:controller.signal}).then(data=>{if(active)setHealth(data);}).catch(()=>{}).finally(()=>{clearTimeout(timer);if(active)setChecked(true);});return()=>{active=false;clearTimeout(timer);controller.abort();};},[]);
  const online=health?.status==='ok'&&health.database==='connected';
  const systemState=!checked?'CHECKING SYSTEM':online?'CORE CONNECTION ONLINE':'CONNECTION UNVERIFIED';
  return <><Header/><main className="mad-main si-home">
    <div className="si-utility-bar"><span><i className="si-live-dot"/> SYNTHETIC INTELLIGENCE / SYSTEM 01</span><span className="si-system-state" role="status">{systemState}</span></div>
    <section className="si-hero">
      <div className="si-hero-copy">
        <p className="eyebrow"><span className="small-line"/> MADSI · SYNTHETIC INTELLIGENCE</p>
        {user&&<p className="hero-greeting">Welcome back, {user.name||'there'}. {user.role==='OWNER'&&<a href="/admin">Open owner command ↗</a>}</p>}
        <h1>More than answers.<br/><span>Intelligence in motion.</span></h1>
        <p className="si-lede">A new kind of digital workspace—built to think with you, organize what matters and help turn ideas into real work.</p>
        <div className="si-hero-actions"><a className="mad-button" href="/synth">Enter MADSI <span aria-hidden="true">↗</span></a><a className="si-text-link" href="#systems">Explore the system <span aria-hidden="true">↓</span></a></div>
        <div className="si-trust-line"><span>BUILT AROUND YOUR WORK</span><b/> <span>YOU SET THE DIRECTION</span><b/> <span>MADE TO EVOLVE</span></div>
      </div>
      <div className="si-core-stage" aria-label="MADSI synthetic intelligence core">
        <div className="si-orbit si-orbit-a"/><div className="si-orbit si-orbit-b"/><div className="si-orbit si-orbit-c"/>
        <div className="si-core-glow"/><div className="si-core">
          <div className="si-core-mark">M</div><span>MADSI</span><small>SYNTHETIC INTELLIGENCE</small>
        </div>
        <div className="si-node si-node-one"><i/> COGNITION <small>01</small></div>
        <div className="si-node si-node-two"><i/> DIRECTIVES <small>02</small></div>
        <div className="si-node si-node-three"><i/> CREATION <small>03</small></div>
        <div className="si-stage-caption"><span>CORE INTERFACE</span><span>01 / 04</span></div>
      </div>
    </section>
    <section className="si-console-launch">
      <div className="si-launch-symbol"><span>↗</span></div>
      <div className="si-launch-copy"><p className="eyebrow">YOUR NEXT MOVE STARTS HERE</p><h2>Give an idea somewhere to go.</h2><p>Open your private workspace and work directly with MADSI.</p></div>
      <a href="/synth" className="si-launch-link">Launch workspace <span>↗</span></a>
    </section>
    <section id="systems" className="si-systems">
      <div className="si-section-head"><div><p className="eyebrow">THE MADSI SYSTEM</p><h2>One intelligence.<br/><span>Multiple ways to move forward.</span></h2></div><p>Designed as a connected system—not just a chat window.</p></div>
      <div className="si-system-grid">{systems.map(item=><article className="si-system-card" key={item.index}><div className="si-card-top"><span>{item.index} / MODULE</span><span>{item.tag}</span></div><div className="si-module-glyph" aria-hidden="true">{item.index==='01'?'◉':item.index==='02'?'⌘':item.index==='03'?'◇':'◎'}</div><h3>{item.name}</h3><p>{item.description}</p><a href={item.href}>{item.action} <span aria-hidden="true">↗</span></a></article>)}</div>
    </section>
    <section className="si-principle-band"><div><p className="eyebrow">A DIFFERENT KIND OF INTELLIGENCE</p><h2>Not another tab to keep open.<br/><span>A system to build with.</span></h2></div><div className="si-principle-copy"><p>MADSI brings conversation, directives and creation into one environment. You stay in control of the goal; MADSI helps make the next step clearer.</p><a href="/pricing">Explore access and plans ↗</a></div></section>
    <footer className="site-footer si-footer"><span>MADSI<small>FULL NAME: MAD SYNTHETIC INTELLIGENCE</small></span><div><a href="/synth">Workspace</a><a href="#systems">System modules</a><a href="/pricing">Plans</a></div></footer>
  </main></>;
}
