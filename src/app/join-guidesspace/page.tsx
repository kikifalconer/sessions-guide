import Image from 'next/image'
import type { ReactNode } from 'react'
import SiteHeader from '@/components/site-header'
import { BRAND_NAME } from '@/lib/brand'
import { buildMetadata } from '@/lib/metadata'
import { getSiteUrl } from '@/lib/siteUrl'
import { JsonLd, faqPageJsonLd } from '@/lib/seo/structuredData'
import MotionProvider from '@/components/motion/MotionProvider'
import StickyHeader from '@/components/motion/StickyHeader'
import RevealLines from '@/components/motion/RevealLines'
import RevealBlock from '@/components/motion/RevealBlock'
import ScrubScale from '@/components/motion/ScrubScale'
import StickyStack from '@/components/motion/StickyStack'
import JoinForms from './JoinForms'

// Practitioner-facing invitation page. Visible copy lives in the consts
// below (and a few inline strings) so it can be rewritten in one place.
//
// Two anchors are load-bearing and must keep their ids:
//   #how-it-works : the hero's secondary CTA scrolls here
//   #pricing      : no inbound link today. The global footer links to the
//                   /pricing ROUTE, not to this fragment. Kept because the
//                   id is a stable deep-link target, but nothing depends on
//                   it yet.
//
// Headings use bare h1/h2/h3 so they inherit the ITC Avant Garde Gothic Pro
// uppercase treatment from globals.css. Nothing here uppercases text in JSX;
// text-transform does that. Buttons reuse .btn-primary / .btn-secondary.
//
// Body copy lives in the consts below rather than inline JSX so apostrophes
// need no entity escaping and the FAQ can feed the visible list and the
// FAQPage JSON-LD from one array.

export const metadata = buildMetadata({
  concept: 'list your practice',
  description:
    'For guides, healers and wisdom keepers. Be found, booked and paid in one calm place. Your rates, your hours, your terms. No commission, ever.',
  path: '/join-guidesspace',
})

const HERO = {
  eyebrow: 'a booking platform for guides of the healing & transformational arts',
  h1: "Created to make Light workers' work lighter.",
  subhead:
    'Focus on your practice, not on admin with booking designed for you, not a pilates studio.',
  alt: 'Two open hands held out doing reiki.',
}

const ORIGIN = {
  heading: 'Created from the inside',
  body: "After working professionally with 2,700+ guides, I realised. Their work was beautifully diverse. Their challenges were the same.",
  footnote: '',
  close: `${BRAND_NAME} was created so you can focus on (and live off of) your sacred, life-changing work.`,
}

const PILLARS_INTRO = 'Three things stay fully yours.'

const PILLARS: { title: string; body: string }[] = [
  {
    title: 'Your money.',
    body: 'We take no comission ever. And we give you the power to choose how you get paid. Through our platform, or inperson, through a method you prefer, or You control how you get paid, whether through our platform, in person, or through your preferred method. That way you can keep your finances secret or keep them automated. Take payment online, in person, or by donation. Set your own rates and terms. We never take a commission.',
  },
  {
    title: 'Your place.',
    body: 'In person, virtual, or both. If your practice travels, your visibility travels with you.',
  },
  {
    title: 'Your time.',
    body: "Recurring hours or a single opening, in your own timezone. Nothing is bookable until you say it's ready.",
  },
]

const ABUNDANT = {
  heading: 'Receive with ease',
  first:
    'Get paid through Stripe the moment someone books, or receive it your own way. The choice is always yours.',
  // Split so the FEATURE-PENDING marker sits directly above the export clause.
  secondLead:
    'No commission. Not on any tier, not ever. And your clients are always yours: ',
  secondExport: 'export your list anytime.',
}

const TIME = {
  heading: 'Protect your time',
  gate: 'Calendar sync: Elevated and above.',
  first:
    "Connect Google Calendar and we'll check it before any booking is confirmed. New sessions appear there automatically, and clear themselves if cancelled.",
  second: "Your practice isn't bound to one room. Work virtually, in person, or both.",
  third: "We can see that you're busy. Never with what.",
}

const FOUND = {
  heading: "Be found by the people you're meant to serve",
  first:
    "Some already know what they're looking for. They'll find you by modality, category or city.",
  second:
    'Others only know that something needs to shift. Our category pages describe what each kind of work is for, so they can find their way to you without knowing its name.',
  third: 'No marketing degree required.',
}

const FOLLOW_UP = {
  heading: 'Every touchpoint, held with care',
  first:
    'Booking confirmations, change notices, and a gentle review invitation the day after, all sent in your name.',
  second: 'Questions from your page land in your inbox, ready for your reply.',
}

