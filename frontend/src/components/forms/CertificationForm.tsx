import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { AdminCertification, CertificationPayload } from '@/@types/admin'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { FormField } from '@/components/forms/FormField'
import { checkboxClassName, inputClassName } from '@/components/ui/fieldStyles'
import {
  toCertificationFormValues,
  toCertificationPayload,
  type CertificationFormValues,
} from '@/utils/contentPayload'

interface CertificationFormProps {
  certification?: AdminCertification
  submitLabel: string
  busy: boolean
  formError: string | null
  fieldErrors: Record<string, string>
  onSubmit: (payload: CertificationPayload) => void
  cancelHref: string
}

export function CertificationForm({
  certification,
  submitLabel,
  busy,
  formError,
  fieldErrors,
  onSubmit,
  cancelHref,
}: CertificationFormProps) {
  const [values, setValues] = useState<CertificationFormValues>(() =>
    toCertificationFormValues(certification),
  )

  function update<K extends keyof CertificationFormValues>(
    key: K,
    value: CertificationFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(toCertificationPayload(values))
  }

  const invalid = (field: string) => (fieldErrors[field] ? true : undefined)
  const describedBy = (field: string) => (fieldErrors[field] ? `${field}-error` : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 max-w-3xl space-y-8">
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

      <fieldset className="space-y-6">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
          Certification
        </legend>

        <div className="grid gap-6 lg:grid-cols-2">
          <FormField id="name" label="Name" required error={fieldErrors.name}>
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
            id="issuingOrganization"
            label="Issuing organization"
            required
            error={fieldErrors.issuingOrganization}
          >
            <input
              id="issuingOrganization"
              value={values.issuingOrganization}
              onChange={(event) => update('issuingOrganization', event.target.value)}
              aria-invalid={invalid('issuingOrganization')}
              aria-describedby={describedBy('issuingOrganization')}
              className={inputClassName}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="space-y-6 border-t border-charcoal/15 pt-8">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">Dates</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            id="issueDate"
            label="Issue date"
            hint="Optional."
            error={fieldErrors.issueDate}
          >
            <input
              id="issueDate"
              type="date"
              value={values.issueDate}
              max={values.expiryDate || undefined}
              onChange={(event) => update('issueDate', event.target.value)}
              aria-invalid={invalid('issueDate')}
              aria-describedby={describedBy('issueDate')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="expiryDate"
            label="Expiry date"
            hint="Optional. Leave blank if the credential does not expire."
            error={fieldErrors.expiryDate}
          >
            <input
              id="expiryDate"
              type="date"
              value={values.expiryDate}
              min={values.issueDate || undefined}
              onChange={(event) => update('expiryDate', event.target.value)}
              aria-invalid={invalid('expiryDate')}
              aria-describedby={describedBy('expiryDate')}
              className={inputClassName}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="space-y-6 border-t border-charcoal/15 pt-8">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
          Verification
        </legend>

        <div className="grid gap-6 lg:grid-cols-2">
          <FormField
            id="credentialId"
            label="Credential ID"
            hint="Optional. Only enter an identifier you are happy to publish."
            error={fieldErrors.credentialId}
          >
            <input
              id="credentialId"
              value={values.credentialId}
              onChange={(event) => update('credentialId', event.target.value)}
              aria-invalid={invalid('credentialId')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="credentialUrl"
            label="Verification URL"
            hint="Optional. Must start with http:// or https://."
            error={fieldErrors.credentialUrl}
          >
            <input
              id="credentialUrl"
              type="url"
              value={values.credentialUrl}
              onChange={(event) => update('credentialUrl', event.target.value)}
              aria-invalid={invalid('credentialUrl')}
              aria-describedby={describedBy('credentialUrl')}
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
              Hidden credentials stay available here but are omitted from the portfolio.
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
