import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SUPABASE_FUNCTIONS = require('./lib/production-backend.cjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_API_URL: '/api/backend' },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "cloudflare:workers": require.resolve("./lib/cloudflare-workers-stub.cjs"),
    };
    return config;
  },
  async rewrites() {
    return [
      { source: '/api/backend/:path*', destination: `${SUPABASE_FUNCTIONS}/madsi-api/:path*` },
      { source: '/api/agents/:path*', destination: `${SUPABASE_FUNCTIONS}/madsi-agents/:path*` },
    ];
  },
};
export default nextConfig;
