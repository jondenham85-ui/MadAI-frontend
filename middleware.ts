import { NextResponse, type NextRequest } from 'next/server';
import { hasSessionCookie } from '@/lib/supabase-proxy.mjs';

export function middleware(request: NextRequest) {
  // Cookie presence gates page navigation only. Every API verifies the
  // Supabase access token and permissions independently.
  if (!hasSessionCookie(request.headers.get('Cookie'))) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/analytics/:path*',
    '/revenue/:path*',
    '/system/:path*',
    '/operations/:path*',
    '/memory/:path*',
    '/shopmad/:path*',
    '/synth/:path*',
    '/agents/:path*',
  ],
};
