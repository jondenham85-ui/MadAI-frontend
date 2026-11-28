# MADSI Facebook Page integration

## Implemented source

- Owner-authenticated Meta OAuth start and callback.
- Short-lived user token exchange for a long-lived user token.
- Page discovery and encrypted Page-token storage.
- AES-GCM encryption of access tokens before storage in the selected server-side database (Neon for staging; Supabase REST remains available for production).
- Owner-only status, recent Page posts, and Page insights endpoints.
- A persisted, one-time publishing approval that must be explicitly created and consumed by an owner.
- Meta webhook verification and HMAC-SHA256 signature validation. Verified events are persisted, deduplicated, and can be triaged by a secret-protected processor. Triage classifies activity for owner review; it does not publish, message, or otherwise act on the Page.

## Database migration and runtime storage

The feature branch now supports two explicit storage backends for the Facebook integration:

- `MADSI_FACEBOOK_STORAGE_BACKEND=neon`: Facebook OAuth states, encrypted Page tokens, and one-time publishing approvals are stored in the isolated MADSI Neon staging database through `MADSI_DATABASE_URL`.
- `MADSI_FACEBOOK_STORAGE_BACKEND=supabase` (default): retains the existing Supabase REST storage path for the production configuration.

Supabase remains the identity provider. The API validates the bearer token with Supabase Auth and reads the user's OWNER/ADMIN profile there. When the backend is `neon`, only Facebook integration records are routed to Neon; profile lookups remain on Supabase. The Neon connection string is server-only and must never be exposed to the browser.

Apply `20261128000100_madsi_facebook.sql` and then `neon/migrations/20261128000200_madsi_facebook_auth_decoupling.sql` to Neon staging. The second migration removes cross-database foreign-key dependencies on `auth.users` and grants the dedicated `madsi_staging` database role access through RLS. Supabase production is not migrated by the Neon workflows.

The Neon-only auth-decoupling SQL lives under `neon/migrations/`, not `supabase/migrations/`, so Supabase CLI migration runs cannot accidentally apply Neon-specific constraint or role changes to the production Supabase project.

The persistent Neon `main` staging branch has also been updated and verified: all three Facebook tables retain RLS, all three Supabase `auth.users` foreign keys are removed, and the dedicated `madsi_staging` role has its private backend policy. A temporary CRUD check exercised insert/read/delete for OAuth state, Page connection, and publish approval records using that role; all test rows were removed.


## Cost-conscious staging and validation

MADSI now has a persistent, isolated Neon staging database. Use
`.github/workflows/madsi-neon-staging.yml` to apply and verify the Facebook
migration against that Neon database. The ordinary Cloudflare validation
workflow still uses disposable PostgreSQL for fast, credential-free CI checks;
it does not replace the persistent Neon staging environment. Neither workflow
touches production.

The existing legacy PostgreSQL instance is a data source, not an approved staging
target. Its current free instance is temporary, and its network allowlist
currently blocks the hosted read-only inspection connection. Do not open its
network access or apply this migration there merely to avoid staging costs.
Only consider it for read-only legacy-data inspection if a secure, authorized
connection path becomes available.

Neon is the persistent staging database for PostgreSQL schema and migration
work. It does not emulate Supabase Auth, Supabase Storage, Supabase JWT
validation, or the Supabase service-role REST API. The current Facebook API
route still uses Supabase Auth and Supabase REST for identity/profile lookups;
therefore Neon is not a drop-in replacement for the production Supabase
project. Full end-to-end Facebook OAuth testing still requires an isolated
staging Supabase Auth/API environment plus staging Meta and Cloudflare
settings. Do not use the production Supabase project as a substitute for
staging, and do not apply the migration to production as part of CI.

## Neon staging database (provisioned 2026-11-28)

A separate free-tier Neon project is now provisioned for MADSI staging:

- Project: `MADSI-Staging`
- Project ID: `dry-haze-09159013`
- Region: `aws-us-east-2` (US East 2)
- Branch: `main` (`br-sparkling-bread-be52ypng`)
- Database: `madsi_staging`
- PostgreSQL: 18
- Compute: 0.25 CU minimum/maximum; free organization plan

