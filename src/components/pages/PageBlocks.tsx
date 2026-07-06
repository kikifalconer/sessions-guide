import type {
  PageBlock,
  HeadingContent,
  ParagraphContent,
  ImageContent,
  ImageTextContent,
} from '@/lib/pages'

// Shared block renderer for editorial + sage pages. Maps block_type to styled
// output per design-system.md type scale. Admin-authored content (no PLACEHOLDER
// markers: the copy is entered in the editor, not shipped in code).
export default function PageBlocks({ blocks }: { blocks: PageBlock[] }) {
  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  )
}

function Block({ block }: { block: PageBlock }) {
  switch (block.block_type) {
    case 'heading': {
      const c = block.content as HeadingContent
      return c.level === 'h3' ? <h3>{c.text}</h3> : <h2>{c.text}</h2>
    }
    case 'paragraph': {
      const c = block.content as ParagraphContent
      return <p className="max-w-[70ch] whitespace-pre-line">{c.text}</p>
    }
    case 'image': {
      const c = block.content as ImageContent
      if (!c.url) return null
      return (
        <figure className={c.width === 'inset' ? 'mx-auto w-full max-w-[720px]' : 'w-full'}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.url} alt={c.alt} className="w-full object-cover" />
        </figure>
      )
    }
    case 'image_text': {
      const c = block.content as ImageTextContent
      const imageRight = c.image_side === 'right'
      return (
        <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
          {c.url && (
            <figure className={imageRight ? 'sm:order-2' : 'sm:order-1'}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.url} alt={c.alt} className="w-full object-cover" />
            </figure>
          )}
          <p className={`max-w-[60ch] whitespace-pre-line ${imageRight ? 'sm:order-1' : 'sm:order-2'}`}>
            {c.text}
          </p>
        </div>
      )
    }
    default:
      return null
  }
}
