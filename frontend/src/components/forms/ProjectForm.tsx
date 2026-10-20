import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { AdminProject, ProjectPayload } from '@/@types/admin'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { FormField } from '@/components/forms/FormField'
import {
  checkboxClassName,
  inputClassName,
  selectClassName,
  textareaClassName,
} from '@/components/ui/fieldStyles'
import { toFormValues, toProjectPayload, type ProjectFormValues } from '@/utils/projectPayload'

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

  function update<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(toProjectPayload(values))
  }

  const invalid = (field: string) => (fieldErrors[field] ? true : undefined)
  const describedBy = (field: string) => (fieldErrors[field] ? `${field}-error` : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-8">
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

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
          <FormField id="category" label="Category" error={fieldErrors.category}>
            <input
              id="category"
              value={values.category}
              onChange={(event) => update('category', event.target.value)}
              aria-invalid={invalid('category')}
              className={inputClassName}
            />
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
            hint="Optional. Uploads are not enabled yet."
            error={fieldErrors.imageUrl}
          >
            <input
              id="imageUrl"
              type="url"
              value={values.imageUrl}
              onChange={(event) => update('imageUrl', event.target.value)}
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
