import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AdminEducation, EducationPayload } from '@/@types/admin'
import { ApiError } from '@/api/client'
import {
  createEducation,
  getEducation,
  updateEducation,
} from '@/api/education.api'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { EducationForm } from '@/components/forms/EducationForm'
import { useApiResource } from '@/hooks/useApiResource'
import { toFieldErrors } from '@/utils/apiErrors'
import { setPageMetadata } from '@/utils/metadata'

/** Serves both `/admin/education/new` and `/admin/education/:id`. */
export function AdminEducationEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setPageMetadata({
      title: isEdit ? 'Edit education — Portfolio admin' : 'New education — Portfolio admin',
      description: isEdit ? 'Edit an academic qualification.' : 'Add an academic qualification.',
    })
  }, [isEdit])

  const fetcher = useCallback(
    (signal: AbortSignal) => (id ? getEducation(id, signal) : Promise.resolve(null)),
    [id],
  )

  const {
    status,
    data: entry,
    error,
    reload,
  } = useApiResource<AdminEducation | null>(fetcher, {
    errorMessage: 'The education entry could not be loaded. Please try again.',
  })

  async function handleSubmit(payload: EducationPayload) {
    setBusy(true)
    setFormError(null)
    setFieldErrors({})

    try {
      if (id) {
        await updateEducation(id, payload)
        setNotice('Changes saved.')
        reload()
      } else {
        await createEducation(payload)
        navigate('/admin/education', {
          replace: true,
          state: { notice: 'Education entry created.' },
        })
      }
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFormError(caught.message)
        setFieldErrors(toFieldErrors(caught.details))
      } else {
        setFormError('The education entry could not be saved. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (isEdit && status === 'loading' && !entry) {
    return (
      <p role="status" className="text-body-sm text-muted-light">
        Loading education entry…
      </p>
    )
  }

  if (isEdit && (status === 'error' || !entry)) {
    return (
      <div className="max-w-xl">
        <InlineAlert tone="error">
          {error ?? 'This education entry could not be found.'}
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
            to="/admin/education"
            className="link-underline self-center text-body-sm text-charcoal/70 hover:text-charcoal"
          >
            Back to education
          </Link>
        </div>
      </div>
    )
  }

  const currentEntry = isEdit ? entry : null

  return (
    <>
      <header>
        <Link
          to="/admin/education"
          className="link-underline text-body-sm text-charcoal/70 hover:text-charcoal"
        >
          ← Back to education
        </Link>

        <p className="eyebrow mt-6 text-gold-ink">Content</p>
        <h1 className="mt-3 text-h2">
          {isEdit ? (currentEntry?.qualification ?? 'Edit education') : 'New qualification'}
        </h1>
      </header>

      <div aria-live="polite" className="mt-6">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
      </div>

      <EducationForm
        key={currentEntry?.id ?? 'new'}
        entry={currentEntry ?? undefined}
        submitLabel={isEdit ? 'Save changes' : 'Create qualification'}
        busy={busy}
        formError={formError}
        fieldErrors={fieldErrors}
        onSubmit={(payload) => void handleSubmit(payload)}
        cancelHref="/admin/education"
      />
    </>
  )
}
