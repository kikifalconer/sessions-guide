// Pure validation + normalization for session_types writes, shared by the
// dashboard server actions and their tests. Kept separate from the 'use server'
// action module the way src/lib/booking.ts holds pure booking rules.
//
// This is the ONLY guard on the pricing rules and the confirmation/pricing
// composition: the database has no CHECK tying the price columns or
// confirmation_mode to pricing_model (audit STOP-2), so a missed case here is
// bad data. Keep it in lockstep with SessionTypeForm's conditional logic.

// Mirrors the DB CHECK enums on session_types (0001_initial_schema.sql).
export const FORMATS = ['virtual', 'in_person', 'both'] as const
export const PRICING_MODELS = ['fixed', 'sliding_scale', 'donation', 'inquire'] as const
export const CONFIRMATION_MODES = ['instant', 'pending_payment', 'pending_approval'] as const
export const PAYMENT_METHODS = ['stripe', 'offsite'] as const
export const CANCELLATION_POLICIES = ['none', 'flexible', 'moderate', 'strict'] as const

const GENERIC_ERROR = 'Something went wrong. Try again or contact support.'

// The payload the form sends. Override fields (confirmation/payment/cancellation)
// carry null to mean "inherit the practitioner default" — the same null-is-inherit
// contract the booking resolver reads (src/lib/booking.ts).
export type SessionTypeInput = {
  name: string
  description: string | null
  durationMinutes: number
  format: string
  modalityId: string
  pricingModel: string
  price: number | null
  priceMin: number | null
  priceMax: number | null
  confirmationMode: string | null
  paymentMethod: string | null
  cancellationPolicy: string | null
  photoUrl: string | null
}

export type SessionTypeRow = {
  name: string
  description: string | null
  duration_minutes: number
  format: string
  modality_id: string
  pricing_model: string
  price: number | null
  price_min: number | null
  price_max: number | null
  confirmation_mode: string | null
  payment_method: string | null
  cancellation_policy: string | null
  photo_url: string | null
}

function inSet<T extends string>(set: readonly T[], value: string): value is T {
  return (set as readonly string[]).includes(value)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function validateSessionTypeInput(
  input: SessionTypeInput
): { row: SessionTypeRow } | { error: string } {
  const name = input.name?.trim()
  if (!name) return { error: 'Add a name for this session.' }

  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    return { error: 'Set a duration in minutes.' }
  }
  if (!inSet(FORMATS, input.format)) return { error: 'Choose a format.' }
  if (!input.modalityId) return { error: 'Choose a modality.' }
  if (!inSet(PRICING_MODELS, input.pricingModel)) return { error: 'Choose a pricing model.' }

  // Pricing conditional logic — must match the DB rules the database does NOT
  // enforce: fixed -> price; sliding_scale -> min+max; donation|inquire -> none.
  let price: number | null = null
  let priceMin: number | null = null
  let priceMax: number | null = null
  if (input.pricingModel === 'fixed') {
    if (!input.price || input.price <= 0) return { error: 'Set a price.' }
    price = round2(input.price)
  } else if (input.pricingModel === 'sliding_scale') {
    if (
      !input.priceMin ||
      !input.priceMax ||
      input.priceMin <= 0 ||
      input.priceMax < input.priceMin
    ) {
      return {
        error: 'Set a minimum and a maximum, with the maximum at or above the minimum.',
      }
    }
    priceMin = round2(input.priceMin)
    priceMax = round2(input.priceMax)
  }
  // donation | inquire: all price fields stay null.

  // confirmation_mode override. null = inherit the practitioner default.
  const confirmationMode = input.confirmationMode
  if (confirmationMode !== null) {
    if (!inSet(CONFIRMATION_MODES, confirmationMode)) return { error: GENERIC_ERROR }
    // pending_payment has no meaning without a transaction at booking time;
    // inquire never books or charges, so the combination is incoherent. The
    // form hides this option for inquire; this is the server-side mirror.
    if (confirmationMode === 'pending_payment' && input.pricingModel === 'inquire') {
      return { error: GENERIC_ERROR }
    }
  }

  const paymentMethod = input.paymentMethod
  if (paymentMethod !== null && !inSet(PAYMENT_METHODS, paymentMethod)) {
    return { error: GENERIC_ERROR }
  }

  const cancellationPolicy = input.cancellationPolicy
  if (cancellationPolicy !== null && !inSet(CANCELLATION_POLICIES, cancellationPolicy)) {
    return { error: GENERIC_ERROR }
  }

  const photoUrl = input.photoUrl
  if (photoUrl !== null && !photoUrl.startsWith('https://res.cloudinary.com/')) {
    return { error: 'That upload did not come back from Cloudinary. Try again.' }
  }

  return {
    row: {
      name,
      description: input.description?.trim() || null,
      duration_minutes: input.durationMinutes,
      format: input.format,
      modality_id: input.modalityId,
      pricing_model: input.pricingModel,
      price,
      price_min: priceMin,
      price_max: priceMax,
      confirmation_mode: confirmationMode,
      payment_method: paymentMethod,
      cancellation_policy: cancellationPolicy,
      photo_url: photoUrl,
    },
  }
}
