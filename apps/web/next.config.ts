import path from "node:path";
import type { NextConfig } from "next";

const clientReleaseId =
  process.env.VERCEL_ENV === "production"
    ? (process.env.VERCEL_DEPLOYMENT_ID ?? "")
    : "";

const nextConfig: NextConfig = {
  transpilePackages: ["@opentrainer/backend", "@opentrainer/lib"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  env: {
    NEXT_PUBLIC_OPENTRAINER_RELEASE_ID: clientReleaseId,
  },
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
