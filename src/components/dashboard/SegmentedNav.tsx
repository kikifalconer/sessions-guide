import Link from 'next/link'

export default function SegmentedNav({
  items,
  labelledBy,
}: {
  items: { label: string; href: string; current: boolean; badge?: number }[]
  labelledBy?: string
}) {
  return (
    <nav
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-2"
    >
      {items.map((item) => {
        const badge = item.badge && item.badge > 0 ? item.badge : 0
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.current ? 'page' : undefined}
            aria-label={badge > 0 ? `${item.label}, ${badge} unread` : undefined}
            className={item.current ? 'btn-primary' : 'btn-secondary'}
          >
            {item.label}
            {badge > 0 && (
              <span className="ml-2 inline-flex min-h-5 min-w-5 items-center justify-center bg-citron px-1 text-[0.6875rem] leading-none tracking-normal text-dark normal-case">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
