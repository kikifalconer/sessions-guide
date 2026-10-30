-- Guide-added group seat for a client who paid outside the platform.
-- google_event_id already exists on session_occurrences (0018). This file
-- does not add a column.
--
-- Apply in the Supabase SQL editor. Do not run this from the app.

create or replace function add_offsite_group_seat(
  p_occurrence_id uuid,
  p_guest_name text,
  p_guest_email text
) returns table (booking_id uuid, error text)
language plpgsql
set search_path = public
as $$
declare
  v_occ session_occurrences%rowtype;
  v_name text;
  v_email text;
  v_location_display text;
  v_location_place_id text;
  v_seats int;
  v_booking_id uuid;
begin
  v_name := btrim(coalesce(p_guest_name, ''));
  v_email := lower(btrim(coalesce(p_guest_email, '')));

  select *
  into v_occ
  from session_occurrences
  where id = p_occurrence_id
  for update;

  if not found or v_occ.status <> 'scheduled' then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  -- Free stale on-platform holds before the capacity check, same window as
  -- book_group_seat. Offsite rows are not included. This does not cancel
  -- PaymentIntents; the caller does that before the insert.
  update bookings
  set status = 'cancelled',
      cancellation_reason = 'payment_abandoned'
  where occurrence_id = v_occ.id
    and status = 'pending_payment'
    and payment_status = 'unpaid'
    and created_at < now() - interval '30 minutes';

  if v_name = '' or position('@' in v_email) < 2 then
    return query select null::uuid, 'invalid'::text;
    return;
  end if;

  if exists (
    select 1
    from bookings
    where occurrence_id = v_occ.id
      and status <> 'cancelled'
      and lower(guest_email) = v_email
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
    null,
    v_name,
    v_email,
    v_occ.format,
    v_location_display,
    v_location_place_id,
    v_occ.start_datetime,
    v_occ.end_datetime,
    'confirmed',
    'instant',
    'offsite',
    null
  )
  returning id into v_booking_id;

  return query select v_booking_id, null::text;
end;
$$;

revoke all on function add_offsite_group_seat(uuid, text, text) from public;
revoke all on function add_offsite_group_seat(uuid, text, text) from anon, authenticated;
grant execute on function add_offsite_group_seat(uuid, text, text) to service_role;
