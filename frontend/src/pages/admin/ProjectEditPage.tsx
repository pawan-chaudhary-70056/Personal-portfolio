import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { AdminProject, ProjectPayload } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { getProject, updateProject } from '@/api/projects.api'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { useApiResource } from '@/hooks/useApiResource'
import { toFieldErrors } from '@/utils/apiErrors'
import { setPageMetadata } from '@/utils/metadata'

export function AdminProjectEditPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(
    () => (location.state as { notice?: string } | null)?.notice ?? null,
  )

  useEffect(() => {
    setPageMetadata({
      title: 'Edit project — Portfolio admin',
      description: 'Edit a portfolio project.',
    })
  }, [])

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      id
        ? getProject(id, signal)
        : Promise.reject(new ApiError(404, 'not_found', 'This project could not be found.')),
    [id],
  )

  const {
    status,
    data: project,
    error,
    reload,
  } = useApiResource<AdminProject>(fetcher, {
    errorMessage: 'The project could not be loaded. Please try again.',
  })

  async function handleSubmit(payload: ProjectPayload) {
    if (!id) {
      return
    }

    setBusy(true)
    setFormError(null)
    setFieldErrors({})
    setNotice(null)

    try {
      await updateProject(id, payload)
      setNotice('Changes saved.')
      reload()
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFormError(caught.message)
        setFieldErrors(toFieldErrors(caught.details))
      } else {
        setFormError('The changes could not be saved. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading' && !project) {
    return (
      <p role="status" className="text-body-sm text-muted-light">
        Loading project…
      </p>
    )
  }

  if (status === 'error' || !project) {
    return (
      <div className="max-w-xl">
        <InlineAlert tone="error">
          {error ?? 'This project could not be found.'}
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
            to="/admin/projects"
            className="link-underline self-center text-body-sm text-charcoal/70 hover:text-charcoal"
          >
            Back to projects
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <header>
        <Link
          to="/admin/projects"
          className="link-underline text-body-sm text-charcoal/70 hover:text-charcoal"
        >
          ← Back to projects
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className="eyebrow text-gold-ink">Content</p>
          <StatusBadge status={project.status} />
        </div>

        <h1 className="mt-3 text-h2">{project.title}</h1>
        <p className="mt-2 text-body-sm text-muted-light">/{project.slug}</p>
      </header>

      <div aria-live="polite" className="mt-6">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
      </div>

      <ProjectForm
        key={project.id}
        project={project}
        submitLabel="Save changes"
        busy={busy}
        formError={formError}
        fieldErrors={fieldErrors}
        onSubmit={(payload) => void handleSubmit(payload)}
        cancelHref="/admin/projects"
      />
    </>
  )
}
