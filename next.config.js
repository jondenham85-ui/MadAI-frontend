const LEGACY_BACKEND_URL = 'https://madai-backend-clean-1.onrender.com';

function backendUrl() {
  const value = process.env.MADSI_BACKEND_URL || LEGACY_BACKEND_URL;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('MADSI_BACKEND_URL must be an HTTPS URL without credentials, query parameters, or a fragment');
  }
  return url.toString().replace(/\/+$/, '');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_API_URL: '/api/backend' },
  async rewrites() {
    return [{ source: '/api/backend/:path*', destination: `${backendUrl()}/:path*` }];
  },
};
module.exports = nextConfig;
