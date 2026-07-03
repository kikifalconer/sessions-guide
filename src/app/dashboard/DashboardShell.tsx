'use client'

import { useState } from 'react'
import ProfileSection from './ProfileSection'
import CalendarSettings from './CalendarSettings'
import SessionsManager from './SessionsManager'
import AvailabilityManager from './AvailabilityManager'
import type {
  ModalityOption,
  PractitionerDefaults,
  SessionTypeRow,
} from './SessionTypeForm'
import type { AvailabilityBlockRow } from './AvailabilityBlockForm'

const SECTIONS = [
  'PROFILE',
  'SESSIONS',
  'AVAILABILITY',
  'CLIENTS',
  'REVIEWS',
  'SETTINGS',
] as const

type Section = (typeof SECTIONS)[number]

// {/* PLACEHOLDER COPY — Kiki to rework */}
// Brief, calm, directional instructions shown under each subpage title.
const HELPER_COPY: Record<Section, string> = {
  PROFILE:
    'This is how seekers meet you. Add your name, photo, bio, and links, then publish when it feels ready. You can keep editing after you go live.',
  SESSIONS:
    'These are the sessions seekers can book with you. Set the format, length, and price for each one, and add as many as you offer.',
  AVAILABILITY:
    'Set the days, times, and places you work. Recurring blocks repeat each week, and dated blocks cover a specific range. Seekers can only book inside these windows.',
  CLIENTS:
    'The people who have booked with you will gather here. This space is still being built.',
  REVIEWS:
    'Reviews from the seekers you have worked with will appear here as they come in. This space is still being built.',
  SETTINGS:
    'Connect your Google Calendar so booked sessions sync automatically and your outside commitments block off time. You can disconnect whenever you need to.',
}

function titleCase(section: Section): string {
  return section.charAt(0) + section.slice(1).toLowerCase()
}

export default function DashboardShell({
  fullName,
  slug,
  tier,
  isPublished,
  calendarConnected,
  calendarId,
  calendarSyncEnabled,
  sessionTypes,
  modalities,
  taggedModalityIds,
  practitionerDefaults,
  modalityNameById,
  availabilityBlocks,
}: {
  fullName: string
  slug: string
  tier: string
  isPublished: boolean
  calendarConnected: boolean
  calendarId: string | null
  calendarSyncEnabled: boolean
  sessionTypes: SessionTypeRow[]
  modalities: ModalityOption[]
  taggedModalityIds: string[]
  practitionerDefaults: PractitionerDefaults
  modalityNameById: Record<string, string>
  availabilityBlocks: AvailabilityBlockRow[]
}) {
  const [active, setActive] = useState<Section>('PROFILE')

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="w-[240px] shrink-0 border-r border-border bg-surface">
        <nav className="flex flex-col py-4">
          {SECTIONS.map((section) => {
            const isActive = active === section
            return (
              <button
                key={section}
                type="button"
                onClick={() => setActive(section)}
                className={`px-6 py-3 text-left ${
                  isActive
                    ? 'border-l-2 border-olive bg-bg'
                    : 'border-l-2 border-transparent'
                }`}
              >
                {/* Sidebar links render as h3 elements; uppercase is applied via
                    the explicitly-requested inline textTransform override. */}
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
        {/* Slim context strip: practitioner name + tier (folded from the old
            in-shell header now that the logo lives in SiteHeader). */}
        <div className="flex items-center justify-between border-b border-border px-8 py-4">
          <p className="caption text-dark">{fullName}</p>
          <span className="caption border border-olive px-3 py-1 text-olive">
            {tier}
          </span>
        </div>

        <main className="flex-1 px-8 py-12">
          <div className="mx-auto w-full max-w-[1200px]">
            <h1>{titleCase(active)}</h1>
            {/* PLACEHOLDER COPY — Kiki to rework */}
            <p className="mt-4 max-w-[60ch] text-dark">{HELPER_COPY[active]}</p>

            <div className="mt-10">
              {active === 'PROFILE' && (
                <ProfileSection slug={slug} isPublished={isPublished} />
              )}

              {active === 'SESSIONS' && (
                <SessionsManager
                  sessionTypes={sessionTypes}
                  modalities={modalities}
                  taggedModalityIds={taggedModalityIds}
                  defaults={practitionerDefaults}
                  modalityNameById={modalityNameById}
                />
              )}

              {active === 'AVAILABILITY' && (
                <AvailabilityManager blocks={availabilityBlocks} />
              )}

              {active === 'SETTINGS' && (
                <CalendarSettings
                  connected={calendarConnected}
                  calendarId={calendarId}
                  syncEnabled={calendarSyncEnabled}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
