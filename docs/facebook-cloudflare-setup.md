# MADSI Facebook Page integration

## Implemented source

- Owner-authenticated Meta OAuth start and callback.
- Short-lived user token exchange for a long-lived user token.
- Page discovery and encrypted Page-token storage.
- AES-GCM encryption of access tokens before storage in Supabase.
- Owner-only status, recent Page posts, and Page insights endpoints.
- A persisted, one-time publishing approval that must be explicitly created and consumed by an owner.
- Meta webhook verification and HMAC-SHA256 signature validation. Verified events are acknowledged only; they do not trigger business actions.

## Database migration

Apply supabase/migrations/20261128000100_madsi_facebook.sql to the existing MADSI Supabase project before enabling the integration. The tables have RLS enabled and no client-role grants. Only the server-side Supabase service-role credential can access them.

## Cloudflare Worker environment

Set the following variables on the Worker serving the MADSI Next.js app. Never put secrets in NEXT_PUBLIC variables, source code, GitHub, or browser code.

| Name | Type | Purpose |
| --- | --- | --- |
| SUPABASE_URL | Text | Existing Supabase project URL |
| SUPABASE_ANON_KEY | Secret or text | Existing Supabase publishable/anon key used to validate user sessions |
| SUPABASE_SERVICE_ROLE_KEY | Secret | Server-only database access |
| META_APP_ID | Text | Meta developer app ID |
| META_APP_SECRET | Secret | Meta developer app secret |
| META_FACEBOOK_PAGE_ID | Text | Exact Page ID to connect; recommended when the account manages multiple Pages |
| META_WEBHOOK_VERIFY_TOKEN | Secret | Random value entered in Meta Webhooks configuration |
| MADSI_FACEBOOK_TOKEN_ENCRYPTION_KEY | Secret | Base64 encoding of 32 cryptographically random bytes |
| META_GRAPH_API_VERSION | Text | v27.0 at the time this integration was authored |
| MADSI_APP_URL | Text | https://www.madmadisonai.com |

Generate the encryption key locally with openssl rand -base64 32. Keep the output private and store it only as a Worker secret. Never send it in chat or commit it.

For Vinext, declare these Worker bindings in cloudflare.config.ts using bindings.text() for non-secret configuration and bindings.secret() for secrets. If this code reads Worker variables through process.env, the Worker must enable Node.js compatibility and nodejs_compat_populate_process_env. The repository did not yet contain Vinext or Cloudflare worker configuration when this integration was authored.

## Meta app configuration

Add this exact OAuth redirect URI to the Meta app:

https://www.madmadisonai.com/api/facebook/callback

Requested permissions:

- pages_show_list
- pages_read_engagement
- pages_read_user_content
- pages_manage_posts
- read_insights

The person authorizing must have appropriate Page tasks, including CREATE_CONTENT or MANAGE for publishing and ANALYZE for insights. Meta may require App Review / Advanced Access before people outside the app's roles can use the integration.

For Webhooks, configure callback URL https://www.madmadisonai.com/api/facebook/webhooks, use the same META_WEBHOOK_VERIFY_TOKEN, and enable the Page fields needed by the product. Webhook requests are signature-checked but currently only acknowledged.

## API routes

- POST /api/facebook/connect
- GET /api/facebook/callback
- GET /api/facebook/status
- GET /api/facebook/posts
- GET /api/facebook/insights
- POST /api/facebook/approval
- POST /api/facebook/posts
- GET /api/facebook/webhooks
- POST /api/facebook/webhooks

All management endpoints require a valid Supabase bearer token and an OWNER or ADMIN profile. Publishing consumes a matching, unexpired approval record before sending the post to Meta, preventing an approval from being reused.

## Deployment and validation

This branch prepares source code only. Apply the SQL migration and configure secrets on a staging Worker before enabling the feature. The repository currently has no checked-in cloudflare.config.ts, Vinext dependency, or Cloudflare build scripts. The Facebook route uses Web APIs and the Edge runtime, but the overall Next.js-to-Vinext migration and a Cloudflare build still need to be completed and tested before deployment.
