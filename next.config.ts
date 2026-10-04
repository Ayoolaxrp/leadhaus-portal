import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }, { protocol: "https", hostname: "fastly.picsum.photos" }] },
  poweredByHeader: false,
  turbopack: { root: __dirname },
  experimental: { serverActions: { bodySizeLimit: "250mb" } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
