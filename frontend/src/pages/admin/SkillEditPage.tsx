import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AdminSkill, SkillPayload } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { createSkill, getSkill, updateSkill } from '@/api/content.api'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { SkillForm } from '@/components/forms/SkillForm'
import { useApiResource } from '@/hooks/useApiResource'
import { toFieldErrors } from '@/utils/apiErrors'
import { setPageMetadata } from '@/utils/metadata'

/** Serves both `/admin/skills/new` and `/admin/skills/:id`. */
export function AdminSkillEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setPageMetadata({
      title: isEdit ? 'Edit skill — Portfolio admin' : 'New skill — Portfolio admin',
      description: isEdit ? 'Edit a portfolio skill.' : 'Add a portfolio skill.',
    })
  }, [isEdit])

  const fetcher = useCallback(
    (signal: AbortSignal) => (id ? getSkill(id, signal) : Promise.resolve(null)),
    [id],
  )

  const {
    status,
    data: skill,
    error,
    reload,
  } = useApiResource<AdminSkill | null>(fetcher, {
    errorMessage: 'The skill could not be loaded. Please try again.',
  })

  async function handleSubmit(payload: SkillPayload) {
    setBusy(true)
    setFormError(null)
    setFieldErrors({})

    try {
      if (id) {
        await updateSkill(id, payload)
        setNotice('Changes saved.')
        reload()
      } else {
        await createSkill(payload)
        navigate('/admin/skills', { replace: true, state: { notice: 'Skill created.' } })
      }
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFormError(caught.message)
        setFieldErrors(toFieldErrors(caught.details))
      } else {
        setFormError('The skill could not be saved. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (isEdit && status === 'loading' && !skill) {
    return (
      <p role="status" className="text-body-sm text-muted-light">
        Loading skill…
      </p>
    )
  }

  if (isEdit && (status === 'error' || !skill)) {
    return (
      <div className="max-w-xl">
        <InlineAlert tone="error">{error ?? 'This skill could not be found.'}</InlineAlert>
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={reload}
            className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
          >
            Retry
          </button>
          <Link
            to="/admin/skills"
            className="link-underline self-center text-body-sm text-charcoal/70 hover:text-charcoal"
          >
            Back to skills
          </Link>
        </div>
      </div>
    )
  }

  // Never seed the create form with a record left over from an edit route.
  const currentSkill = isEdit ? skill : null

  return (
    <>
      <header>
        <Link
          to="/admin/skills"
          className="link-underline text-body-sm text-charcoal/70 hover:text-charcoal"
        >
          ← Back to skills
        </Link>

        <p className="eyebrow mt-6 text-gold-ink">Content</p>
        <h1 className="mt-3 text-h2">{isEdit ? (currentSkill?.name ?? 'Edit skill') : 'New skill'}</h1>
      </header>

      <div aria-live="polite" className="mt-6">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
      </div>

      <SkillForm
        key={currentSkill?.id ?? 'new'}
        skill={currentSkill ?? undefined}
        submitLabel={isEdit ? 'Save changes' : 'Create skill'}
        busy={busy}
        formError={formError}
        fieldErrors={fieldErrors}
        onSubmit={(payload) => void handleSubmit(payload)}
        cancelHref="/admin/skills"
      />
    </>
  )
}
