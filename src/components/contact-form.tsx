'use client'

import { useState } from 'react'

// Shared form for the Help and Contact pages. Posts to /api/contact; the `topic`
// distinguishes the two. Calm, directional states per brand voice.

const FIELD =
  'w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive'

export default function ContactForm({ topic }: { topic: 'help' | 'contact' }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('pending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, topic }),
      })
      const json = await res.json()
      setState(res.ok && json.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <p className="max-w-[52ch] text-dark">
        Thank you. Your note is with us, and someone will be in touch soon.
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-[560px] flex-col gap-6">
      <div>
        <label htmlFor="cf_name" className="label mb-2 block text-dark">
          NAME
        </label>
        <input
          id="cf_name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="cf_email" className="label mb-2 block text-dark">
          EMAIL
        </label>
        <input
          id="cf_email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="cf_message" className="label mb-2 block text-dark">
          {topic === 'help' ? 'HOW CAN WE HELP' : 'YOUR MESSAGE'}
        </label>
        <textarea
          id="cf_message"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${FIELD} resize-y`}
        />
      </div>

      {state === 'error' && (
        <p className="caption text-olive">
          Something went wrong. Try again, or write to hello@sessions.guide.
        </p>
      )}

      <button type="submit" className="btn-primary self-start" disabled={state === 'pending'}>
        {state === 'pending' ? 'SENDING' : 'SEND'}
      </button>
    </form>
  )
}
