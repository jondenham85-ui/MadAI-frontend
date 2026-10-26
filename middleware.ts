import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
  "/admin",
  "/analytics",
  "/revenue",
  "/system",
  "/operations",
  "/memory",
  "/shopmad",
];

export function middleware(
  request: NextRequest
) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute =
    protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(
      "madai_session"
    )?.value;

  if (!token) {
    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/analytics/:path*",
    "/revenue/:path*",
    "/system/:path*",
    "/operations/:path*",
    "/memory/:path*",
    "/shopmad/:path*",
  ],
};
