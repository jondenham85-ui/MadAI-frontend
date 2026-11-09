import {NextRequest,NextResponse} from 'next/server';
import {authContext,currentUser,failure,HttpError,readJson,requireOrigin} from '@/lib/supabase/http';
import {edgeUrl} from '@/lib/supabase-routing';
export const dynamic='force-dynamic';export const runtime='nodejs';
type Context={params:Promise<{path:string[]}>};
async function handle(request:NextRequest,context:Context){
  let auth:ReturnType<typeof authContext>|undefined;
  try{
    const{path}=await context.params;if(path[0]!=='api')throw new HttpError(404,'Route not found');
    const route='/'+path.slice(1).join('/');
    if(!['GET','HEAD','OPTIONS'].includes(request.method))requireOrigin(request);
    auth=authContext(request);const{client,finish}=auth;
    if(route==='/auth/me'&&request.method==='GET')return finish(NextResponse.json({success:true,user:await currentUser(client)}));
    if(route==='/auth/logout'&&request.method==='POST'){
      const{error}=await client.auth.signOut({scope:'local'});if(error)throw new HttpError(503,'Sign out could not be completed; try again');
      const response=NextResponse.json({success:true});response.cookies.set('madsi_session','',{maxAge:0,path:'/'});return finish(response);
    }
    if((route==='/auth/login'||route==='/auth/signup')&&request.method==='POST'){
      const input=await readJson(request),isSignup=route==='/auth/signup',allowed=isSignup?['name','email','password']:['email','password'];
      if(Object.keys(input).some(k=>!allowed.includes(k)))throw new HttpError(400,'Unexpected authentication field');
      if(typeof input.email!=='string'||typeof input.password!=='string')throw new HttpError(400,'Email and password are required');
      const email=input.email.trim().toLowerCase(),password=input.password;
      if(email.length>254||!/^\S+@\S+\.\S+$/.test(email)||password.length<(isSignup?8:1)||new TextEncoder().encode(password).length>72)throw new HttpError(400,'Enter a valid email and password; new passwords require at least 8 characters and at most 72 UTF-8 bytes');
      if(isSignup&&(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>120))throw new HttpError(400,'Name must contain 1 to 120 characters');
      const result=isSignup?await client.auth.signUp({email,password,options:{data:{name:(input.name as string).trim()},emailRedirectTo:request.nextUrl.origin+'/auth/callback'}}):await client.auth.signInWithPassword({email,password});
      if(result.error)throw new HttpError(result.error.status===429?429:400,result.error.status===429?'Too many attempts. Please wait.':result.error.code==='email_not_confirmed'?'Confirm your email before signing in.':isSignup?'Registration could not be completed. Check your details and try again.':'Invalid email or password');
      if(isSignup&&!result.data.session)return finish(NextResponse.json({success:true,user:null,confirmationRequired:true,message:'Check your email to confirm your account, then sign in.'},{status:202}));
      const response=NextResponse.json({success:true,user:await currentUser(client),confirmationRequired:false});response.cookies.set('madsi_session','',{maxAge:0,path:'/'});return finish(response);
    }
    if(route.startsWith('/auth/'))throw new HttpError(404,'Authentication route not found');
    const headers:Record<string,string>={apikey:auth.key};
    if(!(route==='/health'&&request.method==='GET')){
      // Only forward the raw token; the Edge handler independently verifies identity.
      const{data,error}=await client.auth.getSession();if(error||!data.session?.access_token)throw new HttpError(401,'Authentication required');headers.Authorization='Bearer '+data.session.access_token;
    }
    const contentType=request.headers.get('content-type');if(contentType)headers['Content-Type']=contentType;
    const init:RequestInit={method:request.method,cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(15000),headers};
    if(!['GET','HEAD'].includes(request.method)&&request.body)init.body=JSON.stringify(await readJson(request));
    let target:URL;try{target=edgeUrl(auth.url,path,request.nextUrl.search);}catch{throw new HttpError(400,'Invalid API path');}
    const upstream=await fetch(target,init);
    return finish(new NextResponse(upstream.body,{status:upstream.status,headers:{'Content-Type':upstream.headers.get('content-type')||'application/json'}}));
  }catch(error){const response=failure(error);return auth?auth.finish(response):response;}
}
export{handle as GET,handle as POST,handle as PATCH,handle as DELETE};
