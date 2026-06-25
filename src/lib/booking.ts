// Pure booking resolution rules shared by the booking page and its actions.
// Resolution order is always: session type override, then practitioner
// default. See decisions.md for the no-Connect fallback decision.

export type ConfirmationMode = 'instant' | 'pending_payment' | 'pending_approval'
export type PricingModel = 'fixed' | 'sliding_scale' | 'donation' | 'inquire'

export type PractitionerBookingFields = {
  payment_method: string | null
  cancellation_policy: string | null
  confirmation_mode: ConfirmationMode | null
  stripe_account_id: string | null
  offsite_payment_instructions: string | null
}

export type SessionTypeBookingFields = {
  payment_method: string | null
  cancellation_policy: string | null
  confirmation_mode: ConfirmationMode | null
  pricing_model: PricingModel
  price: number | null
  price_min: number | null
  price_max: number | null
}

export function resolveConfirmationMode(
  st: SessionTypeBookingFields,
  p: PractitionerBookingFields
): ConfirmationMode {
  return st.confirmation_mode ?? p.confirmation_mode ?? 'instant'
}

export function resolvePaymentMethod(
  st: SessionTypeBookingFields,
  p: PractitionerBookingFields
): 'stripe' | 'offsite' {
  const method = st.payment_method ?? p.payment_method ?? 'stripe'
  return method === 'offsite' ? 'offsite' : 'stripe'
}

export function resolveCancellationPolicy(
  st: SessionTypeBookingFields,
  p: PractitionerBookingFields
): 'none' | 'flexible' | 'moderate' | 'strict' {
  const policy = st.cancellation_policy ?? p.cancellation_policy ?? 'none'
  if (policy === 'flexible' || policy === 'moderate' || policy === 'strict') return policy
  return 'none'
}

export const CANCELLATION_POLICY_COPY: Record<string, string> = {
  none: 'Cancellations are handled directly with your practitioner.',
  flexible: 'Full refund if cancelled 24 hours or more before your session.',
  moderate:
    'Full refund if cancelled 72 hours or more before your session. 50% refund within 72 hours.',
  strict:
    'Full refund if cancelled 7 days or more before your session. No refund within 7 days.',
}

// Whether this booking takes a card on-platform right now.
// pending_approval never charges upfront: the practitioner may decline,
// and charging before approval risks refund churn (see decisions.md).
export function resolveChargingNow(
  st: SessionTypeBookingFields,
  p: PractitionerBookingFields,
  connectReady: boolean
): boolean {
  if (resolvePaymentMethod(st, p) !== 'stripe') return false
  if (!connectReady) return false
  if (resolveConfirmationMode(st, p) === 'pending_approval') return false
  if (st.pricing_model === 'fixed') return Boolean(st.price && st.price > 0)
  return st.pricing_model === 'sliding_scale' || st.pricing_model === 'donation'
}

// Validates and resolves the charge amount in dollars. Returns null when invalid.
export function resolveChargeAmount(
  st: SessionTypeBookingFields,
  requestedAmount: number | null
): number | null {
  if (st.pricing_model === 'fixed') {
    return st.price && st.price > 0 ? st.price : null
  }
  if (st.pricing_model === 'sliding_scale') {
    if (requestedAmount === null || st.price_min === null || st.price_max === null) return null
    if (requestedAmount < st.price_min || requestedAmount > st.price_max) return null
    return Math.round(requestedAmount * 100) / 100
  }
  if (st.pricing_model === 'donation') {
    if (requestedAmount === null || requestedAmount < 1) return null
    return Math.round(requestedAmount * 100) / 100
  }
  return null
}

// Initial booking status when no on-platform charge happens at booking time.
export function initialStatusWithoutCharge(mode: ConfirmationMode): string {
  if (mode === 'instant') return 'confirmed'
  if (mode === 'pending_approval') return 'pending_approval'
  return 'pending_payment'
}
