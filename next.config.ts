import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: Using standard Next.js mode (not static export)
  // to support dynamic API routes (/api/analyze)

  // Disable image optimization for Cloudflare compatibility
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

