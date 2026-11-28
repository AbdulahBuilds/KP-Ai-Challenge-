/** @type {import('next').NextConfig} */
const RESCUE_WEB_URL = process.env.RESCUE_WEB_URL || 'http://localhost:3001';
const RESCUE_API_URL = process.env.RESCUE_API_URL || 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // 1. Clean route for Hospital Portal
      {
        source: '/hospital',
        destination: '/',
      },
      {
        source: '/hospital/:path*',
        destination: '/:path*',
      },
      // 2. Reverse proxy to BHU Portal (Port 3002)
      {
        source: '/bhu',
        destination: 'http://localhost:3002/bhu',
      },
      {
        source: '/bhu/:path*',
        destination: 'http://localhost:3002/bhu/:path*',
      },
      // 3. Reverse proxy to Rescue 1122 Web (Port 3001)
      {
        source: '/rescue',
        destination: `${RESCUE_WEB_URL}/rescue`,
      },
      {
        source: '/rescue/:path*',
        destination: `${RESCUE_WEB_URL}/rescue/:path*`,
      },
      // 4. Rescue API through the unified portal so the browser can call
      //    /api/v1 from any portal without CORS or port mismatches.
      {
        source: '/api/v1/:path*',
        destination: `${RESCUE_API_URL}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
