import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    eslint: {
    // Warning: Only run ESLint in development, skip during production build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
