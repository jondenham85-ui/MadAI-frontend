import { NextResponse, type NextRequest } from 'next/server';
export function middleware(request: NextRequest) { const token = request.cookies.get('madsi_session')?.value; if (!token) return NextResponse.redirect(new URL('/login', request.url)); return NextResponse.next(); }
export const config = { matcher: ['/admin/:path*', '/analytics/:path*', '/revenue/:path*', '/system/:path*', '/operations/:path*', '/memory/:path*', '/shopmad/:path*'] };
