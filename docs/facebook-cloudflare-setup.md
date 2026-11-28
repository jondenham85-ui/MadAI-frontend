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

Apply `supabase/migrations/20261128000100_madsi_facebook.sql` to the existing MADSI Supabase project before enabling the integration. The tables have RLS enabled and no client-role grants. Only the server-side Supabase service-role credential can access them.

Do not apply this migration to production until it has been reviewed and staging-tested.

## Cost-conscious staging and validation

The default pre-deployment path is to use the disposable PostgreSQL service in
`.github/workflows/madsi-cloudflare-validation.yml`. It creates a fresh
PostgreSQL instance for each GitHub Actions run, applies the Facebook migration,
and verifies that two separate owners can connect the same Page ID. The
database is discarded with the job. This path does not create a paid Supabase
project and does not touch production.

The existing legacy PostgreSQL instance is a data source, not an approved staging
target. Its current free instance is temporary, and its network allowlist
currently blocks the hosted read-only inspection connection. Do not open its
network access or apply this migration there merely to avoid staging costs.
Only consider it for read-only legacy-data inspection if a secure, authorized
connection path becomes available.

Disposable PostgreSQL validates PostgreSQL DDL and the tested ownership
constraint. It does not emulate Supabase Auth, Storage, service-role behavior,
or live Meta OAuth. Those integration checks remain blocked until a separately
isolated Supabase staging environment and staging Meta/Cloudflare settings are
available. Do not use the production Supabase project as a substitute for
staging, and do not apply the migration to production as part of CI.

## Cloudflare Worker environment

Set these variables on the Worker serving the MADSI Next.js app. Never put secrets in `NEXT_PUBLIC_*` variables, source code, GitHub, or browser code.

| Name | Type | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Text | Existing Supabase project URL |
| `SUPABASE_ANON_KEY` | Text/secret | Existing Supabase publishable/anon key used to validate user sessions |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Server-only database access |
| `META_APP_ID` | Text | Meta developer app ID |
| `META_APP_SECRET` | Secret | Meta developer app secret |
| `META_FACEBOOK_PAGE_ID` | Text | Exact Page ID to connect; recommended when the account manages multiple Pages |
| `META_WEBHOOK_VERIFY_TOKEN` | Secret | Random value entered in Meta Webhooks configuration |
| `MADSI_FACEBOOK_TOKEN_ENCRYPTION_KEY` | Secret | Base64 encoding of 32 cryptographically random bytes |
| `META_GRAPH_API_VERSION` | Text | Graph API version; currently defaulted to `v27.0` |
| `MADSI_APP_URL` | Text | `https://www.madmadisonai.com` |

Generate the encryption key locally with `openssl rand -base64 32`. Keep the output private and store it only as a Worker secret. Never send it in chat or commit it.

The Worker config enables Node.js compatibility and `nodejs_compat_populate_process_env`, because the server route reads Worker variables through `process.env`. Cloudflare documents that this flag makes Worker variables and secrets available through `process.env`. Configure the values as Worker variables/secrets in the Cloudflare dashboard or with the supported Cloudflare CLI; do not place secret values in `cloudflare.config.ts`. Worker observability is enabled with structured invocation logs and sampled traces; incoming request query strings are redacted to avoid retaining OAuth callback codes and state values in telemetry.

## Meta app configuration

Add this exact OAuth redirect URI to the Meta app:

`https://www.madmadisonai.com/api/facebook/callback`

Requested permissions:

- `pages_show_list`
- `pages_read_engagement`
- `pages_read_user_content`
- `pages_manage_posts`
- `read_insights`

The person authorizing must have appropriate Page tasks, including CREATE_CONTENT or MANAGE for publishing and ANALYZE for insights. Meta may require App Review / Advanced Access before people outside the app's roles can use the integration.

For Webhooks, configure callback URL `https://www.madmadisonai.com/api/facebook/webhooks`, use the same `META_WEBHOOK_VERIFY_TOKEN`, and enable the Page fields needed by the product. Webhook requests are signature-checked but currently only acknowledged.

## API routes

