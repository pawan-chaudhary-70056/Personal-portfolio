import { Section } from '@/components/layout/Section'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { Reveal } from '@/components/ui/Reveal'
import { featuredProjects } from '@/content/portfolio'

export function FeaturedWork() {
  const lastIndex = String(featuredProjects.length).padStart(2, '0')

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
          <p className="text-caption tracking-[0.14em] text-muted-dark uppercase">
            01 — {lastIndex}
          </p>
        </div>
      </Reveal>

      {featuredProjects.length > 0 ? (
        <div className="mt-14 grid gap-x-10 gap-y-16 sm:grid-cols-2">
          {featuredProjects.map((project, index) => (
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
