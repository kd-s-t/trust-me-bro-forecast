import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unzipper"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "lightweight-charts"],
  },
};

export default nextConfig;
