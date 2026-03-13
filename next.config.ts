import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth"],
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
