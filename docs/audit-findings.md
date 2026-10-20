# guides'space — Audit Findings

Created 2026-08-27 as an empty ledger. F-1 through F-25 were assigned in
code comments, `docs/platform-state.md`, `docs/schema.md`, and Track B
fixes before this file was populated. **Do not reuse those numbers.**
Next new finding is **F-29**.

Evidence rule (`docs/backend-audit-plan.md`): an area passes only on
observed live behavior. Code inspection is a note, not a pass.

---

## A3 — Booking engine (2026-10-07, code inspection only)

Scope: all three confirmation modes; `no_overlapping_bookings` under
concurrency; hold lifecycle including C1 PaymentIntent cancel on expiry;
stale `pending_approval` expiry (M2, 7-day); offsite durability (OD-2);
booked location/format copied at insert; seeker auth server-side; slot
params surviving the auth round-trip.

**Not passed.** No live requests, DB rows, Stripe events, or emails were
observed in this session. Dashboard/explore merge `6bc6b8f` did not add a
second production insert into `bookings`. TRADE-1 is not in the tree.

### Track B recap (claims, re-checked against current `main`)

| ID | July claim | Current code | Live? |
|---|---|---|---|
| F-18 | Approval-hold expiry filtered `payment_status = 'unpaid'`, so offsite/`!connectReady` approval holds never expired. Fixed in `2046c1d`. | **Fix intact.** `expireStaleHolds` updates `status = pending_approval` with no `payment_status` filter (`src/app/[slug]/book/[sessionTypeId]/actions.ts:100-113`). Comment records the OD-2 reading: durability is for offsite **pending_payment**, not approval holds. | Never verified live (July claim). Still **NEEDS-LIVE**. |
| F-19 | `finalizeBooking` takes only `bookingId` and never checks the caller owns it. Open. | **Fixed in code, NEEDS-LIVE.** Client action `requireUser()` + `seeker_id` match; webhook calls `finalizeBookingCore`. | n/a |
| F-20 | Hold expiry ran only when someone loaded that practitioner's book page. Fixed in `2046c1d` by cron pass (d). | **Fix intact.** `/api/cron/complete-bookings` pass (d) (`src/app/api/cron/complete-bookings/route.ts:15-18, 203-223`) selects practitioners with `pending_payment` or `pending_approval` older than 30 min and calls the same `expireStaleHolds`. | Never verified live. Still **NEEDS-LIVE**. |

### F-19 — High — Unauthenticated `finalizeBooking`

**Fixed in code, NEEDS-LIVE.**

Client-facing `finalizeBooking` now `requireUser()`s and matches `seeker_id` (generic error on mismatch). Logic lives in `finalizeBookingCore` (`src/lib/bookingFinalize.ts`). The Stripe webhook (`src/app/api/stripe/webhook/route.ts`) calls the core, still unauthenticated.

### F-28 — High — Unauthenticated `releaseHold`

Renumbered from F-26 (F-26 and F-27 were already used in the July Track B record).

**Fixed in code, NEEDS-LIVE.**

Client-facing `releaseHold` now `requireUser()`s and matches `seeker_id`. `releaseHoldCore` in `src/lib/bookingFinalize.ts` is what `createBookingHold`'s catch calls.

### Writer inventory (`bookings` insert/update)

Production **insert** (only one path):

| Site | Lines | A3 item |
|---|---|---|
| `insertBooking` via `createBooking` / `createBookingHold` | `src/app/[slug]/book/[sessionTypeId]/actions.ts:297-342, 367-423, 428-505` | All three modes; exclusion (23P01 → `SLOT_TAKEN_ERROR`); durable `booked_format` / `booked_location_*`; seeker auth (`requireUser` `:355-362, :368, :429`) |

Production **updates** (no second creator):

| Site | Lines | A3 item |
|---|---|---|
| `expireStaleHolds` | `actions.ts:91-141` | 30-min unpaid hold + C1 PI cancel; M2 7-day `pending_approval` (no payment_status filter, F-18); does **not** expire `pending_payment` + `offsite` (OD-2) |
| `createBookingHold` PI attach | `actions.ts:489-493` | Hold lifecycle |
| `finalizeBookingCore` | `src/lib/bookingFinalize.ts` | Paid confirm; atomic `pending_payment` → `confirmed`. Webhook + owned action. |
| `releaseHoldCore` | `src/lib/bookingFinalize.ts` | Abandon hold + C1 (F-28: owned action; catch uses core) |
| Cron pass (a)(b)(d) | `src/app/api/cron/complete-bookings/route.ts:107-111, 156-157, 184-186, 203-223` | F-20 expiry driver; completion/review not A3 |
| Stripe webhook orphan refund | `src/app/api/stripe/webhook/route.ts:69-76` | A4; calls `finalizeBookingCore` (C2 / F-19) |
| `cancelBooking` | `src/lib/cancellation.ts:297-315` | A5; frees exclusion slot |
| `reconcileRefundFromEvent` | `src/lib/cancellation.ts:425-449` | A5 |
| `createCalendarEventForBooking` / `deleteCalendarEventForBooking` | `src/lib/calendarSync.ts:65, 127` | `google_event_id` only (A7) |

