import Image from 'next/image'
import Link from 'next/link'
import { cardCrop } from '@/lib/cloudinary'

export type SessionCard = {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  photoUrl: string | null
  isInquire: boolean
}

export default function SessionsSection({
  practitionerName,
  practitionerSlug,
  sessions,
  disclaimer,
}: {
  practitionerName: string
  practitionerSlug: string
  sessions: SessionCard[]
  disclaimer?: string | null
}) {
  return (
    <section className="mx-auto w-full max-w-[1200px] border-t border-border px-6 py-14">
      <h3 className="text-center uppercase">{`${practitionerName}'s`}</h3>

      <div className="mt-1 flex justify-center">
        <Image
          src="/sessions.svg"
          alt="Sessions"
          width={1432}
          height={333}
          className="h-auto w-[clamp(200px,35vw,360px)]"
          priority
        />
      </div>

      {disclaimer && (
        <div className="mt-10 border border-border bg-surface px-6 py-5">
          <p className="caption text-dark">{disclaimer}</p>
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="mt-12 text-center text-dark">
          {"Please inquire above if you wish to learn of this practitioner's sessions."}
        </p>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2">
          {sessions.map((session) => (
            <article key={session.id} className="flex flex-col">
              <div className="relative aspect-video w-full bg-surface">
                {session.photoUrl && (
                  <Image
                    src={cardCrop(session.photoUrl, 800, 450)}
                    alt={session.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 588px"
                    className="object-cover"
                  />
                )}
              </div>

              <p className="caption mt-4 text-dark">{session.name}</p>
              <p className="caption mt-1 text-dark opacity-70">
                {session.durationMinutes} MINUTES
              </p>
              {session.description && (
                <p className="mt-3">{session.description}</p>
              )}

              <div className="mt-4">
                {session.isInquire ? (
                  // pricing_model 'inquire' is not a booking; it routes to the
                  // inquiry form carrying this session's context (D11).
                  <Link
                    href={`/${practitionerSlug}/inquire/${session.id}`}
                    className="btn-secondary inline-block"
                  >
                    INQUIRE
                  </Link>
                ) : (
                  <Link
                    href={`/${practitionerSlug}/book/${session.id}`}
                    className="btn-primary inline-block"
                  >
                    BOOK SESSION
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
