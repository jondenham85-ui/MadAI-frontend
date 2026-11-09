# Supabase Auth/API integration: preview staging

This branch replaces the Render rewrite and legacy cookie-presence authorization with Supabase Auth and a same-origin server-side API bridge. It does not migrate Neon records or enable AI, task execution, billing/webhooks, other business writes, or global administrative aggregates.

Required server environment: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. Never substitute a service-role/secret key. Sessions use HttpOnly cookies; middleware and Auth/profile endpoints validate identity with getUser. The bridge forwards the raw access token, but never trusts getSession's embedded user; the Edge handler verifies the token independently and uses RLS.

Signup supports confirmation-required responses and a PKCE code callback at /auth/callback. Verify Supabase site URL, exact allowed callback URLs, email/SMTP delivery, signup policy and anti-abuse settings before launch. Existing token_hash-only email templates need adaptation; this callback accepts PKCE codes only. Confirmation links opened in a different browser may require signing in after confirmation.

Before merge: reconnect Vercel, configure a preview, install dependencies, review the generated lockfile, run npm test, npm run typecheck and npm run build, then test real signup, email confirmation, login, logout, expiry/refresh, cookies, unauthorized tokens and cross-tenant API access. The source-level routing/owner tests do not prove these HTTP/Auth behaviors. Next middleware.ts remains the existing compatibility convention; avoid adding proxy.ts alongside it.

Do not promote while AI, billing, data preservation/import/reconciliation or end-to-end verification is incomplete. Unsupported operations return NOT_MIGRATED from the Edge API rather than using Render. Retire legacy infrastructure only after successful reconciliation and cutover.
