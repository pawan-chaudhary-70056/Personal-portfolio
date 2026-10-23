import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { AdminEducation, EducationPayload } from '@/@types/admin'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { FormField } from '@/components/forms/FormField'
import { checkboxClassName, inputClassName, textareaClassName } from '@/components/ui/fieldStyles'
import {
  toEducationFormValues,
  toEducationPayload,
  type EducationFormValues,
} from '@/utils/contentPayload'

interface EducationFormProps {
  entry?: AdminEducation
  submitLabel: string
  busy: boolean
  formError: string | null
  fieldErrors: Record<string, string>
  onSubmit: (payload: EducationPayload) => void
  cancelHref: string
}

export function EducationForm({
  entry,
  submitLabel,
  busy,
  formError,
  fieldErrors,
  onSubmit,
  cancelHref,
}: EducationFormProps) {
  const [values, setValues] = useState<EducationFormValues>(() => toEducationFormValues(entry))

  function update<K extends keyof EducationFormValues>(
    key: K,
    value: EducationFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(toEducationPayload(values))
  }

  const invalid = (field: string) => (fieldErrors[field] ? true : undefined)
  const describedBy = (field: string) => (fieldErrors[field] ? `${field}-error` : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 max-w-3xl space-y-8">
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

      <fieldset className="space-y-6">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
          Qualification
        </legend>

        <div className="grid gap-6 lg:grid-cols-2">
          <FormField
            id="qualification"
            label="Qualification"
            required
            error={fieldErrors.qualification}
          >
            <input
              id="qualification"
              value={values.qualification}
              onChange={(event) => update('qualification', event.target.value)}
              aria-invalid={invalid('qualification')}
              aria-describedby={describedBy('qualification')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="institution"
            label="Institution"
            required
            error={fieldErrors.institution}
          >
            <input
              id="institution"
              value={values.institution}
              onChange={(event) => update('institution', event.target.value)}
              aria-invalid={invalid('institution')}
              aria-describedby={describedBy('institution')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="fieldOfStudy"
            label="Field of study"
            hint="Optional, for example Computer Science."
            error={fieldErrors.fieldOfStudy}
          >
            <input
              id="fieldOfStudy"
              value={values.fieldOfStudy}
              onChange={(event) => update('fieldOfStudy', event.target.value)}
              aria-invalid={invalid('fieldOfStudy')}
              className={inputClassName}
            />
          </FormField>
        </div>

        <FormField
          id="description"
          label="Description"
          hint="Optional. Relevant academic information in plain text."
          error={fieldErrors.description}
        >
          <textarea
            id="description"
            rows={5}
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
            aria-invalid={invalid('description')}
            aria-describedby={describedBy('description')}
            className={textareaClassName}
          />
        </FormField>
      </fieldset>

      <fieldset className="space-y-6 border-t border-charcoal/15 pt-8">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">Dates</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            id="startDate"
            label="Start date"
            hint="Optional. Leave blank if the exact date is unknown."
            error={fieldErrors.startDate}
          >
            <input
              id="startDate"
              type="date"
              value={values.startDate}
              max={values.endDate || undefined}
              onChange={(event) => update('startDate', event.target.value)}
              aria-invalid={invalid('startDate')}
              aria-describedby={describedBy('startDate')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="endDate"
            label="End date"
            hint="Optional. Leave blank for an ongoing qualification."
            error={fieldErrors.endDate}
          >
            <input
              id="endDate"
              type="date"
              value={values.endDate}
              min={values.startDate || undefined}
              onChange={(event) => update('endDate', event.target.value)}
              aria-invalid={invalid('endDate')}
              aria-describedby={describedBy('endDate')}
              className={inputClassName}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="space-y-6 border-t border-charcoal/15 pt-8">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
          Display
        </legend>

        <FormField
          id="sortOrder"
          label="Sort order"
          hint="Lower numbers appear first in the credentials list."
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
            aria-describedby={describedBy('sortOrder')}
            className={inputClassName}
          />
        </FormField>

        <div className="flex items-start gap-3">
          <input
            id="published"
            type="checkbox"
            checked={values.published}
            onChange={(event) => update('published', event.target.checked)}
            className={`${checkboxClassName} mt-0.5`}
          />
          <label htmlFor="published" className="text-body-sm text-charcoal">
            Show on the public site
            <span className="mt-0.5 block text-caption text-muted-light">
              Hidden qualifications stay available here but are omitted from the portfolio.
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
