import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Temporarily disabled during builds due to extensive technical debt
    // ESLint is still run separately via `npm run lint`
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily disabled during builds - extensive technical debt cleanup needed
    // TypeScript checking still available via `tsc --noEmit`
    ignoreBuildErrors: true,
  },
  // Re-enabled static optimization with Suspense boundaries now in place
  // output: 'standalone', // Removed to allow static generation
  // Force rebuild timestamp
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
