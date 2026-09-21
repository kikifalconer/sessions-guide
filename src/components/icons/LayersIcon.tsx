// Stacked layers -- Subscription. Deliberately not a star (collides with
// favorites) and not a rectangle/card shape (collides with WalletIcon).
export default function LayersIcon() {
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
      <path d="M12,4 L20,8.5 L12,13 L4,8.5 Z" />
      <path d="M4,13 L12,17.5 L20,13" />
      <path d="M4,17 L12,21.5 L20,17" />
    </svg>
  )
}
