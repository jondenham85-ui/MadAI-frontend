const DEFAULT_BACKEND_URL = 'https://madai-backend-clean-1.onrender.com';
function backendBaseUrl(raw) {
  const value = typeof raw === 'string' && raw.trim() ? raw.trim() : DEFAULT_BACKEND_URL;
  let url;
  try { url = new URL(value); } catch { throw new Error('BACKEND_URL must be a valid HTTPS backend URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port) throw new Error('BACKEND_URL must use HTTPS without credentials, query, fragment, or a custom port');
  const basePath = url.pathname.replace(/\/+$/, '');
  const render = url.hostname === 'madai-backend-clean-1.onrender.com' && basePath === '';
  const supabase = url.hostname === 'rcetiocftggebqzfuncd.supabase.co' && basePath === '/functions/v1/madsi-api-candidate';
  if (!render && !supabase) throw new Error('BACKEND_URL must target the approved Render backend or Supabase API candidate, not the migration preflight');
  return url.origin + basePath;
}
const BACKEND_BASE_URL = backendBaseUrl(process.env.BACKEND_URL);
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_API_URL: '/api/backend' },
  async rewrites() {
    return [{ source: '/api/backend/:path*', destination: `${BACKEND_BASE_URL}/:path*` }];
  },
};
module.exports = nextConfig;
