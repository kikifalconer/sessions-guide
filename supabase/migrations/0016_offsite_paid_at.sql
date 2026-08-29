alter table bookings
  add column if not exists offsite_paid_at timestamptz;

comment on column bookings.offsite_paid_at is
  'Guide-reported receipt of an offsite payment. Null = not reported paid.
   Does NOT affect payment_status, refund math, or hold durability (OD-2).';
