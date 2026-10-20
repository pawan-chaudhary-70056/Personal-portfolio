import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AdminExperience, ExperiencePayload } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { createExperience, getExperience, updateExperience } from '@/api/content.api'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { ExperienceForm } from '@/components/forms/ExperienceForm'
import { useApiResource } from '@/hooks/useApiResource'
import { toFieldErrors } from '@/utils/apiErrors'
import { setPageMetadata } from '@/utils/metadata'

/** Serves both `/admin/experience/new` and `/admin/experience/:id`. */
export function AdminExperienceEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setPageMetadata({
      title: isEdit ? 'Edit experience — Portfolio admin' : 'New experience — Portfolio admin',
      description: isEdit ? 'Edit a portfolio experience entry.' : 'Add a portfolio experience entry.',
    })
  }, [isEdit])

  const fetcher = useCallback(
    (signal: AbortSignal) => (id ? getExperience(id, signal) : Promise.resolve(null)),
    [id],
  )

  const {
    status,
    data: entry,
    error,
    reload,
  } = useApiResource<AdminExperience | null>(fetcher, {
    errorMessage: 'The experience entry could not be loaded. Please try again.',
  })

  async function handleSubmit(payload: ExperiencePayload) {
    setBusy(true)
    setFormError(null)
    setFieldErrors({})

    try {
      if (id) {
        await updateExperience(id, payload)
        setNotice('Changes saved.')
        reload()
      } else {
        await createExperience(payload)
        navigate('/admin/experience', { replace: true, state: { notice: 'Experience entry created.' } })
      }
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFormError(caught.message)
        setFieldErrors(toFieldErrors(caught.details))
      } else {
        setFormError('The experience entry could not be saved. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (isEdit && status === 'loading' && !entry) {
    return (
      <p role="status" className="text-body-sm text-muted-light">
        Loading experience entry…
      </p>
    )
  }

  if (isEdit && (status === 'error' || !entry)) {
    return (
      <div className="max-w-xl">
        <InlineAlert tone="error">
          {error ?? 'This experience entry could not be found.'}
        </InlineAlert>
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={reload}
            className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
          >
            Retry
          </button>
          <Link
            to="/admin/experience"
            className="link-underline self-center text-body-sm text-charcoal/70 hover:text-charcoal"
          >
            Back to experience
          </Link>
        </div>
      </div>
    )
  }

  // Never seed the create form with a record left over from an edit route.
  const currentEntry = isEdit ? entry : null

  return (
    <>
      <header>
        <Link
          to="/admin/experience"
          className="link-underline text-body-sm text-charcoal/70 hover:text-charcoal"
        >
          ← Back to experience
        </Link>

        <p className="eyebrow mt-6 text-gold-ink">Content</p>
        <h1 className="mt-3 text-h2">
          {isEdit ? (currentEntry?.role ?? 'Edit entry') : 'New experience'}
        </h1>
      </header>

      <div aria-live="polite" className="mt-6">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
      </div>

      <ExperienceForm
        key={currentEntry?.id ?? 'new'}
        entry={currentEntry ?? undefined}
        submitLabel={isEdit ? 'Save changes' : 'Create entry'}
        busy={busy}
        formError={formError}
        fieldErrors={fieldErrors}
        onSubmit={(payload) => void handleSubmit(payload)}
        cancelHref="/admin/experience"
      />
    </>
  )
}
