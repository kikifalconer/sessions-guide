'use client'

import { useState } from 'react'
import SeekerBookings from '@/components/account/SeekerBookings'
import SeekerReviews from '@/components/account/SeekerReviews'
import SeekerSettings from '@/components/account/SeekerSettings'
import type { SeekerData } from '@/lib/seekerData'

// Seeker dashboard shell (D20): BOOKINGS, REVIEWS, SETTINGS. Mirrors the
// practitioner DashboardShell pattern — client-side tab state, DM Mono
// uppercase sidebar, shared section components.

const SECTIONS = ['BOOKINGS', 'REVIEWS', 'SETTINGS'] as const

type Section = (typeof SECTIONS)[number]

// {/* PLACEHOLDER COPY — Kiki to rework */}
const HELPER_COPY: Record<Section, string> = {
  BOOKINGS:
    'Your sessions, upcoming and past. Open one to see the details or to cancel if your plans change.',
  REVIEWS:
    'Share how your completed sessions went, and see the reviews you have written.',
  SETTINGS: 'Your name, your email, and what we send you.',
}

function titleCase(section: Section): string {
  return section.charAt(0) + section.slice(1).toLowerCase()
}

export default function AccountShell({
  fullName,
  currentEmail,
  newsletterOptIn,
  data,
}: {
  fullName: string
  currentEmail: string | null
  newsletterOptIn: boolean
  data: SeekerData
}) {
  const [active, setActive] = useState<Section>('BOOKINGS')

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="w-[180px] shrink-0 border-r border-border bg-bg">
        <nav className="flex flex-col py-4">
          {SECTIONS.map((section) => {
            const isActive = active === section
            return (
              <button
                key={section}
                type="button"
                onClick={() => setActive(section)}
                className={`px-5 py-3 text-left ${
                  isActive
                    ? 'border-l-2 border-olive bg-surface'
                    : 'border-l-2 border-transparent'
                }`}
              >
                <h3
                  style={{ textTransform: 'uppercase' }}
                  className={isActive ? 'text-olive' : 'text-dark'}
                >
                  {section}
                </h3>
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-8 py-4">
          <p className="caption text-dark">{fullName}</p>
        </div>

        <main className="flex-1 px-8 py-12">
          <div className="mx-auto w-full max-w-[1200px]">
            <h1>{titleCase(active)}</h1>
            {/* PLACEHOLDER COPY — Kiki to rework */}
            <p className="mt-4 max-w-[60ch] text-dark">{HELPER_COPY[active]}</p>

            <div className="mt-10">
              {active === 'BOOKINGS' && (
                <SeekerBookings upcoming={data.upcoming} past={data.past} />
              )}
              {active === 'REVIEWS' && (
                <SeekerReviews prompts={data.prompts} reviews={data.reviews} />
              )}
              {active === 'SETTINGS' && (
                <SeekerSettings
                  initialFullName={fullName}
                  initialNewsletterOptIn={newsletterOptIn}
                  currentEmail={currentEmail}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
