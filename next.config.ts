import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output static export for Cloudflare Pages
  output: "export",

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
