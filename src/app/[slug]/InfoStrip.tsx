import Link from 'next/link'

export type ProfileLink = { label: string; href: string }

export default function InfoStrip({
  modalityNames,
  locations,
  links,
  ratingAverage,
  ratingCount,
  practitionerSlug,
}: {
  modalityNames: string[]
  locations: string[]
  links: ProfileLink[]
  ratingAverage: number | null
  ratingCount: number
  practitionerSlug: string
}) {
  const filledStars = ratingAverage ? Math.round(ratingAverage) : 0

  return (
    <section className="mx-auto w-full max-w-[1200px] border-y border-border px-2 py-6 sm:px-6 sm:py-10">
      <div className="grid min-w-0 grid-cols-4 gap-2 sm:gap-8">
        <div className="min-w-0 overflow-hidden">
          <h5 className="mb-2 truncate text-[0.6rem] text-dark sm:mb-3 sm:text-[0.8rem]">MODALITIES</h5>
          {modalityNames.map((name) => (
            <p key={name} className="truncate text-[0.7rem] sm:text-[0.95rem]">{name}</p>
          ))}
        </div>

        <div className="min-w-0 overflow-hidden">
          <h5 className="mb-2 truncate text-[0.6rem] text-dark sm:mb-3 sm:text-[0.8rem]">LOCATIONS</h5>
          {locations.map((city) => (
            <p key={city} className="truncate text-[0.7rem] sm:text-[0.95rem]">{city}</p>
          ))}
        </div>

        <div className="min-w-0 overflow-hidden">
          <h5 className="mb-2 truncate text-[0.6rem] text-dark sm:mb-3 sm:text-[0.8rem]">LINKS</h5>
          {links.map((link) => (
            <p key={link.label} className="truncate text-[0.7rem] sm:text-[0.95rem]">
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {link.label}
              </a>
            </p>
          ))}
        </div>

        <div className="min-w-0 overflow-hidden">
          <h5 className="mb-2 truncate text-[0.6rem] text-dark sm:mb-3 sm:text-[0.8rem]">RATING</h5>
          {ratingAverage !== null ? (
            <>
              <p className="truncate text-[0.7rem] text-olive sm:text-[0.95rem]" aria-label={`Rated ${ratingAverage.toFixed(1)} out of 5`}>
                {'★'.repeat(filledStars)}
                {'☆'.repeat(5 - filledStars)}
                <span className="ml-1 text-dark sm:ml-2">{ratingAverage.toFixed(1)}</span>
              </p>
              <p className="caption mt-1 truncate text-[0.6rem] sm:mt-2 sm:text-[0.75rem]">
                <Link href={`/${practitionerSlug}/reviews`} className="text-olive">
                  SEE ALL REVIEWS &gt;
                </Link>
              </p>
            </>
          ) : (
            <p className="truncate text-[0.6rem] text-dark opacity-70 sm:text-[0.75rem]">NO REVIEWS YET</p>
          )}
        </div>
      </div>
    </section>
  )
}
