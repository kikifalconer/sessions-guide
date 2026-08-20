import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { buildMetadata } from '@/lib/metadata'
import MotionProvider from '@/components/motion/MotionProvider'
import RevealLines from '@/components/motion/RevealLines'
import RevealBlock from '@/components/motion/RevealBlock'
import ScrubScale from '@/components/motion/ScrubScale'
import HoldingForms from './HoldingForms'

// Holding page. Header-free by design (decisions.md, Shared Site Header): the
// root layout injects no header and the full-width wordmark is the top of the
// page. Adding SiteHeader here would also force the page dynamic, since it
// calls Supabase getUser().
//
// Server component. It was 'use client' until the metadata pass, which
// silently disabled its metadata export. The two forms live in
// ./HoldingForms.tsx so this file can export metadata again.
//
// Motion: MotionProvider renders null and pulls gsap/lenis in on mount, so
// neither is in the server bundle or the initial client bundle.

// The page's own hero copy, reused verbatim as the meta description rather
// than authoring a new string for the slot.
const META_DESCRIPTION =
  'A booking platform for transformational and healing sessions: ceremonies, readings, treatments, healings, and journeys.'

// COPY NEEDED: page title concept for /.
//
// Every other route sets a lowercase concept and buildMetadata appends the
// brand ("{concept} | sessions.guide"). No approved string exists for this
// one: per the landing copy deck, the page title cascades from the A1 hero
// candidate, which is still undecided. Rather than invent brand copy, the
// title is pinned to exactly what / emits today. Replace the override below
// with a real `concept` once A1 lands.
const INTERIM_TITLE = 'sessions.guide'

// SCAFFOLDING, NOT COPY. Deliberately unshippable text, at the shape the real
// line is expected to take (5 words, wrapping to 2-3 lines at desktop), so the
// RevealLines split, the resize re-split and the post-webfont refresh are all
// exercised at realistic proportions before the string arrives. Delete this
// constant and the placeholder comment together when the real H1 lands.
const DUMMY_HERO_H1 = 'placeholder headline do not ship'

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

      <main>
        {/* ---------- Section 1 — wordmark, hero line, invitation ---------- */}
        <section className="relative flex min-h-svh flex-col overflow-hidden">
          {/* Full-height photographic background, scroll-linked via ScrubScale
              (this replaces the removed CSS .parallax-hero). */}
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

          {/* Full-width wordmark, flush to the very top: no padding, no margin.
              Cream mark over the photograph. Raw <img> rather than next/image
              because it spans the full viewport at its natural aspect; the
              7689px source is far wider than any viewport, so it stays crisp. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/guidesspace-logo-cream.png"
            alt="Guides' Space"
            className="relative z-[1] block w-full"
          />

          <div className="redesign-container relative z-[1] flex flex-1 flex-col justify-center py-24">
            {/* COPY NEEDED: holding page hero H1 */}
            <RevealLines as="h1" className="t-display max-w-[14ch] text-light">
              {DUMMY_HERO_H1}
            </RevealLines>

            <RevealBlock delay={0.25}>
              <p className="t-lede mt-10 text-light">
                A booking platform for transformational and healing sessions:
                ceremonies, readings, treatments, healings, and journeys.
              </p>
            </RevealBlock>

            <HoldingForms delay={0.5} />
          </div>
        </section>

        {/* ---------- Section 2 — Built from the inside ---------- */}
        <section className="bg-bg">
          <div className="redesign-container redesign-section grid grid-cols-1 items-center gap-16 md:grid-cols-12">
            <RevealBlock className="md:col-span-5">
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                <Image
                  src="/images/stockPhotos/hands-magic.jpg"
                  alt=""
                  fill
                  sizes="(min-width: 768px) 42vw, 100vw"
                  className="object-cover"
                />
              </div>
            </RevealBlock>

            <div className="md:col-span-7">
              <RevealLines as="h2" className="t-h2 mb-12">
                Built from the inside.
              </RevealLines>

              <RevealBlock stagger="base" className="flex flex-col gap-6">
                <p className="t-body text-dark">
                  As a cofounder of Conscious City Guide, I spent a decade working with
                  thousands of practitioners, healers, teachers, and guides. And though
                  their work was unique, their challenges were common.
                </p>
                <p className="t-body text-dark">
                  Sessions Guide was created for the light workers: so they can receive
                  the abundance they deserve while having sovereignty over how they get
                  paid. So healers can focus on their energy rather than admin. And so
                  nomads won&rsquo;t need to rebuild their client list with each new place
                  they land. Every tool here was chosen so practitioners can stay inside
                  their practice.
                </p>
                <p className="t-body text-dark">
                  And Sessions Guide was created so people seeking healing will find their
                  healers. Those seeking guidance will find their guides. And those
                  seeking transformation can find their alchemist.
                </p>
              </RevealBlock>
            </div>
          </div>
        </section>

        {/* ---------- Section 3 — full-bleed image + statement ---------- */}
        <section className="relative">
          <div className="relative h-[86vh] min-h-[520px] w-full overflow-hidden">
            <div className="absolute inset-0">
              <ScrubScale className="h-full w-full">
                <Image
                  src="/images/stockPhotos/wing.jpg"
                  alt=""
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              </ScrubScale>
            </div>

            {/* Legibility wash over the photograph. */}
            <div className="absolute inset-0 bg-black/35" />

            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <RevealLines as="h2" className="t-h2 max-w-[16ch] text-light">
                {"Making Lightworkers' Work Lighter"}
              </RevealLines>

              <RevealBlock delay={0.2}>
                <Link href="/join-sessions" className="btn-primary btn-fill mt-12">
                  LEARN MORE
                </Link>
              </RevealBlock>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
