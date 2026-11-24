'use client';
import {useState} from 'react';
import {usePathname} from 'next/navigation';
import {useUser} from '@/context/UserContext';
const nav=[
 {label:'Dashboard',href:'/synth',icon:'◫'},
 {label:'Create',href:'/synth#madsi-composer',icon:'＋'},
 {label:'Workspace',href:'/workspace',icon:'▤'},
 {label:'Agents',href:'/agents',icon:'⌘'},
 {label:'Intelligence',href:'/intelligence',icon:'✳'},
 {label:'Business',href:'/pricing',icon:'↗'},
 {label:'Settings',href:'/settings',icon:'⚙'}
];
export default function NexusWorkspace({children}:{children:React.ReactNode}){
 const {user}=useUser(); const [more,setMore]=useState(false); const owner=user?.role==='OWNER'; const pathname=usePathname(); const dashboard=pathname==='/synth';
 const active=(label:string,href:string)=>label==='Dashboard'?dashboard:label==='Create'?dashboard:pathname===href;
 const primary=nav.slice(0,4); const manage=nav.slice(4);
 return <div className="nx-shell"><aside className="nx-rail"><a className="nx-brand" href="/"><span>M</span><b>MADSI<small>NEXUS WORKSPACE</small></b></a><p className="nx-label">WORKSPACE</p><nav>{primary.map((n)=><a key={n.label} href={n.href} className={active(n.label,n.href)?'active':''}><i>{n.icon}</i>{n.label}{dashboard&&n.label==='Dashboard'&&<em/>}</a>)}</nav><p className="nx-label nx-manage">MANAGE</p><nav>{manage.map((n)=><a key={n.label} href={n.href} className={active(n.label,n.href)?'active':''}><i>{n.icon}</i>{n.label}</a>)}{owner&&<a href="/admin" className={pathname==='/admin'?'active':''}><i>⌁</i>Owner command</a>}</nav><div className="nx-rail-status"><i/>PERSONAL WORKSPACE</div></aside><div className="nx-main"><header className="nx-top"><span>MADSI <b>/</b> {dashboard?'Dashboard':pathname==='/settings'?'Settings':pathname==='/workspace'?'Workspace':pathname==='/agents'?'Agents':pathname==='/admin'?'Owner command':pathname==='/pricing'?'Business':pathname==='/intelligence'?'Intelligence':'Workspace'}</span><div><span>YOUR WORKSPACE</span><strong>{(user?.name||'M').charAt(0).toUpperCase()}</strong></div></header><main className="nx-content">{dashboard&&<><section className="nx-welcome"><div><small>YOUR INTELLIGENCE WORKSPACE</small><h1>Ideas into action.</h1><p>Welcome back{user?.name?' '+user.name.split(' ')[0]:''}. What would you like to move forward today?</p></div><a href="#madsi-composer">＋ Start creating</a></section><section className="nx-shortcuts"><a href="#madsi-composer"><i>✳</i><b>Create with MADSI<small>Start a conversation or build an idea</small></b><em>↗</em></a><a href="#madsi-history"><i>▤</i><b>Continue your work<small>Pick up a recent conversation</small></b><em>↗</em></a><a href="/agents"><i>⌘</i><b>AI agent team<small>Explore agent tools and activity</small></b><em>↗</em></a></section></>}{children}</main></div><nav className="nx-mobile"><a href="/synth"><i>◫</i><small>Home</small></a><a href="/synth#madsi-composer"><i>＋</i><small>Create</small></a><a href="/workspace"><i>▤</i><small>Work</small></a><a href="/agents"><i>⌘</i><small>Agents</small></a><button onClick={()=>setMore(v=>!v)} aria-expanded={more}><i>•••</i><small>More</small></button></nav>{more&&<div className="nx-more"><a href="/intelligence">Intelligence</a><a href="/pricing">Business & plans</a>{owner&&<a href="/admin">Owner command</a>}<a href="/settings">Settings</a><button onClick={()=>setMore(false)}>Close</button></div>}</div>;
}
