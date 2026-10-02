// Two overlapping people -- Community. Two figures, deliberately distinct
// from ProfileIcon's single figure.
export default function CommunityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5,19 C4,15.3 6.3,13.3 9,13.3 C11.7,13.3 14,15.3 14.5,19" />
      <circle cx="16" cy="9.5" r="2.6" />
      <path d="M13.3,14 C15,13.2 17.2,13.4 18.8,15.2 C19.9,16.4 20.4,17.7 20.5,19" />
    </svg>
  )
}
