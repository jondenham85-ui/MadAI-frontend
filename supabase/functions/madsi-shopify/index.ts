import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHOPIFY_KEY = Deno.env.get("SHOPIFY_API_KEY") || "";
const SHOPIFY_SECRET = Deno.env.get("SHOPIFY_API_SECRET") || "";
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const SITE = "https://www.madmadisonai.com";
const CALLBACK = SUPABASE_URL + "/functions/v1/madsi-shopify/callback";
const API_VERSION = "2026-10";
const DEFAULT_SHOP = "uunwqe-eu.myshopify.com";
const SCOPES = ["read_products", "write_products", "read_inventory", "read_orders", "read_locations"];

const headers = (origin: string | null) => ({
  "content-type": "application/json",
  "cache-control": "no-store",
  "access-control-allow-origin": origin && [SITE, "https://madmadisonai.com"].includes(origin) ? origin : SITE,
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "vary": "Origin",
});
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(req.headers.get("origin")) });
const redirect = (url: string) => new Response(null, { status: 302, headers: { location: url, "cache-control": "no-store" } });
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
};
const randomHex = (bytes = 32) => [...crypto.getRandomValues(new Uint8Array(bytes))].map(x => x.toString(16).padStart(2, "0")).join("");
function safeShop(value: string) {
  const shop = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) throw new Error("SHOP");
  return shop;
}
async function requireOwner(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("AUTH");
  const { data, error } = await db.auth.getUser(auth.slice(7));
  if (error || !data.user) throw new Error("AUTH");
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profileError || !["OWNER", "ADMIN"].includes(profile?.role || "")) throw new Error("OWNER");
  return data.user.id;
}
async function validHmac(params: URLSearchParams) {
  if (!SHOPIFY_SECRET) return false;
  const hmac = params.get("hmac") || "";
  if (!/^[a-f0-9]{64}$/i.test(hmac)) return false;
  const message = [...params.entries()].filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SHOPIFY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
  const actual = [...signature].map(x => x.toString(16).padStart(2, "0")).join("");
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= actual.charCodeAt(i) ^ hmac.toLowerCase().charCodeAt(i);
  return diff === 0;
}
async function shopifyGraphql(shop: string, token: string, query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-shopify-access-token": token },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.errors?.length) throw new Error("SHOPIFY_API");
  return payload?.data;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(req.headers.get("origin")) });
  const url = new URL(req.url);
  try {
    if (url.pathname.endsWith("/callback") && req.method === "GET") {
      if (!SHOPIFY_KEY || !SHOPIFY_SECRET) return redirect(SITE + "/business?shopify=setup_required");
      const params = url.searchParams;
      const shop = safeShop(params.get("shop") || "");
      const state = params.get("state") || "";
      const code = params.get("code") || "";
      if (!await validHmac(params)) return redirect(SITE + "/business?shopify=invalid_hmac");
      if (!/^[a-f0-9]{64}$/i.test(state) || !/^[a-f0-9]+$/i.test(code)) return redirect(SITE + "/business?shopify=invalid_state");
      const { data: pending } = await db.from("madsi_shopify_oauth_states").select("state_hash,owner_user_id,expires_at").eq("state_hash", await sha256(state)).maybeSingle();
      if (!pending || Date.parse(pending.expires_at) < Date.now()) return redirect(SITE + "/business?shopify=expired");
      const { data: claimed } = await db.from("madsi_shopify_oauth_states").delete().eq("state_hash", await sha256(state)).select("state_hash").maybeSingle();
      if (!claimed) return redirect(SITE + "/business?shopify=expired");
      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ client_id: SHOPIFY_KEY, client_secret: SHOPIFY_SECRET, code }), cache: "no-store",
      });
      const tokenPayload = await tokenResponse.json().catch(() => null);
      if (!tokenResponse.ok || typeof tokenPayload?.access_token !== "string") return redirect(SITE + "/business?shopify=exchange_failed");
      const granted = String(tokenPayload.scope || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      if (SCOPES.some(scope => !granted.includes(scope))) return redirect(SITE + "/business?shopify=missing_scopes");
      const shopData = await shopifyGraphql(shop, tokenPayload.access_token, `query { shop { name myshopifyDomain } }`);
      if (shopData?.shop?.myshopifyDomain !== shop) return redirect(SITE + "/business?shopify=shop_mismatch");
      const { error } = await db.from("madsi_shopify_connections").upsert({
        owner_user_id: pending.owner_user_id, shop_domain: shop, shop_name: shopData.shop.name,
        access_token: tokenPayload.access_token, granted_scopes: granted, api_version: API_VERSION,
        status: "connected", last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: "shop_domain" });
      if (error) return redirect(SITE + "/business?shopify=save_failed");
      return redirect(SITE + "/business?shopify=connected");
    }
    if (req.method !== "GET" && req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
    const ownerId = await requireOwner(req);
    if (url.pathname.endsWith("/connect") && req.method === "POST") {
      if (!SHOPIFY_KEY || !SHOPIFY_SECRET) return json(req, { error: "Shopify app credentials have not been configured in Supabase secrets yet.", code: "SHOPIFY_SETUP_REQUIRED" }, 503);
      const body = await req.json().catch(() => ({}));
      const shop = safeShop(typeof body.shop === "string" ? body.shop : DEFAULT_SHOP);
      const state = randomHex();
      const { error } = await db.from("madsi_shopify_oauth_states").insert({ state_hash: await sha256(state), owner_user_id: ownerId, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
      if (error) return json(req, { error: "Could not start secure Shopify authorization." }, 503);
      const authorize = new URL(`https://${shop}/admin/oauth/authorize`);
      authorize.searchParams.set("client_id", SHOPIFY_KEY);
      authorize.searchParams.set("scope", SCOPES.join(","));
      authorize.searchParams.set("redirect_uri", CALLBACK);
      authorize.searchParams.set("state", state);
      return json(req, { authorization_url: authorize.toString(), shop });
    }
    if (url.pathname.endsWith("/status") && req.method === "GET") {
      const { data, error } = await db.from("madsi_shopify_connections").select("shop_domain,shop_name,granted_scopes,status,last_verified_at").eq("owner_user_id", ownerId).maybeSingle();
      if (error) return json(req, { error: "Connection status unavailable." }, 503);
      return json(req, { connected: data?.status === "connected", connection: data || null });
    }
    if (url.pathname.endsWith("/products") && req.method === "GET") {
      const { data: connection } = await db.from("madsi_shopify_connections").select("shop_domain,access_token").eq("owner_user_id", ownerId).eq("status", "connected").maybeSingle();
      if (!connection) return json(req, { error: "Connect MAD Warehouse first." }, 409);
      const data = await shopifyGraphql(connection.shop_domain, connection.access_token, `query { products(first: 50, sortKey: UPDATED_AT, reverse: true) { nodes { id title handle status vendor totalInventory featuredImage { url altText } variants(first: 10) { nodes { id title price inventoryQuantity } } } } } `);
      return json(req, { products: data?.products?.nodes || [] });
    }
    if (url.pathname.endsWith("/products") && req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body || typeof body.title !== "string" || !body.title.trim()) {
        return json(req, { error: "A product title is required." }, 400);
      }
      const title = body.title.trim().slice(0, 255);
      const descriptionHtml = typeof body.descriptionHtml === "string" ? body.descriptionHtml.slice(0, 10000) : "";
      const vendor = typeof body.vendor === "string" ? body.vendor.trim().slice(0, 255) : "";
      const productType = typeof body.productType === "string" ? body.productType.trim().slice(0, 255) : "";
      const tags = Array.isArray(body.tags)
        ? body.tags.filter((tag: unknown): tag is string => typeof tag === "string").map((tag: string) => tag.trim()).filter(Boolean).slice(0, 20)
        : [];
      const { data: connection, error: connectionError } = await db.from("madsi_shopify_connections")
        .select("shop_domain,access_token,granted_scopes").eq("owner_user_id", ownerId).eq("status", "connected").maybeSingle();
      if (connectionError || !connection) return json(req, { error: "Connect MAD Warehouse first." }, 409);
      if (!Array.isArray(connection.granted_scopes) || !connection.granted_scopes.includes("write_products")) {
        return json(req, { error: "MADSI needs Shopify write_products permission. Update the existing MADSi app's scopes and reauthorize it once.", code: "SHOPIFY_WRITE_SCOPE_REQUIRED" }, 403);
      }
      const mutation = `mutation CreateMadsiDraft($input: ProductCreateInput!) {
        productCreate(product: $input) {
          product { id title status }
          userErrors { field message }
        }
      }`;
      const result = await shopifyGraphql(connection.shop_domain, connection.access_token, mutation, {
        input: { title, descriptionHtml, vendor, productType, tags, status: "DRAFT" }
      });
      const created = result?.productCreate;
      if (created?.userErrors?.length) {
        return json(req, { error: "Shopify rejected the draft product.", details: created.userErrors }, 422);
      }
      if (!created?.product?.id || created.product.status !== "DRAFT") {
        return json(req, { error: "Shopify did not confirm creation of an unpublished draft." }, 502);
      }
      return json(req, { created: true, product: created.product, published: false }, 201);
    }
    if (url.pathname.endsWith("/orders") && req.method === "GET") {
      const { data: connection } = await db.from("madsi_shopify_connections").select("shop_domain,access_token").eq("owner_user_id", ownerId).eq("status", "connected").maybeSingle();
      if (!connection) return json(req, { error: "Connect MAD Warehouse first." }, 409);
      const data = await shopifyGraphql(connection.shop_domain, connection.access_token, `query { orders(first: 25, sortKey: CREATED_AT, reverse: true) { nodes { id name createdAt displayFinancialStatus displayFulfillmentStatus totalPriceSet { shopMoney { amount currencyCode } } } } }`);
      return json(req, { orders: data?.orders?.nodes || [] });
    }
    return json(req, { error: "Not found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTH" ? 401 : message === "OWNER" ? 403 : message === "SHOP" ? 400 : 500;
    return json(req, { error: message === "AUTH" ? "Sign in required." : message === "OWNER" ? "Owner access required." : message === "SHOP" ? "Invalid Shopify shop domain." : "Shopify request could not be completed." }, status);
  }
});