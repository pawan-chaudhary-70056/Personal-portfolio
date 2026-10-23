import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { CategoryPayload } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { useSession } from '@/auth/useSession'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { FormField } from '@/components/forms/FormField'
import { inputClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { toFieldErrors } from '@/utils/apiErrors'
import { setPageMetadata } from '@/utils/metadata'

export interface CategoryRecord {
  id: string
  name: string
  slug: string
  sortOrder: number
}

interface CategoryManagerProps<T extends CategoryRecord> {
  title: string
  description: string
  /** Noun for the records grouped by this category, e.g. "projects". */
  usageLabel: string
  load: (signal?: AbortSignal) => Promise<T[]>
  create: (payload: CategoryPayload) => Promise<unknown>
  update: (id: string, payload: Partial<CategoryPayload>) => Promise<unknown>
  remove: (id: string) => Promise<void>
  countOf: (category: T) => number
}

const emptyForm = { name: '', slug: '', sortOrder: '0' }

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof ApiError ? caught.message : fallback
}

/**
 * Shared category management screen. The backend enforces uniqueness and the
 * deletion policy; this component only explains the consequences.
 */
export function CategoryManager<T extends CategoryRecord>({
  title,
  description,
  usageLabel,
  load,
  create,
  update,
  remove,
  countOf,
}: CategoryManagerProps<T>) {
  const { signOutAndClear } = useSession()

  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [values, setValues] = useState(emptyForm)
  const [editing, setEditing] = useState<T | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setPageMetadata({ title: `${title} — Portfolio admin`, description })
  }, [title, description])

  const fetcher = useCallback((signal: AbortSignal) => load(signal), [load])

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
  } = useApiResource<T[]>(fetcher, {
    errorMessage: 'Could not load categories. Please try again.',
    onError: handleUnauthorized,
  })

  function startCreate() {
    setEditing(null)
    setValues(emptyForm)
    setFieldErrors({})
    setActionError(null)
  }

  function startEdit(category: T) {
    setEditing(category)
    setValues({
      name: category.name,
      slug: category.slug,
      sortOrder: String(category.sortOrder),
    })
    setFieldErrors({})
    setActionError(null)
    document.getElementById('category-name')?.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setActionError(null)
    setNotice(null)
    setFieldErrors({})

    const parsedSortOrder = Number.parseInt(values.sortOrder, 10)
    const payload: CategoryPayload = {
      name: values.name.trim(),
      sortOrder: Number.isNaN(parsedSortOrder) ? 0 : parsedSortOrder,
    }

    // An empty slug lets the backend derive one from the name.
    if (values.slug.trim()) {
      payload.slug = values.slug.trim()
    }

    try {
      if (editing) {
        await update(editing.id, payload)
        setNotice(`“${payload.name}” was updated.`)
        setEditing(null)
      } else {
        await create(payload)
        setNotice(`“${payload.name}” was created.`)
      }

      setValues(emptyForm)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(errorMessage(caught, 'The category could not be saved.'))
        if (caught instanceof ApiError) {
          setFieldErrors(toFieldErrors(caught.details))
        }
      }
    } finally {
      setSaving(false)
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
      await remove(deleteTarget.id)
      setNotice(`“${deleteTarget.name}” was deleted.`)
      if (editing?.id === deleteTarget.id) {
        startCreate()
      }
      setDeleteTarget(null)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(errorMessage(caught, 'The category could not be deleted.'))
      }
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const categories = data ?? []
  const loading = status === 'loading'
  const error = actionError ?? (status === 'error' ? loadError : null)
  const invalid = (field: string) => (fieldErrors[field] ? true : undefined)
  const describedBy = (field: string) => (fieldErrors[field] ? `${field}-error` : undefined)

  return (
    <>
      <header>
        <p className="eyebrow text-gold-ink">Content</p>
        <h1 className="mt-3 text-h2">{title}</h1>
        <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">{description}</p>
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

      <form onSubmit={handleSubmit} noValidate className="mt-8 max-w-3xl border border-charcoal/15 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-h3 text-charcoal">
            {editing ? `Edit “${editing.name}”` : 'New category'}
          </h2>
          {editing ? (
            <button
              type="button"
              onClick={startCreate}
              className="text-caption text-charcoal/70 underline underline-offset-4"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <FormField id="category-name" label="Name" required error={fieldErrors.name}>
            <input
              id="category-name"
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              aria-invalid={invalid('name')}
              aria-describedby={describedBy('name')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="category-slug"
            label="Slug"
            hint="Optional. Derived from the name when blank."
            error={fieldErrors.slug}
          >
            <input
              id="category-slug"
              value={values.slug}
              onChange={(event) => setValues((current) => ({ ...current, slug: event.target.value }))}
              aria-invalid={invalid('slug')}
              aria-describedby={describedBy('slug')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="category-sort-order"
            label="Display order"
            hint="Lower numbers appear first."
            error={fieldErrors.sortOrder}
          >
            <input
              id="category-sort-order"
              type="number"
              min={0}
              max={9999}
              value={values.sortOrder}
              onChange={(event) =>
                setValues((current) => ({ ...current, sortOrder: event.target.value }))
              }
              aria-invalid={invalid('sortOrder')}
              aria-describedby={describedBy('sortOrder')}
              className={inputClassName}
            />
          </FormField>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-5 min-h-11 bg-gold px-5 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d] disabled:opacity-60"
        >
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Create category'}
        </button>
      </form>

      <div className="mt-10">
        {loading && !data ? (
          <p role="status" className="text-body-sm text-muted-light">
            Loading categories…
          </p>
        ) : categories.length === 0 ? (
          <div className="border border-charcoal/15 px-6 py-12 text-center">
            <p className="font-serif text-h3 text-charcoal">No categories yet</p>
            <p className="mx-auto mt-2 max-w-sm text-body-sm text-charcoal/70">
              Create your first category so {usageLabel} can be grouped.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <caption className="sr-only">
                {title} with slug, display order, {usageLabel} using each category, and actions
              </caption>
              <thead>
                <tr className="border-b border-charcoal/20">
                  <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                    Category
                  </th>
                  <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                    Slug
                  </th>
                  <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                    Order
                  </th>
                  <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                    In use
                  </th>
                  <th scope="col" className="py-3 text-caption tracking-[0.14em] text-muted-light uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                  const usage = countOf(category)

                  return (
                    <tr key={category.id} className="border-b border-charcoal/10 align-top">
                      <td className="py-4 pr-4 text-body-sm font-medium text-charcoal">
                        {category.name}
                      </td>
                      <td className="py-4 pr-4 text-body-sm text-charcoal/70">/{category.slug}</td>
                      <td className="py-4 pr-4 text-caption text-muted-light">{category.sortOrder}</td>
                      <td className="py-4 pr-4 text-body-sm text-charcoal/70">
                        {usage} {usageLabel}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            aria-label={`Edit ${category.name}`}
                            className="text-caption text-charcoal underline underline-offset-4"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(category)}
                            disabled={usage > 0}
                            aria-label={`Delete ${category.name}`}
                            title={
                              usage > 0
                                ? `Reassign the ${usage} ${usageLabel} in this category first.`
                                : undefined
                            }
                            className="text-caption text-error underline underline-offset-4 disabled:text-muted-light disabled:no-underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this category?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be permanently deleted. Categories that still group ${usageLabel} cannot be deleted, so nothing currently using it will be affected.`
            : ''
        }
        confirmLabel="Delete category"
        destructive
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
