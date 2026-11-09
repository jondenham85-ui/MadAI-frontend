export type User={id:string;name:string;email:string;role:string;plan:string;createdAt?:string;updatedAt?:string};
export type AuthResult={success:boolean;user:User|null;confirmationRequired?:boolean;message?:string};
type ErrorPayload={error?:string;plan?:string;limit?:number|string|null;code?:string;usageRefundPending?:boolean};
export class ApiError extends Error{
  status:number;plan?:string;limit?:number|string|null;code?:string;usageRefundPending?:boolean;
  constructor(status:number,payload:ErrorPayload){super(typeof payload.error==='string'?payload.error:`Request failed (${status})`);this.name='ApiError';this.status=status;this.plan=payload.plan;this.limit=payload.limit;this.code=typeof payload.code==='string'?payload.code:undefined;this.usageRefundPending=payload.usageRefundPending===true;}
}
function changed(){if(typeof window==='undefined')return;window.dispatchEvent(new Event('madsi-auth-changed'));if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('madsi-auth');channel.postMessage('changed');channel.close();}}
export async function apiRequest<T=unknown>(path:string,options:RequestInit={}):Promise<T>{
  const headers=new Headers(options.headers);if(options.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  const response=await fetch('/api/backend/api'+path,{...options,credentials:'include',cache:'no-store',headers});
  const raw:unknown=await response.json().catch(()=>({error:'The server returned an invalid response'}));
  if(!response.ok){if(response.status===401&&path!=='/auth/me')changed();const payload=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as ErrorPayload:{error:'The server returned an invalid response'};throw new ApiError(response.status,payload);}return raw as T;
}
export async function login(email:string,password:string){const result=await apiRequest<AuthResult>('/auth/login',{method:'POST',body:JSON.stringify({email,password})});changed();return result;}
export async function signup(name:string,email:string,password:string){const result=await apiRequest<AuthResult>('/auth/signup',{method:'POST',body:JSON.stringify({name,email,password})});changed();return result;}
export async function logout(){const result=await apiRequest('/auth/logout',{method:'POST'});changed();return result;}
export async function getCurrentUser():Promise<User|null>{try{return(await apiRequest<{user:User}>('/auth/me')).user;}catch(error){if(error instanceof ApiError&&error.status===401)return null;throw error;}}
