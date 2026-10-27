-- 0018_group_sessions.sql
--
-- Group sessions (Alchemist-tier only; the tier gate is application code, not
-- a constraint here). A session type with max_capacity null stays 1:1. A
-- session type with max_capacity >= 2 is a group type. Each dated event is a
-- session_occurrences row; each client books one seat, which is a bookings
-- row pointing at that occurrence.
--
-- Overlap:
--   * no_overlapping_bookings (0003) is rebuilt so it covers 1:1 rows only
--     (occurrence_id is null). Group seats overlap each other on purpose.
--   * no_overlapping_occurrences stops two scheduled or cancelling occurrences
--     for the same practitioner from overlapping. 'cancelling' blocks the
--     window the same way 'scheduled' does; 'cancelled' does not.
--   * Triggers reject a 1:1 booking that overlaps a scheduled or cancelling
--     occurrence, and the reverse. Both take
--     pg_advisory_xact_lock(hashtext(practitioner_id::text)) before reading
--     the other table, so the check sees every writer, not only the app.
--
-- book_group_seat is the only insert path that should create a group seat.
-- It locks the occurrence, cancels this occurrence's stale on-platform holds
-- (pending_payment, unpaid, older than 30 minutes; never offsite), then
-- returns a row. 'full', 'already_booked', and 'started' are values in that
-- row, not exceptions, so the cancel commits when the seat is not granted.
-- 'not_found' and a bad booking field still raise and roll the statement back.
-- The booking span is the occurrence span (end_datetime is the occurrence end,
-- never start + duration_minutes). The function does not cancel the Stripe
-- PaymentIntent on the cancelled holds.
--
-- RLS: session_occurrences is enabled with NO policies (0010). Execute on
-- book_group_seat is revoked from anon/authenticated.
--
-- IMPORTANT: apply manually in the Supabase SQL editor. Not auto-run.

create extension if not exists btree_gist;

-- 1. session_types.max_capacity. Null = 1:1. A group type holds at least 2.
alter table session_types
  add column max_capacity int null
  constraint session_types_max_capacity_check
  check (max_capacity is null or max_capacity >= 2);

-- 2. session_occurrences. Location stays on availability_blocks. format is a
-- concrete virtual|in_person choice; a 'both' block may host either, which
-- the application checks. This table does not store location.
create table session_occurrences (
  id                    uuid primary key default gen_random_uuid(),
  practitioner_id       uuid not null references practitioners(id) on delete cascade,
  session_type_id       uuid not null references session_types(id),
  availability_block_id uuid not null references availability_blocks(id),
  format                text not null check (format in ('virtual', 'in_person')),
  start_datetime        timestamptz not null,
  end_datetime          timestamptz not null,
  capacity              int not null check (capacity >= 2),
  status                text not null default 'scheduled'
                          check (status in ('scheduled', 'cancelling', 'cancelled')),
  google_event_id       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint session_occurrences_end_after_start check (end_datetime > start_datetime)
);

alter table session_occurrences
  add constraint no_overlapping_occurrences
  exclude using gist (
    practitioner_id with =,
    tstzrange(start_datetime, end_datetime) with &&
  ) where (status in ('scheduled', 'cancelling'));

alter table session_occurrences enable row level security;

-- 3. bookings.occurrence_id. Null = 1:1. Set = one seat in that occurrence.
alter table bookings
  add column occurrence_id uuid null references session_occurrences(id);

create index bookings_occurrence_id_idx
  on bookings (occurrence_id)
  where occurrence_id is not null;

-- One non-cancelled seat per client per occurrence. A cancelled row does not
-- block a later booking. Null seeker_id (historical guests) is outside this
-- index; group seats always carry seeker_id.
create unique index one_seat_per_seeker_per_occurrence
  on bookings (occurrence_id, seeker_id)
  where status <> 'cancelled'
    and occurrence_id is not null
    and seeker_id is not null;

-- Rebuild the 0003 exclusion so group seats (occurrence_id set) are not
-- treated as 1:1 conflicts with each other. The name is unchanged.
alter table bookings drop constraint no_overlapping_bookings;

alter table bookings
  add constraint no_overlapping_bookings
  exclude using gist (
    practitioner_id with =,
    tstzrange(start_datetime, end_datetime) with &&
  ) where (status <> 'cancelled' and occurrence_id is null);

-- 4. Cross-table overlap. 1:1 means occurrence_id is null and status is not
-- cancelled (pending holds, confirmed, and completed all count). An
-- occurrence counts while it is scheduled or cancelling.
create or replace function reject_booking_occurrence_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.occurrence_id is not null or new.status = 'cancelled' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.practitioner_id::text));

  if exists (
    select 1
    from session_occurrences o
    where o.practitioner_id = new.practitioner_id
      and o.status in ('scheduled', 'cancelling')
      and tstzrange(o.start_datetime, o.end_datetime)
          && tstzrange(new.start_datetime, new.end_datetime)
  ) then
    raise exception 'occurrence_overlap' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger bookings_reject_occurrence_overlap
  before insert or update on bookings
  for each row
  execute function reject_booking_occurrence_overlap();

