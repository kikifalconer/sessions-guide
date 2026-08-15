import Image from 'next/image'
import SiteHeader from '@/components/site-header'
import { buildMetadata } from '@/lib/metadata'
import { getSiteUrl } from '@/lib/siteUrl'
import { JsonLd, faqPageJsonLd } from '@/lib/seo/structuredData'

// Practitioner-facing invitation page. The copy is authored and final; this
// file is the layout for it, not a place to rewrite it.
//
// Two anchors are load-bearing and must keep their ids:
//   #how-it-works : the hero's secondary CTA scrolls here
//   #pricing      : the site footer links here
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
    'Built for practitioners of the healing arts: coaches, astrologers, facilitators, and more. Set your own rates, hours, and terms. No commission, ever.',
  path: '/join-sessions',
})

// The invitation mechanism is not decided yet (form vs. waitlist vs. something
// else). This mailto is a placeholder, pointing at the address /contact and
// /privacy already publish. Swap this one constant when the mechanism lands.
const REQUEST_INVITATION_HREF =
  'mailto:hello@sessions.guide?subject=Invitation%20request'

const HERO = {
  eyebrow: 'for practitioners of the healing arts',
  h1: 'you hold the container. we hold the rest.',
  subhead:
    'sessions.guide was built around your practice, not the other way around: room to work in alignment with why you began, and less time lost to the admin that pulls you away from it.',
  alt: 'Two open hands held out with the palms up, a faint band of prism light resting across them.',
}

const ORIGIN = {
  heading: 'Designed alongside the people who do this work',
  body: 'sessions.guide was built from a decade of experience working with thousands* of practitioners, healers, teachers, and guides. And though their work was unique, their challenges were common. What we learned, again and again, is that most tools ask you to shrink your practice to fit a template built for something else entirely. So we built one around the work itself, not despite it.',
  footnote:
    '*literally, 2740+ coaches, doulas, sound healers, astrologers, feng shui designers, equine therapists, etc. while co-creating Conscious City Guide',
  close:
    "We're not here to facilitate your sessions. That's your work. We're here to facilitate everything that makes room for them.",
}

const PILLARS_INTRO =
  "sessions.guide adapts to your life and how you already work, rather than asking you to fit someone else's template. Three things stay fully in your hands:"

const PILLARS: { title: string; body: string }[] = [
  {
    title: 'Keep your finances sovereign.',
    body: "You decide how and where you're paid: through the platform, your own preferred method, or in person. Whether it's a holding fee to protect your time, an honorarium, a donation, or simply your rate paid in full, the choice is yours. We never take a percentage, on any tier, so what you charge and how you charge is entirely between you and the person you're serving.",
  },
  {
    title: 'Where you practice.',
    body: "Whether you're nomadic, working from a studio, or holding sessions from your living room, sessions.guide moves with you instead of asking you to move to it. Set your location per session: in person, virtual, or both. And if your practice travels, so does your visibility, with the freedom to land somewhere new without rebuilding a client list from scratch.",
  },
  {
    title: "When you're available.",
    body: "Recurring hours or a single opening, in your own timezone, shaped around the rest of your life. Connect Google Calendar so a day that's already full stays full, and nothing is bookable until you say it's ready. How you handle a late cancellation stays your call too.",
  },
]

const ABUNDANT = {
  heading: 'Be abundant',
  first:
    "How you're paid should feel like an extension of abundance, not a transaction bolted onto the end of the work. Take payment through Stripe the moment someone books, if that fits, or receive it exactly how you already do: in person, by donation, or by an arrangement that's simply between you and the person in front of you. Either way, the platform builds around your answer.",
  // Split so the FEATURE-PENDING marker sits directly above the export clause.
  secondLead:
    "We don't take a percentage of what you earn. Not on any tier, not ever. If you use Stripe, their fee is the only one in the room. If you don't, there isn't one. And anytime you want to leave, ",
  secondExport: 'export your clients to keep your practice.',
}

const TIME = {
  heading: 'Hold your time with intention',
  gate: 'Calendar sync: Elevated and above.',
  first:
    "Connect Google Calendar and we'll check it before anything is confirmed, so the time you've already given to something else, a class, a session with your own teacher, dinner with your kid, stays exactly that. A booking made here appears there too, and clears itself if it's ever cancelled.",
  second:
    "Your practice was never bound to one room. Hold sessions virtually, in person, or both, and be found wherever you're actually working from.",
  third: "We can see that you're busy. We never see with what.",
}

const FOUND = {
  heading: 'Be found, named or not',
  first:
    "Some people already have a word for what they need. They'll search your modality by name and expect to find you there.",
  second:
    'Others don\'t have the word yet, only a sense that something\'s off. They won\'t type "reiki" or "somatic experiencing" into a search bar. They\'ll type "why do I feel like this," or nothing at all.',
  third:
    "We built for both: search by category, city, or modality name for the people who already know, and a guided path for the people who don't. We want people who your work would benefit to find you, without you needing a degree in marketing.",
}

