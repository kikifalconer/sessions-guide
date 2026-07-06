'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { slugify } from '@/lib/slug'
import { uploadToCloudinary, bannerCrop } from '@/lib/cloudinary'
import { savePage, setPageStatus } from './actions'
import {
  emptyBlockContent,
  pagePublicPath,
  type BlockType,
  type PageBlock,
  type PageRecord,
  type PageType,
  type SageOption,
  type HeadingContent,
  type ParagraphContent,
  type ImageContent,
  type ImageTextContent,
} from '@/lib/pages'

// All copy is PLACEHOLDER for Kiki's rework. Chrome is DM Mono uppercase via
// .label/.caption/.btn-*, CSS-variable Tailwind tokens, no border-radius, no em
// dashes, no exclamation points.

const FIELD =
  'w-full border border-border bg-surface px-3 py-2 font-ui text-[0.85rem] text-dark outline-none focus:border-olive'

const BLOCK_TYPES: { type: BlockType; label: string }[] = [
  { type: 'heading', label: 'Heading' },
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'image', label: 'Image' },
  { type: 'image_text', label: 'Image + text' },
]

type EditorInitial = { page: PageRecord; blocks: PageBlock[] } | null

export default function PageEditor({
  sages,
  initial,
}: {
  sages: SageOption[]
  initial: EditorInitial
}) {
  const router = useRouter()

  const [pageId, setPageId] = useState<string | null>(initial?.page.id ?? null)
  const [status, setStatus] = useState<'draft' | 'published'>(initial?.page.status ?? 'draft')
  const [title, setTitle] = useState(initial?.page.title ?? '')
  const [slug, setSlug] = useState(initial?.page.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.page.slug))
  const [pageType, setPageType] = useState<PageType>(initial?.page.page_type ?? 'editorial')
  const [sageId, setSageId] = useState<string | null>(initial?.page.sage_id ?? null)
  const [heroUrl, setHeroUrl] = useState<string | null>(initial?.page.hero_image_url ?? null)
  const [seoTitle, setSeoTitle] = useState(initial?.page.seo_title ?? '')
  const [seoDescription, setSeoDescription] = useState(initial?.page.seo_description ?? '')
  const [blocks, setBlocks] = useState<PageBlock[]>(initial?.blocks ?? [])

  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function onTitle(value: string) {
    setTitle(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  function onPageType(value: PageType) {
    setPageType(value)
    if (value === 'editorial') setSageId(null)
  }

  async function uploadHero(file: File | undefined) {
    if (!file) return
    setBusy('hero')
    setError(null)
    try {
      setHeroUrl(await uploadToCloudinary(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again or use a different image.')
    } finally {
      setBusy(null)
    }
  }

  // --- block helpers --------------------------------------------------------
  function addBlock(type: BlockType) {
    setBlocks((prev) => [...prev, { block_type: type, sort_order: prev.length, content: emptyBlockContent(type) }])
  }
  function setBlockField(index: number, field: string, value: string) {
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === index
          ? { ...b, content: { ...(b.content as Record<string, unknown>), [field]: value } as unknown as PageBlock['content'] }
          : b
      )
    )
  }
  async function uploadBlockImage(index: number, file: File | undefined) {
    if (!file) return
    setBusy(`block-${index}`)
    setError(null)
    try {
      setBlockField(index, 'url', await uploadToCloudinary(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again or use a different image.')
    } finally {
      setBusy(null)
    }
  }
  function moveBlock(index: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const j = index + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }
  function deleteBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index))
  }

  // --- persistence ----------------------------------------------------------
  async function save(): Promise<string | null> {
    setBusy('save')
    setError(null)
    setNotice(null)
    const res = await savePage({
      id: pageId ?? undefined,
      title,
      slug,
      page_type: pageType,
      sage_id: sageId,
      hero_image_url: heroUrl,
      seo_title: seoTitle.trim() ? seoTitle.trim() : null,
      seo_description: seoDescription.trim() ? seoDescription.trim() : null,
      blocks: blocks.map((b, i) => ({ ...b, sort_order: i })),
    })
    setBusy(null)
    if (!res.ok || !res.id) {
      setError(res.error ?? 'Could not save.')
      return null
    }
    const wasNew = !pageId
    setPageId(res.id)
    setNotice('Saved')
    if (wasNew) router.replace(`/dashboard/admin/pages/${res.id}`)
    return res.id
  }

  async function togglePublish() {
    // Persist current edits first so publish never ships a stale draft.
    const id = await save()
    if (!id) return
    const next = status === 'published' ? 'draft' : 'published'
    setBusy('publish')
    const res = await setPageStatus(id, next)
    setBusy(null)
    if (!res.ok) {
      setError(res.error ?? 'Could not change status.')
      return
    }
    setStatus(next)
    setNotice(next === 'published' ? 'Published' : 'Unpublished')
  }

  const publicPath = pagePublicPath(pageType, slug)

  return (
    <section>
      {/* PLACEHOLDER COPY */}
      <p className="label mb-2 text-olive">Admin</p>
      <h2 className="mb-6">{pageId ? 'Edit page' : 'New page'}</h2>

      {error && <p className="caption mb-4 text-olive">{error}</p>}
      {notice && <p className="caption mb-4 text-dark">{notice}</p>}

      {/* --- meta fields --- */}
      <div className="mb-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="label text-dark">Title</span>
          <input className={FIELD} value={title} onChange={(e) => onTitle(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="label text-dark">Slug</span>
          <input
            className={FIELD}
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value)
              setSlugTouched(true)
            }}
          />
          <span className="caption text-dark">Public path: {publicPath}</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="label text-dark">Type</span>
          <select className={FIELD} value={pageType} onChange={(e) => onPageType(e.target.value as PageType)}>
            <option value="editorial">Editorial</option>
            <option value="sage">Sage</option>
          </select>
        </label>

        {pageType === 'sage' && (
          <label className="flex flex-col gap-1">
            <span className="label text-dark">Sage</span>
            <select
              className={FIELD}
              value={sageId ?? ''}
              onChange={(e) => setSageId(e.target.value || null)}
            >
              <option value="">Select a sage</option>
              {sages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
            </select>
            {sages.length === 0 && (
              <span className="caption text-dark">{/* PLACEHOLDER COPY */}No sages exist yet.</span>
            )}
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="label text-dark">SEO title</span>
          <input className={FIELD} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="label text-dark">SEO description</span>
          <textarea
            className={FIELD}
            rows={2}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
          />
        </label>

        {/* hero */}
        <div className="flex flex-col gap-2">
          <span className="label text-dark">Hero image</span>
          {heroUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerCrop(heroUrl)} alt="" className="max-h-48 w-full object-cover" />
          )}
          <label className="btn-secondary inline-block w-fit cursor-pointer">
            {busy === 'hero' ? 'Uploading' : heroUrl ? 'Replace hero' : 'Upload hero'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => uploadHero(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      {/* --- blocks --- */}
      <div className="mb-6 flex items-center justify-between border-t border-border pt-6">
        <span className="label text-dark">Blocks</span>
        <div className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map((bt) => (
            <button key={bt.type} type="button" className="btn-secondary" onClick={() => addBlock(bt.type)}>
              Add {bt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {blocks.length === 0 && (
          <p className="caption text-dark">{/* PLACEHOLDER COPY */}No blocks yet. Add one above.</p>
        )}
        {blocks.map((block, i) => (
          <div key={i} className="border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="label text-olive">{block.block_type.replace('_', ' + ')}</span>
              <div className="flex gap-2">
                <button type="button" className="caption text-dark" onClick={() => moveBlock(i, -1)} disabled={i === 0}>
                  Up
                </button>
                <button
                  type="button"
                  className="caption text-dark"
                  onClick={() => moveBlock(i, 1)}
                  disabled={i === blocks.length - 1}
                >
                  Down
                </button>
                <button type="button" className="caption text-olive" onClick={() => deleteBlock(i)}>
                  Delete
                </button>
              </div>
            </div>
            <BlockFields
              block={block}
              index={i}
              busy={busy}
              onField={setBlockField}
              onImage={uploadBlockImage}
            />
          </div>
        ))}
      </div>

      {/* --- actions --- */}
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <button type="button" className="btn-primary" onClick={save} disabled={busy !== null}>
          {busy === 'save' ? 'Saving' : 'Save'}
        </button>
        <button type="button" className="btn-secondary" onClick={togglePublish} disabled={busy !== null}>
          {status === 'published' ? 'Unpublish' : 'Publish'}
        </button>
        <span className="caption text-dark">Status: {status}</span>
        {status === 'published' && (
          <a href={publicPath} className="caption text-olive underline" target="_blank" rel="noreferrer">
            View public page
          </a>
        )}
      </div>
    </section>
  )
}

function BlockFields({
  block,
  index,
  busy,
  onField,
  onImage,
}: {
  block: PageBlock
  index: number
  busy: string | null
  onField: (index: number, field: string, value: string) => void
  onImage: (index: number, file: File | undefined) => void
}) {
  const uploading = busy === `block-${index}`

  if (block.block_type === 'heading') {
    const c = block.content as HeadingContent
    return (
      <div className="flex flex-col gap-2">
        <select className={FIELD} value={c.level} onChange={(e) => onField(index, 'level', e.target.value)}>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
        </select>
        <input className={FIELD} placeholder="Heading text" value={c.text} onChange={(e) => onField(index, 'text', e.target.value)} />
      </div>
    )
  }

  if (block.block_type === 'paragraph') {
    const c = block.content as ParagraphContent
    return (
      <textarea className={FIELD} rows={4} placeholder="Paragraph text" value={c.text} onChange={(e) => onField(index, 'text', e.target.value)} />
    )
  }

  if (block.block_type === 'image') {
    const c = block.content as ImageContent
    return (
      <div className="flex flex-col gap-2">
        {c.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.url} alt="" className="max-h-40 w-full object-cover" />
        )}
        <label className="btn-secondary inline-block w-fit cursor-pointer">
          {uploading ? 'Uploading' : c.url ? 'Replace image' : 'Upload image'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onImage(index, e.target.files?.[0])} />
        </label>
        <input className={FIELD} placeholder="Alt text" value={c.alt} onChange={(e) => onField(index, 'alt', e.target.value)} />
        <select className={FIELD} value={c.width} onChange={(e) => onField(index, 'width', e.target.value)}>
          <option value="full">Full width</option>
          <option value="inset">Inset</option>
        </select>
      </div>
    )
  }

  // image_text
  const c = block.content as ImageTextContent
  return (
    <div className="flex flex-col gap-2">
      {c.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.url} alt="" className="max-h-40 w-full object-cover" />
      )}
      <label className="btn-secondary inline-block w-fit cursor-pointer">
        {uploading ? 'Uploading' : c.url ? 'Replace image' : 'Upload image'}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => onImage(index, e.target.files?.[0])} />
      </label>
      <input className={FIELD} placeholder="Alt text" value={c.alt} onChange={(e) => onField(index, 'alt', e.target.value)} />
      <textarea className={FIELD} rows={4} placeholder="Text" value={c.text} onChange={(e) => onField(index, 'text', e.target.value)} />
      <select className={FIELD} value={c.image_side} onChange={(e) => onField(index, 'image_side', e.target.value)}>
        <option value="left">Image left</option>
        <option value="right">Image right</option>
      </select>
    </div>
  )
}
