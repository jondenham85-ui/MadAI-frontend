/ @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    optimizePackageImports: [
      "lucide-react",
    ],
  },

  images: {
    remotePatterns: [],
  },
};

module.exports = nextConfig;
