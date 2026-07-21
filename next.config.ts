// next.config.ts
// Wrapped with @serwist/next to enable PWA service worker generation.
// All existing Next.js config options are preserved exactly as-is.

import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Configure the Serwist PWA plugin.
//   swSrc  — source file compiled by webpack into the service worker bundle.
//   swDest — output path; served by Next.js static file handling as /sw.js.
//   disable — disabled in development to prevent SW conflicts with hot-reload.
//   additionalPrecacheEntries — ensure /offline is always cached for the fallback.
const withSerwist = withSerwistInit({
  swSrc: "sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: ["/offline"],
});

const nextConfig: NextConfig = {
  // Compress responses
  compress: true,

  // Optimize specific package imports to reduce bundle size
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@radix-ui/react-icons",
    ],
  },

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400, // Cache images for 1 day
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Allow local network access for dev (any IP on local network)
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};

export default withSerwist(nextConfig);
