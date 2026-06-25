'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { submitInquiry } from './inquiryActions'

const fieldClass =
  'w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive'

// Inquiry form. Submits the slug + optional session id (both server-validated
// in the action) plus the seeker's name, email, and message.
export default function InquiryForm({
  slug,
  sessionTypeId,
  practitionerName,
  practitionerSlug,
}: {
  slug: string
  sessionTypeId: string | null
  practitionerName: string
  practitionerSlug: string
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await submitInquiry({ slug, sessionTypeId, name, email, message })
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
        <h2 className="mb-4">Your message has been sent.</h2>
        <p>{practitionerName} will reply to you by email.</p>
        <Link href={`/${practitionerSlug}`} className="btn-secondary mt-8 inline-block">
          BACK TO PROFILE
        </Link>
      </section>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-5"
    >
      <div>
        <label htmlFor="inq_name" className="label mb-2 block text-dark">
          NAME
        </label>
        <input
          id="inq_name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
          required
        />
      </div>
      <div>
        <label htmlFor="inq_email" className="label mb-2 block text-dark">
          EMAIL
        </label>
        <input
          id="inq_email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
          required
        />
      </div>
      <div>
        <label htmlFor="inq_message" className="label mb-2 block text-dark">
          YOUR MESSAGE
        </label>
        <textarea
          id="inq_message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={4000}
          className={fieldClass}
          required
        />
      </div>

      {error && <p className="caption text-olive">{error}</p>}

      <div className="flex items-center gap-4">
        <Link href={`/${practitionerSlug}`} className="btn-secondary inline-block">
          BACK
        </Link>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'SENDING' : 'SEND MESSAGE'}
        </button>
      </div>
    </form>
  )
}
