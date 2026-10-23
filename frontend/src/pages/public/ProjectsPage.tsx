import { useEffect } from 'react'
import type { PortfolioContent } from '@/@types/portfolio'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { ContactCta } from '@/components/portfolio/ContactCta'
import { PortfolioGate } from '@/components/portfolio/PortfolioGate'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { Reveal } from '@/components/ui/Reveal'
import { setPageMetadata } from '@/utils/metadata'

export function ProjectsPage() {
  return (
    <PortfolioGate loadingLabel="Loading projects…">
      {(content) => <ProjectsContent content={content} />}
    </PortfolioGate>
  )
}

function ProjectsContent({ content }: { content: PortfolioContent }) {
  const { projects, profile } = content

  useEffect(() => {
    setPageMetadata({
      title: 'Projects — Portfolio',
      description:
        'Published projects with their descriptions, technologies, and links to live sites and repositories.',
      url: `${window.location.origin}/projects`,
    })
  }, [])

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Projects, in full."
        intro="A complete collection of published work. Each project opens into its own page with the description, technologies, and any public links."
        meta={
          <p className="border-t border-ivory/10 pt-6 text-caption tracking-[0.14em] text-muted-dark uppercase">
            {projects.length} published {projects.length === 1 ? 'project' : 'projects'}
          </p>
        }
      />

      <Section
        id="project-list"
        tone="dark"
        labelledBy="project-list-heading"
        className="pt-16 sm:pt-20 lg:pt-24"
      >
        <h2 id="project-list-heading" className="sr-only">
          All published projects
        </h2>

        {projects.length > 0 ? (
          <div className="grid gap-x-10 gap-y-16 sm:grid-cols-2">
            {projects.map((project, index) => (
              <Reveal key={project.id} delay={index % 2 === 0 ? 0 : 80}>
                <ProjectCard project={project} index={index} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="max-w-xl border border-ivory/10 px-6 py-12">
            <p className="font-serif text-h3 text-ivory">No projects are published yet.</p>
            <p className="mt-3 text-body-sm text-ivory/65">
              Projects appear here once they are published from the admin dashboard.
            </p>
          </div>
        )}
      </Section>

      <ContactCta profile={profile} />
    </>
  )
}
