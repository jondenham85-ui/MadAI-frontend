/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  env: {
    NEXT_PUBLIC_API_URL: "https://madai-backend-clean.onrender.com",
  },
  images: {
    remotePatterns: [],
  },
};

module.exports = nextConfig;
