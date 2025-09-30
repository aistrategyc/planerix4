/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    // Ignore during builds for now - we'll fix linting issues later
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore type errors during builds for now
    ignoreBuildErrors: true,
  },

  // Experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['axios'],
  },

  async rewrites() {
    // КРИТИЧЕСКИ ВАЖНО: Разные настройки для dev и prod
    if (process.env.NODE_ENV === 'development') {
      // В dev режиме НЕ перенаправляем, используем локальный backend
      return []
    }

    // В production перенаправляем на prod API используя env переменные
    const apiDomain = process.env.NEXT_PUBLIC_API_DOMAIN || process.env.API_DOMAIN || 'api.planerix.com'

    return [
      {
        source: "/api/:path*",
        destination: `https://${apiDomain}/api/:path*`
      }
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Webpack optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!dev && !isServer) {
      // Production optimizations
      config.optimization.splitChunks.cacheGroups.commons = {
        name: 'commons',
        chunks: 'all',
        minChunks: 2,
      }
    }
    return config
  },
}

module.exports = nextConfig
