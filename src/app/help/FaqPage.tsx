import SiteHeader from '@/components/site-header'

// Shared server-rendered FAQ layout (no client JS): top-of-page anchor nav over
// its topic groups, then stacked Q&A under DM Mono uppercase group headers.
// Design: CSS-variable tokens only, no border-radius, hairline borders, ~1200px.

export type FaqItem = {
  q: string
  lead?: string // paragraph before any steps
  steps?: string[] // ordered how-to list
  trail?: string // paragraph after the steps
  note?: string // extra trailing paragraph (used for forward-looking sub-steps)
}

export type FaqGroup = { id: string; title: string; items: FaqItem[] }

export default function FaqPage({
  title,
  intro,
  groups,
}: {
  title: string
  intro: string
  groups: FaqGroup[]
}) {
  return (
    <>
      <SiteHeader />
      <main className="bg-bg">
        <section className="mx-auto max-w-[1200px] px-6 pb-10 pt-20">
          <h1>{title}</h1>
          <p className="mt-6 max-w-[60ch] text-dark">{intro}</p>

          <nav
            aria-label="Topics"
            className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6"
          >
            {groups.map((g) => (
              <a key={g.id} href={`#${g.id}`} className="label text-olive">
                {g.title}
              </a>
            ))}
          </nav>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 pb-24">
          {groups.map((g) => (
            <div key={g.id} id={g.id} className="scroll-mt-24 border-t border-border py-14">
              <h2 className="font-ui mb-8 uppercase tracking-[0.08em] text-dark text-[0.85rem]">
                {g.title}
              </h2>
              <div className="flex max-w-[70ch] flex-col gap-12">
                {g.items.map((item) => (
                  <div key={item.q}>
                    <h3 className="mb-3">{item.q}</h3>
                    {item.lead && <p className="text-dark">{item.lead}</p>}
                    {item.steps && (
                      <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-dark">
                        {item.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    )}
                    {item.trail && <p className="mt-3 text-dark">{item.trail}</p>}
                    {item.note && <p className="mt-3 text-dark">{item.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </>
  )
}
