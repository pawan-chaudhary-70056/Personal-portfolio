import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { AdminExperience, ExperiencePayload } from '@/@types/admin'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { FormField } from '@/components/forms/FormField'
import { checkboxClassName, inputClassName, textareaClassName } from '@/components/ui/fieldStyles'
import {
  toExperienceFormValues,
  toExperiencePayload,
  type ExperienceFormValues,
} from '@/utils/contentPayload'

interface ExperienceFormProps {
  entry?: AdminExperience
  submitLabel: string
  busy: boolean
  formError: string | null
  fieldErrors: Record<string, string>
  onSubmit: (payload: ExperiencePayload) => void
  cancelHref: string
}

export function ExperienceForm({
  entry,
  submitLabel,
  busy,
  formError,
  fieldErrors,
  onSubmit,
  cancelHref,
}: ExperienceFormProps) {
  const [values, setValues] = useState<ExperienceFormValues>(() => toExperienceFormValues(entry))

  function update<K extends keyof ExperienceFormValues>(
    key: K,
    value: ExperienceFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(toExperiencePayload(values))
  }

  const invalid = (field: string) => (fieldErrors[field] ? true : undefined)
  const describedBy = (field: string) => (fieldErrors[field] ? `${field}-error` : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 max-w-3xl space-y-8">
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

      <fieldset className="space-y-6">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">Role</legend>

        <div className="grid gap-6 lg:grid-cols-2">
          <FormField id="role" label="Role" required error={fieldErrors.role}>
            <input
              id="role"
              value={values.role}
              onChange={(event) => update('role', event.target.value)}
              aria-invalid={invalid('role')}
              aria-describedby={describedBy('role')}
              className={inputClassName}
            />
          </FormField>

          <FormField id="organization" label="Organization" required error={fieldErrors.organization}>
            <input
              id="organization"
              value={values.organization}
              onChange={(event) => update('organization', event.target.value)}
              aria-invalid={invalid('organization')}
              aria-describedby={describedBy('organization')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="employmentType"
            label="Employment type"
            hint="Optional, for example Internship or Full-time."
            error={fieldErrors.employmentType}
          >
            <input
              id="employmentType"
              value={values.employmentType}
              onChange={(event) => update('employmentType', event.target.value)}
              aria-invalid={invalid('employmentType')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="location"
            label="Location"
            hint="Optional. Only add a location you are happy to publish."
            error={fieldErrors.location}
          >
            <input
              id="location"
              value={values.location}
              onChange={(event) => update('location', event.target.value)}
              aria-invalid={invalid('location')}
              className={inputClassName}
            />
          </FormField>
        </div>

        <FormField
          id="description"
          label="Description"
          hint="Optional. Responsibilities and outcomes in plain text."
          error={fieldErrors.description}
        >
          <textarea
            id="description"
            rows={6}
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
          <FormField id="startDate" label="Start date" required error={fieldErrors.startDate}>
            <input
              id="startDate"
              type="date"
              value={values.startDate}
              onChange={(event) => update('startDate', event.target.value)}
              aria-invalid={invalid('startDate')}
              aria-describedby={describedBy('startDate')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="endDate"
            label="End date"
            hint={values.isCurrent ? 'Not applicable while this is your current role.' : 'Optional.'}
            error={fieldErrors.endDate}
          >
            <input
              id="endDate"
              type="date"
              value={values.endDate}
              disabled={values.isCurrent}
              onChange={(event) => update('endDate', event.target.value)}
              aria-invalid={invalid('endDate')}
              aria-describedby={describedBy('endDate')}
              className={`${inputClassName} disabled:bg-charcoal/5 disabled:text-muted-light`}
            />
          </FormField>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="isCurrent"
            type="checkbox"
            checked={values.isCurrent}
            onChange={(event) => {
              update('isCurrent', event.target.checked)
              if (event.target.checked) {
                update('endDate', '')
              }
            }}
            className={`${checkboxClassName} mt-0.5`}
          />
          <label htmlFor="isCurrent" className="text-body-sm text-charcoal">
            This is my current role
            <span className="mt-0.5 block text-caption text-muted-light">
              Current roles are shown without an end date.
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-6 border-t border-charcoal/15 pt-8">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
          Display
        </legend>

        <FormField
          id="sortOrder"
          label="Sort order"
          hint="Lower numbers appear first on the public timeline."
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
              Hidden entries stay available here but are omitted from the portfolio.
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
