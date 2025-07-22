import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Enable partial prerendering for better performance with dynamic content
    ppr: false, // Keep disabled until all dynamic routes are properly configured
  },
  // Ensure proper handling of environment variables during build
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  // Configure webpack to handle Convex stubs during build
  webpack: (config, { isServer, dev }) => {
    // Ensure proper module resolution for Convex generated files
    if (!dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Fallback to stubs if generated files aren't available
        '@/convex/_generated/api': process.env.NEXT_PUBLIC_CONVEX_URL
          ? '@/convex/_generated/api'
          : '@/convex/_generated_stubs/api',
      }
    }

    return config
  },
  // Improve error handling during build
  onDemandEntries: {
    // Reduce memory usage during build
    maxInactiveAge: 60 * 1000, // 1 minute
    pagesBufferLength: 2,
  },
}

export default nextConfig
