/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    // Disable ESLint during builds - ignore errors for production
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable type checking during builds for faster builds
    ignoreBuildErrors: true,
  },
  
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://api.planerix.com/api/:path*"
      }
    ]
  }
}

module.exports = nextConfig
