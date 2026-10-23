import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AdminCertification, CertificationPayload } from '@/@types/admin'
import { ApiError } from '@/api/client'
import {
  createCertification,
  getCertification,
  updateCertification,
} from '@/api/certifications.api'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { CertificationForm } from '@/components/forms/CertificationForm'
import { useApiResource } from '@/hooks/useApiResource'
import { toFieldErrors } from '@/utils/apiErrors'
import { setPageMetadata } from '@/utils/metadata'

/** Serves both `/admin/certifications/new` and `/admin/certifications/:id`. */
export function AdminCertificationEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setPageMetadata({
      title: isEdit
        ? 'Edit certification — Portfolio admin'
        : 'New certification — Portfolio admin',
      description: isEdit ? 'Edit a professional certification.' : 'Add a professional certification.',
    })
  }, [isEdit])

  const fetcher = useCallback(
    (signal: AbortSignal) => (id ? getCertification(id, signal) : Promise.resolve(null)),
    [id],
  )

  const {
    status,
    data: certification,
    error,
    reload,
  } = useApiResource<AdminCertification | null>(fetcher, {
    errorMessage: 'The certification could not be loaded. Please try again.',
  })

  async function handleSubmit(payload: CertificationPayload) {
    setBusy(true)
    setFormError(null)
    setFieldErrors({})

    try {
      if (id) {
        await updateCertification(id, payload)
        setNotice('Changes saved.')
        reload()
      } else {
        await createCertification(payload)
        navigate('/admin/certifications', {
          replace: true,
          state: { notice: 'Certification created.' },
        })
      }
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFormError(caught.message)
        setFieldErrors(toFieldErrors(caught.details))
      } else {
        setFormError('The certification could not be saved. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (isEdit && status === 'loading' && !certification) {
    return (
      <p role="status" className="text-body-sm text-muted-light">
        Loading certification…
      </p>
    )
  }

  if (isEdit && (status === 'error' || !certification)) {
    return (
      <div className="max-w-xl">
        <InlineAlert tone="error">
          {error ?? 'This certification could not be found.'}
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
            to="/admin/certifications"
            className="link-underline self-center text-body-sm text-charcoal/70 hover:text-charcoal"
          >
            Back to certifications
          </Link>
        </div>
      </div>
    )
  }

  const currentCertification = isEdit ? certification : null

  return (
    <>
      <header>
        <Link
          to="/admin/certifications"
          className="link-underline text-body-sm text-charcoal/70 hover:text-charcoal"
        >
          ← Back to certifications
        </Link>

        <p className="eyebrow mt-6 text-gold-ink">Content</p>
        <h1 className="mt-3 text-h2">
          {isEdit
            ? (currentCertification?.name ?? 'Edit certification')
            : 'New certification'}
        </h1>
      </header>

      <div aria-live="polite" className="mt-6">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
      </div>

      <CertificationForm
        key={currentCertification?.id ?? 'new'}
        certification={currentCertification ?? undefined}
        submitLabel={isEdit ? 'Save changes' : 'Create certification'}
        busy={busy}
        formError={formError}
        fieldErrors={fieldErrors}
        onSubmit={(payload) => void handleSubmit(payload)}
        cancelHref="/admin/certifications"
      />
    </>
  )
}
