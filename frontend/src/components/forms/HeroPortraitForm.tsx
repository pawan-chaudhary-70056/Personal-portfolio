import { useState, type FormEvent } from 'react'
import type { AdminHomepage, HeroDraftPayload } from '@/@types/admin'
import type { PublicHeroEffect } from '@/@types/portfolio'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { FormField } from '@/components/forms/FormField'
import { HeroPortrait } from '@/components/portfolio/HeroPortrait'
import { checkboxClassName, inputClassName } from '@/components/ui/fieldStyles'

export type HeroBusyAction = 'upload' | 'save' | 'publish' | 'remove' | 'sections' | null

interface HeroPortraitFormProps {
  homepage: AdminHomepage
  displayName: string
  busy: HeroBusyAction
  formError: string | null
  fieldErrors: Record<string, string>
  selectedFile: File | null
  previewUrl: string | null
  onSelectFile: (file: File | null) => void
  onUpload: () => void
  onSave: (payload: HeroDraftPayload) => void
  onPublish: () => void
  onRemove: () => void
}

function formatMegabytes(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`
}

function formatPublishedAt(value: string | null): string {
  if (!value) {
    return 'Not published yet'
  }

  return `Published ${new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })}`
}

export function HeroPortraitForm({
  homepage,
  displayName,
  busy,
  formError,
  fieldErrors,
  selectedFile,
  previewUrl,
  onSelectFile,
  onUpload,
  onSave,
  onPublish,
  onRemove,
}: HeroPortraitFormProps) {
  const { draft, published, hasUnpublishedChanges, publishedAt, limits } = homepage

  const [values, setValues] = useState<HeroDraftPayload>({
    portraitAlt: draft.portrait?.alt ?? '',
    portraitVisible: draft.portraitVisible,
    effectEnabled: draft.effectEnabled,
    tiltIntensity: draft.tiltIntensity,
    animationIntensity: draft.animationIntensity,
    floatingEnabled: draft.floatingEnabled,
  })

  function update<K extends keyof HeroDraftPayload>(key: K, value: HeroDraftPayload[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({ ...values, portraitAlt: values.portraitAlt?.trim() || null })
  }

  const previewEffect: PublicHeroEffect = {
    enabled: values.effectEnabled,
    tiltIntensity: values.tiltIntensity,
    animationIntensity: values.animationIntensity,
    floating: values.floatingEnabled,
  }

  const serverPortrait = draft.portrait
  const previewPortrait = previewUrl
    ? {
        url: previewUrl,
        alt: values.portraitAlt?.trim() ?? '',
        width: 800,
        height: 1000,
      }
    : serverPortrait
      ? {
          url: serverPortrait.url,
          alt: values.portraitAlt?.trim() ?? '',
          width: serverPortrait.width,
          height: serverPortrait.height,
        }
      : null

  const missingAlt = Boolean(values.portraitVisible && previewPortrait && !values.portraitAlt?.trim())
  const invalid = (field: string) => (fieldErrors[field] ? true : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10">
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <fieldset className="space-y-6">
            <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
              Portrait image
            </legend>

            <div className="border border-charcoal/15 p-4">
              <label
                htmlFor="hero-portrait-file"
                className="block text-body-sm font-medium text-charcoal"
              >
                Choose an image
              </label>
              <p className="mt-1 text-caption text-muted-light">
                JPEG, PNG, or WebP up to {formatMegabytes(limits.maxBytes)}. The image is
                validated and stored on the server; SVG files are rejected.
              </p>
              <input
                id="hero-portrait-file"
                type="file"
                accept={limits.allowedTypes.join(',')}
                onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
                className="mt-3 block w-full text-body-sm text-charcoal file:mr-4 file:min-h-11 file:border file:border-charcoal/30 file:bg-ivory file:px-4 file:text-body-sm file:text-charcoal"
              />

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onUpload}
                  disabled={!selectedFile || busy !== null}
                  className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-50"
                >
                  {busy === 'upload' ? 'Uploading…' : 'Upload portrait'}
                </button>

                {selectedFile ? (
                  <button
                    type="button"
                    onClick={() => onSelectFile(null)}
                    disabled={busy !== null}
                    className="text-caption text-charcoal/70 underline underline-offset-4 disabled:opacity-50"
                  >
                    Clear selection
                  </button>
                ) : null}

                {serverPortrait ? (
                  <button
                    type="button"
                    onClick={onRemove}
                    disabled={busy !== null}
                    className="text-caption text-error underline underline-offset-4 disabled:opacity-50"
                  >
                    {busy === 'remove' ? 'Removing…' : 'Remove draft portrait'}
                  </button>
                ) : null}
              </div>

              {selectedFile ? (
                <p className="mt-3 text-caption text-charcoal/70">
                  Local preview of “{selectedFile.name}”. Upload to store it as the draft.
                </p>
              ) : serverPortrait ? (
                <p className="mt-3 text-caption text-charcoal/70">
                  Draft portrait: {serverPortrait.width} × {serverPortrait.height} px,{' '}
                  {formatMegabytes(serverPortrait.sizeBytes)}.
                </p>
              ) : (
                <p className="mt-3 text-caption text-muted-light">
                  No draft portrait. The homepage shows the editorial monogram fallback.
                </p>
              )}
            </div>

            <FormField
              id="hero-portrait-alt"
              label="Portrait description"
              hint="Required before a visible portrait can be published. Describe the image for screen readers."
              error={fieldErrors.portraitAlt}
            >
              <input
                id="hero-portrait-alt"
                value={values.portraitAlt ?? ''}
                onChange={(event) => update('portraitAlt', event.target.value)}
                aria-invalid={invalid('portraitAlt')}
                aria-describedby={fieldErrors.portraitAlt ? 'hero-portrait-alt-error' : undefined}
                className={inputClassName}
              />
            </FormField>

            {missingAlt ? (
              <InlineAlert tone="info">
                Add a portrait description before publishing; a visible portrait cannot be
                published without alt text.
              </InlineAlert>
            ) : null}

            <div className="flex items-start gap-3">
              <input
                id="hero-portrait-visible"
                type="checkbox"
                checked={values.portraitVisible}
                onChange={(event) => update('portraitVisible', event.target.checked)}
                className={`${checkboxClassName} mt-0.5`}
              />
              <label htmlFor="hero-portrait-visible" className="text-body-sm text-charcoal">
                Show the portrait on the homepage
                <span className="mt-0.5 block text-caption text-muted-light">
                  Turning this off publishes the fallback instead of the image.
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-6 border-t border-charcoal/15 pt-8">
            <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
              3D effect
            </legend>

            <div className="flex items-start gap-3">
              <input
                id="hero-effect-enabled"
                type="checkbox"
                checked={values.effectEnabled}
                onChange={(event) => update('effectEnabled', event.target.checked)}
                className={`${checkboxClassName} mt-0.5`}
              />
              <label htmlFor="hero-effect-enabled" className="text-body-sm text-charcoal">
                Enable the interactive effect
                <span className="mt-0.5 block text-caption text-muted-light">
                  Pointer tilt and depth are skipped on touch devices and when reduced motion is
                  requested.
                </span>
              </label>
            </div>

            <FormField
              id="hero-tilt"
              label={`Tilt intensity — ${values.tiltIntensity}`}
              hint="0 turns tilt off; 100 is the maximum 10° of restrained rotation."
              error={fieldErrors.tiltIntensity}
            >
              <input
                id="hero-tilt"
                type="range"
                min={0}
                max={100}
                step={5}
                value={values.tiltIntensity}
                onChange={(event) => update('tiltIntensity', Number(event.target.value))}
                disabled={!values.effectEnabled}
                className="w-full accent-charcoal disabled:opacity-50"
              />
            </FormField>

            <FormField
              id="hero-animation"
              label={`Animation intensity — ${values.animationIntensity}`}
              hint="Controls pointer shift and the speed of the floating motion."
              error={fieldErrors.animationIntensity}
            >
              <input
                id="hero-animation"
                type="range"
                min={0}
                max={100}
                step={5}
                value={values.animationIntensity}
                onChange={(event) => update('animationIntensity', Number(event.target.value))}
                disabled={!values.effectEnabled}
                className="w-full accent-charcoal disabled:opacity-50"
              />
            </FormField>

            <div className="flex items-start gap-3">
              <input
                id="hero-float"
                type="checkbox"
                checked={values.floatingEnabled}
                onChange={(event) => update('floatingEnabled', event.target.checked)}
                disabled={!values.effectEnabled}
                className={`${checkboxClassName} mt-0.5`}
              />
              <label htmlFor="hero-float" className="text-body-sm text-charcoal">
                Subtle floating motion
                <span className="mt-0.5 block text-caption text-muted-light">
                  A few pixels of drift that pauses under the pointer. Never used with reduced
                  motion.
                </span>
              </label>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4 border-t border-charcoal/15 pt-8">
            <button
              type="submit"
              disabled={busy !== null}
              className="min-h-12 border border-charcoal/30 px-6 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-60"
            >
              {busy === 'save' ? 'Saving…' : 'Save draft'}
            </button>

            <button
              type="button"
              onClick={onPublish}
              disabled={busy !== null}
              className="min-h-12 bg-gold px-6 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d] disabled:opacity-60"
            >
              {busy === 'publish' ? 'Publishing…' : 'Publish changes'}
            </button>

            <p className="text-caption text-muted-light">
              Draft changes never reach the public homepage until published.
            </p>
          </div>
        </div>

        <aside aria-labelledby="hero-preview-heading" className="xl:sticky xl:top-8 xl:self-start">
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="hero-preview-heading"
              className="text-caption tracking-[0.14em] text-muted-light uppercase"
            >
              Draft preview
            </h2>
            <p className="text-caption text-muted-light">Not public</p>
          </div>

          <div className="mt-3 border border-charcoal/15 bg-charcoal p-6">
            <HeroPortrait
              portrait={previewPortrait}
              effect={previewEffect}
              displayName={displayName}
            />
          </div>

          <p className="mt-3 text-caption text-muted-light">
            {formatPublishedAt(publishedAt)}
            {hasUnpublishedChanges ? ' · Unpublished changes' : ''}
          </p>

          {published?.portrait ? (
            <p className="mt-1 text-caption text-muted-light">
              The public portrait is the version published{' '}
              {publishedAt ? new Date(publishedAt).toLocaleDateString() : 'earlier'}.
            </p>
          ) : (
            <p className="mt-1 text-caption text-muted-light">
              The public homepage currently shows the fallback portrait.
            </p>
          )}
        </aside>
      </div>
    </form>
  )
}
