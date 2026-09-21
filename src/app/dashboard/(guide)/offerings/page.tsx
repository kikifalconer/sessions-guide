import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { requirePractitioner } from '../requirePractitioner'
import SessionsManager from '../SessionsManager'

export const metadata = { title: `offerings | ${BRAND_NAME}` }

// D30 pass 1: moved from sessions/page.tsx unchanged (IA consolidation --
// SESSIONS becomes MY OFFERINGS). No internal /dashboard links in this file
// to update. /dashboard/sessions now redirects here.
export default async function DashboardOfferingsPage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()

  const [{ data: stRows }, { data: tagRows }, { data: modalityRows }] = await Promise.all([
    admin
      .from('session_types')
      .select(
        'id, name, description, duration_minutes, format, modality_id, pricing_model, price, price_min, price_max, payment_method, cancellation_policy, confirmation_mode, photo_url, is_active'
      )
      .eq('practitioner_id', practitioner.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from('practitioner_modalities')
      .select('modality_id')
      .eq('practitioner_id', practitioner.id),
    admin
      .from('modalities')
      .select('id, name, slug, categories(name)')
      .eq('is_approved', true)
      .order('name'),
  ])

  const sessionTypes = (stRows ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    description: (s.description as string | null) ?? null,
    durationMinutes: s.duration_minutes as number,
    format: s.format as string,
    modalityId: s.modality_id as string,
    pricingModel: s.pricing_model as string,
    price: (s.price as number | null) ?? null,
    priceMin: (s.price_min as number | null) ?? null,
    priceMax: (s.price_max as number | null) ?? null,
    paymentMethod: (s.payment_method as string | null) ?? null,
    cancellationPolicy: (s.cancellation_policy as string | null) ?? null,
    confirmationMode: (s.confirmation_mode as string | null) ?? null,
    photoUrl: (s.photo_url as string | null) ?? null,
    isActive: s.is_active as boolean,
  }))

  const modalities = (modalityRows ?? []).map((m) => {
    const category = m.categories as { name?: string } | { name?: string }[] | null
    const categoryName = Array.isArray(category) ? (category[0]?.name ?? '') : (category?.name ?? '')
    return {
      id: m.id as string,
      name: m.name as string,
      slug: m.slug as string,
      category: categoryName,
    }
  })

  const modalityNameById: Record<string, string> = Object.fromEntries(
    modalities.map((m) => [m.id, m.name])
  )

  const taggedModalityIds = (tagRows ?? []).map((t) => t.modality_id as string)

  const practitionerDefaults = {
    paymentMethod: practitioner.payment_method ?? 'stripe',
    cancellationPolicy: practitioner.cancellation_policy ?? 'none',
    confirmationMode: practitioner.confirmation_mode ?? 'instant',
  }

  return (
    <main className="px-8 py-12">
      <div className="mx-auto w-full max-w-[1200px]">
        <h1>Session types</h1>
        <p className="mt-4 max-w-[60ch] text-dark">
          These are the sessions seekers can book with you. Set the format, length, and price
          for each one, and add as many as you offer.
        </p>
        <div className="mt-10">
          <SessionsManager
            sessionTypes={sessionTypes}
            modalities={modalities}
            taggedModalityIds={taggedModalityIds}
            defaults={practitionerDefaults}
            modalityNameById={modalityNameById}
          />
        </div>
      </div>
    </main>
  )
}
