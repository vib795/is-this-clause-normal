import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // output: "standalone",
  serverExternalPackages: ["mammoth", "pdf-parse", "pdfkit"],
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default withNextIntl(nextConfig);
