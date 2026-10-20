import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { assertBuildSiteUrl } from "./src/lib/siteUrl";

// Build-time gate: a production build fails loudly if NEXT_PUBLIC_SITE_URL is
// missing or localhost, so we learn from a failed deploy rather than from a
// user who received a dead cancel link. Preview deploys may fall back to
// VERCEL_URL. Dev builds accept localhost silently.
export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) {
    assertBuildSiteUrl()
  }
  return nextConfig
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        // /join-sessions was renamed to /join-guidesspace. Permanent: the
        // rename is canonical, not a temporary detour.
        source: "/join-sessions",
        destination: "/join-guidesspace",
        permanent: true,
      },
    ]
  },
};
