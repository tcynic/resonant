/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Disable TypeScript and ESLint checks during build for Vercel deployment
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Enable partial prerendering for better performance with dynamic content
    ppr: false, // Keep disabled until all dynamic routes are properly configured
  },
  // Next.js automatically handles NEXT_PUBLIC_* environment variables
  // No manual env configuration needed
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

module.exports = nextConfig
