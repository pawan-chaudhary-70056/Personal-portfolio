import { Link } from 'react-router-dom'
import type { PublicProject } from '@/@types/portfolio'
import { Section } from '@/components/layout/Section'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { Reveal } from '@/components/ui/Reveal'

interface FeaturedWorkProps {
  projects: PublicProject[]
  /** Published homepage selection, in the administrator's order. */
  featuredIds?: string[]
}

export function FeaturedWork({ projects, featuredIds }: FeaturedWorkProps) {
  // The saved selection wins; without one, fall back to each project's flag and
  // finally to every published project so the section never renders empty.
  const selected = (featuredIds ?? []).flatMap((id) => {
    const project = projects.find((candidate) => candidate.id === id)
    return project ? [project] : []
  })
  const flagged = projects.filter((project) => project.featured)
  const displayProjects = selected.length > 0 ? selected : flagged.length > 0 ? flagged : projects
  const lastIndex = String(displayProjects.length).padStart(2, '0')

  return (
    <Section id="work" tone="dark" labelledBy="work-heading">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-gold">Selected work</p>
            <h2 id="work-heading" className="mt-5 max-w-2xl text-h2">
              A few projects, examined closely.
            </h2>
          </div>
          <div className="flex items-center gap-6">
            {displayProjects.length > 0 ? (
              <p className="text-caption tracking-[0.14em] text-muted-dark uppercase">
                01 — {lastIndex}
              </p>
            ) : null}
            <Link to="/projects" className="link-underline text-body-sm text-gold hover:text-ivory">
              All projects →
            </Link>
          </div>
        </div>
      </Reveal>

      {displayProjects.length > 0 ? (
        <div className="mt-14 grid gap-x-10 gap-y-16 sm:grid-cols-2">
          {displayProjects.map((project, index) => (
            <Reveal key={project.id} delay={index % 2 === 0 ? 0 : 80}>
              <ProjectCard project={project} index={index} />
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="mt-12 max-w-md text-body-lg text-ivory/60">
          Selected projects will appear here once they are published.
        </p>
      )}
    </Section>
  )
}
