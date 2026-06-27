import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Production optimizasyonları
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // CNAME için — static export değil, standalone output
  // lifeos.perainc.online domain'inde çalışacak
};

export default nextConfig;
