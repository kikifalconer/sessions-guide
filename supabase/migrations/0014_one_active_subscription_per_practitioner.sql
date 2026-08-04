-- 0014_one_active_subscription_per_practitioner.sql
--
-- F-23: subscriptions had a unique constraint on stripe_subscription_id only,
-- so nothing at the DB level stopped one practitioner from holding several
-- subscriptions at once. Combined with the Sage redemption route (which checked
-- that a CODE was unredeemed, never that the PRACTITIONER already had a
-- subscription), one practitioner could redeem several codes and end up billed
-- once per subscription when they added a card.
--
-- Partial unique index rather than a plain constraint: cancelled / unpaid /
-- incomplete rows are history and must be allowed to accumulate. Only the
-- entitlement-granting statuses are constrained. The status list here MUST stay
-- in sync with ACTIVE_SUBSCRIPTION_STATUSES in src/lib/tiers.ts.
--
-- SAFE TO APPLY NOW: prod `subscriptions` is empty (verified in Phase 0), so
-- there are no existing duplicates to reconcile. This is the cheapest this
-- constraint will ever be to add.
--
-- NOTE: with this in place, a webhook upsert that would create a SECOND active
-- row for a practitioner will fail rather than silently duplicate. Stripe will
-- retry it, and the failure is the signal that something upstream created a
-- subscription it should not have.
--
-- IMPORTANT: apply manually in Supabase (SQL editor or CLI). Not auto-run.

create unique index if not exists subscriptions_one_active_per_practitioner
  on subscriptions (practitioner_id)
  where status in ('active', 'trialing', 'past_due');
