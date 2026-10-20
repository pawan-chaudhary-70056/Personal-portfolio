import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { AdminSkill } from '@/@types/admin'
import { ApiError } from '@/api/client'
import {
  deleteSkill,
  listSkills,
  updateSkill,
  type SkillListResponse,
} from '@/api/content.api'
import { useSession } from '@/auth/useSession'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { VisibilityBadge } from '@/components/admin/VisibilityBadge'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { inputClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { setPageMetadata } from '@/utils/metadata'

export function AdminSkillsPage() {
  const { signOutAndClear } = useSession()
  const location = useLocation()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [notice, setNotice] = useState<string | null>(
    () => (location.state as { notice?: string } | null)?.notice ?? null,
  )
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminSkill | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setPageMetadata({
      title: 'Skills — Portfolio admin',
      description: 'Manage portfolio skills.',
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetcher = useCallback(
    (signal: AbortSignal) => listSkills({ search: debouncedSearch }, signal),
    [debouncedSearch],
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
    status,
    data,
    error: loadError,
    reload,
  } = useApiResource<SkillListResponse>(fetcher, {
    errorMessage: 'Could not load skills. Please try again.',
    onError: handleUnauthorized,
  })

  async function togglePublished(skill: AdminSkill) {
    setBusyId(skill.id)
    setNotice(null)
    setActionError(null)

    try {
      await updateSkill(skill.id, { published: !skill.published })
      setNotice(
        skill.published
          ? `“${skill.name}” is hidden from the public site.`
          : `“${skill.name}” is now published.`,
      )
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(caught instanceof ApiError ? caught.message : 'The skill could not be updated.')
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
      await deleteSkill(deleteTarget.id)
      setNotice(`“${deleteTarget.name}” was permanently deleted.`)
      setDeleteTarget(null)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(caught instanceof ApiError ? caught.message : 'The skill could not be deleted.')
      }
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const skills = data?.skills ?? []
  const loading = status === 'loading'
  const showEmpty = !loading && skills.length === 0
  const error = actionError ?? (status === 'error' ? loadError : null)

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold-ink">Content</p>
          <h1 className="mt-3 text-h2">Skills</h1>
          <p className="mt-3 max-w-xl text-body-sm text-charcoal/70">
            Skills are grouped by category on the public site. Hidden skills stay here but are
            omitted from the portfolio.
          </p>
        </div>
        <Link
          to="/admin/skills/new"
          className="min-h-11 bg-gold px-5 py-3 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d]"
        >
          New skill
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

      <div className="mt-8 max-w-md">
        <label
          htmlFor="skill-search"
          className="block text-caption tracking-[0.14em] text-muted-light uppercase"
        >
          Search
        </label>
        <input
          id="skill-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, category, or description"
          className={`${inputClassName} mt-2`}
        />
      </div>

      <div className="mt-8">
        {loading && !data ? (
          <p role="status" className="text-body-sm text-muted-light">
            Loading skills…
          </p>
        ) : showEmpty ? (
          <div className="border border-charcoal/15 px-6 py-12 text-center">
            <p className="font-serif text-h3 text-charcoal">No skills found</p>
            <p className="mx-auto mt-2 max-w-sm text-body-sm text-charcoal/70">
              {search
                ? 'No skills match this search. Try a different term.'
                : 'Add your first skill so it can appear on the public site.'}
            </p>
            <Link
              to="/admin/skills/new"
              className="mt-6 inline-block min-h-11 bg-gold px-5 py-3 text-body-sm font-medium text-charcoal"
            >
              New skill
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-left">
              <caption className="sr-only">
                Portfolio skills with category, visibility, and available actions
              </caption>
              <thead>
                <tr className="border-b border-charcoal/20">
                  <th
                    scope="col"
                    className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                  >
                    Skill
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
                    Order
                  </th>
                  <th
                    scope="col"
                    className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                  >
                    Visibility
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
                {skills.map((skill) => (
                  <tr key={skill.id} className="border-b border-charcoal/10 align-top">
                    <td className="py-4 pr-4">
                      <Link
                        to={`/admin/skills/${skill.id}`}
                        className="text-body-sm font-medium text-charcoal underline-offset-4 hover:underline"
                      >
                        {skill.name}
                      </Link>
                      {skill.description ? (
                        <p className="mt-1 max-w-sm text-caption text-muted-light">
                          {skill.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-4 pr-4 text-body-sm text-charcoal/70">{skill.category}</td>
                    <td className="py-4 pr-4 text-caption text-muted-light">{skill.sortOrder}</td>
                    <td className="py-4 pr-4">
                      <VisibilityBadge published={skill.published} />
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <Link
                          to={`/admin/skills/${skill.id}`}
                          className="text-caption text-charcoal underline underline-offset-4"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() => void togglePublished(skill)}
                          disabled={busyId === skill.id}
                          aria-label={`${skill.published ? 'Hide' : 'Publish'} ${skill.name}`}
                          className="text-caption text-charcoal/70 underline underline-offset-4 disabled:opacity-50"
                        >
                          {skill.published ? 'Hide' : 'Publish'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(skill)}
                          aria-label={`Delete ${skill.name}`}
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
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this skill?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be permanently deleted. This cannot be undone. To keep it private instead, hide it.`
            : ''
        }
        confirmLabel="Delete skill"
        destructive
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
