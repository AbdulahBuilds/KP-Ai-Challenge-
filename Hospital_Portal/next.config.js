/** @type {import('next').NextConfig} */
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
        destination: 'http://localhost:3001/rescue',
      },
      {
        source: '/rescue/:path*',
        destination: 'http://localhost:3001/rescue/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
