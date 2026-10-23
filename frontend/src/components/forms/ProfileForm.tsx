import { useState, type FormEvent } from 'react'
import type { AdminProfile, ProfilePayload } from '@/@types/admin'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { FormField } from '@/components/forms/FormField'
import { inputClassName, textareaClassName } from '@/components/ui/fieldStyles'
import {
  toProfileFormValues,
  toProfilePayload,
  type ProfileFormValues,
} from '@/utils/profilePayload'

interface ProfileFormProps {
  profile: AdminProfile | null
  busy: boolean
  formError: string | null
  fieldErrors: Record<string, string>
  onSubmit: (payload: ProfilePayload) => void
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value.trim())
}

function initialsFrom(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return initials || 'P'
}

export function ProfileForm({
  profile,
  busy,
  formError,
  fieldErrors,
  onSubmit,
}: ProfileFormProps) {
  const [values, setValues] = useState<ProfileFormValues>(() => toProfileFormValues(profile))

  function update<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(toProfilePayload(values))
  }

  const invalid = (field: string) => (fieldErrors[field] ? true : undefined)
  const describedBy = (field: string) => (fieldErrors[field] ? `${field}-error` : undefined)

  const portrait = isHttpUrl(values.portraitUrl) ? values.portraitUrl.trim() : null
  const links = [
    { label: 'Website', url: values.websiteUrl },
    { label: 'LinkedIn', url: values.linkedinUrl },
    { label: 'GitHub', url: values.githubUrl },
  ].filter((link) => isHttpUrl(link.url))

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10">
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <fieldset className="space-y-6">
            <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
              Identity
            </legend>

            <FormField
              id="displayName"
              label="Display name"
              required
              hint="The primary name shown across the portfolio."
              error={fieldErrors.displayName}
            >
              <input
                id="displayName"
                value={values.displayName}
                onChange={(event) => update('displayName', event.target.value)}
                aria-invalid={invalid('displayName')}
                aria-describedby={describedBy('displayName')}
                className={inputClassName}
              />
            </FormField>

            <FormField
              id="headline"
              label="Professional headline"
              required
              hint={`${values.headline.length}/160 characters. A single line describing what you do.`}
              error={fieldErrors.headline}
            >
              <input
                id="headline"
                value={values.headline}
                onChange={(event) => update('headline', event.target.value)}
                aria-invalid={invalid('headline')}
                aria-describedby={describedBy('headline')}
                className={inputClassName}
              />
            </FormField>

            <FormField
              id="biography"
              label="Biography"
              required
              hint={`${values.biography.length}/10000 characters. Plain text; paragraphs are preserved.`}
              error={fieldErrors.biography}
            >
              <textarea
                id="biography"
                rows={8}
                value={values.biography}
                onChange={(event) => update('biography', event.target.value)}
                aria-invalid={invalid('biography')}
                aria-describedby={describedBy('biography')}
                className={textareaClassName}
              />
            </FormField>
          </fieldset>

          <fieldset className="space-y-6 border-t border-charcoal/15 pt-8">
            <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
              Public details
            </legend>

            <div className="grid gap-6 lg:grid-cols-2">
              <FormField
                id="location"
                label="Location"
                hint="Optional. Shown only if you enter it."
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

              <FormField
                id="publicEmail"
                label="Public email"
                hint="Optional. Entering an address publishes it on the portfolio."
                error={fieldErrors.publicEmail}
              >
                <input
                  id="publicEmail"
                  type="email"
                  value={values.publicEmail}
                  onChange={(event) => update('publicEmail', event.target.value)}
                  aria-invalid={invalid('publicEmail')}
                  aria-describedby={describedBy('publicEmail')}
                  className={inputClassName}
                />
              </FormField>
            </div>
          </fieldset>

          <fieldset className="space-y-6 border-t border-charcoal/15 pt-8">
            <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
              Links
            </legend>

            <div className="grid gap-6 lg:grid-cols-2">
              <FormField
                id="websiteUrl"
                label="Website URL"
                hint="Optional. Must start with http:// or https://."
                error={fieldErrors.websiteUrl}
              >
                <input
                  id="websiteUrl"
                  type="url"
                  value={values.websiteUrl}
                  onChange={(event) => update('websiteUrl', event.target.value)}
                  aria-invalid={invalid('websiteUrl')}
                  aria-describedby={describedBy('websiteUrl')}
                  className={inputClassName}
                />
              </FormField>

              <FormField id="linkedinUrl" label="LinkedIn URL" error={fieldErrors.linkedinUrl}>
                <input
                  id="linkedinUrl"
                  type="url"
                  value={values.linkedinUrl}
                  onChange={(event) => update('linkedinUrl', event.target.value)}
                  aria-invalid={invalid('linkedinUrl')}
                  aria-describedby={describedBy('linkedinUrl')}
                  className={inputClassName}
                />
              </FormField>

              <FormField id="githubUrl" label="GitHub URL" error={fieldErrors.githubUrl}>
                <input
                  id="githubUrl"
                  type="url"
                  value={values.githubUrl}
                  onChange={(event) => update('githubUrl', event.target.value)}
                  aria-invalid={invalid('githubUrl')}
                  aria-describedby={describedBy('githubUrl')}
                  className={inputClassName}
                />
              </FormField>
            </div>
          </fieldset>

          <fieldset className="space-y-6 border-t border-charcoal/15 pt-8">
            <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
              Portrait
            </legend>

            <div className="grid gap-6 lg:grid-cols-2">
              <FormField
                id="portraitUrl"
                label="Portrait URL"
                hint="Optional. Uploads are not enabled yet; use a hosted image URL."
                error={fieldErrors.portraitUrl}
              >
                <input
                  id="portraitUrl"
                  type="url"
                  value={values.portraitUrl}
                  onChange={(event) => update('portraitUrl', event.target.value)}
                  aria-invalid={invalid('portraitUrl')}
                  aria-describedby={describedBy('portraitUrl')}
                  className={inputClassName}
                />
              </FormField>

              <FormField
                id="portraitAlt"
                label="Portrait description"
                hint="Required when a portrait URL is set. Describe the image for screen readers."
                error={fieldErrors.portraitAlt}
              >
                <input
                  id="portraitAlt"
                  value={values.portraitAlt}
                  onChange={(event) => update('portraitAlt', event.target.value)}
                  aria-invalid={invalid('portraitAlt')}
                  aria-describedby={describedBy('portraitAlt')}
                  className={inputClassName}
                />
              </FormField>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4 border-t border-charcoal/15 pt-8">
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 bg-gold px-6 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d] disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save profile'}
            </button>
            <p className="text-caption text-muted-light">
              Saved changes are published immediately.
            </p>
          </div>
        </div>

        <aside
          aria-labelledby="profile-preview-heading"
          className="xl:sticky xl:top-8 xl:self-start"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="profile-preview-heading"
              className="text-caption tracking-[0.14em] text-muted-light uppercase"
            >
              Preview
            </h2>
            <p className="text-caption text-muted-light">Not yet published</p>
          </div>

          <div className="mt-3 border border-charcoal/15 bg-white p-6">
            {portrait ? (
              <img
                src={portrait}
                alt={values.portraitAlt.trim()}
                className="size-24 border border-charcoal/10 object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex size-24 items-center justify-center border border-charcoal/15 bg-charcoal/[0.03] font-serif text-h2 text-charcoal/60"
              >
                {initialsFrom(values.displayName)}
              </div>
            )}

            <p className="mt-5 font-serif text-h3 text-charcoal">
              {values.displayName.trim() || 'Your name'}
            </p>
            <p className="mt-1 text-body-sm text-gold-ink">
              {values.headline.trim() || 'Professional headline'}
            </p>

            {values.location.trim() ? (
              <p className="mt-3 text-caption tracking-[0.12em] text-muted-light uppercase">
                {values.location.trim()}
              </p>
            ) : null}

            <p className="mt-4 line-clamp-6 whitespace-pre-line text-body-sm text-charcoal/70">
              {values.biography.trim() || 'Your biography preview appears here.'}
            </p>

            {links.length > 0 || values.publicEmail.trim() ? (
              <ul className="mt-5 space-y-1.5 border-t border-charcoal/10 pt-4 text-caption text-charcoal/70">
                {values.publicEmail.trim() ? (
                  <li className="break-all">{values.publicEmail.trim()}</li>
                ) : null}
                {links.map((link) => (
                  <li key={link.label}>
                    {link.label}
                    <span aria-hidden="true"> · </span>
                    <span className="break-all text-muted-light">{link.url.trim()}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <p className="mt-3 text-caption text-muted-light">
            This is a visual preview only. Save to publish these details.
          </p>
        </aside>
      </div>
    </form>
  )
}
