const BACKEND_ORIGIN = 'https://madai-backend-clean-1.onrender.com';
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true, env: { NEXT_PUBLIC_API_URL: '/api/backend' }, async rewrites() { return [{ source: '/api/backend/:path*', destination: `${BACKEND_ORIGIN}/:path*` }]; } };
module.exports = nextConfig;
