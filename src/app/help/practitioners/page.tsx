// COPY: placeholder, pending rework
import FaqPage, { type FaqGroup } from '../FaqPage'

export const metadata = { title: 'Help for practitioners | sessions.guide' }

const GROUPS: FaqGroup[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    items: [
      {
        q: 'How do I get listed?',
        steps: [
          'Sign up.',
          'Follow the onboarding steps: name, photo, bio, links.',
          'Pick your modalities.',
          'Publish your profile.',
        ],
        trail: 'Until you publish, seekers cannot see you.',
      },
      {
        q: 'How many modalities can I choose?',
        lead: 'Up to 3 total, and exactly 1 is your main one. Your category is set automatically from your modality. You cannot change the category by hand.',
      },
      // TODO: UI not built, steps are forward-looking
      {
        q: 'My practice is not in the list. What do I do?',
        steps: [
          'During modality selection, choose "Suggest a modality."',
          'Type the name of your practice.',
          'Submit.',
        ],
        trail:
          'Suggestions are reviewed before they appear on the site. You will be able to select it once approved.',
      },
    ],
  },
  {
    id: 'sessions',
    title: 'Sessions',
    items: [
      {
        q: 'What is a session type?',
        lead: 'One thing you offer. Example: a 90 minute reading. Each session type has a name, a photo, a length, a price, and one modality.',
      },
      {
        q: 'How do I add a session type?',
        steps: [
          'Open your dashboard.',
          'Go to the SESSIONS tab.',
          'Choose "Add session type."',
          'Fill in the name, photo, length, modality, and pricing.',
          'Save.',
        ],
        trail: 'It appears on your profile once your profile is published.',
      },
      {
        q: 'What pricing options are there?',
        lead: 'Fixed price, sliding scale, by donation, or inquire for pricing. You pick one per session type.',
      },
    ],
  },
  {
    id: 'availability',
    title: 'Availability',
    items: [
      {
        q: 'How do I set when I am available?',
        steps: [
          'Open your dashboard.',
          'Go to the AVAILABILITY tab.',
          'Choose "Add block."',
          'Pick the format: virtual, in person, or both.',
          'If in person, choose a location.',
          'Pick repeating days, a date range, or a single date.',
          'Set the time window and timezone.',
          'Save.',
        ],
      },
      {
        q: 'Do I have to share my address?',
        lead: 'No. When you choose a location, you decide how exact it is: a city, a neighbourhood, or a full address. Seekers only see your city before they book. They see the full location after booking.',
      },
      {
        q: 'I work in different places on different days. Can the platform handle that?',
        lead: 'Yes. Make a separate block for each place. A block for your home studio, a block for another city, a block for virtual sessions. Each has its own schedule.',
      },
      {
        q: 'Can I set availability for a trip?',
        lead: 'Yes. When adding a block, choose a date range instead of repeating days. Example: in Bali from March 1 to March 31.',
      },
    ],
  },
  {
    id: 'getting-paid',
    title: 'Getting paid',
    items: [
      {
        q: 'How do I get paid?',
        lead: 'Two options. Get paid through the platform by card, or collect payment yourself.',
      },
      // Payment method is set per session type (audit): SESSIONS tab, on each
      // session type. The off-platform instructions field below does not exist.
      {
        q: 'How do I choose my payment method?',
        steps: [
          'Open your dashboard.',
          'Go to the SESSIONS tab.',
          'Add or edit a session type.',
          'In the payment field, choose On platform (card) or Off platform.',
        ],
        trail: 'Payment is set on each session type.',
        // TODO: UI not built, steps are forward-looking
        note: 'If you collect payment off platform, write clear instructions for the seeker. They see these at booking.',
      },
      {
        q: 'Does the platform take a cut?',
        lead: 'No. You pay a subscription to be listed. That is the only fee. Session payments go straight to you.',
      },
    ],
  },
  {
    id: 'bookings-and-cancellations',
    title: 'Bookings and cancellations',
    items: [
      {
        q: 'How do bookings confirm?',
        lead: 'You choose: instantly, after payment, or after you approve each booking.',
      },
      // Cancellation policy is set per session type (audit): SESSIONS tab, on
      // each session type, using the real option labels below.
      {
        q: 'How do I set my cancellation policy?',
        steps: [
          'Open your dashboard.',
          'Go to the SESSIONS tab.',
          'Add or edit a session type.',
          'Choose one of four cancellation options.',
        ],
        trail:
          'The options are Handled directly: you handle it yourself. Flexible: full refund up to 24 hours before. Moderate: full refund up to 72 hours before, half refund inside that. Strict: full refund up to 7 days before, no refund inside that. The policy is set on each session type.',
      },
      {
        q: 'How do refunds work?',
        lead: 'Automatically, based on your policy, when payment was made by card on the platform.',
      },
    ],
  },
  {
    id: 'calendar',
    title: 'Calendar',
    items: [
      {
        q: 'How do I connect my calendar?',
        steps: [
          'Open your dashboard.',
          'Go to SETTINGS.',
          'Choose "Connect Google Calendar."',
          'Sign in with Google and allow access.',
        ],
        trail:
          'Bookings then appear on your calendar, and your busy times block booking slots.',
      },
      {
        q: 'How do I disconnect it?',
        lead: 'Same place. Go to SETTINGS and choose disconnect. Existing bookings stay on your calendar.',
      },
    ],
  },
  {
    id: 'reviews',
    title: 'Reviews',
    items: [
      {
        q: 'How do reviews work?',
        lead: 'After a session is completed, the seeker gets an email asking for a review. Reviews are tied to real bookings. Nobody can review you without booking.',
      },
      // TODO: UI not built, steps are forward-looking
      {
        q: 'How do I pin a review to the top of my profile?',
        steps: [
          'Open your dashboard.',
          'Go to your reviews.',
          'Choose "Feature" on the review you want at the top.',
        ],
        trail:
          'You can feature one review at a time. Choosing a new one replaces the old one.',
      },
    ],
  },
  {
    id: 'your-subscription',
    title: 'Your subscription',
    items: [
      {
        q: 'What happens if my subscription lapses?',
        lead: 'Your profile is hidden but nothing is deleted. Pay again and it comes back.',
      },
    ],
  },
]

export default function PractitionerHelp() {
  return (
    <FaqPage
      title="Help for practitioners"
      intro="How to get listed, set up sessions and availability, get paid, and manage your bookings."
      groups={GROUPS}
    />
  )
}