create or replace function reject_occurrence_booking_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status not in ('scheduled', 'cancelling') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.practitioner_id::text));

  if exists (
    select 1
    from bookings b
    where b.practitioner_id = new.practitioner_id
      and b.occurrence_id is null
      and b.status <> 'cancelled'
      and tstzrange(b.start_datetime, b.end_datetime)
          && tstzrange(new.start_datetime, new.end_datetime)
  ) then
    raise exception 'occurrence_overlap' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger session_occurrences_reject_booking_overlap
  before insert or update on session_occurrences
  for each row
  execute function reject_occurrence_booking_overlap();

-- Trigger functions are not part of the API. PUBLIC's default execute grant
-- would otherwise include service_role, so grant that role back explicitly
-- after the revoke or its inserts cannot fire the triggers.
revoke all on function reject_booking_occurrence_overlap() from public, anon, authenticated;
revoke all on function reject_occurrence_booking_overlap() from public, anon, authenticated;
grant execute on function reject_booking_occurrence_overlap() to service_role;
grant execute on function reject_occurrence_booking_overlap() to service_role;

-- 5. book_group_seat. Locks the occurrence row, then inserts one seat.
-- Returns one row: booking_id set and error null on success. error is
-- 'started', 'already_booked', or 'full' when the seat is not granted, and
-- booking_id is null. Those are not exceptions, so the stale-hold update
-- below commits with the call. Callers must not roll the transaction back
-- on those three values.
--
-- Raises (message, errcode P0001) 'not_found' for a null seeker, a missing
-- id, or any status other than 'scheduled' (cancelling and cancelled accept
-- no new seats). A booking field the table rejects (status, confirmation_mode,
-- payment_status) still raises and rolls this statement back, including the
-- stale-hold update.
--
-- Stale on-platform holds on this occurrence are set to cancelled
-- (cancellation_reason payment_abandoned) after the occurrence is locked and
-- known scheduled, and before started / already_booked / capacity. Same
-- predicate as expireStaleHolds: pending_payment, payment_status unpaid,
-- created_at older than 30 minutes. Offsite rows are never included and hold
-- a seat until the guide cancels them (OD-2). Cancelling the row does not
-- cancel its Stripe PaymentIntent.
create or replace function book_group_seat(
  p_occurrence_id uuid,
  p_seeker_id uuid,
  p_confirmation_mode text,
  p_status text,
  p_payment_status text,
  p_notes text
) returns table (booking_id uuid, error text)
language plpgsql
set search_path = public
as $$
declare
  v_occ session_occurrences%rowtype;
  v_location_display text;
  v_location_place_id text;
  v_seats int;
  v_booking_id uuid;
begin
  if p_seeker_id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  select *
  into v_occ
  from session_occurrences
  where id = p_occurrence_id
  for update;

  if not found or v_occ.status <> 'scheduled' then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  -- Same shape as expireStaleHolds: status + cancellation_reason only.
  -- Runs before any denial return so a denied seat still leaves the hold
  -- cancelled. A later raise (bad input) rolls this update back.
  update bookings
  set status = 'cancelled',
      cancellation_reason = 'payment_abandoned'
  where occurrence_id = v_occ.id
    and status = 'pending_payment'
    and payment_status = 'unpaid'
    and created_at < now() - interval '30 minutes';

  if v_occ.start_datetime <= now() then
    return query select null::uuid, 'started'::text;
    return;
  end if;

  if exists (
    select 1
    from bookings
    where occurrence_id = v_occ.id
      and seeker_id = p_seeker_id
      and status <> 'cancelled'
  ) then
    return query select null::uuid, 'already_booked'::text;
    return;
  end if;

  select count(*)
  into v_seats
  from bookings
  where occurrence_id = v_occ.id
    and status <> 'cancelled';

  if v_seats >= v_occ.capacity then
    return query select null::uuid, 'full'::text;
    return;
  end if;

  select location_display, location_place_id
  into v_location_display, v_location_place_id
  from availability_blocks
  where id = v_occ.availability_block_id;

  if v_occ.format <> 'in_person' then
    v_location_display := null;
    v_location_place_id := null;
  end if;

  begin
    insert into bookings (
      practitioner_id,
      availability_block_id,
      session_type_id,
      occurrence_id,
      seeker_id,
      guest_name,
      guest_email,
      booked_format,
      booked_location_display,
      booked_location_place_id,
      start_datetime,
      end_datetime,
      status,
      confirmation_mode,
      payment_status,
      notes
    ) values (
      v_occ.practitioner_id,
      v_occ.availability_block_id,
      v_occ.session_type_id,
      v_occ.id,
      p_seeker_id,
      null,
      null,
      v_occ.format,
      v_location_display,
      v_location_place_id,
      v_occ.start_datetime,
      v_occ.end_datetime,
      p_status,
      p_confirmation_mode,
      p_payment_status,
      nullif(btrim(p_notes), '')
    )
    returning id into v_booking_id;
  exception
    when unique_violation then
      if sqlerrm like '%one_seat_per_seeker_per_occurrence%' then
        return query select null::uuid, 'already_booked'::text;
        return;
      end if;
      raise;
  end;

  return query select v_booking_id, null::text;
end;
$$;

revoke all on function book_group_seat(uuid, uuid, text, text, text, text) from public;
revoke all on function book_group_seat(uuid, uuid, text, text, text, text) from anon, authenticated;
grant execute on function book_group_seat(uuid, uuid, text, text, text, text) to service_role;
