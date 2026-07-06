// Shared types + helpers for the pages system (D-entry: pages system).
// Used by the admin editor and the public renderers.

export type PageType = 'sage' | 'editorial'
export type PageStatus = 'draft' | 'published'
export type BlockType = 'heading' | 'paragraph' | 'image' | 'image_text'

export type HeadingContent = { text: string; level: 'h2' | 'h3' }
export type ParagraphContent = { text: string }
export type ImageContent = { url: string; alt: string; width: 'full' | 'inset' }
export type ImageTextContent = {
  url: string
  alt: string
  text: string
  image_side: 'left' | 'right'
}
export type BlockContent =
  | HeadingContent
  | ParagraphContent
  | ImageContent
  | ImageTextContent

export type PageBlock = {
  id?: string
  block_type: BlockType
  sort_order: number
  content: BlockContent
}

export type PageRecord = {
  id: string
  slug: string
  title: string
  hero_image_url: string | null
  page_type: PageType
  sage_id: string | null
  seo_title: string | null
  seo_description: string | null
  status: PageStatus
  updated_at: string
}

export type SageOption = { id: string; display_name: string; slug: string }

// Server-side slug validation: lowercase letters/numbers, hyphen-separated,
// no leading/trailing/double hyphens.
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// The public route prefix for a page type.
export function pagePublicPath(type: PageType, slug: string): string {
  return `/${type === 'sage' ? 'sages' : 'guides'}/${slug}`
}

// Default empty content for a freshly added block of each type.
export function emptyBlockContent(type: BlockType): BlockContent {
  switch (type) {
    case 'heading':
      return { text: '', level: 'h2' }
    case 'paragraph':
      return { text: '' }
    case 'image':
      return { url: '', alt: '', width: 'full' }
    case 'image_text':
      return { url: '', alt: '', text: '', image_side: 'left' }
  }
}

// Coerce arbitrary editor input into a clean, shape-correct content object per
// block_type (never trust the client jsonb verbatim).
export function sanitizeBlockContent(type: BlockType, content: unknown): BlockContent {
  const c = (content ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  switch (type) {
    case 'heading':
      return { text: str(c.text), level: c.level === 'h3' ? 'h3' : 'h2' }
    case 'paragraph':
      return { text: str(c.text) }
    case 'image':
      return { url: str(c.url), alt: str(c.alt), width: c.width === 'inset' ? 'inset' : 'full' }
    case 'image_text':
      return {
        url: str(c.url),
        alt: str(c.alt),
        text: str(c.text),
        image_side: c.image_side === 'right' ? 'right' : 'left',
      }
  }
}
