import Link from 'next/link'
import { DateTime } from 'luxon'
import { loadIntegration } from '@/lib/calendar'
import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { loadSeekerData } from '@/lib/seekerData'
import { requirePractitioner } from '../requirePractitioner'
import ProfileSection from '../ProfileSection'
import CalendarSettings from '../CalendarSettings'
import DisplayNameEditor from '../DisplayNameEditor'
import ModalitiesEditor from '../ModalitiesEditor'
import PortraitEditor from '../PortraitEditor'
import ReservationsCalendar, { type CalendarBookingMarker } from '../ReservationsCalendar'

export const metadata = { title: `account | ${BRAND_NAME}` }

const WEEKDAY_TOKENS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

function openDaysLabel(rules: (string | null)[]): string {
  const days = new Set<string>()
  let hasRuleLessBlock = false
  for (const rule of rules) {
    if (!rule) {
      hasRuleLessBlock = true
      continue
    }
    const m = rule.match(/^WEEKLY:(.+)$/)
    if (m) {
      for (const d of m[1].split(',')) days.add(d)
    }
  }
  if (hasRuleLessBlock) return 'Every day'
  if (days.size === 0) return 'No availability set'
  const ordered = WEEKDAY_TOKENS.filter((d) => days.has(d))
  return ordered.map((d) => d.charAt(0) + d.slice(1).toLowerCase()).join(', ')
}

