import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { requirePractitioner } from '../../requirePractitioner'
import NotesEditor from '../NotesEditor'

export const metadata = { title: `client | ${BRAND_NAME}` }

export default async function DashboardCommunityClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()

  const { data: client } = await admin
    .from('clients')
    .select('id, practitioner_id, seeker_id, guest_name, guest_email, notes, session_count, first_booked_at, last_booked_at')
    .eq('id', clientId)
    .maybeSingle()

  if (!client || client.practitioner_id !== practitioner.id) notFound()

  const seekerId = client.seeker_id as string | null
  let name = (client.guest_name as string | null) ?? 'A client'
  let email = (client.guest_email as string | null) ?? null

  if (seekerId) {
    const [{ data: seekerRow }, { data: userData }] = await Promise.all([
      admin.from('seekers').select('full_name').eq('id', seekerId).maybeSingle(),
      admin.auth.admin.getUserById(seekerId),
    ])
    name = (seekerRow?.full_name as string | undefined) ?? name
    email = userData.user?.email ?? email
  }

  return (
    <main className="px-8 py-12">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10">
        <div>
          <h1>{name}</h1>
          <p className="mt-4 text-dark">{email ?? 'No contact email on file.'}</p>
          <p className="caption mt-2 text-dark opacity-70">
            {client.session_count as number} session{(client.session_count as number) === 1 ? '' : 's'}{' '}
            completed
          </p>
        </div>

        <NotesEditor clientId={client.id as string} initialNotes={client.notes as string | null} />
      </div>
    </main>
  )
}
