import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { PortfolioContent, PublicProject } from '@/@types/portfolio'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { ContactCta } from '@/components/portfolio/ContactCta'
import { PortfolioGate } from '@/components/portfolio/PortfolioGate'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Reveal } from '@/components/ui/Reveal'
import { formatDate } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'
import { textParagraphs } from '@/utils/profileText'

export function ProjectDetailPage() {
  return (
    <PortfolioGate loadingLabel="Loading project…">
      {(content) => <ProjectDetailContent content={content} />}
    </PortfolioGate>
  )
}

function ProjectDetailContent({ content }: { content: PortfolioContent }) {
  const { slug } = useParams()
  const project = content.projects.find((entry) => entry.slug === slug)

  useEffect(() => {
    setPageMetadata({
      title: project ? `${project.title} — Portfolio` : 'Project not found — Portfolio',
      description: project
        ? project.summary.slice(0, 160)
        : 'This project is not available on the public portfolio.',
      url: project ? `${window.location.origin}/projects/${project.slug}` : undefined,
    })
  }, [project])

  if (!project) {
    return (
      <Section
        id="project-not-found"
        tone="dark"
        labelledBy="project-not-found-heading"
        className="min-h-svh pt-40"
      >
        <p className="eyebrow text-gold">404</p>
        <h1 id="project-not-found-heading" className="mt-5 max-w-2xl text-h1">
          This project is not available.
        </h1>
        <p className="mt-5 max-w-md text-body-lg text-ivory/70">
          It may have been unpublished or removed, or the link may be mistyped. The full project
          collection is the best place to start again.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink to="/projects">Back to projects</ButtonLink>
          <ButtonLink to="/" variant="outline">
            Homepage
          </ButtonLink>
        </div>
      </Section>
    )
  }

  const paragraphs = textParagraphs(project.description)

  // Same-category projects first; the current project is never included.
  const related = content.projects
    .filter((entry) => entry.id !== project.id)
    .sort(
      (first, second) =>
        Number(second.category === project.category) -
        Number(first.category === project.category),
    )
    .slice(0, 3)

  return (
    <>
      <PageHeader
        eyebrow={`${project.category} · ${project.year}`}
        title={project.title}
        intro={project.summary}
        actions={<ProjectLinks project={project} />}
        meta={
          <div className="space-y-8">
            {project.technologies.length > 0 ? (
              <div>
                <p className="eyebrow text-gold">Technologies</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {project.technologies.map((technology) => (
                    <li
                      key={technology}
                      className="border border-ivory/15 px-2.5 py-1 text-caption tracking-wide text-muted-dark"
                    >
                      {technology}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {project.imageUrl ? (
              <img
                src={project.imageUrl}
                alt={project.imageAlt ?? ''}
                loading="lazy"
                decoding="async"
                className="aspect-16/9 w-full border border-ivory/10 object-cover"
              />
            ) : null}
          </div>
        }
      />

      <Section id="overview" tone="light" labelledBy="overview-heading">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-20">
          <Reveal>
            <p className="eyebrow text-gold-ink">Overview</p>
            <h2 id="overview-heading" className="mt-5 text-h3">
              About this project
            </h2>

            <dl className="mt-8 text-body-sm">
              <div className="flex items-baseline justify-between gap-6 border-t border-charcoal/15 py-3">
                <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">
                  Category
                </dt>
                <dd className="text-right text-charcoal">{project.category}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 border-t border-charcoal/10 py-3">
                <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">Year</dt>
                <dd className="text-right text-charcoal">{project.year}</dd>
              </div>
              {project.publishedAt ? (
                <div className="flex items-baseline justify-between gap-6 border-t border-charcoal/10 py-3">
                  <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">
                    Published
                  </dt>
                  <dd className="text-right text-charcoal">{formatDate(project.publishedAt)}</dd>
                </div>
              ) : null}
            </dl>

            <Link
              to="/projects"
              className="link-underline mt-10 inline-block text-body-sm text-gold-ink hover:text-charcoal"
            >
              ← Back to all projects
            </Link>
          </Reveal>

          <Reveal delay={80}>
            <h2 className="sr-only">Project description</h2>
            {paragraphs.length > 0 ? (
              <div className="max-w-reading space-y-5">
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={`${paragraph.slice(0, 32)}-${index}`}
                    className="text-body-lg text-charcoal/75"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="max-w-reading text-body-lg text-charcoal/70">
                A detailed description for this project has not been published yet.
              </p>
            )}
          </Reveal>
        </div>
      </Section>

      {project.screenshots.length > 0 ? (
        <Section
          id="screenshots"
          tone="dark"
          labelledBy="screenshots-heading"
          className="bg-charcoal-900"
        >
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow text-gold">Gallery</p>
                <h2 id="screenshots-heading" className="mt-5 max-w-2xl text-h2">
                  Screenshots.
                </h2>
              </div>
              <p className="text-caption tracking-[0.14em] text-muted-dark uppercase">
                {project.screenshots.length}{' '}
                {project.screenshots.length === 1 ? 'Image' : 'Images'}
              </p>
            </div>
          </Reveal>

          <ul className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2">
            {project.screenshots.map((screenshot, index) => (
              <li key={screenshot.id}>
                <Reveal delay={index * 60}>
                  <a
                    href={screenshot.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block overflow-hidden"
                  >
                    <img
                      src={screenshot.url}
                      alt={screenshot.alt}
                      loading="lazy"
                      decoding="async"
                      className="aspect-16/10 w-full border border-ivory/10 object-cover transition-transform duration-[400ms] ease-standard hover:scale-[1.02]"
                    />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <p className="mt-3 text-body-sm text-ivory/70">
                    {screenshot.caption ?? screenshot.alt}
                  </p>
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {related.length > 0 ? (
        <Section id="related-projects" tone="dark" labelledBy="related-projects-heading">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow text-gold">More work</p>
                <h2 id="related-projects-heading" className="mt-5 max-w-2xl text-h2">
                  Related projects.
                </h2>
              </div>
              <Link
                to="/projects"
                className="link-underline text-body-sm text-gold hover:text-ivory"
              >
                All projects →
              </Link>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((entry, index) => (
              <Reveal key={entry.id} delay={index * 60}>
                <ProjectCard project={entry} index={index} />
              </Reveal>
            ))}
          </div>
        </Section>
      ) : null}

      <ContactCta profile={content.profile} />
    </>
  )
}

function ProjectLinks({ project }: { project: PublicProject }) {
  if (!project.liveUrl && !project.repositoryUrl) {
    return (
      <p className="text-body-sm text-ivory/60">
        No public links have been published for this project.
      </p>
    )
  }

  return (
    <>
      {project.liveUrl ? (
        <ButtonLink href={project.liveUrl} external>
          Visit the live site ↗
          <span className="sr-only"> (opens in a new tab)</span>
        </ButtonLink>
      ) : null}
      {project.repositoryUrl ? (
        <ButtonLink
          href={project.repositoryUrl}
          external
          variant={project.liveUrl ? 'outline' : 'primary'}
        >
          View the repository ↗
          <span className="sr-only"> (opens in a new tab)</span>
        </ButtonLink>
      ) : null}
    </>
  )
}
