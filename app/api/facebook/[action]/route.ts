export const runtime = "edge";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ action: string }> };

const json = (body: unknown, status = 500) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

function configuration() {
  const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "";
  return { url, key };
}

/**
 * Facebook OAuth, Page tokens and publishing now execute in Supabase Edge
 * Functions. The Next.js route remains a same-origin proxy so the browser
 * keeps the existing /api/facebook/* URLs and OAuth state cookie.
 */
async function proxy(request: Request, action: string) {
  const { url, key } = configuration();
  if (!url || !key) return json({ error: "MADSI Supabase connection is not configured.", code: "SUPABASE_SETUP_REQUIRED" }, 503);

  const incoming = new URL(request.url);
  const target = url + "/functions/v1/madsi-facebook/" + encodeURIComponent(action) + incoming.search;
  const headers = new Headers();
  headers.set("apikey", key);
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  const contentType = request.headers.get("content-type");
  if (authorization) headers.set("authorization", authorization);
  if (cookie) headers.set("cookie", cookie);
  if (contentType) headers.set("content-type", contentType);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(25000),
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (Number(request.headers.get("content-length") || 0) > 12000) {
      return json({ error: "Request body too large." }, 413);
    }
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const responseHeaders = new Headers();
    for (const name of ["content-type", "cache-control", "location", "set-cookie", "x-content-type-options"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("Cache-Control", "no-store");
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return json({ error: "MADSI Facebook service is temporarily unavailable.", code: "FACEBOOK_SERVICE_UNAVAILABLE" }, 503);
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { action } = await context.params;
  return proxy(request, action);
}

export async function POST(request: Request, context: RouteContext) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return json({ error: "Cross-site requests are not allowed." }, 403);
      }
    } catch {
      return json({ error: "Invalid request origin." }, 403);
    }
  }
  const { action } = await context.params;
  return proxy(request, action);
}
