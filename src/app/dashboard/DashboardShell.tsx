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
      <aside className="w-[220px] shrink-0 border-r border-border bg-surface">
        <p className="caption px-6 py-6 text-dark">SESSIONS.GUIDE</p>
        <nav className="flex flex-col">
          {SECTIONS.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActive(section)}
              className={`caption px-6 py-3 text-left text-dark ${
                active === section
                  ? 'border-l-2 border-olive bg-bg'
                  : 'border-l-2 border-transparent'
              }`}
            >
              {section}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-8 py-5">
          <p className="caption text-dark">{fullName}</p>
          <span className="caption border border-olive px-3 py-1 text-olive">
            {tier}
          </span>
        </header>

        <main className="flex-1 px-8 py-12">
          <h2 className="text-center">
            {active.charAt(0) + active.slice(1).toLowerCase()}
          </h2>

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
        </main>
      </div>
    </div>
  )
}
