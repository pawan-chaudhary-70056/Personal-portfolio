import { useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { OverviewResponse } from '@/@types/admin'
import { getOverview } from '@/api/admin.api'
import { useSession } from '@/auth/useSession'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { useApiResource } from '@/hooks/useApiResource'
import { auditActionLabel } from '@/utils/auditLabels'
import { formatDateTime } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'

export function AdminOverviewPage() {
  const { admin } = useSession()
  const fetcher = useCallback(
    (signal: AbortSignal) => getOverview(signal),
    [],
  )

  const { status, data, error, reload } = useApiResource<OverviewResponse>(fetcher, {
    errorMessage: 'Could not load the dashboard. Please try again.',
  })

  useEffect(() => {
    setPageMetadata({
      title: 'Overview — Portfolio admin',
      description: 'Administrative overview of portfolio content.',
    })
  }, [])

  const loading = status === 'loading'

  const projectCards = [
    {
      label: 'Total projects',
      value: data?.projects.total,
      note: `${data?.projects.featured ?? 0} featured`,
    },
    { label: 'Published', value: data?.projects.published, note: 'Visible on the site' },
    { label: 'Drafts', value: data?.projects.draft, note: 'Not publicly visible' },
    { label: 'Archived', value: data?.projects.archived, note: 'Hidden from listings' },
  ]

  const contentCards = [
    {
      label: 'Skills',
      value: data?.content.skills.total,
      note: `${data?.content.skills.published ?? 0} published`,
      href: '/admin/skills',
    },
    {
      label: 'Experience',
      value: data?.content.experience.total,
      note: `${data?.content.experience.published ?? 0} published`,
      href: '/admin/experience',
    },
    {
      label: 'Education',
      value: data?.content.education.total,
      note: `${data?.content.education.published ?? 0} published`,
      href: '/admin/education',
    },
    {
      label: 'Certifications',
      value: data?.content.certifications.total,
      note: `${data?.content.certifications.published ?? 0} published`,
      href: '/admin/certifications',
    },
  ]

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold-ink">Overview</p>
          <h1 className="mt-3 text-h2">Content at a glance</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/profile"
            className="min-h-11 border border-charcoal/30 px-5 py-3 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
          >
            Edit profile
          </Link>
          <Link
            to="/admin/projects/new"
            className="min-h-11 bg-gold px-5 py-3 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d]"
          >
            New project
          </Link>
        </div>
      </header>

      {error ? (
        <div className="mt-8">
          <InlineAlert tone="error">
            {error}{' '}
            <button type="button" onClick={reload} className="underline">
              Retry
            </button>
          </InlineAlert>
        </div>
      ) : null}

      <div
        aria-busy={loading}
        className="mt-10 grid gap-px border border-charcoal/15 bg-charcoal/15 sm:grid-cols-2 lg:grid-cols-4"
      >
        {projectCards.map((card) => (
          <div key={card.label} className="bg-ivory p-6">
            <p className="text-caption tracking-[0.14em] text-muted-light uppercase">{card.label}</p>
            <p className="mt-3 font-serif text-h1 leading-none text-charcoal">
              {loading ? '—' : (card.value ?? 0)}
            </p>
            <p className="mt-2 text-caption text-muted-light">{card.note}</p>
          </div>
        ))}
      </div>

      <div
        aria-busy={loading}
        className="mt-6 grid gap-px border border-charcoal/15 bg-charcoal/15 sm:grid-cols-2 lg:grid-cols-4"
      >
        {contentCards.map((card) => (
          <div key={card.label} className="bg-ivory p-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-caption tracking-[0.14em] text-muted-light uppercase">
                {card.label}
              </p>
              <Link
                to={card.href}
                className="text-caption text-charcoal underline underline-offset-4"
              >
                Manage
              </Link>
            </div>
            <p className="mt-3 font-serif text-h1 leading-none text-charcoal">
              {loading ? '—' : (card.value ?? 0)}
            </p>
            <p className="mt-2 text-caption text-muted-light">{card.note}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="activity-heading" className="mt-14">
        <div className="flex items-end justify-between gap-4">
          <h2 id="activity-heading" className="text-h3">
            Recent activity
          </h2>
          {admin?.role === 'OWNER' ? (
            <Link
              to="/admin/audit-logs"
              className="text-caption text-charcoal underline underline-offset-4"
            >
              View full activity log
            </Link>
          ) : null}
        </div>

        {loading ? (
          <p role="status" className="mt-6 text-body-sm text-muted-light">
            Loading activity…
          </p>
        ) : data && data.recentEvents.length > 0 ? (
          <ol className="mt-6 border-t border-charcoal/15">
            {data.recentEvents.map((event) => {
              const metadata = event.metadata ?? {}
              const title =
                typeof metadata.title === 'string'
                  ? metadata.title
                  : typeof metadata.name === 'string'
                    ? metadata.name
                    : typeof metadata.role === 'string'
                      ? metadata.role
                      : null

              return (
                <li
                  key={event.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-charcoal/10 py-3.5"
                >
                  <div>
                    <p className="text-body-sm text-charcoal">
                      {auditActionLabel(event.action)}
                      {title ? <span className="text-charcoal/60"> — {title}</span> : null}
                    </p>
                    <p className="mt-0.5 text-caption text-muted-light">
                      {event.admin?.name ?? 'System'} · {event.entityType}
                    </p>
                  </div>
                  <time dateTime={event.createdAt} className="text-caption text-muted-light">
                    {formatDateTime(event.createdAt)}
                  </time>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="mt-6 text-body-sm text-muted-light">
            No administrative activity has been recorded yet.
          </p>
        )}
      </section>
    </>
  )
}