The Facebook integration migration was applied to this isolated Neon database after adding a minimal compatibility `auth.users` table and the Supabase role names required by the SQL grants. Validation confirmed all three Facebook tables exist with row-level security enabled, the same Facebook Page ID can be represented by two distinct owner records, and the migration's service-role grants are present. Temporary test rows were removed after validation.

The repository also includes a manual GitHub Actions workflow at
`.github/workflows/madsi-neon-staging.yml`. It refuses to run unless the
connection URL targets this exact Neon project and the `madsi_staging`
database. Configure the repository Actions secret
`NEON_STAGING_DATABASE_URL` with the Neon connection string for this staging
database (use the pooled connection string if appropriate). The workflow
applies the idempotent Facebook migration and verifies all three tables and
their RLS settings; its `verify_only` option checks the schema without
reapplying the migration. Never use a production connection string.

This Neon database is PostgreSQL staging only. It does not provide Supabase Auth, Supabase Storage, Supabase JWT validation, or the Supabase service-role API. Do not point the running application at Neon as a replacement for the production Supabase project. Keep production Supabase unchanged; use Neon for isolated SQL/migration regression and schema development. Full Facebook OAuth testing still needs a staging Supabase Auth/service-role environment and a staging Meta app.

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
| `MADSI_FACEBOOK_PROCESSOR_SECRET` | Secret | Bearer secret for trusted event-processor invocations |

Generate the encryption key locally with `openssl rand -base64 32`. Keep the output private and store it only as a Worker secret. Never send it in chat or commit it.

The custom `worker/index.ts` entry delegates fetch requests to Vinext and runs the protected Facebook event processor on a five-minute production Cron Trigger. Cron is disabled for Preview builds. The Worker config enables Node.js compatibility and `nodejs_compat_populate_process_env`, because the server route reads Worker variables through `process.env`. Cloudflare documents that this flag makes Worker variables and secrets available through `process.env`. Configure the values as Worker variables/secrets in the Cloudflare dashboard or with the supported Cloudflare CLI; do not place secret values in `cloudflare.config.ts`. Worker observability is enabled with structured invocation logs and sampled traces; incoming request query strings are redacted to avoid retaining OAuth callback codes and state values in telemetry.

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

For Webhooks, configure callback URL `https://www.madmadisonai.com/api/facebook/webhooks`, use the same `META_WEBHOOK_VERIFY_TOKEN`, and enable the Page fields needed by the product. Webhook requests are signature-checked and stored in the event inbox. The protected processor claims pending events, recovers expired processing leases, retries transient failures up to five claims, moves exhausted stale leases to failed for owner review, and adds a deterministic `madsi_triage` classification to each event for owner review. Its response explicitly reports `mode: triage_only`; it does not publish posts, reply to comments, send messages, or trigger other external actions. The production Worker now has a five-minute Cloudflare Cron Trigger. Its custom Worker entry delegates normal HTTP requests to Vinext and invokes this protected processor from `scheduled()`. Preview builds explicitly disable the Cron Trigger, so isolated previews cannot process events automatically. The production schedule will begin only after a production deployment and after `MADSI_FACEBOOK_PROCESSOR_SECRET` plus the production storage settings are configured.

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
- `POST /api/facebook/process` (trusted server only; requires `Authorization: Bearer <MADSI_FACEBOOK_PROCESSOR_SECRET>`)

All management endpoints require a valid Supabase bearer token and an OWNER or ADMIN profile. Publishing consumes a matching, unexpired approval record before sending the post to Meta, preventing an approval from being reused.

## Cloudflare build and deployment

The repository now contains the Vinext/Vite integration in `vite.config.ts`, the Cloudflare Worker definition in `cloudflare.config.ts`, generated Worker type inclusion in `tsconfig.json`, and scripts for the Vinext development and build workflow. The Worker config enables `nodejs_compat_populate_process_env` so server-only Worker variables and secrets can be read through `process.env`.