// Prices are deliberately unset placeholders. Do not substitute numbers here;
// they are set once the tier pricing is decided.
const TIERS: { name: string; body: string; price: string }[] = [
  {
    name: 'Trial',
    body: 'Your full profile with one session live. Enough to be found and booked.',
    price: '[PRICE / FREE]',
  },
  {
    name: 'Elevated',
    body: 'Unlimited sessions, plus Google Calendar sync.',
    price: '[PRICE]',
  },
  {
    name: 'Alchemist',
    body: 'Everything in Elevated, plus featured placement when people search.',
    price: '[PRICE]',
  },
]

const CLOSE = {
  heading: 'come home to your practice',
  first: 'Where your purpose, your practice and your power meet.',
  second: "If the tools you've been handed never quite fit, this one was made for you.",
  note: `${BRAND_NAME} is invitation-only while we grow with a small circle of guides. Invitations will widen as our foundation of real reviews grows.`,
}

// Single source for both the rendered FAQ and the FAQPage JSON-LD. Plain
// register, kept literal for answer-engine visibility.
const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Do you take a percentage of my sessions?',
    answer:
      'No. Clients pay into your own Stripe account. Our only revenue is your membership.',
  },
  {
    question: 'Do I need Stripe?',
    answer:
      "No. Prefer in person, donation, or your own arrangement? We'll pass your payment instructions to the client instead.",
  },
  {
    question: 'What fees are there?',
    answer: "None from us, on any tier. If you use Stripe, only Stripe's fee applies.",
  },
  {
    question: 'What do you send my clients?',
    answer:
      "Booking confirmations, cancellation and refund notices, and a review invitation about a day after the session. You get an alert when someone sends an inquiry. That's all.",
  },
  {
    question: 'Can I email my client list?',
    answer:
      'Not yet. Every message we send is tied to a real booking. No mailing lists, no campaigns.',
  },
  {
    question: 'Does it work with my calendar?',
    answer:
      'Yes, Google Calendar on Elevated and above. We check it before confirming a booking, and your sessions appear there too.',
  },
  {
    question: 'Can I set my own cancellation policy?',
    answer: 'Yes, for your whole practice or per session. Refunds follow your policy.',
  },
  {
    question: 'Who owns my client relationships?',
    answer: 'You do.',
  },
  {
    question: "Can I be found by people who don't know what to search for?",
    // Describes shipped discovery only. This answer is quoted verbatim into
    // FAQPage JSON-LD, so it must not imply a guided flow that does not exist.
    answer:
      'Yes. People can browse by category or city, or search a modality by name. Category pages explain what each kind of work is for, so someone can find you without knowing its name.',
  },
  {
    question: "Can I take down a review I don't like?",
    answer:
      "No. Reviews come only from people who actually booked with you, one per session. If one crosses a line, report it and we'll look into it personally.",
  },
]

