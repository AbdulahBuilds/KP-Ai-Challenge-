import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  basePath: '/rescue',
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/rescue',
        permanent: false,
        basePath: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_PROXY_URL ?? 'http://localhost:4000'}/api/v1/:path*`,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
