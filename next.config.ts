import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { validateSiteUrl } from "./src/lib/siteUrl";

// Build-time gate: a production build fails loudly if NEXT_PUBLIC_SITE_URL is
// missing or localhost, so we learn from a failed deploy rather than from a
// user who received a dead cancel link. Dev builds accept localhost silently.
export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) {
    validateSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, true)
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
};
