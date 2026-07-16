import type { NextConfig } from "next";

const scriptSources =
  process.env.NODE_ENV === "development"
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3", "sharp"],
  // Database media can become private again after unpublishing. Bypassing the
  // optimizer prevents its long-lived public derivative cache from retaining
  // an image after the guarded /api/media/:id route starts returning 404.
  images: { unoptimized: true },
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingExcludes: {
    "*": [
      "./data/**/*",
      "./backups/**/*",
      "./coverage/**/*",
      "./playwright-report/**/*",
      "./test-results/**/*",
    ],
  },
  // pnpm keeps Sharp's platform binaries in optional @img packages. Turbopack
  // can trace the JS loader without the libvips shared object, leaving the
  // standalone media routes unable to start in production.
  outputFileTracingIncludes: {
    "/api/media{,/**}": [
      "./node_modules/.pnpm/@img+sharp-*@*/node_modules/@img/sharp-*/**/*",
      "./node_modules/.pnpm/@img+sharp-libvips-*@*/node_modules/@img/sharp-libvips-*/**/*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src ${scriptSources}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
