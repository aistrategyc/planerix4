/** @type {import('next').NextConfig} */
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'https://api.planerix.com https://itstep.app.n8n.cloud';

const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self' data:;
  connect-src 'self' ${API_ORIGIN};
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`;

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  async redirects() {
    return [
      { source: '/login', destination: `${APP_ORIGIN}/login`, permanent: false },
      { source: '/register', destination: `${APP_ORIGIN}/register`, permanent: false },
      { source: '/app', destination: `${APP_ORIGIN}`, permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: csp.replace(/\s{2,}/g, ' ').trim() },
        ],
      },
    ];
  },
};

module.exports = nextConfig;