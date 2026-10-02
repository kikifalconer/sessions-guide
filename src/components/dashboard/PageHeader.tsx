export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="min-w-0">
        <h1>{title}</h1>
        {description && <p className="mt-4 max-w-[60ch] text-dark">{description}</p>}
      </div>
      {action}
    </div>
  )
}
