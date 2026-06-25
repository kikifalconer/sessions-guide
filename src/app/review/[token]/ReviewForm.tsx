'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { submitReview } from './reviewActions'

// Review form. Submits only the rating and body (plus the token); the
// reviewer name and all ids are derived server-side from the booking.
export default function ReviewForm({
  token,
  practitionerName,
  practitionerSlug,
  reviewerName,
}: {
  token: string
  practitionerName: string
  practitionerSlug: string | null
  reviewerName: string
}) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    if (rating < 1) {
      setError('Choose a rating from one to five stars.')
      return
    }
    startTransition(async () => {
      const result = await submitReview({ token, rating, body })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDone(true)
    })
  }

  if (done) {
    return (
      <section>
        <h2 className="mb-4">Your review is posted.</h2>
        <p>Thank you for sharing your experience with {practitionerName}.</p>
        {practitionerSlug && (
          <Link href={`/${practitionerSlug}`} className="btn-secondary mt-8 inline-block">
            VIEW PROFILE
          </Link>
        )}
      </section>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-6"
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
        <label htmlFor="review_body" className="label mb-2 block text-dark">
          YOUR REVIEW (OPTIONAL)
        </label>
        <textarea
          id="review_body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={2000}
          className="w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive"
        />
      </div>

      <p className="caption text-dark opacity-70">POSTING AS {reviewerName.toUpperCase()}</p>

      {error && <p className="caption text-olive">{error}</p>}

      <div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'POSTING' : 'POST REVIEW'}
        </button>
      </div>
    </form>
  )
}
