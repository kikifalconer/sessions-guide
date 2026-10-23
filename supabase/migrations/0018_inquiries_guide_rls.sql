-- 0018_inquiries_guide_rls.sql
--
-- Guides can read their own inquiries and change only status / updated_at.
-- The public inquiry form still inserts through the service role, so there
-- is no INSERT policy here. Anon stays locked out.
--
-- 0010 enabled RLS on inquiries with no policies, which means the
-- authenticated role could not select or update its own rows. The dashboard
-- still reads and writes through the service-role client and checks
-- practitioner_id in application code. These policies are the database
-- backstop if a request ever uses the signed-in client.
--
-- Apply manually in Supabase (not auto-run), same as 0010.

create policy inquiries_select_own
  on public.inquiries
  for select
  to authenticated
  using (practitioner_id = auth.uid());

create policy inquiries_update_own
  on public.inquiries
  for update
  to authenticated
  using (practitioner_id = auth.uid())
  with check (
    practitioner_id = auth.uid()
    and status in ('new', 'read', 'archived')
  );

revoke update on table public.inquiries from anon, authenticated;
grant update (status, updated_at) on table public.inquiries to authenticated;
