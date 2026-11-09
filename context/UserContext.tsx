'use client';
import {createContext,useContext,useEffect,useState,type Dispatch,type ReactNode,type SetStateAction} from 'react';
import {getCurrentUser,type User} from '@/services/auth';
type Value={user:User|null;setUser:Dispatch<SetStateAction<User|null>>;loading:boolean;isAuthenticated:boolean};
const Context=createContext<Value|null>(null);
export function UserProvider({children}:{children:ReactNode}){
  const[user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true,generation=0;const refresh=async()=>{const current=++generation;try{const next=await getCurrentUser();if(active&&current===generation)setUser(next);}catch{if(active&&current===generation)setUser(null);}finally{if(active&&current===generation)setLoading(false);}};
    const visible=()=>{if(document.visibilityState==='visible')void refresh();};const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('madsi-auth');if(channel)channel.onmessage=()=>void refresh();
    window.addEventListener('madsi-auth-changed',refresh);document.addEventListener('visibilitychange',visible);void refresh();
    return()=>{active=false;channel?.close();window.removeEventListener('madsi-auth-changed',refresh);document.removeEventListener('visibilitychange',visible);};
  },[]);
  return <Context.Provider value={{user,setUser,loading,isAuthenticated:Boolean(user?.id)}}>{children}</Context.Provider>;
}
export function useUser(){const context=useContext(Context);if(!context)throw new Error('useUser must be used inside UserProvider');return context;}
