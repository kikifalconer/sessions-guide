'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/siteUrl'
import { updateSeekerSettings } from '@/app/account/actions'

// Seeker SETTINGS: full_name + D21 newsletter flag (server action, seekers
// upsert) and email change via Supabase's re-verify flow (browser client;
// Supabase emails confirmation links to complete the change).
// All copy is PLACEHOLDER — Kiki to review.

const fieldClass =
  'w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive'

export default function SeekerSettings({
  initialFullName,
  initialNewsletterOptIn,
  currentEmail,
}: {
  initialFullName: string
  initialNewsletterOptIn: boolean
  currentEmail: string | null
}) {
  const [fullName, setFullName] = useState(initialFullName)
  const [newsletter, setNewsletter] = useState(initialNewsletterOptIn)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [newEmail, setNewEmail] = useState('')
  const [emailMessage, setEmailMessage] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailPending, setEmailPending] = useState(false)

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage(null)
    setProfileError(null)
    startTransition(async () => {
      const result = await updateSeekerSettings({ fullName, newsletterOptIn: newsletter })
      if (!result.ok) {
        setProfileError(result.error)
        return
      }
      setProfileMessage('Saved.')
    })
  }

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailMessage(null)
    setEmailError(null)
    setEmailPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser(
      { email: newEmail.trim() },
      { emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent('/account')}` }
    )
    setEmailPending(false)
    if (error) {
      setEmailError('The email change could not be started. Try again or contact support.')
      return
    }
    setEmailMessage(
      'Check your email. Confirmation links have been sent so you can verify the change.'
    )
    setNewEmail('')
  }

  return (
    <div className="flex max-w-xl flex-col gap-12">
      <form onSubmit={saveProfile} className="flex flex-col gap-6">
        <div>
          <label htmlFor="settings_full_name" className="label mb-2 block text-dark">
            FULL NAME
          </label>
          <input
            id="settings_full_name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={fieldClass}
          />
        </div>

        {/* D21: express opt-in, freely revocable. */}
        <label htmlFor="settings_newsletter" className="flex items-start gap-3">
          <input
            id="settings_newsletter"
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
            className="mt-1 h-4 w-4 accent-olive"
          />
          <span className="font-heading text-sm font-light text-dark">
            Send me occasional notes from sessions.guide.
          </span>
        </label>

        {profileError && <p className="caption text-olive">{profileError}</p>}
        {profileMessage && <p className="caption text-dark">{profileMessage.toUpperCase()}</p>}

        <div>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? 'SAVING' : 'SAVE'}
          </button>
        </div>
      </form>

      <form onSubmit={changeEmail} className="flex flex-col gap-6">
        <div>
          <p className="label mb-2 text-dark">EMAIL</p>
          <p className="mb-4">{currentEmail ?? 'No email on file.'}</p>
          <label htmlFor="settings_new_email" className="label mb-2 block text-dark">
            NEW EMAIL
          </label>
          <input
            id="settings_new_email"
            type="email"
            autoComplete="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className={fieldClass}
          />
          <p className="caption mt-2 text-dark/60">
            WE SEND A CONFIRMATION LINK BEFORE ANYTHING CHANGES
          </p>
        </div>

        {emailError && <p className="caption text-olive">{emailError}</p>}
        {emailMessage && <p className="caption text-dark">{emailMessage.toUpperCase()}</p>}

        <div>
          <button type="submit" className="btn-secondary" disabled={emailPending}>
            {emailPending ? 'ONE MOMENT' : 'CHANGE EMAIL'}
          </button>
        </div>
      </form>
    </div>
  )
}