function SectionPhoto({
  src,
  alt,
  sticky,
}: {
  src: string
  alt: string
  sticky?: boolean
}) {
  return (
    <div
      className={`relative aspect-[4/5] w-full overflow-hidden bg-surface ${
        sticky ? 'md:sticky md:top-28' : ''
      }`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        loading="lazy"
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  )
}

function SectionWithPhoto({
  id,
  src,
  alt,
  children,
  className,
  innerClassName = 'redesign-container redesign-section',
  stickyPhoto,
}: {
  id?: string
  src: string
  alt: string
  children: ReactNode
  className?: string
  innerClassName?: string
  stickyPhoto?: boolean
}) {
  return (
    <section id={id} className={className}>
      <div className={innerClassName}>
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-16">
          <div className="min-w-0">{children}</div>
          <SectionPhoto src={src} alt={alt} sticky={stickyPhoto} />
        </div>
      </div>
    </section>
  )
}

export default function JoinSessionsPage() {
  const faqSeo = faqPageJsonLd({
    url: `${getSiteUrl()}/join-guidesspace`,
    items: FAQ,
  })

  return (
    <>
      <JsonLd data={faqSeo} />
      <MotionProvider />

      <StickyHeader>
        <SiteHeader />
      </StickyHeader>

      <main className="bg-bg">
        {/* ---------- Hero ---------- */}
        <section className="relative flex min-h-svh flex-col overflow-hidden">
          <div className="absolute inset-0">
            <ScrubScale className="h-full w-full">
              <Image
                src="/images/healinghands.jpg"
                alt={HERO.alt}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            </ScrubScale>
          </div>
          {/* Legibility wash over the photograph. */}
          <div className="absolute inset-0 bg-black/10" />

          <div className="redesign-container relative z-[1] flex flex-1 flex-col justify-center py-32 text-center text-white">
            <RevealBlock>
              <p className="text-white">{HERO.eyebrow}</p>
            </RevealBlock>

            <RevealLines as="h1" className="t-display mx-auto max-w-[18ch] text-white">
              {HERO.h1}
            </RevealLines>

            <RevealBlock delay={0.25}>
              <p className="t-lede mx-auto mt-10 text-white">{HERO.subhead}</p>
            </RevealBlock>

            <div id="request-invitation" className="mx-auto mt-14 flex flex-col items-center gap-8">
              <JoinForms delay={0.45} />
              <RevealBlock delay={0.55}>
                <a href="#how-it-works" className="link-wipe t-eyebrow text-white">
                  See how it works
                </a>
              </RevealBlock>
            </div>
          </div>
        </section>

        {/* ---------- Designed alongside the people who do this work ---------- */}
        <SectionWithPhoto
          src="/images/stockPhotos/hands-magic.jpg"
          alt="Hands cupped around a small light, as if holding something precious"
        >
          <RevealLines as="h2" className="t-h2 mb-12 max-w-[20ch]">
            {ORIGIN.heading}
          </RevealLines>
          <RevealBlock stagger="base" className="flex flex-col gap-8">
            <p className="t-body text-dark">{ORIGIN.body}</p>
               <p className="t-body text-dark">{ORIGIN.close}</p>
                <p className="t-eyebrow max-w-[68ch] text-dark opacity-70">{ORIGIN.footnote}</p>
        
          </RevealBlock>
        </SectionWithPhoto>

        {/* ---------- Designed to move with your practice (hero CTA target) ----------
            The three pillars advance on scrub inside a pinned StickyStack above
            768px; below it they scroll normally as three stacked blocks. */}
        <SectionWithPhoto
          id="how-it-works"
          src="/images/stockPhotos/reiki3.jpg"
          alt="Hands offering reiki above a person lying in rest"
          className="scroll-mt-28 border-t border-border bg-surface"
          innerClassName="redesign-container redesign-section pb-24"
          stickyPhoto
        >
          <RevealLines as="h2" className="t-h2 mb-10 max-w-[20ch]">
            Built around how you already work
          </RevealLines>
          <RevealBlock>
            <p className="t-lede text-dark">{PILLARS_INTRO}</p>
          </RevealBlock>
          <StickyStack
            className="mt-10 min-h-[70vh]"
            states={PILLARS.map((p) => (
              <div
                key={p.title}
                className="flex min-h-[70vh] flex-col justify-center border-t border-border pt-10"
              >
                <h3 className="t-h3 mb-6 max-w-[24ch]">{p.title}</h3>
                <p className="t-body text-dark">{p.body}</p>
              </div>
            ))}
          />
        </SectionWithPhoto>

        {/* ---------- Be abundant ---------- */}
        <SectionWithPhoto
          src="/images/stockPhotos/crystals.jpg"
          alt="A cluster of crystals catching the light"
        >
          <RevealLines as="h2" className="t-h2 mb-12">
            {ABUNDANT.heading}
          </RevealLines>
          <RevealBlock stagger="base" className="flex flex-col gap-8">
            <p className="t-body text-dark">{ABUNDANT.first}</p>
            <p className="t-body text-dark">
              {ABUNDANT.secondLead}
              {/* FEATURE-PENDING: client CSV/export — must ship before invite codes are issued.
                  See known-issues.md GAP-3. Do not remove this comment until export exists. */}
              {ABUNDANT.secondExport}
            </p>
          </RevealBlock>
        </SectionWithPhoto>

        {/* ---------- Hold your time with intention ---------- */}
        <SectionWithPhoto
          src="/images/stockPhotos/meditation4.jpg"
          alt="A person sitting in meditation, holding time still"
          className="border-t border-border bg-surface"
        >
          <RevealLines as="h2" className="t-h2 mb-8">
            {TIME.heading}
          </RevealLines>
          {/* TIER-UNENFORCED: no tier gate on Google Calendar connect. Same root cause as
              F-3 (tierLimits.ts has zero importers). Both latent while all practitioners
              are Elevated; both stop being latent at first trial expiry. Fix together in
              A6 downgrade-semantics work, not here. */}
          <RevealBlock>
            <p className="t-eyebrow mb-12 text-olive">{TIME.gate}</p>
          </RevealBlock>
          <RevealBlock stagger="base" className="flex flex-col gap-8">
            <p className="t-body text-dark">{TIME.first}</p>
            <p className="t-body text-dark">{TIME.second}</p>
            <p className="t-body text-dark">{TIME.third}</p>
          </RevealBlock>
        </SectionWithPhoto>

        {/* ---------- Be found, named or not ---------- */}
        <SectionWithPhoto
          src="/images/stockPhotos/lotus.jpg"
          alt="A lotus opening, easy to find without knowing its name"
        >
          <RevealLines as="h2" className="t-h2 mb-12">
            {FOUND.heading}
          </RevealLines>
          <RevealBlock stagger="base" className="flex flex-col gap-8">
            <p className="t-body text-dark">{FOUND.first}</p>
            <p className="t-body text-dark">{FOUND.second}</p>
            {/* FEATURE-PENDING: "guided path" describes category-page descriptive intros
                today. No quiz or wizard exists. Revisit if a real guided discovery flow
                ships. */}
            <p className="t-body text-dark">{FOUND.third}</p>
          </RevealBlock>
        </SectionWithPhoto>

        {/* ---------- The follow-up moves with grace ---------- */}
        <SectionWithPhoto
          src="/images/stockPhotos/herbs.jpg"
          alt="Dried herbs laid out for aftercare and follow-up"
          className="border-t border-border bg-surface"
        >
          <RevealLines as="h2" className="t-h2 mb-12">
            {FOLLOW_UP.heading}
          </RevealLines>
          <RevealBlock stagger="base" className="flex flex-col gap-8">
            <p className="t-body text-dark">{FOLLOW_UP.first}</p>
            <p className="t-body text-dark">{FOLLOW_UP.second}</p>
          </RevealBlock>
        </SectionWithPhoto>

        {/* ---------- Tiers and pricing (#pricing deep-link target) ---------- */}
        <section id="pricing" className="scroll-mt-28 border-t border-border">
          <div className="redesign-container redesign-section">
            <RevealLines as="h2" className="t-h2 mb-16">
              {'Membership'}
            </RevealLines>

            {/* Square borders, 1px rules, no elevation. Emphasis is type weight
                and a fill block, never a badge. */}
            <RevealBlock stagger="base" className="grid grid-cols-1 gap-px bg-border md:grid-cols-3">
              {TIERS.map((t) => (
                <RevealBlock
                  key={t.name}
                  stagger="tight"
                  className="flex flex-col bg-bg p-10"
                >
                  <h3 className="t-h3 mb-6">{t.name}</h3>
                  <p className="t-body mb-10 flex-1 text-dark">{t.body}</p>
                  <p className="t-eyebrow bg-olive px-4 py-3 text-center text-light">
                    {t.price}
                  </p>
                </RevealBlock>
              ))}
            </RevealBlock>

            <RevealBlock>
              <p className="t-body mt-16 text-dark">
                No commission on any tier. Change or leave anytime.
              </p>
            </RevealBlock>
          </div>
        </section>

        {/* ---------- Close (inverted full-bleed block) ---------- */}
        <section className="bg-olive text-light">
          <div className="redesign-container redesign-section text-center">
            <RevealLines as="h2" className="t-h2 mx-auto mb-12 max-w-[18ch] text-light">
              {CLOSE.heading}
            </RevealLines>
            <RevealBlock stagger="base" className="flex flex-col items-center gap-8">
              <p className="t-body text-light">{CLOSE.first}</p>
              <p className="t-body text-light">{CLOSE.second}</p>
            </RevealBlock>

            <RevealBlock delay={0.2}>
              <a
                href="#request-invitation"
                className="btn-secondary btn-fill mt-14 border-light text-light"
              >
                Already invited? Enter your code above ↑
              </a>
            </RevealBlock>

            <RevealBlock>
              <p className="t-eyebrow mx-auto mt-16 max-w-[60ch] text-light opacity-80">
                {CLOSE.note}
              </p>
            </RevealBlock>
          </div>
        </section>

        {/* ---------- FAQ ----------
            Native <details>/<summary> so it opens, closes and indexes with JS
            off. The h3 sits INSIDE <summary>, which keeps the heading outline
            byte-identical to the previous h3 + p markup. faqPageJsonLd reads
            the same FAQ array this renders, so the schema cannot drift. */}
        <section className="border-t border-border">
          <div className="redesign-container redesign-section">
            <RevealLines as="h2" className="t-h2 mb-16">
              Questions guides ask
            </RevealLines>

            <RevealBlock stagger="tight">
              {FAQ.map((item) => (
                <details key={item.question} className="faq-item border-b border-border py-8">
                  <summary>
                    <h3 className="t-h3 max-w-[28ch]">{item.question}</h3>
                  </summary>
                  <p className="t-body pt-6 text-dark">{item.answer}</p>
                </details>
              ))}
            </RevealBlock>
          </div>
        </section>
      </main>
    </>
  )
}
