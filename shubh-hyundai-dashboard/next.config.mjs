/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Fix HMR issues - Use turbopack config instead of webpack for Next.js 16
  turbopack: {
    // Empty config to silence the warning
  },
}

export default nextConfig
