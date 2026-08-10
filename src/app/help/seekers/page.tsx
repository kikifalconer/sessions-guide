// COPY: placeholder, pending rework
import FaqPage, { type FaqGroup } from '../FaqPage'

export const metadata = { title: 'help for seekers | sessions.guide' }

const GROUPS: FaqGroup[] = [
  {
    id: 'finding-a-practitioner',
    title: 'Finding a practitioner',
    items: [
      {
        q: 'How do I browse?',
        steps: [
          'Open the explore page.',
          'Tap a category, or use search.',
          'Filter by practice, format, or location.',
        ],
        trail: 'City pages show everyone who works in or near that city.',
      },
      {
        q: 'Why do virtual practitioners show up in my city search?',
        lead: 'You can meet them from anywhere. Want in-person only? Use the in-person filter.',
      },
      {
        q: 'Can I see where a session takes place?',
        lead: 'You see the city before you book. You see the full location after booking. This protects practitioner privacy.',
      },
    ],
  },
  {
    id: 'your-account',
    title: 'Your account',
    items: [
      {
        q: 'How do I log in?',
        steps: [
          'Go to the login page.',
          'Enter your email.',
          'Open the email we send you and tap the link.',
        ],
        trail: 'You are in. No password to remember.',
      },
    ],
  },
  {
    id: 'booking',
    title: 'Booking',
    items: [
      {
        q: 'How do I book a session?',
        steps: [
          "Open a practitioner's profile.",
          'Choose a session.',
          'Pick a time. Times show in your timezone.',
          'If the practitioner offers both virtual and in person, choose which one.',
          "Pay by card, or follow the practitioner's payment instructions if they collect payment directly.",
          'Watch for your confirmation email.',
        ],
      },
      {
        q: 'When is my booking confirmed?',
        lead: 'Some bookings confirm right away. Some confirm after payment. Some wait for the practitioner to say yes. You will see which one before you book.',
      },
    ],
  },
  {
    id: 'cancelling',
    title: 'Cancelling',
    items: [
      {
        q: 'How do I cancel a booking?',
        steps: ['Open your confirmation email.', 'Tap the cancellation link.', 'Confirm.'],
        trail:
          "The practitioner's cancellation policy is shown before you book, so there are no surprises.",
      },
      {
        q: 'Will I get a refund?',
        lead: "Refunds follow the practitioner's policy and happen automatically if you paid by card on the site.",
      },
    ],
  },
  {
    id: 'reviews',
    title: 'Reviews',
    items: [
      {
        q: 'How do I leave a review?',
        steps: [
          'After your session, open the review email.',
          'Tap the link.',
          'Choose a star rating and write a few honest words.',
          'Submit.',
        ],
        trail: 'Reviews are tied to real bookings.',
      },
      {
        q: 'What if a review looks fake or harmful?',
        steps: [
          "Open the practitioner's reviews page.",
          'Tap "Report" on the review.',
          'Say why.',
        ],
        trail: 'It will be checked.',
      },
    ],
  },
  {
    id: 'good-to-know',
    title: 'Good to know',
    items: [
      {
        q: 'Why do I see a legal notice on some sessions?',
        lead: 'Some practices, like psychedelic facilitation, may be regulated where you live. The notice appears automatically. Knowing your local laws is up to you and the practitioner.',
      },
    ],
  },
]

export default function SeekerHelp() {
  return (
    <FaqPage
      title="Help for seekers"
      intro="How to find a practitioner, book a session, cancel, and leave a review."
      groups={GROUPS}
    />
  )
}
