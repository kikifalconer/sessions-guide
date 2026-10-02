# sessions.guide — Roadmap (from 2026-07-26)

Backend first, proven, then the story. Each phase ends with its exit criteria met — not with a date.

## Phase A — Ground Truth & Audit (this project's core)
Phase 0 ground-truth pass, then audit areas A1–A13 per `backend-audit-plan.md`. Output: `audit-findings.md`, corrected docs, decided OD-1/OD-2/OD-3.

## Phase B — Fix & Harden
Work the findings ledger Critical→Low in single-concern passes; close the 🟡 gaps that belong to the backend (GAP-1 approval flow + TD2 rider, GAP-2 busy-merge, GAP-5 tree hygiene, GAP-6 Supabase items); land decided items (OD-1, OD-2, OD-3/RL-1); consolidate TD8 if a fourth rating surface is coming. Re-verify each fix live.

## Phase C — Launch-Gate Config & Dress Rehearsal
TD9 Resend domain + per-flow delivery re-observation · TD6 key sequence completed · TD1 token encryption (target 2026-09-01, before public practitioner signup) · TD3 Option B anon policies (or explicit re-acceptance for invite-only) · Stripe live-mode checklist prepared · full end-to-end demo (backend-audit-plan exit criterion 6). Backend is now declared trustworthy.

## Phase D — Frontend, Storytelling, UX
Only now. Pull forward from the archive project: `design-system.md`, `brand-voice.md`, `content-copy-tasks.md`, `product-spec.md` (refresh against post-audit reality first). Scope includes: holding-page retirement and `/explore`→`/` promotion (D12 note), practitioner-marketing / SAGES / ABOUT pages (flip held-out nav links), category hero imagery (DEBT-1), profile polish, seeker UX passes, OD-4 tier entitlements design, editorial content via the pages system.

## Phase E — Public Launch Prep (beyond this project)
Self-serve practitioner signup + billing enforcement (reverses the invite-phase billing deferral) · discussion boards (D22; requires RL-1 shipped) · TD11 real admin role before any second admin · Stripe live keys · counsel items (CASL/Spam Act, UGC hosting) · TD4 cities table when organic multi-city data exists.

---

**Working agreement across phases:** decisions get logged with the next D-number; debt gets an ID in `known-issues.md` the day it's accepted; docs are updated in the same pass as the code they describe.
