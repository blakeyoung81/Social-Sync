/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [];
  },
  // Development server configuration
  serverOptions: {
    port: 3001
  }
}

module.exports = nextConfig 