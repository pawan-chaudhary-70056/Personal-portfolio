import type { Project } from '@/@types/portfolio'

interface ProjectCardProps {
  project: Project
  index: number
}

interface ProjectLink {
  label: string
  url: string
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  const displayIndex = String(index + 1).padStart(2, '0')
  const titleHref = project.liveUrl ?? project.repositoryUrl

  const links: ProjectLink[] = [
    ...(project.liveUrl ? [{ label: 'Live site', url: project.liveUrl }] : []),
    ...(project.repositoryUrl ? [{ label: 'Repository', url: project.repositoryUrl }] : []),
  ]

  return (
    <article className="group flex h-full flex-col transition-transform duration-[250ms] ease-standard hover:-translate-y-1">
      <div className="relative aspect-4/3 overflow-hidden bg-charcoal-900">
        {project.imageUrl ? (
          <img
            src={project.imageUrl}
            alt={project.imageAlt ?? ''}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-[400ms] ease-standard group-hover:scale-[1.02]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full flex-col justify-between border border-ivory/10 p-6"
          >
            <span className="h-px w-10 bg-gold/70" />
            <span className="font-serif text-h2 text-muted-dark">{displayIndex}</span>
          </div>
        )}

        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gold transition-transform duration-[250ms] ease-standard group-hover:scale-x-100"
        />
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-4">
        <p className="text-caption tracking-[0.14em] text-muted-dark uppercase">
          {displayIndex} — {project.category}
        </p>
        <p className="text-caption text-muted-dark">{project.year}</p>
      </div>

      <h3 className="mt-3 text-h3 text-ivory">
        {titleHref ? (
          <a
            href={titleHref}
            target="_blank"
            rel="noreferrer noopener"
            className="link-underline transition-colors duration-150 ease-standard hover:text-gold"
          >
            {project.title}
          </a>
        ) : (
          project.title
        )}
      </h3>

      <p className="mt-3 text-body-sm text-ivory/65">{project.summary}</p>

      <ul className="mt-5 flex flex-wrap gap-2">
        {project.technologies.map((technology) => (
          <li
            key={technology}
            className="border border-ivory/15 px-2.5 py-1 text-caption tracking-wide text-muted-dark"
          >
            {technology}
          </li>
        ))}
        {project.sample ? (
          <li className="border border-gold/40 px-2.5 py-1 text-caption tracking-wide text-gold">
            Sample
          </li>
        ) : null}
      </ul>

      {links.length > 0 ? (
        <ul className="mt-auto flex gap-6 pt-6">
          {links.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${link.label} for ${project.title} (opens in a new tab)`}
                className="link-underline text-body-sm text-gold"
              >
                {link.label} ↗
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}
