// Single open palm, facing up (offering) -- My Sessions. Bolder/fewer
// strokes than a first pass (which read too thin/ambiguous at 24px):
// rounded palm base, three fanned fingers (not four -- less clutter, more
// weight per stroke) and one thumb, sharing the base so it reads as one
// hand. Deliberately not a calendar (Availability owns that).
export default function OpenPalmIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7.5,19.5 L7.5,14.8 Q7.5,12.8 9.5,12.8 L14.5,12.8 Q16.5,12.8 16.5,14.8 L16.5,19.5" />
      <line x1="9.7" y1="12.8" x2="9.3" y2="6.5" />
      <line x1="12" y1="12.8" x2="12" y2="5" />
      <line x1="14.3" y1="12.8" x2="14.7" y2="6.5" />
      <path d="M8,15.5 Q5,15 4,11.5" />
    </svg>
  )
}