// D30 pass 1: moved from profile/page.tsx unchanged (IA consolidation --
// PROFILE becomes ACCOUNT). Content, queries, and copy are byte-identical
// except three internal links updated to the new route names this same
// pass introduces (/dashboard/reservations -> /dashboard/bookings,
// /dashboard/sessions -> /dashboard/offerings) -- routing maintenance, not
// a content change. /dashboard/profile now redirects here.
//
// Flagging, not fixing, in this pass: this page still carries the
// upcoming-reservations list, the compact calendar, and the "sessions you
// booked" rail -- all now duplicated by the consolidated /dashboard/bookings
// view. Left in place because removing them is a content decision outside
// "routes only, no content changes."
export default async function DashboardAccountPage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()
  const nowUtc = DateTime.utc()
  const monthStartIso = nowUtc.startOf('month').toISO() as string
  const monthEndIso = nowUtc.endOf('month').toISO() as string

  const [
    { data: profileRow },
    { data: tagRows },
    { data: modalityRows },
    { data: upcomingRows },
    { count: sessionsThisMonth },
    { count: sessionsAllTime },
    { count: communityCount },
    { data: stripeRows },
    { data: sessionTypeRows },
    { data: blockRows },
    { data: calendarRows },
    integration,
    seekerData,
  ] = await Promise.all([
    admin.from('practitioners').select('tagline, photo_url').eq('id', practitioner.id).maybeSingle(),
    admin.from('practitioner_modalities').select('modality_id, is_primary').eq('practitioner_id', practitioner.id),
    admin.from('modalities').select('id, name, slug, categories(name)').eq('is_approved', true).order('name'),
    admin
      .from('bookings')
      .select('id, start_datetime, booked_format, seeker_id, guest_name, session_types ( name )')
      .eq('practitioner_id', practitioner.id)
      .eq('status', 'confirmed')
      .gte('start_datetime', nowUtc.toISO() as string)
      .order('start_datetime', { ascending: true })
      .limit(3),
    admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('practitioner_id', practitioner.id)
      .in('status', ['confirmed', 'completed'])
      .gte('start_datetime', monthStartIso)
      .lte('start_datetime', monthEndIso),
    admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('practitioner_id', practitioner.id)
      .in('status', ['confirmed', 'completed']),
    admin.from('clients').select('id', { count: 'exact', head: true }).eq('practitioner_id', practitioner.id),
    admin
      .from('bookings')
      .select('amount_paid, amount_refunded')
      .eq('practitioner_id', practitioner.id)
      .eq('payment_status', 'paid')
      .gte('start_datetime', monthStartIso)
      .lte('start_datetime', monthEndIso),
    admin
      .from('session_types')
      .select('id, price, price_min, price_max')
      .eq('practitioner_id', practitioner.id)
      .eq('is_active', true),
    admin
      .from('availability_blocks')
      .select('recurrence_rule')
      .eq('practitioner_id', practitioner.id)
      .eq('is_active', true),
    admin
      .from('bookings')
      .select('start_datetime, status')
      .eq('practitioner_id', practitioner.id)
      .in('status', ['confirmed', 'completed', 'pending_payment', 'pending_approval']),
    loadIntegration(practitioner.id),
    loadSeekerData(practitioner.id),
  ])

  // Resolve client display names for the upcoming-reservations preview.
  // bookings.seeker_id references auth.users, not seekers, directly -- no FK
  // for PostgREST to embed across, so this is a two-step lookup.
  const seekerIds = Array.from(
    new Set((upcomingRows ?? []).map((r) => r.seeker_id as string | null).filter(Boolean))
  ) as string[]
  const seekerNameById: Record<string, string> = {}
  if (seekerIds.length > 0) {
    const { data: seekerRows } = await admin.from('seekers').select('id, full_name').in('id', seekerIds)
    for (const row of seekerRows ?? []) {
      seekerNameById[row.id as string] = row.full_name as string
    }
  }
  const upcoming = (upcomingRows ?? []).map((row) => {
    const st = row.session_types as unknown as { name: string } | null
    const seekerId = row.seeker_id as string | null
    const clientName = seekerId
      ? (seekerNameById[seekerId] ?? 'A client')
      : ((row.guest_name as string | null) ?? 'A client')
    return {
      id: row.id as string,
      startUtc: row.start_datetime as string,
      sessionName: st?.name ?? 'Session',
      clientName,
    }
  })

  const modalities = (modalityRows ?? []).map((m) => {
    const category = m.categories as { name?: string } | { name?: string }[] | null
    const categoryName = Array.isArray(category) ? (category[0]?.name ?? '') : (category?.name ?? '')
    return { id: m.id as string, name: m.name as string, slug: m.slug as string, category: categoryName }
  })
  const primaryTag = (tagRows ?? []).find((t) => t.is_primary)
  const secondaryTags = (tagRows ?? []).filter((t) => !t.is_primary)

  const abundanceThisMonth = (stripeRows ?? []).reduce((sum, row) => {
    const paid = (row.amount_paid as number | null) ?? 0
    const refunded = (row.amount_refunded as number | null) ?? 0
    return sum + (paid - refunded)
  }, 0)

  const prices = (sessionTypeRows ?? []).flatMap((s) => {
    const vals: number[] = []
    if (s.price != null) vals.push(s.price as number)
    if (s.price_min != null) vals.push(s.price_min as number)
    if (s.price_max != null) vals.push(s.price_max as number)
    return vals
  })
  const priceRange =
    prices.length === 0 ? null : `$${Math.min(...prices)} – $${Math.max(...prices)}`

  const openDays = openDaysLabel((blockRows ?? []).map((b) => (b.recurrence_rule as string | null)))

  const calendarMarkers: CalendarBookingMarker[] = (calendarRows ?? []).map((row) => ({
    isoDate: DateTime.fromISO(row.start_datetime as string).toISODate() as string,
    kind: row.status === 'confirmed' || row.status === 'completed' ? 'confirmed' : 'held',
  }))

  const firstName = practitioner.full_name.trim().split(/\s+/)[0] || 'there'
  const asClientUpcoming = seekerData.upcoming.slice(0, 2)

  return (
    <main className="px-8 py-12">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-16 xl:flex-row xl:gap-10">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="caption text-dark opacity-70">GUIDE DASHBOARD</p>
              <h1 className="mt-2">Welcome back, {firstName}</h1>
            </div>
            <ProfileSection slug={practitioner.slug} isPublished={practitioner.is_published} />
          </div>

          <div className="mt-12">
            <h2>Your profile</h2>
            <div className="mt-6 flex flex-col gap-8 border border-border bg-surface p-6 sm:flex-row">
              <PortraitEditor initialPhotoUrl={profileRow?.photo_url ?? null} />
              <div className="flex min-w-0 flex-1 flex-col gap-8">
                <DisplayNameEditor
                  initialFullName={practitioner.full_name}
                  initialTagline={profileRow?.tagline ?? null}
                />
                <ModalitiesEditor
                  modalities={modalities}
                  initialPrimaryId={(primaryTag?.modality_id as string | undefined) ?? null}
                  initialSecondaryIds={secondaryTags.map((t) => t.modality_id as string)}
                />
              </div>
            </div>
          </div>

          <div className="mt-12">
            <div className="flex items-baseline justify-between">
              <h2>Upcoming reservations</h2>
              <Link href="/dashboard/bookings" className="caption text-olive">
                SEE ALL
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="mt-4 max-w-[60ch] text-dark">
                Nothing booked yet. Reservations will show here once someone books you.
              </p>
            ) : (
              <ul className="mt-6 flex flex-col gap-3">
                {upcoming.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between border border-border bg-surface px-4 py-3"
                  >
                    <span className="caption text-dark">
                      {row.sessionName} · {row.clientName}
                    </span>
                    <span className="flex items-center gap-4">
                      <span className="caption text-dark/60">
                        {DateTime.fromISO(row.startUtc).toFormat('ccc, LLL d, h:mm a')}
                      </span>
                      <Link href={`/dashboard/bookings/${row.id}`} className="caption text-olive">
                        DETAILS
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              href="/dashboard/availability"
              className="block border border-border bg-surface px-4 py-4 transition-colors hover:border-olive"
            >
              <p className="caption text-dark/60">HOURS</p>
              <p className="mt-2 text-dark">{openDays}</p>
              <p className="caption mt-2 text-olive">EDIT AVAILABILITY</p>
            </Link>
            <Link
              href="/dashboard/offerings"
              className="block border border-border bg-surface px-4 py-4 transition-colors hover:border-olive"
            >
              <p className="caption text-dark/60">MENU</p>
              <p className="mt-2 text-dark">
                {sessionTypeRows?.length ?? 0} offering{(sessionTypeRows?.length ?? 0) === 1 ? '' : 's'}
                {priceRange ? ` · ${priceRange}` : ''}
              </p>
              <p className="caption mt-2 text-olive">SESSIONS &amp; PRICES</p>
            </Link>
            <Link
              href="/dashboard/abundance"
              className="block border border-border bg-surface px-4 py-4 transition-colors hover:border-olive"
            >
              <p className="caption text-dark/60">ABUNDANCE VIA STRIPE</p>
              <p className="mt-2 text-dark">${abundanceThisMonth.toFixed(2)} this month</p>
              {/* Labeled so this can't be read as total earnings -- Stripe-
                  processed revenue only, offsite payments aren't counted. */}
              <p className="caption mt-1 text-dark/60">Excludes offsite payments.</p>
              <p className="caption mt-2 text-olive">PAYMENTS &amp; BILLING</p>
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="border border-border bg-surface px-4 py-4">
              <p className="caption text-dark/60">SESSIONS</p>
              <p className="mt-2 text-dark">
                {sessionsThisMonth ?? 0} this month · {sessionsAllTime ?? 0} all time
              </p>
            </div>
            <div className="border border-border bg-surface px-4 py-4">
              <p className="caption text-dark/60">COMMUNITY</p>
              <p className="mt-2 text-dark">{communityCount ?? 0}</p>
            </div>
          </div>

          <div className="mt-16">
            <h2>Calendar sync</h2>
            <p className="mt-4 max-w-[60ch] text-dark">
              Connect your Google Calendar so booked sessions sync automatically and your outside
              commitments block off time. You can disconnect whenever you need to.
            </p>
            <div className="mt-6">
              <CalendarSettings
                connected={Boolean(integration)}
                calendarId={integration?.calendar_id ?? null}
                syncEnabled={integration?.sync_enabled ?? false}
              />
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-10 xl:w-[360px] xl:shrink-0">
          <div className="border border-border bg-surface p-6">
            <ReservationsCalendar markers={calendarMarkers} compact />
          </div>

          <div className="border border-border bg-surface p-6">
            <p className="label mb-4 text-dark">SESSIONS YOU BOOKED</p>
            {asClientUpcoming.length === 0 ? (
              <p className="text-dark">Nothing booked as a client yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {asClientUpcoming.map((b) => (
                  <li key={b.id}>
                    <p className="caption text-dark">
                      {b.sessionName} · {b.practitionerName}
                    </p>
                    <p className="caption mt-1 text-dark opacity-70">
                      {DateTime.fromISO(b.startUtc).toLocal().toFormat('ccc, LLL d, h:mm a')} ·{' '}
                      {b.bookedFormat === 'virtual' ? 'VIRTUAL' : 'IN PERSON'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/dashboard/bookings" className="caption mt-4 block text-olive">
              MANAGE MY BOOKINGS →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
