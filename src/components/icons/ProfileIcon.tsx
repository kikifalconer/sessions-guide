// ID card. Matches SearchIcon's pattern (header-nav.tsx): 24x24 viewBox,
// stroke-based, currentColor, no fill. Single figure -- kept deliberately
// distinct from CommunityIcon's two overlapping figures.
export default function ProfileIcon() {
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
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.5 16c.5-1.8 1.8-2.7 3-2.7s2.5.9 3 2.7" />
      <line x1="14" y1="9.5" x2="18" y2="9.5" />
      <line x1="14" y1="12.5" x2="18" y2="12.5" />
    </svg>
  )
}
