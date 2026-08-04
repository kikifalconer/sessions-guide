import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, getOrCreateStripeCustomer } from '@/lib/stripeCustomer'
import { tierToPriceId, ACTIVE_SUBSCRIPTION_STATUSES } from '@/lib/tiers'

// Sage code redemption (D25). Grants one free year of Elevated via a Stripe
// subscription with a 365-day trial and NO payment method collected; Stripe
// auto-cancels at trial end if none is added
// (trial_settings.end_behavior.missing_payment_method = 'cancel').
//
// Ordering is deliberate: the single-redemption CLAIM (conditional update) runs
// BEFORE any Stripe call, so two concurrent redemptions cannot both create a
// subscription. If Stripe then fails, the claim is released in a compensating
// update so the code is usable again. The Stripe subscription is created on the
// elevated_MONTHLY price so that, if the practitioner later adds a card, renewal
// defaults to monthly.
export const runtime = 'nodejs'

const TRIAL_DAYS = 365

function unixToIso(unix: number | null | undefined): string | null {
  return typeof unix === 'number' ? DateTime.fromSeconds(unix).toUTC().toISO() : null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { code?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  if (!code) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const admin = createAdminClient()
  const nowIso = DateTime.utc().toISO()

  // One active subscription per practitioner (F-23). Without this a
  // practitioner could redeem several Sage codes, each creating its own Stripe
  // subscription with its own 365-day trial — and be billed once per
  // subscription the moment they add a card. Checked before the claim so a
  // refused redemption never consumes the code.
  const { data: activeSub } = await admin
    .from('subscriptions')
    .select('id')
    .eq('practitioner_id', user.id)
    .in('status', [...ACTIVE_SUBSCRIPTION_STATUSES])
    .maybeSingle()
  if (activeSub) {
    return NextResponse.json({ error: 'already_subscribed' }, { status: 409 })
  }

  // Friendly-error probe: distinguishes not_found / already_redeemed / expired.
  const { data: existing } = await admin
    .from('sage_codes')
    .select('id, redeemed_by, expires_at')
    .eq('code', code)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (existing.redeemed_by) {
    return NextResponse.json({ error: 'already_redeemed' }, { status: 409 })
  }
  if (existing.expires_at && DateTime.fromISO(existing.expires_at as string) < DateTime.utc()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  // Atomic single-redemption claim. The WHERE guards both redemption and expiry,
  // so a lost race (two simultaneous redemptions) yields no row here.
  const { data: claimed } = await admin
    .from('sage_codes')
    .update({ redeemed_by: user.id, redeemed_at: nowIso })
    .eq('code', code)
    .is('redeemed_by', null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .select('id')
    .maybeSingle()
  if (!claimed) {
    // Someone else won the claim between the probe and here.
    return NextResponse.json({ error: 'already_redeemed' }, { status: 409 })
  }
  const claimedId = claimed.id as string

  // Create the trial subscription. On ANY failure, release the claim so the code
  // can be used again, then surface the error.
  // Held outside the try so the compensating path can undo a Stripe object that
  // was already created before a later step failed (F-24).
  let createdSubscriptionId: string | null = null

  try {
    const priceId = tierToPriceId('elevated', 'monthly')
    const customerId = await getOrCreateStripeCustomer(user.id)
    const stripe = getStripe()
    const trialEndUnix = Math.floor(DateTime.utc().plus({ days: TRIAL_DAYS }).toSeconds())

    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_end: trialEndUnix,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      metadata: { practitioner_id: user.id, sage_code_id: claimedId },
    })
    createdSubscriptionId = sub.id

    // Reflect the trial immediately (webhook reconciles idempotently later).
    const item = sub.items.data[0]
    await admin.from('subscriptions').upsert(
      {
        practitioner_id: user.id,
        stripe_subscription_id: sub.id,
        stripe_customer_id: customerId,
        tier: 'elevated',
        billing_cycle: 'monthly',
        status: sub.status,
        current_period_start: unixToIso(
          (item as unknown as { current_period_start?: number }).current_period_start
        ),
        current_period_end: unixToIso(
          (item as unknown as { current_period_end?: number }).current_period_end
        ),
        trial_end: unixToIso(sub.trial_end),
        updated_at: nowIso,
      },
      { onConflict: 'stripe_subscription_id' }
    )
    await admin
      .from('practitioners')
      .update({ subscription_tier: 'elevated' })
      .eq('id', user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[sage-redeem] Stripe/subscription write failed; releasing claim', code, err)

    // Cancel a subscription that was already created before the failure (F-24).
    // Releasing the code without this leaves a live 365-day trial on the
    // customer that no DB row knows about, and the next redemption of the
    // now-reusable code stacks a second one on top.
    if (createdSubscriptionId) {
      try {
        await getStripe().subscriptions.cancel(createdSubscriptionId)
      } catch (cancelErr) {
        console.error(
          '[sage-redeem] LOUD: orphaned Stripe subscription could not be cancelled',
          { subscription: createdSubscriptionId, practitioner: user.id },
          cancelErr
        )
      }
      await admin.from('subscriptions').delete().eq('stripe_subscription_id', createdSubscriptionId)
    }

    // Compensating update: un-redeem so the code is not consumed by a failed run.
    await admin
      .from('sage_codes')
      .update({ redeemed_by: null, redeemed_at: null })
      .eq('id', claimedId)
    return NextResponse.json({ error: 'redeem_failed' }, { status: 500 })
  }
}
