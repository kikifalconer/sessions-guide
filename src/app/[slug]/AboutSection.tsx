import Image from 'next/image'
import Link from 'next/link'
import { faceCrop } from '@/lib/cloudinary'

export default function AboutSection({
  bio,
  photoUrl,
  practitionerSlug,
}: {
  bio: string | null
  photoUrl: string | null
  practitionerSlug: string
}) {
  return (
    <section className="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,33%)_1fr] gap-4 px-4 py-10 sm:gap-10 sm:px-6 sm:py-14 md:grid-cols-[3fr_7fr]">
      <div className="relative aspect-[3/4] w-full bg-surface">
        {photoUrl && (
          <Image
            src={faceCrop(photoUrl, 600)}
            alt=""
            fill
            sizes="(max-width: 768px) 33vw, 360px"
            className="object-cover"
          />
        )}
      </div>

      <div>
        <h5 className="mb-4 text-dark">ABOUT</h5>
        {bio ? (
          <p className="whitespace-pre-line">{bio}</p>
        ) : (
          <p>This practitioner has not added a bio yet.</p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn-primary">
            BOOK
          </button>
          {/* Profile-level inquiry (no session context), per D11. */}
          <Link
            href={`/${practitionerSlug}/inquire`}
            className="btn-secondary inline-block"
          >
            INQUIRE
          </Link>
        </div>
      </div>
    </section>
  )
}
