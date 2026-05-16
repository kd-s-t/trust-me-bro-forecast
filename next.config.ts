import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "unzipper",
    "@aws-sdk/client-s3",
    "@aws-sdk/lib-storage",
  ],
};

export default nextConfig;
