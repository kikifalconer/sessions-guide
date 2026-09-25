import Link from 'next/link'

export default function SegmentedNav({
  items,
  labelledBy,
}: {
  items: { label: string; href: string; current: boolean }[]
  labelledBy?: string
}) {
  return (
    <nav
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-2"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? 'page' : undefined}
          className={item.current ? 'btn-primary' : 'btn-secondary'}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
