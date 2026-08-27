import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { buildMetadata } from '@/lib/metadata'
import { BRAND_NAME } from '@/lib/brand'
import SiteHeader from '@/components/site-header'
import MotionProvider from '@/components/motion/MotionProvider'
import RevealLines from '@/components/motion/RevealLines'
import RevealBlock from '@/components/motion/RevealBlock'
import ScrubScale from '@/components/motion/ScrubScale'

// Landing page, rebuilt from docs/mockups/landing page@2x.png. Renders
// <SiteHeader variant="landing" /> in normal flow above the hero (pixel-
// sampled from the mockup: the nav sits on a flat bone bar, not
// transparently over the photo — see the header-nav commit for the
// verification). This reverses the earlier "header-free /" decision
// (decisions.md, Shared Site Header) since / now needs the same
// Supabase getUser() call every other SiteHeader route already accepts.
//
// Server component. The waitlist/invite-code forms that used to live here
// (HoldingForms) have moved to /join-guidesspace, which now owns the
// invitation mechanism.
//
// Motion: MotionProvider renders null and pulls gsap/lenis in on mount, so
// neither is in the server bundle or the initial client bundle.

const META_DESCRIPTION =
  'A booking platform for transformational and healing sessions: ceremonies, readings, treatments, healings, and journeys.'

// COPY NEEDED: page title concept for /.
//
// Every other route sets a lowercase concept and buildMetadata appends the
// brand ("{concept} | guides’space"). No approved string exists for this
// one: per the landing copy deck, the page title cascades from the A1 hero
// candidate, which is still undecided. Rather than invent brand copy, the
// title is pinned to exactly what / emits today. Replace the override below
// with a real `concept` once A1 lands.
const INTERIM_TITLE = BRAND_NAME

const base = buildMetadata({
  concept: INTERIM_TITLE,
  description: META_DESCRIPTION,
  path: '/',
})

export const metadata: Metadata = {
  ...base,
  title: INTERIM_TITLE,
  openGraph: { ...base.openGraph, title: INTERIM_TITLE },
  twitter: { ...base.twitter, title: INTERIM_TITLE },
}

