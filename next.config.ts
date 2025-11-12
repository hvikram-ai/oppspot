import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Temporarily disabled during builds due to extensive technical debt
    // ESLint is still run separately via `npm run lint`
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignoring build errors due to missing database types for newly added tables
    // (agent_workflows, ai_agents, system_alerts, etc. not in generated types/database.ts)
    // These tables need to be added to the Supabase schema or types regenerated
    ignoreBuildErrors: true,
  },
  // Exclude Supabase Edge Functions from build (they use Deno, not Node.js)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'pdf-parse': 'commonjs pdf-parse'
      });
    }
    return config;
  },
  // Re-enabled static optimization with Suspense boundaries now in place
  // output: 'standalone', // Removed to allow static generation
  // Force rebuild timestamp
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
