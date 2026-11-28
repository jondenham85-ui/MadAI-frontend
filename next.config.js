import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SUPABASE_FUNCTIONS = require('./lib/production-backend.cjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_API_URL: '/api/backend' },
  async rewrites() {
    // Avoid external production Supabase rewrites in Vercel/Cloudflare previews.
    if (process.env.VERCEL_ENV === 'preview' || process.env.MADSI_PREVIEW_MODE === 'true') return [];
    return [
      { source: '/api/backend/:path*', destination: `${SUPABASE_FUNCTIONS}/madsi-api/:path*` },
      { source: '/api/agents/:path*', destination: `${SUPABASE_FUNCTIONS}/madsi-agents/:path*` },
    ];
  },
};
export default nextConfig;
