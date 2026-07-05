'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { DateTime } from 'luxon'
import type { ReviewPromptView, SeekerReviewView } from '@/lib/seekerData'
import { submitOwnReview } from '@/app/account/actions'

// Seeker-side reviews: prompts for completed-but-unreviewed sessions plus the
// seeker's own reviews with their published state. Shared between /account
// REVIEWS and the practitioner MY SESSIONS tab.
// All copy is PLACEHOLDER — Kiki to review.

function PromptCard({ prompt }: { prompt: ReviewPromptView }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  if (done) {
    return (
      <div className="border border-border bg-surface px-4 py-3">
        <p>Your review of {prompt.practitionerName} is posted. Thank you.</p>
      </div>
    )
  }

  return (
    <div className="border border-border bg-surface">
      <div className="flex items-baseline justify-between gap-4 px-4 py-3">
        <span className="min-w-0">
          <span className="label block text-dark">{prompt.sessionName.toUpperCase()}</span>
          <span className="mt-1 block font-heading text-sm font-light text-dark">
            with {prompt.practitionerName},{' '}
            {DateTime.fromISO(prompt.startUtc).toLocal().toFormat('LLLL d, yyyy')}
          </span>
        </span>
        {!open && (
          <button type="button" className="btn-secondary shrink-0" onClick={() => setOpen(true)}>
            LEAVE A REVIEW
          </button>
        )}
      </div>

      {open && (
        <form
          className="flex flex-col gap-5 border-t border-border px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            if (rating < 1) {
              setError('Choose a rating from one to five stars.')
              return
            }
            startTransition(async () => {
              const result = await submitOwnReview({
                bookingId: prompt.bookingId,
                rating,
                body,
              })
              if (!result.ok) {
                setError(result.error)
                return
              }
              setDone(true)
            })
          }}
        >
          <div>
            <p className="label mb-2 text-dark">YOUR RATING</p>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="text-[1.75rem] leading-none text-olive"
                >
                  {n <= (hover || rating) ? '★' : '☆'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor={`review_body_${prompt.bookingId}`} className="label mb-2 block text-dark">
              YOUR REVIEW (OPTIONAL)
            </label>
            <textarea
              id={`review_body_${prompt.bookingId}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive"
            />
          </div>

          {error && <p className="caption text-olive">{error}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'POSTING' : 'POST REVIEW'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              NOT NOW
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function SeekerReviews({
  prompts,
  reviews,
}: {
  prompts: ReviewPromptView[]
  reviews: SeekerReviewView[]
}) {
  if (prompts.length === 0 && reviews.length === 0) {
    return <p>Reviews you write after your sessions will live here.</p>
  }

  return (
    <div className="flex flex-col gap-10">
      {prompts.length > 0 && (
        <section>
          <h5 className="mb-4 text-dark">SHARE HOW IT WENT</h5>
          <div className="flex flex-col gap-3">
            {prompts.map((p) => (
              <PromptCard key={p.bookingId} prompt={p} />
            ))}
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section>
          <h5 className="mb-4 text-dark">YOUR REVIEWS</h5>
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="border border-border bg-surface px-4 py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0">
                    <span className="text-olive">
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </span>{' '}
                    <span className="font-heading text-sm font-light text-dark">
                      {r.practitionerName},{' '}
                      {DateTime.fromISO(r.createdAt).toLocal().toFormat('LLLL d, yyyy')}
                    </span>
                  </span>
                  <span className="caption shrink-0 text-olive">
                    {r.isPublished ? 'PUBLISHED' : 'PENDING'}
                  </span>
                </div>
                {r.body && <p className="mt-2">{r.body}</p>}
                {r.practitionerSlug && (
                  <Link href={`/${r.practitionerSlug}/reviews`} className="caption mt-2 inline-block text-olive">
                    SEE ALL REVIEWS
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
