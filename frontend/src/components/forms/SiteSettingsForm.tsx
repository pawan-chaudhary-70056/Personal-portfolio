import { useState, type FormEvent } from 'react'
import type { AdminSiteSettings, SiteSettingsPayload } from '@/@types/admin'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { FormField } from '@/components/forms/FormField'
import { inputClassName, textareaClassName } from '@/components/ui/fieldStyles'

interface SiteSettingsFormProps {
  settings: AdminSiteSettings
  busy: boolean
  formError: string | null
  fieldErrors: Record<string, string>
  onSubmit: (payload: SiteSettingsPayload) => void
}

interface FormValues {
  siteTitle: string
  siteDescription: string
  canonicalUrl: string
  socialImageUrl: string
}

export function SiteSettingsForm({
  settings,
  busy,
  formError,
  fieldErrors,
  onSubmit,
}: SiteSettingsFormProps) {
  const [values, setValues] = useState<FormValues>({
    siteTitle: settings.siteTitle,
    siteDescription: settings.siteDescription,
    canonicalUrl: settings.canonicalUrl ?? '',
    socialImageUrl: settings.socialImageUrl ?? '',
  })

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Empty optional URLs are stored as null by the backend.
    onSubmit({
      siteTitle: values.siteTitle.trim(),
      siteDescription: values.siteDescription.trim(),
      canonicalUrl: values.canonicalUrl.trim() || null,
      socialImageUrl: values.socialImageUrl.trim() || null,
    })
  }

  const invalid = (field: string) => (fieldErrors[field] ? true : undefined)
  const describedBy = (field: string) => (fieldErrors[field] ? `${field}-error` : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 max-w-2xl">
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

      <fieldset className="mt-6 space-y-8">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
          Public metadata
        </legend>

        <FormField
          id="siteTitle"
          label="Site title"
          hint={`${values.siteTitle.length}/120 characters. Used as the homepage and social preview title. Leave empty to use the profile name and headline.`}
          error={fieldErrors.siteTitle}
        >
          <input
            id="siteTitle"
            value={values.siteTitle}
            onChange={(event) => update('siteTitle', event.target.value)}
            aria-invalid={invalid('siteTitle')}
            aria-describedby={describedBy('siteTitle')}
            className={inputClassName}
          />
        </FormField>

        <FormField
          id="siteDescription"
          label="Default description"
          hint={`${values.siteDescription.length}/320 characters. Used for the meta description and link previews when the profile has no biography summary.`}
          error={fieldErrors.siteDescription}
        >
          <textarea
            id="siteDescription"
            rows={4}
            value={values.siteDescription}
            onChange={(event) => update('siteDescription', event.target.value)}
            aria-invalid={invalid('siteDescription')}
            aria-describedby={describedBy('siteDescription')}
            className={textareaClassName}
          />
        </FormField>

        <FormField
          id="canonicalUrl"
          label="Canonical URL"
          hint="Optional. The public site address used for canonical and Open Graph URLs, for example https://example.com."
          error={fieldErrors.canonicalUrl}
        >
          <input
            id="canonicalUrl"
            type="url"
            inputMode="url"
            placeholder="https://example.com"
            value={values.canonicalUrl}
            onChange={(event) => update('canonicalUrl', event.target.value)}
            aria-invalid={invalid('canonicalUrl')}
            aria-describedby={describedBy('canonicalUrl')}
            className={inputClassName}
          />
        </FormField>

        <FormField
          id="socialImageUrl"
          label="Social sharing image"
          hint="Optional. An absolute http(s) URL to the image shown when the site is shared. Leave empty to omit the image."
          error={fieldErrors.socialImageUrl}
        >
          <input
            id="socialImageUrl"
            type="url"
            inputMode="url"
            placeholder="https://example.com/og-image.jpg"
            value={values.socialImageUrl}
            onChange={(event) => update('socialImageUrl', event.target.value)}
            aria-invalid={invalid('socialImageUrl')}
            aria-describedby={describedBy('socialImageUrl')}
            className={inputClassName}
          />
        </FormField>
      </fieldset>

      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-charcoal/15 pt-8">
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 bg-gold px-6 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d] disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save settings'}
        </button>
        <p className="text-caption text-muted-light">
          Saved settings are public immediately. Social profile links stay on the Profile page.
        </p>
      </div>
    </form>
  )
}