const FOLLOW_UP = {
  heading: 'The follow-up moves with grace',
  first:
    "A confirmation when someone books. A note if plans change. An invitation to leave a review a day after the session, once there's been time to feel what it did. All of it goes out under your name, so it feels like it's coming from you, not a company.",
  second:
    'Questions from your page land in your inbox, ready for you to answer in your own words.',
}

// Prices are deliberately unset placeholders. Do not substitute numbers here;
// they are set once the tier pricing is decided.
const TIERS: { name: string; body: string; price: string }[] = [
  {
    name: 'Trial',
    body: 'Your full profile, hours, and terms, with one session type live. Enough to be found, and booked.',
    price: '[PRICE / FREE]',
  },
  {
    name: 'Elevated',
    body: 'Unlimited session types, and a calendar that finally talks to yours.',
    price: '[PRICE]',
  },
  {
    name: 'Alchemist',
    body: 'Everything in Elevated, plus a place near the front when people are searching.',
    price: '[PRICE]',
  },
]

const CLOSE = {
  heading: 'come see for yourself',
  first: 'This is where your practice, your purpose, and your power meet.',
  second:
    'If the way you work has never quite fit the tools you were handed, we would love for you to see this one.',
  note: "sessions.guide is invitation-only right now, while we grow alongside a small group of practitioners. That's temporary. We're building toward an open platform, anchored by real reviews, and invitations will widen as that foundation grows stronger.",
}

// Single source for both the rendered FAQ and the FAQPage JSON-LD. Plain
// register, kept literal for answer-engine visibility.
const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Do you take a percentage of my sessions?',
    answer:
      'No. Your clients pay directly into your own Stripe account. Our revenue is the subscription, nothing else.',
  },
  {
    question: 'Do I need Stripe?',
    answer:
      "No. Stripe lets someone pay the moment they book. If you'd rather be paid in person, by donation, or by your own arrangement, tell us and we'll pass your instructions to the client instead.",
  },
  {
    question: 'What fees are there?',
    answer:
      "None from us, on any tier. If you use Stripe, you pay Stripe's fee. If you take payment your own way, there's no fee at all.",
  },
  {
    question: 'What do you send my clients?',
    answer:
      "Booking confirmations, cancellation and refund notices, an inquiry alert to you, and a review invitation about a day after the session. That's the whole list.",
  },
  {
    question: 'Can I email my client list?',
    answer:
      "Not yet. What we send is tied to an actual booking. There's no mailing list here, and no campaigns.",
  },
  {
    question: 'Does it work with my calendar?',
    answer:
      'Google Calendar, on Elevated and above. We check it before confirming a booking, and your sessions appear on your calendar too.',
  },
  {
    question: 'Can I set my own cancellation policy?',
    answer:
      'Yes, across your whole practice or per session type. Refunds are calculated from your cancellation policy.',
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
      'Yes. You can be found by browsing category, by city, or by searching a modality name directly. Category pages carry full descriptions of what each kind of work is for, so someone can find their way to you without knowing the name of it first.',
  },
  {
    question: "Can I take down a review I don't like?",
    answer:
      "No, and it's worth knowing that up front. Reviews come only from people who actually booked with you, one per session. If something crosses a line, you can report it and we'll look into it personally.",
  },
]