export default function LandingPage() {
  return (
    <>
      <MotionProvider />

      <SiteHeader variant="landing" />

      <main>
        {/* ---------- Section 1 — hero photo, wordmark, static modality line ---------- */}
        <section className="relative flex min-h-svh flex-col overflow-hidden">
          <div className="absolute inset-0">
            <ScrubScale className="h-full w-full">
              <Image
                src="/images/reikiHero2.jpg"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            </ScrubScale>
          </div>

          {/* Legibility wash over the photograph. */}
          <div className="absolute inset-0 bg-black/25" />

          {/* Full-width wordmark, flush to the top of the hero photo. Raw
              <img> rather than next/image because it spans the full viewport
              at its natural aspect and needs its native GIF animation, which
              next/image doesn't preserve. The repo-root /guidesspace-logo-cream.gif
              path referenced here previously 404s (only the .png variant
              exists at root); this is the only place the actual .gif file
              lives. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/landing/guidesspace-logo-cream.gif"
            alt={BRAND_NAME}
            className="relative z-[1] block w-full"
          />

          <div className="redesign-container relative z-[1] flex flex-1 flex-col items-center justify-center py-16 text-center">
            <RevealBlock>
              <p className="t-lede text-light">booking for</p>
            </RevealBlock>

            {/* TODO: static placeholder for the eventual rotating modality
                word (mockup shows "MODALITIES.GIF" as its own placeholder
                label). Do not build the rotation until the modality list and
                cadence are specified — see /images/landing/modalities.gif
                for the reference animation, not embedded here. "reiki" was
                picked because it matches the hero photo. */}
            <RevealLines as="h1" className="t-display mt-2 text-light">
              reiki
            </RevealLines>

            <RevealBlock
              stagger="loose"
              delay={0.25}
              className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row"
            >
              <Link href="/explore" className="btn-secondary btn-fill border-light text-light">
                Find Your Guide
              </Link>
              <Link
                href="/join-guidesspace"
                className="btn-secondary btn-fill border-light text-light"
              >
                For Guides
              </Link>
            </RevealBlock>
          </div>
        </section>

        {/* ---------- Section 2 — centered statement band ---------- */}
        <section className="bg-bg">
          <div className="redesign-container redesign-section text-center">
            <RevealLines as="h2" className="t-h2 mx-auto max-w-[20ch]">
              {"Designed to Make Light Workers' Work Lighter"}
            </RevealLines>

            {/* TODO COPY: exact final wording pending BRAND-8/BRAND-10
                sign-off. BRAND-15 lexicon fix applied: the mockup's "and
                practitioners of the mystical arts" tail is dropped. */}
            <RevealBlock delay={0.15}>
              <p className="t-lede mx-auto mt-8 max-w-[46ch] text-dark">
                With tools for guides, healers, and coaches.
              </p>
            </RevealBlock>

            {/* TODO LINK: no existing route is an obvious target for
                "SEE MORE" — needs a real destination once one exists. */}
            <RevealBlock delay={0.25}>
              <a href="#" className="btn-primary btn-fill mt-12">
                See More
              </a>
            </RevealBlock>
          </div>
        </section>

        {/* ---------- Section 3 — split copy / image, curved divider ---------- */}
        <section className="bg-bg">
          <div className="redesign-container redesign-section grid grid-cols-1 items-center gap-16 md:grid-cols-12">
            <div className="min-w-0 md:col-span-5">
              <RevealLines as="h2" className="t-h2 mb-8 max-w-[16ch] break-words">
                {"Created to Find You the Healing + Transformation You're Seeking"}
              </RevealLines>

              {/* TODO COPY: placeholder body, pending BRAND-8/BRAND-10 sign-off. */}
              <RevealBlock delay={0.15}>
                <p className="t-body mb-10 text-dark">book healing + transformational sessions</p>
              </RevealBlock>

              <RevealBlock delay={0.25}>
                <Link href="/explore" className="btn-primary btn-fill">
                  Explore
                </Link>
              </RevealBlock>
            </div>

            {/* The organic curve is baked into landing2.jpg's own pixels (the
                cutout is filled with the exact bone bg color), so this
                renders at the image's native aspect ratio with no cropping
                and no clip-path/mask CSS — cropping via a viewport-relative
                height would misalign the pre-baked curve against the page
                background. */}
            <RevealBlock className="md:col-span-7">
              <div className="relative aspect-[1920/1616] w-full overflow-hidden">
                <Image
                  src="/images/landing/landing2.jpg"
                  alt=""
                  fill
                  sizes="(min-width: 768px) 58vw, 100vw"
                  className="object-cover"
                />
              </div>
            </RevealBlock>
          </div>
        </section>

        {/* ---------- Section 4 — full-bleed mission statement ---------- */}
        <section className="relative bg-bg">
          {/* Same native-aspect-ratio reasoning as section 3: landing1.jpg's
              baked-in curve only lines up with the page background at its
              own aspect, not an arbitrary object-cover crop. */}
          <div className="relative aspect-[1920/1616] w-full overflow-hidden">
            <Image
              src="/images/landing/landing1.jpg"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />

            <div className="redesign-container absolute inset-0 flex flex-col justify-center">
              <RevealLines as="h2" className="t-h2 max-w-[14ch] text-light">
                Built to Serve
              </RevealLines>

              {/* BRAND-15 lexicon fix applied: "conscious practitioners" ->
                  "conscious guides". Condenses the fuller "Built from the
                  inside" narrative that used to live on this page — the full
                  version now lives at /mission; this button is the intended
                  hand-off, not a duplicate. */}
              <RevealBlock delay={0.2}>
                <p className="t-body mt-6 max-w-[40ch] text-light">
                  By a co-founder of Conscious City Guide, to serve the unique needs of conscious
                  guides.
                </p>
              </RevealBlock>

              <RevealBlock delay={0.35}>
                <Link
                  href="/mission"
                  className="btn-secondary btn-fill mt-10 border-light text-light"
                >
                  Our Mission
                </Link>
              </RevealBlock>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
