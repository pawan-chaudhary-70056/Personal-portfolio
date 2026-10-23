import { useState, type FormEvent } from 'react'
import type {
  AdminHomepage,
  HomepageLayoutPayload,
  HomepageSectionKey,
} from '@/@types/admin'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { checkboxClassName } from '@/components/ui/fieldStyles'

interface HomepageSectionsFormProps {
  homepage: AdminHomepage
  busy: boolean
  formError: string | null
  fieldErrors: Record<string, string>
  onSave: (payload: HomepageLayoutPayload) => void
}

const sectionLabels = (homepage: AdminHomepage, key: HomepageSectionKey): string =>
  homepage.sectionCatalog.find((section) => section.key === key)?.label ?? key

export function HomepageSectionsForm({
  homepage,
  busy,
  formError,
  fieldErrors,
  onSave,
}: HomepageSectionsFormProps) {
  const [order, setOrder] = useState<HomepageSectionKey[]>(homepage.draft.sectionOrder)
  const [hidden, setHidden] = useState<HomepageSectionKey[]>(
    homepage.draft.hiddenSections,
  )
  const [featured, setFeatured] = useState<string[]>(homepage.draft.featuredProjectIds)

  function move(index: number, direction: -1 | 1) {
    setOrder((current) => {
      const target = index + direction

      if (target < 0 || target >= current.length) {
        return current
      }

      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved as HomepageSectionKey)
      return next
    })
  }

  function toggleVisible(key: HomepageSectionKey, visible: boolean) {
    setHidden((current) =>
      visible ? current.filter((value) => value !== key) : [...current, key],
    )
  }

  function toggleFeatured(id: string, selected: boolean) {
    setFeatured((current) => {
      if (!selected) {
        return current.filter((value) => value !== id)
      }

      if (current.includes(id) || current.length >= homepage.maxFeaturedProjects) {
        return current
      }

      return [...current, id]
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({ sectionOrder: order, hiddenSections: hidden, featuredProjectIds: featured })
  }

  const atLimit = featured.length >= homepage.maxFeaturedProjects

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-12 border-t border-charcoal/15 pt-10">
      <h2 className="text-h3">Homepage sections</h2>
      <p className="mt-2 max-w-2xl text-body-sm text-charcoal/70">
        The hero always comes first. Arrange the sections below, hide the ones that are not
        ready, and choose which published projects are featured. Changes are drafts until you
        publish.
      </p>

      {formError ? (
        <div className="mt-6">
          <InlineAlert tone="error">{formError}</InlineAlert>
        </div>
      ) : null}

      <fieldset className="mt-8 space-y-4">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
          Section order and visibility
        </legend>

        <ol className="divide-y divide-charcoal/10 border border-charcoal/15">
          {order.map((key, index) => {
            const label = sectionLabels(homepage, key)
            const visible = !hidden.includes(key)

            return (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-caption text-muted-light tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-body-sm text-charcoal">{label}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || busy}
                      aria-label={`Move ${label} up`}
                      className="min-h-9 min-w-9 border border-charcoal/30 px-2 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === order.length - 1 || busy}
                      aria-label={`Move ${label} down`}
                      className="min-h-9 min-w-9 border border-charcoal/30 px-2 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>

                  <label
                    htmlFor={`section-${key}-visible`}
                    className="flex items-center gap-2 text-body-sm text-charcoal"
                  >
                    <input
                      id={`section-${key}-visible`}
                      type="checkbox"
                      checked={visible}
                      onChange={(event) => toggleVisible(key, event.target.checked)}
                      disabled={busy}
                      className={checkboxClassName}
                    />
                    Show
                  </label>
                </div>
              </li>
            )
          })}
        </ol>

        {hidden.length > 0 ? (
          <p className="text-caption text-muted-light">
            {hidden.length} hidden {hidden.length === 1 ? 'section' : 'sections'}. Hidden
            sections keep their position and return in place when shown again.
          </p>
        ) : null}

        {fieldErrors.sectionOrder ? (
          <p className="text-body-sm text-error">{fieldErrors.sectionOrder}</p>
        ) : null}
        {fieldErrors.hiddenSections ? (
          <p className="text-body-sm text-error">{fieldErrors.hiddenSections}</p>
        ) : null}
      </fieldset>

      <fieldset className="mt-10 space-y-4 border-t border-charcoal/15 pt-8">
        <legend className="text-caption tracking-[0.14em] text-muted-light uppercase">
          Featured projects
        </legend>
        <p className="max-w-2xl text-body-sm text-charcoal/70">
          Only published projects can be featured. The order below is the order shown on the
          homepage; without a selection, projects marked as featured are used.
        </p>

        {homepage.featuredCandidates.length > 0 ? (
          <div className="space-y-3">
            {featured.length > 0 ? (
              <p className="text-caption text-muted-light">
                Selected {featured.length} of {homepage.maxFeaturedProjects}.
              </p>
            ) : null}

            <ul className="divide-y divide-charcoal/10 border border-charcoal/15">
              {homepage.featuredCandidates.map((project) => {
                const checked = featured.includes(project.id)

                return (
                  <li key={project.id}>
                    <label
                      htmlFor={`featured-${project.id}`}
                      className="flex items-center gap-3 px-4 py-3 text-body-sm text-charcoal"
                    >
                      <input
                        id={`featured-${project.id}`}
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => toggleFeatured(project.id, event.target.checked)}
                        disabled={busy || (!checked && atLimit)}
                        className={checkboxClassName}
                      />
                      <span>{project.title}</span>
                      <span className="ml-auto text-caption text-muted-light">
                        /{project.slug}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <InlineAlert tone="info">
            No published projects yet. Publish a project to make it available here.
          </InlineAlert>
        )}

        {fieldErrors.featuredProjectIds ? (
          <p className="text-body-sm text-error">{fieldErrors.featuredProjectIds}</p>
        ) : null}
      </fieldset>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 border border-charcoal/30 px-6 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save homepage layout'}
        </button>
        <p className="text-caption text-muted-light">
          Publish above to make the saved layout public.
        </p>
      </div>
    </form>
  )
}
