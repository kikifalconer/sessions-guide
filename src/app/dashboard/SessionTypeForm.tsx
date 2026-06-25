'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { uploadToCloudinary, cardCrop } from '@/lib/cloudinary'
import {
  createSessionType,
  updateSessionType,
  addModalityToProfile,
} from './sessionTypeActions'
import type { SessionTypeInput } from '@/lib/sessionType'

export type ModalityOption = {
  id: string
  name: string
  slug: string
  category: string
}

export type SessionTypeRow = {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  format: string
  modalityId: string
  pricingModel: string
  price: number | null
  priceMin: number | null
  priceMax: number | null
  paymentMethod: string | null
  cancellationPolicy: string | null
  confirmationMode: string | null
  photoUrl: string | null
  isActive: boolean
}

export type PractitionerDefaults = {
  paymentMethod: string
  cancellationPolicy: string
  confirmationMode: string
}

const FIELD =
  'w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive'

const FORMAT_LABEL: Record<string, string> = {
  virtual: 'Virtual',
  in_person: 'In person',
  both: 'Virtual or in person',
}

const PRICING_LABEL: Record<string, string> = {
  fixed: 'Fixed price',
  sliding_scale: 'Sliding scale',
  donation: 'Donation',
  inquire: 'Inquire',
}

const PAYMENT_LABEL: Record<string, string> = {
  stripe: 'On platform (card)',
  offsite: 'Off platform',
}

const CANCELLATION_LABEL: Record<string, string> = {
  none: 'Handled directly',
  flexible: 'Flexible',
  moderate: 'Moderate',
  strict: 'Strict',
}

const CONFIRMATION_LABEL: Record<string, string> = {
  instant: 'Confirm instantly',
  pending_payment: 'Confirm once paid',
  pending_approval: 'I approve each request',
}

// '' in a select maps to null on the wire: null = inherit the practitioner default.
function toNull(value: string): string | null {
  return value === '' ? null : value
}

function num(value: string): number | null {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : null
}

