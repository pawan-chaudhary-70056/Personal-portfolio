import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ProjectPayload } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { createProject } from '@/api/projects.api'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { toFieldErrors } from '@/utils/apiErrors'
import { setPageMetadata } from '@/utils/metadata'

export function AdminProjectCreatePage() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setPageMetadata({
      title: 'New project — Portfolio admin',
      description: 'Create a portfolio project.',
    })
  }, [])

  async function handleSubmit(payload: ProjectPayload) {
    setBusy(true)
    setFormError(null)
    setFieldErrors({})

    try {
      const project = await createProject(payload)
      navigate(`/admin/projects/${project.id}`, {
        replace: true,
        state: { notice: 'Project created.' },
      })
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFormError(caught.message)
        setFieldErrors(toFieldErrors(caught.details))
      } else {
        setFormError('The project could not be saved. Please try again.')
      }
    } finally {
      setBusy(false)
    }
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
        <p className="eyebrow mt-6 text-gold-ink">Content</p>
        <h1 className="mt-3 text-h2">New project</h1>
        <p className="mt-3 max-w-xl text-body-sm text-charcoal/70">
          New projects start as drafts. Publish when the content and links are ready.
        </p>
      </header>

      <ProjectForm
        submitLabel="Create project"
        busy={busy}
        formError={formError}
        fieldErrors={fieldErrors}
        onSubmit={(payload) => void handleSubmit(payload)}
        cancelHref="/admin/projects"
      />
    </>
  )
}
