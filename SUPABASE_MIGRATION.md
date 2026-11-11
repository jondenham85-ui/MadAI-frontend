# MADSI Supabase backend cutover

This branch keeps production hosting on Vercel and removes the browser's dependency on a Render URL by proxying the existing frontend API paths to the Supabase Edge Function.

## Request path

Browser requests remain same-origin:

```text
/api/backend/api/auth/login
```

The Next.js rewrite sends them to:

```text
https://lsbqmdpmaurhqlkuuldh.supabase.co/functions/v1/madsi-api/api/auth/login
```

Authentication uses Supabase Auth. The Edge Function stores access and refresh tokens in `HttpOnly`, `Secure`, `SameSite=Lax` cookies. Service-role credentials are never sent to the browser.

## Required Vercel environment

No backend secret belongs in Vercel. The frontend only needs its existing public variables:

```env
NEXT_PUBLIC_API_URL=/api/backend
NEXT_PUBLIC_OWNER_EMAIL=jondenham85@gmail.com
```

OpenAI and Stripe secrets are configured as Supabase Edge Function secrets in the backend repository's Supabase documentation.

## Status

- `repair/madsi-supabase-migration` is a safe working branch; production `main` is unchanged.
- Local tests and production build pass.
- The branch must not be merged or deployed until the Supabase database migration and Edge Function are applied, deployed, and tested.
- Render remains available as the current production backend until that verification is complete.
