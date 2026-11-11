const SUPABASE_FUNCTIONS = 'https://lsbqmdpmaurhqlkuuldh.supabase.co/functions/v1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_API_URL: '/api/backend' },
  async rewrites() {
    return [
      { source: '/api/backend/:path*', destination: `${SUPABASE_FUNCTIONS}/madsi-api/:path*` },
      { source: '/api/agents/:path*', destination: `${SUPABASE_FUNCTIONS}/madsi-agents/:path*` },
    ];
  },
};
module.exports = nextConfig;