The browser-facing Supabase settings (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, or the project's configured anon-key equivalent) are compiled into the client bundle. They must be present in the build environment when the Cloudflare Worker is built; changing Worker runtime secrets later will not rewrite those client-bundle values. Keep only public Supabase values in `NEXT_PUBLIC_*`; keep the service-role key and Meta secrets server-only.

The feature branch has passed the normal Next.js production build, typecheck, regression tests, Vinext compatibility scan, temporary Cloudflare initialization, Cloudflare Worker build, and local Worker HTTP 200 smoke test in GitHub Actions. The earlier validated source commit was `9f4e68474efaaa47e45f67f5ee1ebb4a56090154`; the Neon workflow and this documentation update are newer changes and require their own CI run. Live staging integration tests remain outstanding.

The checks above are build validation only. They do not prove that the Worker has been deployed or that live Supabase/Meta credentials work.

Before any deployment:

1. Create/configure a separate staging Worker and add the required non-public variables and secrets.
2. Apply the SQL migration to a staging Supabase project (or an explicitly approved staging schema).
3. Configure the Meta app redirect URI and webhook callback for the staging hostname.
4. Authenticate to Cloudflare and run the Vinext dry-run command.
5. Deploy only to staging, then verify OAuth, Page discovery, insights, webhook verification, and approval-gated publishing.
6. Do not switch production traffic until staging passes and production rollout is explicitly approved.

The repository now includes a guarded manual workflow at `.github/workflows/madsi-cloudflare-preview.yml`. Run it from the `feat/madsi-facebook-cloudflare` branch only. It runs typecheck and regression tests, then uses Vinext's supported `npx @vinext/cloudflare previews deploy --preview-name madsi-facebook-cloudflare` command. It creates an isolated Cloudflare Preview; it does not deploy the production Worker, change DNS, or migrate production Supabase.

Before running it, configure these GitHub Actions repository secrets:
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` — Cloudflare preview deployment access.
- `MADSI_AUTH_SUPABASE_URL` and `MADSI_AUTH_SUPABASE_PUBLISHABLE_KEY` — the existing MADSI Supabase Auth project and its public key. This is used only for authentication and read-only owner-profile lookup in the Facebook preview; do not run signup tests or unrelated production-data workflows from the preview.
- `NEON_STAGING_DATABASE_URL` — the dedicated Neon staging connection string for `madsi_staging`.

The workflow requires the Neon URL to match the known MADSI staging endpoint/database and sets `MADSI_FACEBOOK_STORAGE_BACKEND=neon`. It will not silently fall back to Supabase for Facebook records. In Neon mode, the only permitted Supabase fallback is the authenticated `profiles` GET used to confirm OWNER/ADMIN access; unknown tables and every other unrecognized storage request fail closed rather than being routed to production. The preview build also sets `MADSI_PREVIEW_MODE=true`: `/api/backend/*` and `/api/agents/*` fail closed on preview hosts, and Next.js preview rewrites are disabled, so those routes cannot fall through to the production Supabase API. The dedicated `/api/facebook/*` route remains separate; it uses Neon for Facebook integration records and Supabase only for authentication and owner-profile lookup.

After the Preview URL is created, configure the Preview's server-side variables/secrets in Cloudflare Preview settings: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (read-only profile lookup for the Facebook route), `MADSI_FACEBOOK_STORAGE_BACKEND=neon`, `MADSI_DATABASE_URL` (the Neon staging connection string), `META_APP_ID`, `META_APP_SECRET`, `META_FACEBOOK_PAGE_ID`, `META_WEBHOOK_VERIFY_TOKEN`, `MADSI_FACEBOOK_TOKEN_ENCRYPTION_KEY`, `META_GRAPH_API_VERSION`, and `MADSI_APP_URL`. Use a staging Meta app and staging Page/test assets. Add the Preview's exact callback URL to the staging Meta app and configure its webhook URL there. Keep service-role and Meta credentials in Cloudflare's secret store; never put them in GitHub build secrets, source code, or chat.

Cloudflare documents Previews as separate environments with their own settings and URL: https://developers.cloudflare.com/workers/previews/. For a normal deployment, use `npx cf auth login`, followed by `npx cf deploy --dry-run` and then `npx cf deploy`. The last command uploads and deploys the Worker and must not be run without explicit production approval.


## Cloudflare Workers Builds branch preview

The connected feature-branch trigger uses the native Vinext Preview command:
`npx @vinext/cloudflare previews deploy --preview-name madsi-facebook-cloudflare`.
Its build command is intentionally empty because this command builds the app and deploys the Preview itself. This trigger is scoped only to `feat/madsi-facebook-cloudflare`; it does not deploy the production Worker or change the production domain. The separate GitHub Actions preview workflow also validates and deploys the isolated Preview.

For a future production Workers Builds connection, use a dedicated `mad-ai-frontend` Worker with the production branch set to `main`, an empty build command, and `npx @vinext/cloudflare deploy` as its deploy command. Do not repoint the existing `madsi-inference` Worker or its build configuration to the frontend application.

## Guarded Cloudflare production release

The repository includes `.github/workflows/madsi-cloudflare-production.yml`. It is a manual `workflow_dispatch` release that refuses to run from any ref other than `main`. It runs typecheck and regression tests, then uses the native Vinext command `npx @vinext/cloudflare deploy` to deploy the existing Next.js app as the `mad-ai-frontend` Worker.

The workflow requires the existing GitHub Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `MADSI_AUTH_SUPABASE_URL`, and `MADSI_AUTH_SUPABASE_PUBLISHABLE_KEY`. The Supabase URL/key are public client configuration; no service-role key, Meta secret, database password, or Facebook token is placed in GitHub Actions or the browser bundle.

This production workflow deploys the Worker to its Cloudflare Workers hostname only. It does not attach `www.madmadisonai.com`, alter DNS, or modify the separate `madsi-inference` Worker. Verify the new Worker and configure its server-only runtime secrets before switching the public domain. Facebook management remains unavailable until the Worker has `SUPABASE_SERVICE_ROLE_KEY`, `META_APP_ID`, `META_APP_SECRET`, `MADSI_FACEBOOK_TOKEN_ENCRYPTION_KEY`, and `META_WEBHOOK_VERIFY_TOKEN` configured in Cloudflare. Set `MADSI_APP_URL` to the active public origin when the domain cutover is ready.

## Automatic Neon pull-request branches

The repository includes `.github/workflows/madsi-neon-pr-branches.yml`.
For pull requests opened, reopened, or updated within this repository, it
creates an isolated Neon branch named `preview/pr-<number>`.
The branch is created from the staging project using the `madsi_staging`
database and `madsi_staging` role. It is configured to expire after 14 days
and is explicitly deleted when the pull request closes. Pull requests originating from forks are
skipped so repository Neon credentials are never exposed to fork workflows.

Configure these repository settings before expecting the automation to run:

- Actions secret `NEON_API_KEY`: create an API key in Neon account settings.
- Actions variable `NEON_PROJECT_ID`: set to `dry-haze-09159013`
  (the `MADSI-Staging` project).

This API key is separate from `NEON_STAGING_DATABASE_URL`, which is used
only by the manual persistent-staging migration workflow. Do not put either
value in source code or chat. Neon PR branches are disposable database
branches under the staging project; they do not change production Supabase
or the persistent `main` staging branch.

After creating or reusing the branch, the workflow uses the action's
short-lived branch connection output to apply both
`20261128000100_madsi_facebook.sql` and
`neon/migrations/20261128000200_madsi_facebook_auth_decoupling.sql`, then verifies
that all three Facebook tables exist with RLS enabled. The connection string is passed
only between workflow steps through the runner environment; it is not logged,
stored as a repository secret, or injected into the application preview.

This automates isolated database provisioning and schema verification for
each PR. It does not make Neon a substitute for Supabase Auth, Storage, JWT
validation, or the Supabase service-role API, and it does not configure live
Facebook/Meta credentials. The application preview still needs its own
staging Supabase and Cloudflare Preview settings before end-to-end OAuth
testing.
