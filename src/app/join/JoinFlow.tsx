'use client'

import { useState } from 'react'
import StepAccount from './steps/StepAccount'
import StepName from './steps/StepName'
import StepModalities from './steps/StepModalities'
import StepBio from './steps/StepBio'
import StepPhotos from './steps/StepPhotos'
import StepLinks from './steps/StepLinks'

export type ModalityOption = {
  id: string
  name: string
  slug: string
  category: string
}

export type PractitionerPrefill = {
  fullName: string
  tagline: string
  bio: string
  photoUrl: string | null
  bannerUrl: string | null
  link1: string
  link2: string
  link3: string
} | null

const TOTAL_STEPS = 6

export default function JoinFlow({
  initialStep,
  isSignedIn,
  modalities,
  prefill,
  initialPrimaryId,
  initialSecondaryIds,
}: {
  initialStep: number
  isSignedIn: boolean
  modalities: ModalityOption[]
  prefill: PractitionerPrefill
  initialPrimaryId: string | null
  initialSecondaryIds: string[]
}) {
  const [step, setStep] = useState(initialStep)

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  const back = () => setStep((s) => Math.max(s - 1, 1))

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <p className="label mb-10 text-dark">
          STEP {step} OF {TOTAL_STEPS}
        </p>

        {step === 1 && (
          <StepAccount isSignedIn={isSignedIn} onNext={next} />
        )}
        {step === 2 && (
          <StepName
            initialFullName={prefill?.fullName ?? ''}
            initialTagline={prefill?.tagline ?? ''}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 3 && (
          <StepModalities
            modalities={modalities}
            initialPrimaryId={initialPrimaryId}
            initialSecondaryIds={initialSecondaryIds}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 4 && (
          <StepBio
            initialBio={prefill?.bio ?? ''}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 5 && (
          <StepPhotos
            initialBannerUrl={prefill?.bannerUrl ?? null}
            initialPhotoUrl={prefill?.photoUrl ?? null}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 6 && (
          <StepLinks
            initialLink1={prefill?.link1 ?? ''}
            initialLink2={prefill?.link2 ?? ''}
            initialLink3={prefill?.link3 ?? ''}
            onBack={back}
          />
        )}
      </div>
    </main>
  )
}
