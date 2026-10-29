import type { NextConfig } from "next";

// The admin panel never calls the backend cross-origin. Every /api/v1/* request
// is proxied to BACKEND_URL, so the Better Auth session cookie lives on the
// admin host and the backend's CSRF guard sees this host's Origin — which is
// why that origin must be listed in the backend's ALLOWED_ORIGINS.
//
// The rewrite is compiled into the build, so a production build without
// BACKEND_URL (e.g. a Coolify build variable left empty, which overrides the
// Dockerfile default) would silently proxy to localhost. Fail the build instead.
if (process.env.NODE_ENV === "production" && !/^https?:\/\/[^/]/i.test(process.env.BACKEND_URL ?? "")) {
  throw new Error("BACKEND_URL must be set to the backend's base URL (e.g. https://api.revcoraos.com, without /api/v1) for a production build.");
}
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
