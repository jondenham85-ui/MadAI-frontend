const decodePart = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
};

const equalBytes = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

export async function validateShopifyIdToken(token, clientId, clientSecret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof token !== "string" || token.length > 12000 || !clientId || !clientSecret) {
    throw new Error("INVALID_SHOPIFY_SESSION");
  }
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("INVALID_SHOPIFY_SESSION");

  let header, claims;
  try {
    header = decodePart(parts[0]);
    claims = decodePart(parts[1]);
  } catch {
    throw new Error("INVALID_SHOPIFY_SESSION");
  }
  if (header?.alg !== "HS256" || typeof claims?.aud !== "string" ||
      claims.aud !== clientId || !Number.isFinite(claims.exp) ||
      !Number.isFinite(claims.nbf) || claims.exp <= nowSeconds ||
      claims.nbf > nowSeconds || !Number.isFinite(claims.iat) ||
      claims.iat > nowSeconds + 60 || typeof claims.sub !== "string" ||
      !claims.sub) {
    throw new Error("INVALID_SHOPIFY_SESSION");
  }

  let dest, issuer;
  try {
    dest = new URL(typeof claims.dest === "string" ? claims.dest : "");
    issuer = new URL(typeof claims.iss === "string" ? claims.iss : "");
  } catch {
    throw new Error("INVALID_SHOPIFY_SESSION");
  }
  const shop = dest.hostname.toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ||
      dest.protocol !== "https:" || issuer.protocol !== "https:" ||
      issuer.hostname.toLowerCase() !== shop ||
      !/^\/admin\/?$/.test(issuer.pathname) ||
      (dest.pathname !== "/" && dest.pathname !== "")) {
    throw new Error("INVALID_SHOPIFY_SESSION");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(clientSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signature = Uint8Array.from(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parts[2].length / 4) * 4, "=")), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(parts[0] + "." + parts[1]),
  );
  if (!valid) throw new Error("INVALID_SHOPIFY_SESSION");
  return { shop, subject: claims.sub };
}
