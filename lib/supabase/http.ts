import {createServerClient} from '@supabase/ssr';
import {NextRequest,NextResponse} from 'next/server';
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export function authContext(request:NextRequest){
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new HttpError(503,'Supabase integration is not configured');
  const updates:Array<(response:NextResponse)=>void>=[],headers=new Headers();
  const client=createServerClient(url,key,{cookieOptions:{httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'lax',path:'/'},cookies:{getAll:()=>request.cookies.getAll(),setAll(cookies,cacheHeaders){
    cookies.forEach(cookie=>{request.cookies.set(cookie.name,cookie.value);updates.push(response=>{response.cookies.set(cookie.name,cookie.value,{...cookie.options,httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'lax',path:'/'});});});
    Object.entries(cacheHeaders??{}).forEach(([name,value])=>headers.set(name,value));
  }}});
  function finish(response:NextResponse){updates.forEach(apply=>apply(response));headers.forEach((value,name)=>response.headers.set(name,value));response.headers.set('Cache-Control','private, no-store, max-age=0');response.headers.set('Pragma','no-cache');response.headers.set('X-Content-Type-Options','nosniff');return response;}
  return{client,finish,url,key};
}
export function requireOrigin(request:NextRequest){if(request.headers.get('origin')!==request.nextUrl.origin||request.headers.get('sec-fetch-site')==='cross-site')throw new HttpError(403,'Same-origin request required');}
export async function readJson(request:NextRequest){
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new HttpError(415,'JSON required');
  const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'JSON required');
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>131072){await reader.cancel();throw new HttpError(413,'Request too large');}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let data:unknown;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'Invalid JSON');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new HttpError(400,'JSON object required');return data as Record<string,unknown>;
}
export async function currentUser(client:ReturnType<typeof authContext>['client']){
  const{data,error}=await client.auth.getUser();if(error||!data.user)throw new HttpError(error?.status&&error.status>=500?503:401,error?.status&&error.status>=500?'Authentication unavailable':'Authentication required');
  const profile=await client.from('profiles').select('id,name,email,role,plan,created_at,updated_at').eq('id',data.user.id).maybeSingle();
  if(profile.error)throw new HttpError(503,'Profile lookup unavailable');if(!profile.data)throw new HttpError(403,'Account profile is not ready');const p=profile.data;
  return{id:p.id as string,name:p.name as string,email:p.email as string,role:p.role as string,plan:p.plan as string,createdAt:p.created_at as string,updatedAt:p.updated_at as string};
}
export function failure(error:unknown){return NextResponse.json({error:error instanceof HttpError?error.message:'Request temporarily unavailable'},{status:error instanceof HttpError?error.status:503,headers:{'Cache-Control':'private, no-store','Pragma':'no-cache'}});}
