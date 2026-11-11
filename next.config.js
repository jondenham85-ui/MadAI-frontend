const BACKEND_ORIGIN = 'https://lsbqmdpmaurhqlkuuldh.supabase.co/functions/v1/madsi-api';
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true, env: { NEXT_PUBLIC_API_URL: '/api/backend' }, async rewrites() { return [{ source: '/api/backend/:path*', destination: `${BACKEND_ORIGIN}/:path*` }]; } };
module.exports = nextConfig;
