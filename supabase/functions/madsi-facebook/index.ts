import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PUBLIC_KEY = Deno.env.get("SUPABASE_ANON_KEY") || (() => {
  try { return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default || ""; } catch { return ""; }
})();
const SITE = (Deno.env.get("MADSI_APP_URL") || "https://www.madmadisonai.com").replace(/\/+$/, "");
const META_APP_ID = Deno.env.get("META_APP_ID") || "";
const META_APP_SECRET = Deno.env.get("META_APP_SECRET") || "";
const PAGE_ID = Deno.env.get("META_FACEBOOK_PAGE_ID") || "";
const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "";
const ENCRYPTION_KEY = Deno.env.get("MADSI_FACEBOOK_TOKEN_ENCRYPTION_KEY") || "";
const VERSION = /^v\d+\.\d+$/.test(Deno.env.get("META_GRAPH_API_VERSION") || "") ? Deno.env.get("META_GRAPH_API_VERSION")! : "v27.0";
const SCOPES = ["pages_show_list", "pages_read_engagement", "pages_read_user_content", "pages_manage_posts", "read_insights"];
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const graphRoot = () => "https://graph.facebook.com/" + VERSION;
const ready = () => Boolean(SUPABASE_URL && SERVICE_KEY && PUBLIC_KEY && META_APP_ID && META_APP_SECRET && ENCRYPTION_KEY);
const callbackUrl = () => SITE + "/api/facebook/callback";
const randomHex = (n = 32) => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (v: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)))].map(x => x.toString(16).padStart(2, "0")).join("");
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (v: string) => Uint8Array.from(atob(v), c => c.charCodeAt(0));
async function cryptoKey() {
  const raw = unb64(ENCRYPTION_KEY);
  if (raw.byteLength !== 32) throw new Error("ENCRYPTION_KEY_INVALID");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function encrypt(v: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(), new TextEncoder().encode(v));
  return b64(iv) + "." + b64(new Uint8Array(data));
}
async function decrypt(v: string) {
  const [iv, data] = v.split(".");
  if (!iv || !data) throw new Error("TOKEN_DECRYPT_FAILED");
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await cryptoKey(), unb64(data)));
}
async function db(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", SERVICE_KEY);
  headers.set("Authorization", "Bearer " + SERVICE_KEY);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(SUPABASE_URL + "/rest/v1/" + path, { ...init, headers, cache: "no-store", signal: init.signal || AbortSignal.timeout(12000) });
  const raw = await response.text();
  let data: any = null;
  if (raw) { try { data = JSON.parse(raw); } catch { data = null; } }
  if (!response.ok) throw new Error("DATABASE_REQUEST_FAILED");
  return data;
}
async function requireOwner(req: Request) {
  const token = (req.headers.get("authorization") || "").match(/^Bearer\s+([A-Za-z0-9._~-]+)$/)?.[1];
  if (!token) throw new Error("AUTH_REQUIRED");
  const response = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: PUBLIC_KEY, Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("AUTH_REQUIRED");
  const user = await response.json() as { id?: string };
  if (!user.id) throw new Error("AUTH_REQUIRED");
  const profiles = await db("profiles?id=eq." + encodeURIComponent(user.id) + "&select=role&limit=1");
  if (!["OWNER", "ADMIN"].includes(Array.isArray(profiles) ? profiles[0]?.role || "" : "")) throw new Error("OWNER_REQUIRED");
  return user.id;
}
function cookie(req: Request, name: string) {
  const entry = (req.headers.get("cookie") || "").split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return entry ? entry.slice(name.length + 1) : "";
}
function redirect(result: string) {
  const url = new URL("/settings/integrations/facebook", SITE);
  url.searchParams.set("facebook", result);
  return new Response(null, { status: 303, headers: { Location: url.toString(), "Cache-Control": "no-store", "Set-Cookie": "madsi_fb_oauth_state=; Path=/api/facebook/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0" } });
}
async function graph(path: string, params: Record<string, string>, method: "GET" | "POST" = "GET") {
  const url = new URL(graphRoot() + path);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) method === "GET" ? url.searchParams.set(k, v) : body.set(k, v);
  const response = await fetch(url, { method, ...(method === "POST" ? { headers: { "Content-Type": "application/x-www-form-urlencoded" }, body } : {}), cache: "no-store", signal: AbortSignal.timeout(20000) });
  const payload = await response.json().catch(() => null) as any;
  if (!response.ok || payload?.error) throw new Error(payload?.error?.code === 190 ? "FACEBOOK_TOKEN_INVALID" : "FACEBOOK_API_FAILED");
  return payload || {};
}
async function callback(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.has("error")) return redirect("authorization_cancelled");
  const state = url.searchParams.get("state") || "", code = url.searchParams.get("code") || "";
  if (!/^[a-f0-9]{64}$/.test(state) || !code || cookie(req, "madsi_fb_oauth_state") !== state) return redirect("invalid_authorization");
  if (!ready()) return redirect("setup_required");
  try {
    const stateHash = await sha256(state);
    const found = await db("madsi_facebook_oauth_states?state_hash=eq." + stateHash + "&select=owner_user_id,expires_at&limit=1");
    const pending = Array.isArray(found) ? found[0] : null;
    if (!pending || Date.parse(pending.expires_at) <= Date.now()) return redirect("expired");
    const deleted = await db("madsi_facebook_oauth_states?state_hash=eq." + stateHash, { method: "DELETE", headers: { Prefer: "return=representation" } });
    if (!Array.isArray(deleted) || deleted.length !== 1) return redirect("expired");
    const exchange = new URL(graphRoot() + "/oauth/access_token");
    exchange.searchParams.set("client_id", META_APP_ID); exchange.searchParams.set("client_secret", META_APP_SECRET);
    exchange.searchParams.set("redirect_uri", callbackUrl()); exchange.searchParams.set("code", code);
    const shortRes = await fetch(exchange, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const shortToken = await shortRes.json() as any;
    if (!shortRes.ok || !shortToken.access_token) return redirect("token_exchange_failed");
    const longUrl = new URL(graphRoot() + "/oauth/access_token");
    longUrl.searchParams.set("grant_type", "fb_exchange_token"); longUrl.searchParams.set("client_id", META_APP_ID);
    longUrl.searchParams.set("client_secret", META_APP_SECRET); longUrl.searchParams.set("fb_exchange_token", shortToken.access_token);
    const longRes = await fetch(longUrl, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const longToken = await longRes.json() as any;
    if (!longRes.ok || !longToken.access_token) return redirect("token_exchange_failed");
    const permissions = await graph("/me/permissions", { access_token: longToken.access_token });
    const granted = (Array.isArray(permissions.data) ? permissions.data : []).filter((x: any) => x.status === "granted").map((x: any) => String(x.permission));
    if (SCOPES.some(s => !granted.includes(s))) return redirect("permissions_missing");
    const pageResult = await graph("/me/accounts", { fields: "id,name,access_token,tasks", limit: "100", access_token: longToken.access_token });
    const pages = (Array.isArray(pageResult.data) ? pageResult.data : []) as any[];
    const eligible = pages.filter(p => p.id && p.access_token && Array.isArray(p.tasks) && (p.tasks.includes("CREATE_CONTENT") || p.tasks.includes("MANAGE")) && p.tasks.includes("ANALYZE"));
    const selected = PAGE_ID ? eligible.find(p => p.id === PAGE_ID) : eligible.length === 1 ? eligible[0] : null;
    if (!selected) return redirect(eligible.length > 1 ? "page_selection_required" : "target_page_not_available");
    const expiry = Number(longToken.expires_in) > 0 ? new Date(Date.now() + Number(longToken.expires_in) * 1000).toISOString() : null;
    await db("madsi_facebook_connections?on_conflict=owner_user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({
      owner_user_id: pending.owner_user_id, page_id: selected.id, page_name: selected.name, page_access_token_ciphertext: await encrypt(selected.access_token),
      granted_scopes: granted, page_tasks: selected.tasks || [], status: "connected", token_expires_at: expiry, last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }) });
    return redirect("connected");
  } catch { return redirect("connection_failed"); }
}
async function getConnection(ownerId: string) {
  const rows = await db("madsi_facebook_connections?owner_user_id=eq." + encodeURIComponent(ownerId) + "&status=eq.connected&select=page_id,page_name,page_access_token_ciphertext,granted_scopes,page_tasks,status,token_expires_at,last_verified_at&limit=1");
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error("FACEBOOK_NOT_CONNECTED");
  if (row.token_expires_at && Date.parse(row.token_expires_at) < Date.now()) throw new Error("FACEBOOK_TOKEN_EXPIRED");
  return { ...row, token: await decrypt(row.page_access_token_ciphertext) };
}
async function status(ownerId: string) {
  const rows = await db("madsi_facebook_connections?owner_user_id=eq." + encodeURIComponent(ownerId) + "&select=page_id,page_name,granted_scopes,page_tasks,status,token_expires_at,last_verified_at&limit=1");
  const row = Array.isArray(rows) ? rows[0] : null, valid = !row?.token_expires_at || Date.parse(row.token_expires_at) > Date.now();
  const connected = row?.status === "connected" && valid;
  return json({ connected, connection: row ? { ...row, status: connected ? "connected" : "expired" } : null });
}
async function posts(ownerId: string) {
  const saved = await getConnection(ownerId);
  const data = await graph("/" + encodeURIComponent(saved.page_id) + "/feed", { fields: "id,message,created_time,permalink_url,is_published", limit: "25", access_token: saved.token });
  return json({ posts: Array.isArray(data.data) ? data.data : [] });
}
async function insights(ownerId: string) {
  const saved = await getConnection(ownerId);
  const data = await graph("/" + encodeURIComponent(saved.page_id) + "/insights", { metric: "page_impressions,page_post_engagements,page_follows", period: "day", since: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), until: new Date().toISOString().slice(0, 10), access_token: saved.token });
  return json({ insights: Array.isArray(data.data) ? data.data : [] });
}
async function approval(req: Request, ownerId: string) {
  const body = await req.json().catch(() => null) as any, message = typeof body?.message === "string" ? body.message.trim() : "";
  if (body?.confirm !== true || !message || message.length > 5000) return json({ error: "Confirm the exact post text before creating a one-time publishing approval." }, 400);
  await getConnection(ownerId);
  const expires = new Date(Date.now() + 600000).toISOString();
  const rows = await db("madsi_facebook_publish_approvals", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ owner_user_id: ownerId, message, status: "approved", expires_at: expires }) });
  const item = Array.isArray(rows) ? rows[0] : null;
  return item?.id ? json({ approval_id: item.id, expires_at: expires }, 201) : json({ error: "MADSI could not save the publishing approval." }, 503);
}
async function publish(req: Request, ownerId: string) {
  const body = await req.json().catch(() => null) as any, id = typeof body?.approval_id === "string" ? body.approval_id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "A valid publishing approval is required." }, 400);
  const saved = await getConnection(ownerId), filter = "?id=eq." + encodeURIComponent(id) + "&owner_user_id=eq." + encodeURIComponent(ownerId) + "&status=eq.approved&expires_at=gt." + encodeURIComponent(new Date().toISOString()) + "&consumed_at=is.null";
  const rows = await db("madsi_facebook_publish_approvals" + filter + "&select=id,message&limit=1"), item = Array.isArray(rows) ? rows[0] : null;
  if (!item) return json({ error: "That publishing approval is expired or already used. Review the post and approve it again." }, 409);
  const consumed = await db("madsi_facebook_publish_approvals" + filter, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "consumed", consumed_at: new Date().toISOString() }) });
  if (!Array.isArray(consumed) || consumed.length !== 1) return json({ error: "That approval has already been used." }, 409);
  const result = await graph("/" + encodeURIComponent(saved.page_id) + "/feed", { message: item.message, access_token: saved.token }, "POST");
  return result.id ? json({ published: true, post_id: String(result.id) }, 201) : json({ error: "Facebook did not confirm that the post was published." }, 502);
}
async function webhook(req: Request) {
  if (req.method === "GET") {
    const u = new URL(req.url);
    if (!VERIFY_TOKEN) return new Response("Webhook verification is not configured", { status: 503 });
    return u.searchParams.get("hub.mode") === "subscribe" && u.searchParams.get("hub.verify_token") === VERIFY_TOKEN && u.searchParams.get("hub.challenge")
      ? new Response(u.searchParams.get("hub.challenge"), { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } })
      : new Response("Forbidden", { status: 403 });
  }
  const signature = req.headers.get("x-hub-signature-256") || "";
  if (!META_APP_SECRET || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return json({ error: "Invalid webhook signature." }, 401);
  const raw = await req.arrayBuffer();
  if (raw.byteLength > 1000000) return json({ error: "Webhook payload too large." }, 413);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(META_APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, raw));
  const expected = "sha256=" + [...digest].map(x => x.toString(16).padStart(2, "0")).join("");
  let diff = expected.length ^ signature.length;
  for (let i = 0; i < Math.min(expected.length, signature.length); i++) diff |= expected.charCodeAt(i) ^ signature.toLowerCase().charCodeAt(i);
  return diff === 0 ? json({ received: true }) : json({ error: "Invalid webhook signature." }, 401);
}
function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, [string, number]> = {
    AUTH_REQUIRED: ["Sign in to MADSI again.", 401], OWNER_REQUIRED: ["Owner access is required for Facebook Page management.", 403],
    FACEBOOK_NOT_CONNECTED: ["Connect your Facebook Page first.", 409], FACEBOOK_TOKEN_EXPIRED: ["Facebook authorization expired or was revoked. Reconnect the Page.", 409],
    FACEBOOK_TOKEN_INVALID: ["Facebook authorization expired or was revoked. Reconnect the Page.", 409], ENCRYPTION_KEY_INVALID: ["Facebook token encryption is not configured correctly.", 503]
  };
  const [message, status] = messages[code] || ["MADSI could not complete the Facebook request. Check the connection and try again.", 503];
  return json({ error: message }, status);
}
Deno.serve(async (req: Request) => {
  const url = new URL(req.url), action = url.pathname.split("/").filter(Boolean).at(-1) || "";
  const origin = req.headers.get("origin");
  if (origin && ![SITE, "https://madmadisonai.com"].includes(origin)) return json({ error: "Origin not allowed." }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": origin || SITE, "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Vary": "Origin" } });
  if (action === "webhooks") return webhook(req);
  if (action === "callback" && req.method === "GET") return callback(req);
  if (!["GET", "POST"].includes(req.method)) return json({ error: "Method not allowed." }, 405);
  if (!ready()) return json({ error: "Facebook integration is not configured in Supabase yet.", code: "FACEBOOK_SETUP_REQUIRED" }, 503);
  if (req.method === "POST" && origin && origin !== new URL(req.url).origin && ![SITE, "https://madmadisonai.com"].includes(origin)) return json({ error: "Cross-site requests are not allowed." }, 403);
  if (Number(req.headers.get("content-length") || 0) > 12000) return json({ error: "Request body too large." }, 413);
  try {
    const ownerId = await requireOwner(req);
    if (action === "connect" && req.method === "POST") {
      const state = randomHex();
      await db("madsi_facebook_oauth_states", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ state_hash: await sha256(state), owner_user_id: ownerId, expires_at: new Date(Date.now() + 600000).toISOString() }) });
      const auth = new URL("https://www.facebook.com/" + VERSION + "/dialog/oauth");
      auth.searchParams.set("client_id", META_APP_ID); auth.searchParams.set("redirect_uri", callbackUrl()); auth.searchParams.set("response_type", "code");
      auth.searchParams.set("state", state); auth.searchParams.set("scope", SCOPES.join(",")); auth.searchParams.set("auth_type", "rerequest");
      const response = json({ authorization_url: auth.toString() });
      response.headers.append("Set-Cookie", "madsi_fb_oauth_state=" + state + "; Path=/api/facebook/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600");
      return response;
    }
    if (action === "status" && req.method === "GET") return await status(ownerId);
    if (action === "posts" && req.method === "GET") return await posts(ownerId);
    if (action === "insights" && req.method === "GET") return await insights(ownerId);
    if (action === "approval" && req.method === "POST") return await approval(req, ownerId);
    if (action === "posts" && req.method === "POST") return await publish(req, ownerId);
    return json({ error: "Not found." }, 404);
  } catch (error) { return failure(error); }
});
