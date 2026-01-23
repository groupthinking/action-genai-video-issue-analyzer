import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Cloud Run deployment
  // This creates a minimal server.js with only necessary dependencies
  output: "standalone",

  // Disable image optimization for Cloudflare compatibility
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

