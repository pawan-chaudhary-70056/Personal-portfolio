import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { AdminSkill, SkillPayload } from '@/@types/admin'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { FormField } from '@/components/forms/FormField'
import { checkboxClassName, inputClassName, textareaClassName } from '@/components/ui/fieldStyles'
import { toSkillFormValues, toSkillPayload, type SkillFormValues } from '@/utils/contentPayload'

interface SkillFormProps {
  skill?: AdminSkill
  submitLabel: string
  busy: boolean
  formError: string | null
  fieldErrors: Record<string, string>
  onSubmit: (payload: SkillPayload) => void
  cancelHref: string
}

export function SkillForm({
  skill,
  submitLabel,
  busy,
  formError,
  fieldErrors,
  onSubmit,
  cancelHref,
}: SkillFormProps) {
  const [values, setValues] = useState<SkillFormValues>(() => toSkillFormValues(skill))

  function update<K extends keyof SkillFormValues>(key: K, value: SkillFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(toSkillPayload(values))
  }

  const invalid = (field: string) => (fieldErrors[field] ? true : undefined)
  const describedBy = (field: string) => (fieldErrors[field] ? `${field}-error` : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 max-w-2xl space-y-8">
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="name" label="Skill" required error={fieldErrors.name}>
          <input
            id="name"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            aria-invalid={invalid('name')}
            aria-describedby={describedBy('name')}
            className={inputClassName}
          />
        </FormField>

        <FormField
          id="category"
          label="Category"
          required
          hint="Groups related skills, for example Security or Development."
          error={fieldErrors.category}
        >
          <input
            id="category"
            value={values.category}
            onChange={(event) => update('category', event.target.value)}
            aria-invalid={invalid('category')}
            aria-describedby={describedBy('category')}
            className={inputClassName}
          />
        </FormField>
      </div>

      <FormField
        id="description"
        label="Description"
        hint={`${values.description.length}/300 characters. Optional supporting detail.`}
        error={fieldErrors.description}
      >
        <textarea
          id="description"
          rows={3}
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
          aria-invalid={invalid('description')}
          aria-describedby={describedBy('description')}
          className={textareaClassName}
        />
      </FormField>

      <FormField
        id="sortOrder"
        label="Sort order"
        hint="Lower numbers appear first within a category."
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

      <div className="flex items-start gap-3 border-t border-charcoal/15 pt-8">
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
            Hidden skills stay available here but are omitted from the portfolio.
          </span>
        </label>
      </div>

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
