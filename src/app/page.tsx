import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { buildMetadata } from '@/lib/metadata'
import HoldingForms from './HoldingForms'

// Holding page. Header-free by design (decisions.md, Shared Site Header):
// the root layout injects no header and the full-width wordmark is the top of
// the page. All colors/fonts come from CSS variables (Tailwind tokens).
//
// This is a SERVER component. It was 'use client' until now, which silently
// disabled its metadata export: buildMetadata was imported and never called,
// so / shipped with no canonical tag at all and inherited the root layout's
// seeker-facing description. The two forms moved to ./HoldingForms.tsx
// unchanged so this file can export metadata again.

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
// title is pinned to exactly what / emits today, so this commit fixes the
// canonical without changing what anyone reads. Replace the override below
// with a real `concept` once A1 lands.
const INTERIM_TITLE = 'sessions.guide'

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
    <main>
      {/* ---------- Section 1 — wordmark, hero line, invitation ---------- */}
      <section className="relative flex min-h-screen flex-col">
        {/* Full-height photographic background. */}
        <Image
          src="/images/reikiHero2.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Legibility wash over the photograph. */}
        <div className="absolute inset-0 bg-black/25" />

        {/* Full-width wordmark, flush to the very top: no padding, no margin. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sessionsguide-logo-light.svg"
          alt="Sessions Guide"
          className="relative z-[1] block w-full"
        />

        <div className="relative z-[1] mx-auto flex max-w-[760px] flex-1 flex-col justify-center px-6 pb-28 pt-12 text-center sm:pt-20">
          <p className="mx-auto max-w-[48ch] text-[1.05rem] leading-[1.8] text-light">
            A booking platform for transformational and healing sessions:
            ceremonies, readings, treatments, healings, and journeys.
          </p>

          <HoldingForms />
        </div>
      </section>

      {/* ---------- Section 2 — Built from the inside ---------- */}
      <section className="bg-bg">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-16 px-6 py-28 sm:px-10 md:grid-cols-2">
          <div className="relative aspect-[4/5] w-full overflow-hidden">
            <Image
              src="/images/stockPhotos/hands-magic.jpg"
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          <div>
            <h1 className="mb-10">Built from the inside.</h1>
            <p className="mb-6 max-w-[54ch] text-dark">
              As a cofounder of Conscious City Guide, I spent a decade working with
              thousands of practitioners, healers, teachers, and guides. And though
              their work was unique, their challenges were common.
            </p>
            <p className="mb-6 max-w-[54ch] text-dark">
              Sessions Guide was created for the light workers: so they can receive
              the abundance they deserve while having sovereignty over how they get
              paid. So healers can focus on their energy rather than admin. And so
              nomads won&rsquo;t need to rebuild their client list with each new place
              they land. Every tool here was chosen so practitioners can stay inside
              their practice.
            </p>
            <p className="max-w-[54ch] text-dark">
              And Sessions Guide was created so people seeking healing will find their
              healers. Those seeking guidance will find their guides. And those
              seeking transformation can find their alchemist.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Section 3 — full-bleed image + statement ---------- */}
      <section className="relative">
        <div className="relative h-[72vh] min-h-[440px] w-full">
          <Image
            src="/images/stockPhotos/wing.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          {/* Legibility wash over the photograph. */}
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            {/* Inline style so it wins over the global h1 olive color. */}
            <h2 className="max-w-[16ch]" style={{ color: 'var(--color-light)' }}>
              {"Making Lightworkers' Work Lighter"}
            </h2>
            <Link href="/join-sessions" className="btn-primary mt-10">
              LEARN MORE
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