Not production writers: `scripts/seed-verify.mjs:54` (seed). Dashboard/explore (`6bc6b8f`) only **read** bookings or cancel via `cancelBooking` (`src/app/dashboard/(guide)/actions.ts:63-87`, `src/app/account/actions.ts:51-58`). `src/proxy.ts` refreshes the auth cookie only — no booking writes. No `middleware.ts`. No TRADE writer.

`offsite_paid_at` (0016) has **no application writer**. A3 durability of offsite holds is `status` + `payment_status = 'offsite'`, not that column.

### Per-item status

| A3 item | Status | Evidence / blocker |
|---|---|---|
| Instant confirm (Path A, no charge) | **CODE-OK / NEEDS-LIVE** | `resolveChargingNow` false → `createBooking` → `initialStatusWithoutCharge('instant')` = `confirmed` (`src/lib/booking.ts:99-104`, `actions.ts:399-415`). |
| Instant/paid (Path B) | **CODE-OK / NEEDS-LIVE** | `createBookingHold` inserts `pending_payment`/`unpaid`, PI on Connect, `finalizeBooking` + webhook C2. |
| Offsite `pending_payment` mode | **CODE-OK / NEEDS-LIVE** | Path A status `pending_payment`, `payment_status` `offsite` (`actions.ts:405-406`). UI "reserved" (`BookingFlow.tsx:471`). |
| `pending_approval` create | **CODE-OK / NEEDS-LIVE** | Path A, never charges (`booking.ts:60-69`). |
| `pending_approval` → confirmed E2E | **FINDING (existing GAP-1)** | No approve/decline writer. Dashboard detail is explicit (`src/app/dashboard/(guide)/bookings/[bookingId]/page.tsx:20-21`). Cannot mark this mode passed end-to-end. |
| Exclusion under concurrency | **CODE-OK / NEEDS-LIVE** | Migration `supabase/migrations/0003_booking_flow_prereqs.sql:16-23`; insert maps `23P01` (`actions.ts:293-339`). Race: `validateSlot` then insert — constraint is the lock. |
| Hold expiry + C1 PI cancel | **CODE-OK / NEEDS-LIVE** | Unpaid `pending_payment` older than 30 min cancelled `payment_abandoned`; `cancelHeldPaymentIntent` (`src/lib/paymentIntents.ts:28-51`). Cron F-20 intact. |
| M2 7-day approval expiry | **CODE-OK / NEEDS-LIVE** | `STALE_APPROVAL_DAYS = 7` (`actions.ts:38, 107-113`). F-18 intact. |
| OD-2 offsite durability | **CODE-OK / NEEDS-LIVE**; decision still **OPEN** | Expiry query requires `payment_status = 'unpaid'`. Offsite rows are never auto-cancelled. `known-issues.md` OD-2 still asks durable-forever vs a policy. F-18 comment: OD-2 is pending_**payment**, not approval holds. |
| Booked location/format durable | **CODE-OK / NEEDS-LIVE** | Insert copies `booked_format`, and for `in_person` `booked_location_display` / `booked_location_place_id` from the block (`actions.ts:323-325`). Later block edits cannot change the row. |
| Seeker auth server-side | **CODE-OK / NEEDS-LIVE** | `createBooking` / `createBookingHold` / `finalizeBooking` / `releaseHold` require a session. F-19 and F-28: **Fixed in code, NEEDS-LIVE.** Webhook still calls `finalizeBookingCore` unauthenticated. `src/proxy.ts` does not enforce booking auth. |
| Slot params after auth | **CODE-OK / NEEDS-LIVE** | `BookingFlow.tsx:169-173, 337` puts `?slot=&format=` on `next`; `sanitizeNext` allows `?` query (`magic-link-form.tsx:15-20`); confirm redirects to `next` (`auth/confirm/route.ts:66`); page re-validates against generated slots (`page.tsx:141-149`). Magic-link **send** itself is blocked until TD9. |

### TD9 (emails)

`sendBookingEmails` is fire-and-forget; a Resend 403 does not fail the booking (`src/lib/email.ts:48-51`, `actions.ts:702`). Until TD9 (domain + `RESEND_FROM_EMAIL`), A3 cannot observe: confirmation / request / reserved mail, or the magic-link that carries `?slot=&format=` (OTP send uses Resend/Supabase SMTP). Live booking **rows** can still be checked in the DB. Do not treat "The details are in your email" (`BookingFlow.tsx:489`) as evidence.

---

## F-28 — High — Unauthenticated `releaseHold`

Renumbered from the A3 F-26 slot (F-26/F-27 already used in July Track B).

- **File:** `src/app/[slug]/book/[sessionTypeId]/actions.ts` (action); `src/lib/bookingFinalize.ts` (`releaseHoldCore`)
- **Evidence:** was an exported server action with no session check.
- **Status:** **Fixed in code, NEEDS-LIVE.**
