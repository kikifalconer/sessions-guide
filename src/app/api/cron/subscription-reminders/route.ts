import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTrialReminderEmail } from '@/lib/email'
import { getSiteUrl } from '@/lib/siteUrl'

// Daily Vercel Cron (D25). Sends trial-end reminders for sage-code trials:
//   T-14: trial_end within 14 days, reminder_14_sent_at null.
//   T-1:  trial_end within 1 day, reminder_1_sent_at null.
// Each column is stamped only on a real send (sendTrialReminderEmail returns a
// boolean), so a transient Resend failure retries next pass and a sub can never
// be double-reminded. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
export const runtime = 'nodejs'

type AdminClient = ReturnType<typeof createAdminClient>

async function practitionerEmail(admin: AdminClient, id: string): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(id)
  return data.user?.email ?? null
}

function dateLabel(trialEndIso: string): string {
  return DateTime.fromISO(trialEndIso).toUTC().toFormat('LLLL d, yyyy')
}

export async function GET(req: NextRequest) {
  // Fail-closed auth, matching the complete-bookings cron.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'cron_secret_not_configured' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = DateTime.utc()
  const nowIso = now.toISO() as string
  const in14Iso = now.plus({ days: 14 }).toISO() as string
  const in1Iso = now.plus({ days: 1 }).toISO() as string
  const renewUrl = `${getSiteUrl()}/dashboard/billing`

  // T-14 candidates: trialing, trial_end in (now, now+14d], not yet reminded.
  const { data: t14 } = await admin
    .from('subscriptions')
    .select('id, practitioner_id, trial_end')
    .eq('status', 'trialing')
    .is('reminder_14_sent_at', null)
    .gt('trial_end', nowIso)
    .lte('trial_end', in14Iso)

  // T-1 candidates: trialing, trial_end in (now, now+1d], not yet reminded.
  const { data: t1 } = await admin
    .from('subscriptions')
    .select('id, practitioner_id, trial_end')
    .eq('status', 'trialing')
    .is('reminder_1_sent_at', null)
    .gt('trial_end', nowIso)
    .lte('trial_end', in1Iso)

  let sent14 = 0
  let sent1 = 0

  for (const row of t14 ?? []) {
    const trialEnd = row.trial_end as string | null
    if (!trialEnd) continue
    const email = await practitionerEmail(admin, row.practitioner_id as string)
    if (!email) continue // no address to reach; leave for a later pass
    const ok = await sendTrialReminderEmail({
      to: email,
      endDateLabel: dateLabel(trialEnd),
      renewUrl,
      daysBefore: 14,
    })
    if (ok) {
      await admin
        .from('subscriptions')
        .update({ reminder_14_sent_at: nowIso })
        .eq('id', row.id)
      sent14 += 1
    }
  }

  for (const row of t1 ?? []) {
    const trialEnd = row.trial_end as string | null
    if (!trialEnd) continue
    const email = await practitionerEmail(admin, row.practitioner_id as string)
    if (!email) continue
    const ok = await sendTrialReminderEmail({
      to: email,
      endDateLabel: dateLabel(trialEnd),
      renewUrl,
      daysBefore: 1,
    })
    if (ok) {
      await admin
        .from('subscriptions')
        .update({ reminder_1_sent_at: nowIso })
        .eq('id', row.id)
      sent1 += 1
    }
  }

  return NextResponse.json({ ok: true, reminder14Sent: sent14, reminder1Sent: sent1 })
}
