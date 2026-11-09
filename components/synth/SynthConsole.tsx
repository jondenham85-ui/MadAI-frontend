'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Pricing from '@/components/billing/Pricing';
import {ApiError,apiRequest} from '@/services/auth';
import {useUser} from '@/context/UserContext';
import {nextAttempt,retryNeedsNewKey} from '@/lib/synth-request';
type Message={role:string;content:string};
type ChatResponse={answer:string;conversationId:string};
type TaskResponse={directive:{status?:string;result?:string|null};note:string};
export default function SynthConsole(){
  const{user,loading}=useUser();const[prompt,setPrompt]=useState(''),[mode,setMode]=useState('chat'),[messages,setMessages]=useState<Message[]>([]),[conversationId,setConversationId]=useState<string>(),[busy,setBusy]=useState(false),[restoring,setRestoring]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState<number|null>(null),[paywall,setPaywall]=useState(false);
  const attempt=useRef<ReturnType<typeof nextAttempt>|null>(null),requestController=useRef<AbortController|null>(null),historyController=useRef<AbortController|null>(null),currentUser=useRef(user?.id);currentUser.current=user?.id;
  const storageKey=(uid:string)=>'madsi.conversation.'+uid;
  function remember(uid:string,id:string){try{localStorage.setItem(storageKey(uid),id);}catch{}}
  useEffect(()=>{
    if(loading)return;const uid=user?.id;let active=true;requestController.current?.abort();historyController.current?.abort();attempt.current=null;setBusy(false);setMessages([]);setPrompt('');setConversationId(undefined);setError('');setStatus(null);setPaywall(false);setRestoring(false);
    if(!uid)return;const controller=new AbortController();historyController.current=controller;setRestoring(true);
    async function restore(){
      try{
        let id:string|null=null;try{id=localStorage.getItem(storageKey(uid!));}catch{}if(id==='new')return;
        if(!id){const list=await apiRequest<{conversations:Array<{id:string}>}>('/conversations',{signal:controller.signal});id=Array.isArray(list?.conversations)?list.conversations[0]?.id||null:null;}
        if(!id||id.length>200)return;
        const saved=await apiRequest<{messages:Array<{role:string;content:string}>}>('/conversations/'+encodeURIComponent(id)+'/messages',{signal:controller.signal});
        if(!active||controller.signal.aborted||currentUser.current!==uid)return;
        if(!Array.isArray(saved?.messages))throw new Error('Conversation history response was invalid');
        setMessages(saved.messages.filter(m=>m&&typeof m.content==='string'&&['user','assistant'].includes(m.role)).map(m=>({role:m.role==='user'?'You':'MAD SI',content:m.content})));setConversationId(id);remember(uid!,id);
      }catch(error){if(!active||controller.signal.aborted||currentUser.current!==uid)return;if(error instanceof ApiError&&error.status===404){try{localStorage.removeItem(storageKey(uid!));}catch{}}else setError('Saved conversation could not be loaded. '+(error instanceof Error?error.message:''));}
      finally{if(active&&currentUser.current===uid)setRestoring(false);}
    }
    void restore();return()=>{active=false;controller.abort();requestController.current?.abort();};
  },[user?.id,loading]);
  async function submit(event:FormEvent){
    event.preventDefault();const submitted=prompt.trim(),uid=user?.id;if(!submitted||busy||restoring)return;if(!uid){setStatus(401);setError('Please sign in to send this request.');return;}
    setBusy(true);setError('');setStatus(null);setPaywall(false);const controller=new AbortController();requestController.current=controller;const timer=setTimeout(()=>controller.abort(),90000);
    try{
      attempt.current=nextAttempt(attempt.current,JSON.stringify({uid,mode,prompt:submitted,conversationId:conversationId||null}));const requestId=attempt.current.id;let answer:string;
      if(mode==='chat'){
        const result=await apiRequest<ChatResponse>('/synth',{method:'POST',signal:controller.signal,headers:{'Idempotency-Key':requestId},body:JSON.stringify({prompt:submitted,conversationId,requestId})});
        if(currentUser.current!==uid)return;if(typeof result?.answer!=='string'||!result.answer.trim()||typeof result.conversationId!=='string'||!result.conversationId)throw new Error('The server returned an invalid chat response');
        answer=result.answer;setConversationId(result.conversationId);remember(uid,result.conversationId);
      }else{
        const result=await apiRequest<TaskResponse>('/tasks',{method:'POST',signal:controller.signal,headers:{'Idempotency-Key':requestId},body:JSON.stringify({prompt:submitted,build:mode==='build',requestId})});
        if(currentUser.current!==uid)return;if(result?.directive?.status!=='COMPLETED'||typeof result.directive.result!=='string'||!result.directive.result.trim())throw new Error('The directive did not return a completed AI result');answer=result.directive.result;
      }
      attempt.current=null;setMessages(previous=>[...previous,{role:'You',content:submitted},{role:'MAD SI',content:answer}]);setPrompt('');
    }catch(error){
      if(currentUser.current!==uid)return;
      if(error instanceof ApiError){setStatus(error.status);if(retryNeedsNewKey(error.status,error.code,error.message,error.usageRefundPending))attempt.current=null;
        if(error.status===402){setPaywall(true);setError('Your daily plan limit was reached, or source generation is not enabled for this account.');}else if(error.status===401)setError('Please sign in to send this request.');else if(error.status===504)setError('Execution timed out. Retrying the same request is safe.');else if(error.message==='request_in_progress')setError('This request is still processing. Retry shortly to retrieve its result.');else if(error.message==='request_failed_use_new_key')setError('The previous attempt failed. Submit again to start a new attempt.');else setError(error.message);
      }else if(error instanceof Error&&error.name==='AbortError')setError('The response was interrupted. Retry the same request to retrieve its result.');else setError(error instanceof Error?error.message:'The service is unavailable.');
    }finally{clearTimeout(timer);if(requestController.current===controller)requestController.current=null;if(currentUser.current===uid)setBusy(false);}
  }
  function reset(){historyController.current?.abort();attempt.current=null;setRestoring(false);setConversationId(undefined);setMessages([]);setError('');setStatus(null);setPaywall(false);if(user?.id)remember(user.id,'new');}
  return <section className="mad-card console-card"><div className="mad-console-heading"><div><p className="eyebrow">MAD SI / CONSOLE</p><h2>What are we working on?</h2></div><button className="mad-secondary" onClick={reset} disabled={busy}>New conversation</button></div>{user?.role==='OWNER'&&<p className="owner-console-note">Owner account recognized: {user.name}. <a href="/admin">View server-confirmed access →</a></p>}<div className="mad-messages" aria-live="polite">{messages.length===0&&<p className="mad-muted">A question, a directive, or a starting point for code. Start here.</p>}{messages.map((message,index)=><article key={index}><h3>{message.role}</h3><pre>{message.content}</pre></article>)}</div><form onSubmit={submit} className="mad-form"><div className="mode-switch" role="group" aria-label="Request mode">{[['chat','Chat'],['task','Run directive'],['build','Generate source']].map(([value,label])=><button type="button" key={value} aria-pressed={mode===value} className={mode===value?'is-selected':''} disabled={busy||restoring} onClick={()=>setMode(value)}>{label}</button>)}</div><label htmlFor="madsi-prompt" className="sr-only">Your request</label><textarea id="madsi-prompt" value={prompt} onChange={event=>setPrompt(event.target.value)} maxLength={16000} disabled={busy||restoring} required placeholder={mode==='chat'?'Ask MAD SI something…':mode==='task'?'Describe the directive you want MAD SI to process…':'Describe the website, tool or game source you want…'} onKeyDown={event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/><div className="composer-footer"><span>Ctrl / ⌘ + Enter to send</span><button type="submit" disabled={busy||restoring||!prompt.trim()}>{busy?'Working…':mode==='task'?'Run directive':'Send request'} <span aria-hidden="true">↗</span></button></div></form>{(busy||restoring)&&<p className="mad-muted" role="status">{restoring?'Loading your saved conversation…':'MAD SI is processing your request…'}</p>}{error&&<div className="mad-error" role="alert"><p>{error}</p>{status&&<small>HTTP {status} · {mode==='chat'?'/api/synth':'/api/tasks'}</small>}{status===401&&<p><a href="/login">Sign in →</a></p>}</div>}{paywall&&<section className="mad-paywall"><a className="mad-button" href="/pricing">View access and plans</a><Pricing/></section>}<p className="console-disclaimer">Directives generate and save an AI response. Source generation requires eligible member or verified owner access; generated code and external business actions are not automatically run or deployed.</p></section>;
}
