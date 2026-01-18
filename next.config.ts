import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Output static export for Cloudflare Pages (production only)
  // In development, use standard mode to support API routes
  ...(isDev ? {} : { output: "export" }),

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