- `POST /api/facebook/connect`
- `GET /api/facebook/callback`
- `GET /api/facebook/status`
- `GET /api/facebook/posts`
- `GET /api/facebook/insights`
- `POST /api/facebook/approval`
- `POST /api/facebook/posts`
- `GET /api/facebook/webhooks`
- `POST /api/facebook/webhooks`

All management endpoints require a valid Supabase bearer token and an OWNER or ADMIN profile. Publishing consumes a matching, unexpired approval record before sending the post to Meta, preventing an approval from being reused.

## Cloudflare build and deployment

The repository now contains the Vinext/Vite integration in `vite.config.ts`, the Cloudflare Worker definition in `cloudflare.config.ts`, generated Worker type inclusion in `tsconfig.json`, and scripts for the Vinext development and build workflow. The Worker config enables `nodejs_compat_populate_process_env` so server-only Worker variables and secrets can be read through `process.env`.

The browser-facing Supabase settings (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, or the project's configured anon-key equivalent) are compiled into the client bundle. They must be present in the build environment when the Cloudflare Worker is built; changing Worker runtime secrets later will not rewrite those client-bundle values. Keep only public Supabase values in `NEXT_PUBLIC_*`; keep the service-role key and Meta secrets server-only.

The feature branch has passed the normal Next.js production build, typecheck, regression tests, Vinext compatibility scan, temporary Cloudflare initialization, Cloudflare Worker build, and local Worker HTTP 200 smoke test in GitHub Actions. The latest validated source commit is `3dd5e5e93ec251387d6cdb3a9dbf6ba9118fb76d`. Live staging integration tests remain outstanding.

The checks above are build validation only. They do not prove that the Worker has been deployed or that live Supabase/Meta credentials work.

Before any deployment:

1. Create/configure a separate staging Worker and add the required non-public variables and secrets.
2. Apply the SQL migration to a staging Supabase project (or an explicitly approved staging schema).
3. Configure the Meta app redirect URI and webhook callback for the staging hostname.
4. Authenticate to Cloudflare and run the Vinext dry-run command.
5. Deploy only to staging, then verify OAuth, Page discovery, insights, webhook verification, and approval-gated publishing.
6. Do not switch production traffic until staging passes and production rollout is explicitly approved.

The repository now includes a guarded manual workflow at `.github/workflows/madsi-cloudflare-preview.yml`. Run it from the `feat/madsi-facebook-cloudflare` branch only. It runs typecheck and regression tests, then uses Vinext's supported `npx @vinext/cloudflare previews deploy --preview-name madsi-facebook-cloudflare` command. It creates an isolated Cloudflare Preview; it does not deploy the production Worker, change DNS, or migrate production Supabase.

Before running it, configure these GitHub Actions repository secrets (use staging values only):
- `CLOUDFLARE_API_TOKEN` — token with the Cloudflare Workers deployment permissions required by Vinext.
- `CLOUDFLARE_ACCOUNT_ID` — the target Cloudflare account ID.
- `STAGING_SUPABASE_URL` — URL of a separate staging Supabase project.
- `STAGING_SUPABASE_PUBLISHABLE_KEY` — publishable/anon key belonging to that staging project.

The workflow intentionally stops before deployment if any are missing, or if the Supabase URL is not a Supabase project URL. Do not point it at the production Supabase project.

After the Preview URL is created, configure the Preview's server-side variables/secrets in Cloudflare Preview settings: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `META_APP_ID`, `META_APP_SECRET`, `META_FACEBOOK_PAGE_ID`, `META_WEBHOOK_VERIFY_TOKEN`, `MADSI_FACEBOOK_TOKEN_ENCRYPTION_KEY`, `META_GRAPH_API_VERSION`, and `MADSI_APP_URL`. Use a staging Meta app and staging Page/test assets. Add the Preview's exact callback URL to the staging Meta app and configure its webhook URL there. Keep service-role and Meta credentials in Cloudflare's secret store; never put them in GitHub build secrets, source code, or chat.

Cloudflare documents Previews as separate environments with their own settings and URL: https://developers.cloudflare.com/workers/previews/. For a normal deployment, use `npx cf auth login`, followed by `npx cf deploy --dry-run` and then `npx cf deploy`. The last command uploads and deploys the Worker and must not be run without explicit production approval.
