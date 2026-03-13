import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["mammoth"],
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
