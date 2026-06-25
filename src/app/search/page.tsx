import Link from 'next/link'
import SiteHeader from '@/components/site-header'
import PractitionerCard from '@/components/PractitionerCard'
import { DISCOVERY_HOME } from '@/lib/routes'
import {
  discoverSearch,
  approvedModalities,
  derivableCities,
  type SearchFormat,
} from '@/lib/discovery'

export const metadata = { title: 'Search | sessions.guide' }

const PSYCHEDELIC_DISCLAIMER =
  'Psychedelic journey facilitation may be subject to local laws and regulations. Practitioners and clients are solely responsible for ensuring compliance with the laws of their jurisdiction.'

const FIELD =
  'w-full border border-border bg-surface px-3 py-2 font-ui text-[0.8rem] uppercase tracking-[0.04em] text-dark outline-none focus:border-olive sm:w-auto'

const FORMATS: SearchFormat[] = ['any', 'in_person', 'virtual']
const FORMAT_LABEL: Record<SearchFormat, string> = {
  any: 'ANY FORMAT',
  in_person: 'IN PERSON',
  virtual: 'VIRTUAL',
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ modality?: string; format?: string; city?: string }>
}) {
  const sp = await searchParams
  const modalitySlug = sp.modality || undefined
  const citySlug = sp.city || undefined
  const format: SearchFormat =
    sp.format === 'in_person' || sp.format === 'virtual' ? sp.format : 'any'

  const [cards, modalityGroups, cities] = await Promise.all([
    discoverSearch({ modalitySlug, format, citySlug }),
    approvedModalities(),
    derivableCities(),
  ])

  const hasPsychedelic = cards.some((p) => p.hasPsychedelic)
  const hasFilters = Boolean(modalitySlug || citySlug || format !== 'any')

  return (
    <main className="min-h-screen bg-bg">
      <SiteHeader />

      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <nav className="caption mb-6 text-dark" aria-label="Breadcrumb">
          <Link href={DISCOVERY_HOME} className="text-olive">
            EXPLORE
          </Link>
          <span className="px-2 opacity-50">›</span>
          <span>SEARCH</span>
        </nav>

        <h2 className="mb-8">Search</h2>

        {/* URL-driven filters: a native GET form (shareable links, works without
            JS). Stacks on mobile, a row on desktop. */}
        <form
          method="get"
          action="/search"
          className="mb-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <label className="flex flex-col gap-1">
            <span className="label text-dark">MODALITY</span>
            <select name="modality" defaultValue={modalitySlug ?? ''} className={FIELD}>
              <option value="">ANY MODALITY</option>
              {modalityGroups.map((g) => (
                <optgroup key={g.category} label={g.category}>
                  {g.modalities.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label text-dark">FORMAT</span>
            <select name="format" defaultValue={format} className={FIELD}>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABEL[f]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label text-dark">CITY</span>
            <select name="city" defaultValue={citySlug ?? ''} className={FIELD}>
              <option value="">ANY CITY</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="btn-primary">
            SEARCH
          </button>
        </form>

        {hasPsychedelic && (
          <div className="mb-8 border border-border bg-surface px-4 py-3">
            <p className="caption text-dark">{PSYCHEDELIC_DISCLAIMER}</p>
          </div>
        )}

        {cards.length === 0 ? (
          <p className="text-dark">
            {hasFilters
              ? 'No practitioners match these filters. Try fewer, or browse by category.'
              : 'No practitioners are listed yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((p) => (
              <PractitionerCard key={p.id} practitioner={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
