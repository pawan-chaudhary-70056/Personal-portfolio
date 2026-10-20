import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminProject, ProjectListResponse, ProjectStatus } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { deleteProject, listProjects, updateProject } from '@/api/projects.api'
import { useSession } from '@/auth/useSession'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { inputClassName, selectClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDateTime } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'

const PAGE_SIZE = 10

export function AdminProjectsPage() {
  const { signOutAndClear } = useSession()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<ProjectStatus | ''>('')
  const [page, setPage] = useState(1)

  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminProject | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setPageMetadata({
      title: 'Projects — Portfolio admin',
      description: 'Manage portfolio projects.',
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      listProjects({ search: debouncedSearch, status, page, pageSize: PAGE_SIZE }, signal),
    [debouncedSearch, status, page],
  )

  const handleUnauthorized = useCallback(
    async (caught: unknown) => {
      if (caught instanceof ApiError && caught.status === 401) {
        await signOutAndClear()
        return true
      }
      return false
    },
    [signOutAndClear],
  )

  const {
    status: loadStatus,
    data,
    error: loadError,
    reload,
  } = useApiResource<ProjectListResponse>(fetcher, {
    errorMessage: 'Could not load projects. Please try again.',
    onError: handleUnauthorized,
  })

  function reportActionFailure(caught: unknown, fallback: string) {
    setActionError(caught instanceof ApiError ? caught.message : fallback)
  }

  async function changeStatus(project: AdminProject, next: ProjectStatus) {
    setBusyId(project.id)
    setNotice(null)
    setActionError(null)

    try {
      await updateProject(project.id, { status: next })
      setNotice(
        next === 'PUBLISHED'
          ? `“${project.title}” is now published and publicly visible.`
          : `“${project.title}” was archived and removed from public listings.`,
      )
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        reportActionFailure(caught, 'The project could not be updated.')
      }
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return
    }

    setDeleting(true)
    setActionError(null)
    setNotice(null)

    try {
      await deleteProject(deleteTarget.id)
      setNotice(`“${deleteTarget.title}” was permanently deleted.`)
      setDeleteTarget(null)

      if (data && data.items.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        reload()
      }
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        reportActionFailure(caught, 'The project could not be deleted.')
      }
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const items = data?.items ?? []
  const loading = loadStatus === 'loading'
  const showEmpty = !loading && items.length === 0
  const error = actionError ?? (loadStatus === 'error' ? loadError : null)

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold-ink">Content</p>
          <h1 className="mt-3 text-h2">Projects</h1>
          <p className="mt-3 max-w-xl text-body-sm text-charcoal/70">
            Only published projects appear on the public site. Drafts and archived projects stay
            private.
          </p>
        </div>
        <Link
          to="/admin/projects/new"
          className="min-h-11 bg-gold px-5 py-3 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d]"
        >
          New project
        </Link>
      </header>

      <div aria-live="polite" className="mt-6 space-y-3">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
        {error ? (
          <InlineAlert tone="error">
            {error}{' '}
            <button type="button" onClick={reload} className="underline">
              Retry
            </button>
          </InlineAlert>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="project-search"
            className="block text-caption tracking-[0.14em] text-muted-light uppercase"
          >
            Search
          </label>
          <input
            id="project-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Title, slug, or category"
            className={`${inputClassName} mt-2`}
          />
        </div>

        <div className="sm:w-48">
          <label
            htmlFor="status-filter"
            className="block text-caption tracking-[0.14em] text-muted-light uppercase"
          >
            Status
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ProjectStatus | '')
              setPage(1)
            }}
            className={`${selectClassName} mt-2`}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      <div className="mt-8">
        {loading && !data ? (
          <p role="status" className="text-body-sm text-muted-light">
            Loading projects…
          </p>
        ) : showEmpty ? (
          <div className="border border-charcoal/15 px-6 py-12 text-center">
            <p className="font-serif text-h3 text-charcoal">No projects found</p>
            <p className="mx-auto mt-2 max-w-sm text-body-sm text-charcoal/70">
              {search || status
                ? 'No projects match these filters. Try clearing the search or status filter.'
                : 'Create your first project to start building the public portfolio.'}
            </p>
            <Link
              to="/admin/projects/new"
              className="mt-6 inline-block min-h-11 bg-gold px-5 py-3 text-body-sm font-medium text-charcoal"
            >
              New project
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] border-collapse text-left">
                <caption className="sr-only">
                  Portfolio projects with status and available actions
                </caption>
                <thead>
                  <tr className="border-b border-charcoal/20">
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Project
                    </th>
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Category
                    </th>
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Updated
                    </th>
                    <th
                      scope="col"
                      className="py-3 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((project) => (
                    <tr key={project.id} className="border-b border-charcoal/10 align-top">
                      <td className="py-4 pr-4">
                        <Link
                          to={`/admin/projects/${project.id}`}
                          className="text-body-sm font-medium text-charcoal underline-offset-4 hover:underline"
                        >
                          {project.title}
                        </Link>
                        <p className="mt-1 text-caption text-muted-light">/{project.slug}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge status={project.status} />
                        {project.featured ? (
                          <p className="mt-1 text-caption text-muted-light">Featured</p>
                        ) : null}
                      </td>
                      <td className="py-4 pr-4 text-body-sm text-charcoal/70">{project.category}</td>
                      <td className="py-4 pr-4 text-caption text-muted-light">
                        <time dateTime={project.updatedAt}>
                          {formatDateTime(project.updatedAt)}
                        </time>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <Link
                            to={`/admin/projects/${project.id}`}
                            className="text-caption text-charcoal underline underline-offset-4"
                          >
                            Edit
                          </Link>

                          {project.status !== 'PUBLISHED' ? (
                            <button
                              type="button"
                              onClick={() => void changeStatus(project, 'PUBLISHED')}
                              disabled={busyId === project.id}
                              aria-label={`Publish ${project.title}`}
                              className="text-caption text-success-ink underline underline-offset-4 disabled:opacity-50"
                            >
                              Publish
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void changeStatus(project, 'ARCHIVED')}
                              disabled={busyId === project.id}
                              aria-label={`Archive ${project.title}`}
                              className="text-caption text-charcoal/70 underline underline-offset-4 disabled:opacity-50"
                            >
                              Archive
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(project)}
                            aria-label={`Delete ${project.title}`}
                            className="text-caption text-error underline underline-offset-4"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-caption text-muted-light">
                Showing {items.length} of {data?.total ?? 0} projects
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="min-h-10 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40"
                >
                  Previous
                </button>
                <p className="text-caption text-muted-light">
                  Page {data?.page ?? 1} of {data?.pageCount ?? 1}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      data && current < data.pageCount ? current + 1 : current,
                    )
                  }
                  disabled={!data || page >= data.pageCount}
                  className="min-h-10 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this project?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” will be permanently deleted. This cannot be undone. To hide a project instead, archive it.`
            : ''
        }
        confirmLabel="Delete project"
        destructive
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