export default function JoinSessionsPage() {
  const faqSeo = faqPageJsonLd({
    url: `${getSiteUrl()}/join-sessions`,
    items: FAQ,
  })

  return (
    <>
      <JsonLd data={faqSeo} />
      <SiteHeader />

      <main className="bg-bg">
        {/* ---------- Hero ---------- */}
        <section className="relative flex min-h-[88vh] flex-col overflow-hidden">
          <Image
            src="/images/healinghands.jpg"
            alt={HERO.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Legibility wash over the photograph. */}
          <div className="absolute inset-0 bg-black/35" />

          <div className="relative z-[1] mx-auto flex w-full max-w-[900px] flex-1 flex-col justify-center px-6 py-24 text-center">
            <p className="label mb-6 text-light">{HERO.eyebrow}</p>
            {/* Inline style so it wins over the global h1 olive color. */}
            <h1 style={{ color: 'var(--color-light)' }}>{HERO.h1}</h1>
            <p className="mx-auto mt-8 max-w-[56ch] text-light">{HERO.subhead}</p>

            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href={REQUEST_INVITATION_HREF} className="btn-primary">
                Request an invitation
              </a>
              <a href="#how-it-works" className="btn-secondary">
                See how it works
              </a>
            </div>
          </div>
        </section>

        {/* ---------- Designed alongside the people who do this work ---------- */}
        <section className="mx-auto w-full max-w-[820px] px-6 py-24 sm:px-10">
          <h2 className="mb-10">{ORIGIN.heading}</h2>
          <p className="mb-6 text-dark">{ORIGIN.body}</p>
          <p className="caption mb-8 text-dark opacity-70">{ORIGIN.footnote}</p>
          <p className="text-dark">{ORIGIN.close}</p>
        </section>

        {/* ---------- Designed to move with your practice (hero CTA target) ---------- */}
        <section
          id="how-it-works"
          className="scroll-mt-24 border-t border-border bg-surface"
        >
          <div className="mx-auto w-full max-w-[1200px] px-6 py-24 sm:px-10">
            <h2 className="mb-8">Designed to move with your practice</h2>
            <p className="mb-16 max-w-[68ch] text-dark">{PILLARS_INTRO}</p>

            <div className="grid grid-cols-1 gap-x-12 gap-y-14 md:grid-cols-3">
              {PILLARS.map((p) => (
                <div key={p.title}>
                  <h3 className="mb-4">{p.title}</h3>
                  <p className="text-dark">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Be abundant ---------- */}
        <section className="mx-auto w-full max-w-[820px] px-6 py-24 sm:px-10">
          <h2 className="mb-10">{ABUNDANT.heading}</h2>
          <p className="mb-6 text-dark">{ABUNDANT.first}</p>
          <p className="text-dark">
            {ABUNDANT.secondLead}
            {/* FEATURE-PENDING: client CSV/export — must ship before invite codes are issued.
                See known-issues.md GAP-3. Do not remove this comment until export exists. */}
            {ABUNDANT.secondExport}
          </p>
        </section>

        {/* ---------- Hold your time with intention ---------- */}
        <section className="border-t border-border bg-surface">
          <div className="mx-auto w-full max-w-[820px] px-6 py-24 sm:px-10">
            <h2 className="mb-6">{TIME.heading}</h2>
            {/* TIER-UNENFORCED: no tier gate on Google Calendar connect. Same root cause as
                F-3 (tierLimits.ts has zero importers). Both latent while all practitioners
                are Elevated; both stop being latent at first trial expiry. Fix together in
                A6 downgrade-semantics work, not here. */}
            <p className="label mb-10 text-dark">{TIME.gate}</p>
            <p className="mb-6 text-dark">{TIME.first}</p>
            <p className="mb-6 text-dark">{TIME.second}</p>
            <p className="text-dark">{TIME.third}</p>
          </div>
        </section>

        {/* ---------- Be found, named or not ---------- */}
        <section className="mx-auto w-full max-w-[820px] px-6 py-24 sm:px-10">
          <h2 className="mb-10">{FOUND.heading}</h2>
          <p className="mb-6 text-dark">{FOUND.first}</p>
          <p className="mb-6 text-dark">{FOUND.second}</p>
          {/* FEATURE-PENDING: "guided path" describes category-page descriptive intros
              today. No quiz or wizard exists. Revisit if a real guided discovery flow
              ships. */}
          <p className="text-dark">{FOUND.third}</p>
        </section>

        {/* ---------- The follow-up moves with grace ---------- */}
        <section className="border-t border-border bg-surface">
          <div className="mx-auto w-full max-w-[820px] px-6 py-24 sm:px-10">
            <h2 className="mb-10">{FOLLOW_UP.heading}</h2>
            <p className="mb-6 text-dark">{FOLLOW_UP.first}</p>
            <p className="text-dark">{FOLLOW_UP.second}</p>
          </div>
        </section>

        {/* ---------- Tiers and pricing (the site footer links to #pricing) ---------- */}
        <section id="pricing" className="scroll-mt-24 border-t border-border">
          <div className="mx-auto w-full max-w-[1200px] px-6 py-24 sm:px-10">
            <h2 className="mb-16">{'Tiers & pricing'}</h2>

            <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-3">
              {TIERS.map((t) => (
                <div key={t.name} className="border border-border bg-surface p-8">
                  <h3 className="mb-4">{t.name}</h3>
                  <p className="mb-8 text-dark">{t.body}</p>
                  <p className="label text-olive">{t.price}</p>
                </div>
              ))}
            </div>

            <p className="mt-12 text-dark">
              No commission, on any tier. Leave or change whenever you need to.
            </p>
          </div>
        </section>

        {/* ---------- Close ---------- */}
        <section className="border-t border-border bg-surface">
          <div className="mx-auto w-full max-w-[720px] px-6 py-28 text-center sm:px-10">
            <h2 className="mb-10">{CLOSE.heading}</h2>
            <p className="mb-6 text-dark">{CLOSE.first}</p>
            <p className="mb-12 text-dark">{CLOSE.second}</p>

            <a href={REQUEST_INVITATION_HREF} className="btn-primary">
              Request an invitation
            </a>

            <p className="caption mx-auto mt-12 max-w-[60ch] text-dark opacity-70">
              {CLOSE.note}
            </p>
          </div>
        </section>

        {/* ---------- FAQ ----------
            Plain divs rather than a <dl>: heading content is not permitted
            inside <dt>, and the h3 questions are what carry the heading
            structure for search and answer engines. */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-[820px] px-6 py-24 sm:px-10">
            <h2 className="mb-16">Questions practitioners ask</h2>

            {FAQ.map((item) => (
              <div key={item.question} className="mb-10 last:mb-0">
                <h3 className="mb-3">{item.question}</h3>
                <p className="text-dark">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
