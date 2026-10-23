import { useEffect } from 'react'
import type { PortfolioContent } from '@/@types/portfolio'
import { PageHeader } from '@/components/layout/PageHeader'
import { ContactCta } from '@/components/portfolio/ContactCta'
import { ExperiencePreview } from '@/components/portfolio/ExperiencePreview'
import { PortfolioGate } from '@/components/portfolio/PortfolioGate'
import { setPageMetadata } from '@/utils/metadata'

export function ExperiencePage() {
  return (
    <PortfolioGate loadingLabel="Loading experience…">
      {(content) => <ExperienceContent content={content} />}
    </PortfolioGate>
  )
}

function ExperienceContent({ content }: { content: PortfolioContent }) {
  const { experience, profile } = content

  useEffect(() => {
    setPageMetadata({
      title: 'Experience — Portfolio',
      description:
        'A structured professional history with roles, organizations, employment types, and dates.',
      url: `${window.location.origin}/experience`,
    })
  }, [])

  const currentRole = experience.find((entry) => entry.isCurrent) ?? experience[0] ?? null

  return (
    <>
      <PageHeader
        eyebrow="Experience"
        title="Professional history."
        intro={
          currentRole
            ? `Currently ${currentRole.role} at ${currentRole.organization}. The full history follows, most recent first.`
            : 'Roles and organizations appear here once they are published, most recent first.'
        }
        meta={
          <p className="border-t border-ivory/10 pt-6 text-caption tracking-[0.14em] text-muted-dark uppercase">
            {experience.length} {experience.length === 1 ? 'entry' : 'entries'}
            {profile?.location ? ` · ${profile.location}` : ''}
          </p>
        }
      />

      <ExperiencePreview experience={experience} />
      <ContactCta profile={profile} />
    </>
  )
}
