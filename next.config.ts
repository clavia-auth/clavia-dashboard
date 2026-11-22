import type { NextConfig } from "next";

/**
 * The dashboard is served at `https://management.{domain}/dashboard/`, on the same origin
 * as the Management API it calls (Caddy routes `/dashboard/*` here and `/api/v1/*` to
 * Clavia). It is a backend for frontend: tokens never reach the browser.
 *
 * Cache Components and Partial Prefetching are off on purpose. Every page reads the
 * operator's session, and the Content-Security-Policy carries a per-request nonce
 * (`src/proxy.ts`), which Next.js can only apply to dynamically rendered pages. Pages
 * stream behind `loading.tsx` skeletons and `<Suspense>` boundaries instead.
 */
const publicHost = process.env.DASHBOARD_URL === undefined ? [] : [new URL(process.env.DASHBOARD_URL).hostname];

const nextConfig: NextConfig = {
  basePath: "/dashboard",
  // In development the browser reaches the dev server through Caddy, on the public host.
  allowedDevOrigins: publicHost,
  poweredByHeader: false,
  devIndicators: { position: "bottom-right" },
  reactStrictMode: true,
  typedRoutes: true,
  serverExternalPackages: ["ioredis"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