export default function SessionTypeForm({
  sessionType,
  modalities,
  taggedModalityIds,
  defaults,
  onDone,
  onCancel,
}: {
  sessionType: SessionTypeRow | null
  modalities: ModalityOption[]
  taggedModalityIds: string[]
  defaults: PractitionerDefaults
  onDone: () => void
  onCancel: () => void
}) {
  const isEdit = Boolean(sessionType)
  // Local copy so the soft prompt clears immediately after a successful add.
  const [tagged, setTagged] = useState<Set<string>>(() => new Set(taggedModalityIds))

  const [name, setName] = useState(sessionType?.name ?? '')
  const [description, setDescription] = useState(sessionType?.description ?? '')
  const [duration, setDuration] = useState(
    sessionType ? String(sessionType.durationMinutes) : ''
  )
  const [format, setFormat] = useState(sessionType?.format ?? 'virtual')
  const [modalityId, setModalityId] = useState(
    sessionType?.modalityId ?? taggedModalityIds[0] ?? ''
  )
  const [pricingModel, setPricingModel] = useState(sessionType?.pricingModel ?? 'fixed')
  const [price, setPrice] = useState(sessionType?.price != null ? String(sessionType.price) : '')
  const [priceMin, setPriceMin] = useState(
    sessionType?.priceMin != null ? String(sessionType.priceMin) : ''
  )
  const [priceMax, setPriceMax] = useState(
    sessionType?.priceMax != null ? String(sessionType.priceMax) : ''
  )
  const [confirmationMode, setConfirmationMode] = useState(sessionType?.confirmationMode ?? '')
  const [paymentMethod, setPaymentMethod] = useState(sessionType?.paymentMethod ?? '')
  const [cancellationPolicy, setCancellationPolicy] = useState(
    sessionType?.cancellationPolicy ?? ''
  )
  const [photoUrl, setPhotoUrl] = useState<string | null>(sessionType?.photoUrl ?? null)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  // Modality picker (single select, searchable). Tagged modalities sort first.
  const [picking, setPicking] = useState(!modalityId)
  const [search, setSearch] = useState('')
  const modalityById = useMemo(
    () => new Map(modalities.map((m) => [m.id, m])),
    [modalities]
  )
  const selectedModality = modalityId ? modalityById.get(modalityId) : undefined
  const filteredModalities = useMemo(() => {
    const q = search.trim().toLowerCase()
    return modalities
      .filter(
        (m) =>
          q === '' ||
          m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const at = tagged.has(a.id) ? 0 : 1
        const bt = tagged.has(b.id) ? 0 : 1
        if (at !== bt) return at - bt
        return a.name.localeCompare(b.name)
      })
  }, [modalities, search, tagged])

  // pending_payment is incoherent for inquire (no transaction to be pending on).
  // If pricing flips to inquire while it is selected, reset to inherit.
  useEffect(() => {
    if (pricingModel === 'inquire' && confirmationMode === 'pending_payment') {
      setConfirmationMode('')
    }
  }, [pricingModel, confirmationMode])

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      setPhotoUrl(url)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Upload failed. Try again or use a different image.'
      )
    } finally {
      setUploading(false)
    }
  }

  const selectModality = (id: string) => {
    setModalityId(id)
    setPicking(false)
    setSearch('')
  }

  const addToProfile = () => {
    if (!modalityId) return
    setError(null)
    startTransition(async () => {
      const result = await addModalityToProfile(modalityId)
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
      } else {
        // Reflect the add locally so the soft prompt clears without a full reload.
        setTagged((prev) => new Set(prev).add(modalityId))
      }
    })
  }

  const submit = () => {
    setError(null)
    if (!modalityId) {
      setError('Choose a modality.')
      return
    }
    const input: SessionTypeInput = {
      name: name.trim(),
      description: description.trim() || null,
      durationMinutes: parseInt(duration, 10),
      format,
      modalityId,
      pricingModel,
      price: pricingModel === 'fixed' ? num(price) : null,
      priceMin: pricingModel === 'sliding_scale' ? num(priceMin) : null,
      priceMax: pricingModel === 'sliding_scale' ? num(priceMax) : null,
      confirmationMode: toNull(confirmationMode),
      paymentMethod: toNull(paymentMethod),
      cancellationPolicy: toNull(cancellationPolicy),
      photoUrl,
    }
    startTransition(async () => {
      const result = sessionType
        ? await updateSessionType(sessionType.id, input)
        : await createSessionType(input)
      if (result.ok) {
        onDone()
      } else {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
      }
    })
  }

  const untaggedSelected = Boolean(selectedModality && !tagged.has(selectedModality.id))
  const showPendingPayment = pricingModel !== 'inquire'

  return (
    <div className="mx-auto mt-10 w-full max-w-[640px]">
      <p className="label mb-8 text-dark">
        {isEdit ? 'EDIT SESSION TYPE' : 'NEW SESSION TYPE'}
      </p>

      <div className="flex flex-col gap-6">
        <div>
          <label htmlFor="st_name" className="label mb-2 block text-dark">
            NAME
          </label>
          <input
            id="st_name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="st_description" className="label mb-2 block text-dark">
            DESCRIPTION
          </label>
          <textarea
            id="st_description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${FIELD} resize-y`}
          />
        </div>

        <div>
          <label htmlFor="st_duration" className="label mb-2 block text-dark">
            DURATION (MINUTES)
          </label>
          <input
            id="st_duration"
            type="number"
            min={1}
            step={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="st_format" className="label mb-2 block text-dark">
            FORMAT
          </label>
          <select
            id="st_format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className={FIELD}
          >
            {Object.entries(FORMAT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Modality — single select, searchable, tagged modalities first. */}
        <div>
          <p className="label mb-2 text-dark">MODALITY</p>
          {selectedModality && !picking ? (
            <div className="flex items-center justify-between border border-olive bg-surface px-4 py-3">
              <span className="font-heading font-light text-dark">
                {selectedModality.name}
              </span>
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="caption text-olive"
              >
                CHANGE
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search modalities"
                className={FIELD}
              />
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto border border-border bg-light">
                {filteredModalities.length === 0 && (
                  <li className="px-4 py-3">
                    <p>No matches. Try a different search.</p>
                  </li>
                )}
                {filteredModalities.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => selectModality(m.id)}
                      className="flex w-full items-baseline justify-between px-4 py-3 text-left hover:bg-surface"
                    >
                      <span className="font-heading font-light text-dark">{m.name}</span>
                      <span className="caption text-dark opacity-60">
                        {tagged.has(m.id) ? 'ON YOUR PROFILE' : m.category}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {untaggedSelected && (
            <div className="mt-3 border border-border bg-surface px-4 py-3">
              <p className="caption text-dark">
                This modality is not on your profile yet.
              </p>
              <button
                type="button"
                onClick={addToProfile}
                disabled={pending}
                className="caption mt-2 text-olive"
              >
                ADD TO MY PROFILE
              </button>
            </div>
          )}
        </div>

        {/* Pricing — conditional fields mirror the DB rules the database does not
            enforce. */}
        <div>
          <label htmlFor="st_pricing" className="label mb-2 block text-dark">
            PRICING
          </label>
          <select
            id="st_pricing"
            value={pricingModel}
            onChange={(e) => setPricingModel(e.target.value)}
            className={FIELD}
          >
            {Object.entries(PRICING_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {pricingModel === 'fixed' && (
          <div>
            <label htmlFor="st_price" className="label mb-2 block text-dark">
              PRICE (USD)
            </label>
            <input
              id="st_price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={FIELD}
            />
          </div>
        )}

        {pricingModel === 'sliding_scale' && (
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="st_price_min" className="label mb-2 block text-dark">
                MINIMUM (USD)
              </label>
              <input
                id="st_price_min"
                type="number"
                min={0}
                step="0.01"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className={FIELD}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="st_price_max" className="label mb-2 block text-dark">
                MAXIMUM (USD)
              </label>
              <input
                id="st_price_max"
                type="number"
                min={0}
                step="0.01"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className={FIELD}
              />
            </div>
          </div>
        )}

        {(pricingModel === 'donation' || pricingModel === 'inquire') && (
          <p className="caption text-dark opacity-70">
            {pricingModel === 'donation'
              ? 'Seekers choose what to contribute at booking.'
              : 'Seekers reach you through an inquiry rather than booking directly.'}
          </p>
        )}

        {/* Confirmation — an override. Blank inherits the practitioner default. */}
        <div>
          <label htmlFor="st_confirmation" className="label mb-2 block text-dark">
            CONFIRMATION
          </label>
          <select
            id="st_confirmation"
            value={confirmationMode}
            onChange={(e) => setConfirmationMode(e.target.value)}
            className={FIELD}
          >
            <option value="">
              {`Use my default (${CONFIRMATION_LABEL[defaults.confirmationMode] ?? CONFIRMATION_LABEL.instant})`}
            </option>
            <option value="instant">{CONFIRMATION_LABEL.instant}</option>
            {showPendingPayment && (
              <option value="pending_payment">{CONFIRMATION_LABEL.pending_payment}</option>
            )}
            <option value="pending_approval">{CONFIRMATION_LABEL.pending_approval}</option>
          </select>
        </div>

        {/* Payment — an override. Blank inherits the practitioner default. */}
        <div>
          <label htmlFor="st_payment" className="label mb-2 block text-dark">
            PAYMENT
          </label>
          <select
            id="st_payment"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className={FIELD}
          >
            <option value="">
              {`Use my default (${PAYMENT_LABEL[defaults.paymentMethod] ?? PAYMENT_LABEL.stripe})`}
            </option>
            <option value="stripe">{PAYMENT_LABEL.stripe}</option>
            <option value="offsite">{PAYMENT_LABEL.offsite}</option>
          </select>
        </div>

        {/* Cancellation — an override. Blank inherits the practitioner default. */}
        <div>
          <label htmlFor="st_cancellation" className="label mb-2 block text-dark">
            CANCELLATION
          </label>
          <select
            id="st_cancellation"
            value={cancellationPolicy}
            onChange={(e) => setCancellationPolicy(e.target.value)}
            className={FIELD}
          >
            <option value="">
              {`Use my default (${CANCELLATION_LABEL[defaults.cancellationPolicy] ?? CANCELLATION_LABEL.none})`}
            </option>
            <option value="none">{CANCELLATION_LABEL.none}</option>
            <option value="flexible">{CANCELLATION_LABEL.flexible}</option>
            <option value="moderate">{CANCELLATION_LABEL.moderate}</option>
            <option value="strict">{CANCELLATION_LABEL.strict}</option>
          </select>
        </div>

        {/* Photo — optional, reuses the Cloudinary unsigned-upload helper. */}
        <div>
          <p className="label mb-2 text-dark">PHOTO</p>
          <div className="relative aspect-video w-full overflow-hidden border border-border bg-surface">
            {photoUrl && (
              <Image
                src={cardCrop(photoUrl, 800, 450)}
                alt="Session photo preview"
                fill
                sizes="(max-width: 768px) 100vw, 640px"
                className="object-cover"
              />
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            className="btn-secondary mt-3"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'UPLOADING' : photoUrl ? 'REPLACE PHOTO' : 'UPLOAD PHOTO'}
          </button>
        </div>

        {error && <p className="caption text-olive">{error}</p>}

        <div className="flex items-center gap-4">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={pending}>
            CANCEL
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={submit}
            disabled={pending || uploading}
          >
            {pending ? 'SAVING' : isEdit ? 'SAVE CHANGES' : 'CREATE SESSION TYPE'}
          </button>
        </div>
      </div>
    </div>
  )
}
