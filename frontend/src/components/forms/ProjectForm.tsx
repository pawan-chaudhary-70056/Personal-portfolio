import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { AdminProject, AdminProjectCategory, ProjectPayload } from '@/@types/admin'
import { listProjectCategories } from '@/api/categories.api'
import { ApiError } from '@/api/client'
import { uploadMedia } from '@/api/media.api'
import { MediaPicker } from '@/components/admin/MediaPicker'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { FormField } from '@/components/forms/FormField'
import { useApiResource } from '@/hooks/useApiResource'
import {
  checkboxClassName,
  inputClassName,
  selectClassName,
  textareaClassName,
} from '@/components/ui/fieldStyles'
import {
  emptyScreenshotRow,
  toFormValues,
  toProjectPayload,
  type ProjectFormValues,
  type ScreenshotFormValues,
} from '@/utils/projectPayload'

interface ProjectFormProps {
  project?: AdminProject
  submitLabel: string
  busy: boolean
  formError: string | null
  fieldErrors: Record<string, string>
  onSubmit: (payload: ProjectPayload) => void
  cancelHref: string
}

export function ProjectForm({
  project,
  submitLabel,
  busy,
  formError,
  fieldErrors,
  onSubmit,
  cancelHref,
}: ProjectFormProps) {
  const [values, setValues] = useState<ProjectFormValues>(() => toFormValues(project))
  const [localError, setLocalError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  // One dialog serves the cover and every gallery row; the index says which.
  const [screenshotPicker, setScreenshotPicker] = useState<number | null>(null)
  const [uploadingScreenshot, setUploadingScreenshot] = useState<number | null>(null)
  const [draggingScreenshot, setDraggingScreenshot] = useState<number | null>(null)
  const [dragOverScreenshot, setDragOverScreenshot] = useState<number | null>(null)
  const [reorderMessage, setReorderMessage] = useState('')

  // Categories are managed separately; the select keeps projects inside the
  // managed list while still showing a current value that was renamed.
  const fetchCategories = useCallback(
    (signal: AbortSignal) => listProjectCategories(signal),
    [],
  )
  const { data: categories } = useApiResource<AdminProjectCategory[]>(fetchCategories, {
    errorMessage: 'Categories could not be loaded.',
  })
  const categoryOptions = categories ?? []
  const currentCategoryKnown = categoryOptions.some((option) => option.name === values.category)

  function update<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)

    // A partially filled screenshot row is a mistake, not an instruction to
    // guess. Fail early with a message and the offending field focused.
    const firstIncomplete = values.screenshots.findIndex((screenshot) => {
      const hasContent = Boolean(
        screenshot.url.trim() ||
          screenshot.mediaId.trim() ||
          screenshot.alt.trim() ||
          screenshot.caption.trim(),
      )
      const hasImage = Boolean(screenshot.url.trim() || screenshot.mediaId.trim())
      return hasContent && (!hasImage || !screenshot.alt.trim())
    })

    if (firstIncomplete >= 0) {
      const screenshot = values.screenshots[firstIncomplete]
      const hasImage = Boolean(screenshot.url.trim() || screenshot.mediaId.trim())
      setLocalError(
        'Each screenshot needs an image and alt text. Remove any row you do not need.',
      )
      document
        .getElementById(`screenshot-${firstIncomplete}-${hasImage ? 'alt' : 'url'}`)
        ?.focus()
      return
    }

    onSubmit(toProjectPayload(values))
  }

  function addScreenshot() {
    setLocalError(null)
    setValues((current) => ({
      ...current,
      screenshots: [...current.screenshots, emptyScreenshotRow()],
    }))
  }

  function removeScreenshot(index: number) {
    setLocalError(null)
    setValues((current) => ({
      ...current,
      screenshots: current.screenshots.filter((_screenshot, position) => position !== index),
    }))
  }

  /**
   * Reorders the gallery in place. List order is the saved display order, so
   * nothing else changes when a row moves.
   */
  function moveScreenshot(from: number, to: number) {
    const count = values.screenshots.length

    if (from === to || from < 0 || to < 0 || from >= count || to >= count) {
      return
    }

    setValues((current) => {
      const screenshots = [...current.screenshots]
      const [moved] = screenshots.splice(from, 1)

      if (!moved) {
        return current
      }

      screenshots.splice(to, 0, moved)
      return { ...current, screenshots }
    })
    setReorderMessage(`Screenshot ${from + 1} moved to position ${to + 1}.`)
  }

  function endScreenshotDrag() {
    setDraggingScreenshot(null)
    setDragOverScreenshot(null)
  }

  function updateScreenshot(index: number, key: keyof ScreenshotFormValues, value: string) {
    setLocalError(null)
    setValues((current) => ({
      ...current,
      screenshots: current.screenshots.map((screenshot, position) =>
        position === index ? { ...screenshot, [key]: value } : screenshot,
      ),
    }))
  }

  function pickScreenshotImage(index: number, mediaId: string, altText: string | null) {
    setLocalError(null)
    setValues((current) => ({
      ...current,
      screenshots: current.screenshots.map((screenshot, position) =>
        position === index
          ? {
              ...screenshot,
              mediaId,
              // The two sources are mutually exclusive.
              url: '',
              alt: screenshot.alt.trim() || altText || '',
            }
          : screenshot,
      ),
    }))
  }

  async function uploadScreenshot(index: number, file: File) {
    setLocalError(null)
    setUploadingScreenshot(index)

    try {
      const asset = await uploadMedia(file)
      pickScreenshotImage(index, asset.id, asset.altText)
    } catch (caught) {
      setLocalError(
        caught instanceof ApiError
          ? caught.message
          : 'The image could not be uploaded. Check your connection and try again.',
      )
    } finally {
      setUploadingScreenshot(null)
    }
  }

  const invalid = (field: string) => (fieldErrors[field] ? true : undefined)
  const describedBy = (field: string) => (fieldErrors[field] ? `${field}-error` : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-8">
      {formError || localError ? (
        <InlineAlert tone="error">{localError ?? formError}</InlineAlert>
      ) : null}

      <fieldset className="space-y-6">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
          Project details
        </legend>

        <div className="grid gap-6 lg:grid-cols-2">
          <FormField id="title" label="Title" required error={fieldErrors.title}>
            <input
              id="title"
              value={values.title}
              onChange={(event) => update('title', event.target.value)}
              aria-invalid={invalid('title')}
              aria-describedby={describedBy('title')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="slug"
            label="Slug"
            hint="Leave blank to generate from the title. Lowercase letters, numbers, hyphens."
            error={fieldErrors.slug}
          >
            <input
              id="slug"
              value={values.slug}
              onChange={(event) => update('slug', event.target.value)}
              aria-invalid={invalid('slug')}
              aria-describedby={describedBy('slug')}
              className={inputClassName}
            />
          </FormField>
        </div>

        <FormField
          id="summary"
          label="Summary"
          required
          hint={`${values.summary.length}/300 characters. Shown on project cards.`}
          error={fieldErrors.summary}
        >
          <textarea
            id="summary"
            rows={3}
            value={values.summary}
            onChange={(event) => update('summary', event.target.value)}
            aria-invalid={invalid('summary')}
            aria-describedby={describedBy('summary')}
            className={textareaClassName}
          />
        </FormField>

        <FormField
          id="description"
          label="Description"
          hint="Details for the project page. Plain text."
          error={fieldErrors.description}
        >
          <textarea
            id="description"
            rows={10}
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
            aria-invalid={invalid('description')}
            aria-describedby={describedBy('description')}
            className={textareaClassName}
          />
        </FormField>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            id="category"
            label="Category"
            hint="Managed in project categories."
            error={fieldErrors.category}
          >
            <select
              id="category"
              value={values.category}
              onChange={(event) => update('category', event.target.value)}
              aria-invalid={invalid('category')}
              aria-describedby={describedBy('category')}
              className={selectClassName}
            >
              {currentCategoryKnown || !values.category ? null : (
                <option value={values.category}>{values.category}</option>
              )}
              {categoryOptions.length === 0 ? (
                <option value={values.category}>{values.category || 'No categories yet'}</option>
              ) : null}
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            <Link
              to="/admin/project-categories"
              className="mt-2 inline-block text-caption text-charcoal/70 underline underline-offset-4"
            >
              Manage categories
            </Link>
          </FormField>

          <FormField
            id="year"
            label="Year"
            required
            hint="For example 2026 or 2024–2026."
            error={fieldErrors.year}
          >
            <input
              id="year"
              value={values.year}
              onChange={(event) => update('year', event.target.value)}
              aria-invalid={invalid('year')}
              aria-describedby={describedBy('year')}
              className={inputClassName}
            />
          </FormField>
        </div>

        <FormField
          id="technologies"
          label="Technologies"
          hint="Comma separated, up to 20."
          error={fieldErrors.technologies}
        >
          <input
            id="technologies"
            value={values.technologies}
            onChange={(event) => update('technologies', event.target.value)}
            aria-invalid={invalid('technologies')}
            aria-describedby={describedBy('technologies')}
            className={inputClassName}
          />
        </FormField>
      </fieldset>

      <fieldset className="space-y-6 border-t border-charcoal/15 pt-8">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">Links</legend>

        <div className="grid gap-6 lg:grid-cols-2">
          <FormField
            id="liveUrl"
            label="Live URL"
            hint="Optional. Must start with http:// or https://."
            error={fieldErrors.liveUrl}
          >
            <input
              id="liveUrl"
              type="url"
              value={values.liveUrl}
              onChange={(event) => update('liveUrl', event.target.value)}
              aria-invalid={invalid('liveUrl')}
              aria-describedby={describedBy('liveUrl')}
              className={inputClassName}
            />
          </FormField>

          <FormField id="repositoryUrl" label="Repository URL" error={fieldErrors.repositoryUrl}>
            <input
              id="repositoryUrl"
              type="url"
              value={values.repositoryUrl}
              onChange={(event) => update('repositoryUrl', event.target.value)}
              aria-invalid={invalid('repositoryUrl')}
              aria-describedby={describedBy('repositoryUrl')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="imageUrl"
            label="Cover image URL"
            hint="Optional. Use an uploaded image below, or link a hosted one."
            error={fieldErrors.imageUrl}
          >
            <input
              id="imageUrl"
              type="url"
              value={values.imageUrl}
              onChange={(event) => {
                update('imageUrl', event.target.value)
                // A typed URL replaces a previously picked library image.
                if (event.target.value.trim()) update('coverMediaId', '')
              }}
              aria-invalid={invalid('imageUrl')}
              aria-describedby={describedBy('imageUrl')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="imageAlt"
            label="Cover image description"
            hint="Describe the image for screen readers."
            error={fieldErrors.imageAlt}
          >
            <input
              id="imageAlt"
              value={values.imageAlt}
              onChange={(event) => update('imageAlt', event.target.value)}
              aria-invalid={invalid('imageAlt')}
              className={inputClassName}
            />
          </FormField>
        </div>

        <div className="border border-charcoal/15 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-caption tracking-[0.14em] text-muted-light uppercase">
                Uploaded cover
              </p>
              <p className="mt-1 text-body-sm text-charcoal/70">
                {values.coverMediaId
                  ? 'This project uses an image from the media library.'
                  : 'No library image selected. Choose one instead of hosting a URL.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
              >
                {values.coverMediaId ? 'Change image' : 'Choose from library'}
              </button>
              {values.coverMediaId ? (
                <button
                  type="button"
                  onClick={() => update('coverMediaId', '')}
                  className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          {values.coverMediaId ? (
            <img
              src={`/api/admin/media/${values.coverMediaId}/file`}
              alt=""
              className="mt-4 aspect-video w-full max-w-xs border border-charcoal/10 bg-charcoal/5 object-contain"
            />
          ) : null}
        </div>

        <MediaPicker
          open={pickerOpen}
          selectedId={values.coverMediaId || null}
          onClose={() => setPickerOpen(false)}
          onSelect={(asset) => {
            update('coverMediaId', asset.id)
            update('imageUrl', '')
            // Reuse the library description so the cover is never published
            // without alt text.
            if (!values.imageAlt.trim() && asset.altText) {
              update('imageAlt', asset.altText)
            }
          }}
        />
      </fieldset>

      <fieldset className="space-y-6 border-t border-charcoal/15 pt-8">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
          Screenshots
        </legend>

        <p className="text-caption text-muted-light">
          Optional. Up to 8 images shown on the project page in list order. Each screenshot needs an
          image — uploaded here, picked from the media library, or linked by URL — and alt text.
          Drag a row by its handle, or use the arrow buttons, to change the display order.
        </p>

        <p role="status" className="sr-only">
          {reorderMessage}
        </p>

        {values.screenshots.length === 0 ? (
          <p className="text-body-sm text-charcoal/70">No screenshots yet.</p>
        ) : null}

        {values.screenshots.map((screenshot, index) => (
          <div
            key={screenshot.key ?? index}
            onDragOver={(event) => {
              // Allowing the drop is what makes this row a valid target. The
              // state flag only drives the highlight; the drop itself reads the
              // source index from the drag data so it never depends on a render.
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              if (dragOverScreenshot !== index) setDragOverScreenshot(index)
            }}
            onDragLeave={() =>
              setDragOverScreenshot((current) => (current === index ? null : current))
            }
            onDrop={(event) => {
              event.preventDefault()
              const from = Number(event.dataTransfer.getData('text/plain'))

              if (Number.isInteger(from)) {
                moveScreenshot(from, index)
              }

              endScreenshotDrag()
            }}
            className={`border p-4 transition-colors duration-150 ease-standard ${
              dragOverScreenshot === index
                ? 'border-gold bg-gold/5'
                : 'border-charcoal/15'
            } ${draggingScreenshot === index ? 'opacity-60' : ''}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', String(index))
                    setDraggingScreenshot(index)
                  }}
                  onDragEnd={endScreenshotDrag}
                  aria-hidden="true"
                  title="Drag to reorder"
                  className="cursor-grab rounded border border-charcoal/20 px-2 py-1 text-caption text-charcoal/60 select-none active:cursor-grabbing"
                >
                  ⠿
                </span>
                <p className="text-caption tracking-[0.14em] text-muted-light uppercase">
                  Screenshot {index + 1}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => moveScreenshot(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move screenshot ${index + 1} up`}
                  className="min-h-11 border border-charcoal/30 px-3 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveScreenshot(index, index + 1)}
                  disabled={index === values.screenshots.length - 1}
                  aria-label={`Move screenshot ${index + 1} down`}
                  className="min-h-11 border border-charcoal/30 px-3 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeScreenshot(index)}
                  aria-label={`Remove screenshot ${index + 1}`}
                  className="text-caption text-error underline underline-offset-4"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <FormField
                id={`screenshot-${index}-url`}
                label="Image URL"
                hint={
                  screenshot.mediaId
                    ? 'A library image is selected. Remove it to use a URL instead.'
                    : 'Starts with http:// or https://. Or use the library below.'
                }
              >
                <input
                  id={`screenshot-${index}-url`}
                  type="url"
                  value={screenshot.url}
                  disabled={Boolean(screenshot.mediaId)}
                  onChange={(event) => {
                    updateScreenshot(index, 'url', event.target.value)
                    // A typed URL replaces a previously picked library image.
                    if (event.target.value.trim()) updateScreenshot(index, 'mediaId', '')
                  }}
                  className={`${inputClassName} disabled:opacity-60`}
                />
              </FormField>

              <FormField
                id={`screenshot-${index}-alt`}
                label="Alt text"
                required
                hint="Describe the image for screen readers."
              >
                <input
                  id={`screenshot-${index}-alt`}
                  value={screenshot.alt}
                  onChange={(event) => updateScreenshot(index, 'alt', event.target.value)}
                  className={inputClassName}
                />
              </FormField>

              <FormField
                id={`screenshot-${index}-caption`}
                label="Caption"
                hint="Optional. Shown beneath the image."
              >
                <input
                  id={`screenshot-${index}-caption`}
                  value={screenshot.caption}
                  maxLength={200}
                  onChange={(event) => updateScreenshot(index, 'caption', event.target.value)}
                  className={inputClassName}
                />
              </FormField>
            </div>

            <div className="mt-4 border border-charcoal/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-caption tracking-[0.14em] text-muted-light uppercase">
                    Library image
                  </p>
                  <p className="mt-1 text-body-sm text-charcoal/70">
                    {screenshot.mediaId
                      ? 'This screenshot uses an image from the media library.'
                      : 'No library image selected. Pick an existing one or upload a new image.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setScreenshotPicker(index)}
                    className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
                  >
                    {screenshot.mediaId ? 'Change image' : 'Choose from library'}
                  </button>
                  {screenshot.mediaId ? (
                    <button
                      type="button"
                      onClick={() => updateScreenshot(index, 'mediaId', '')}
                      aria-label={`Remove library image from screenshot ${index + 1}`}
                      className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
                    >
                      Remove image
                    </button>
                  ) : null}
                </div>
              </div>

              {screenshot.mediaId ? (
                <img
                  src={`/api/admin/media/${screenshot.mediaId}/file`}
                  alt=""
                  className="mt-4 aspect-video w-full max-w-xs border border-charcoal/10 bg-charcoal/5 object-contain"
                />
              ) : null}

              <div className="mt-4">
                <label
                  htmlFor={`screenshot-${index}-upload`}
                  className="block text-caption tracking-[0.14em] text-muted-light uppercase"
                >
                  Upload an image
                </label>
                <input
                  id={`screenshot-${index}-upload`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingScreenshot === index}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    // Reset so choosing the same file again still triggers a change.
                    event.target.value = ''
                    if (file) void uploadScreenshot(index, file)
                  }}
                  className="mt-2 block w-full max-w-sm text-caption"
                />
                {uploadingScreenshot === index ? (
                  <p role="status" className="mt-1 text-caption text-muted-light">
                    Uploading…
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        <MediaPicker
          open={screenshotPicker !== null}
          selectedId={
            screenshotPicker !== null
              ? values.screenshots[screenshotPicker]?.mediaId || null
              : null
          }
          onClose={() => setScreenshotPicker(null)}
          onSelect={(asset) => {
            if (screenshotPicker !== null) {
              pickScreenshotImage(screenshotPicker, asset.id, asset.altText)
            }
          }}
        />

        <button
          type="button"
          onClick={addScreenshot}
          className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
        >
          Add screenshot
        </button>
      </fieldset>

      <fieldset className="space-y-6 border-t border-charcoal/15 pt-8">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
          Publishing
        </legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            id="status"
            label="Status"
            hint="Drafts and archived projects are never publicly visible."
            error={fieldErrors.status}
          >
            <select
              id="status"
              value={values.status}
              onChange={(event) =>
                update('status', event.target.value as ProjectFormValues['status'])
              }
              className={selectClassName}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </FormField>

          <FormField
            id="sortOrder"
            label="Sort order"
            hint="Lower numbers appear first among featured projects."
            error={fieldErrors.sortOrder}
          >
            <input
              id="sortOrder"
              type="number"
              min={0}
              max={9999}
              value={values.sortOrder}
              onChange={(event) => update('sortOrder', event.target.value)}
              aria-invalid={invalid('sortOrder')}
              className={inputClassName}
            />
          </FormField>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="featured"
            type="checkbox"
            checked={values.featured}
            onChange={(event) => update('featured', event.target.checked)}
            className={`${checkboxClassName} mt-0.5`}
          />
          <label htmlFor="featured" className="text-body-sm text-charcoal">
            Feature this project
            <span className="mt-0.5 block text-caption text-muted-light">
              Featured projects appear first on the public homepage.
            </span>
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-charcoal/15 pt-8">
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 bg-gold px-6 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d] disabled:opacity-60"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>

        <Link
          to={cancelHref}
          className="link-underline text-body-sm text-charcoal/70 hover:text-charcoal"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
