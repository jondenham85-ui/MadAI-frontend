import {NextRequest,NextResponse} from 'next/server';
import {authContext} from '@/lib/supabase/http';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
  let auth:ReturnType<typeof authContext>|undefined;
  try{auth=authContext(request);const code=request.nextUrl.searchParams.get('code');if(code){const{error}=await auth.client.auth.exchangeCodeForSession(code);if(!error){const response=NextResponse.redirect(new URL('/',request.url));response.headers.set('Referrer-Policy','no-referrer');return auth.finish(response);}}}catch{}
  const response=NextResponse.redirect(new URL('/login?auth_error=confirmation_failed',request.url));response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');return auth?auth.finish(response):response;
}
