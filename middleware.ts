import {NextRequest,NextResponse} from 'next/server';
import {authContext} from '@/lib/supabase/http';
export async function middleware(request:NextRequest){
  let auth:ReturnType<typeof authContext>|undefined;
  try{
    auth=authContext(request);const{data,error}=await auth.client.auth.getUser();
    if(error?.status&&error.status>=500)return auth.finish(NextResponse.json({error:'Authentication unavailable'},{status:503}));
    if(error||!data.user)return auth.finish(NextResponse.redirect(new URL('/login',request.url)));
    if(request.nextUrl.pathname==='/admin'||request.nextUrl.pathname.startsWith('/admin/')){
      const profile=await auth.client.from('profiles').select('role').eq('id',data.user.id).maybeSingle();
      if(profile.error)return auth.finish(NextResponse.json({error:'Authorization unavailable'},{status:503}));
      if(profile.data?.role!=='OWNER')return auth.finish(NextResponse.redirect(new URL('/',request.url)));
    }
    return auth.finish(NextResponse.next({request}));
  }catch{const response=NextResponse.json({error:'Authentication temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return auth?auth.finish(response):response;}
}
export const config={matcher:['/admin/:path*','/analytics/:path*','/revenue/:path*','/system/:path*','/operations/:path*','/memory/:path*','/shopmad/:path*','/synth/:path*','/voice/:path*']};
