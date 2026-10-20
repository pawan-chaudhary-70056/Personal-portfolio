import { useEffect } from 'react'
import { ContactCta } from '@/components/portfolio/ContactCta'
import { CredentialsPreview } from '@/components/portfolio/CredentialsPreview'
import { ExperiencePreview } from '@/components/portfolio/ExperiencePreview'
import { FeaturedWork } from '@/components/portfolio/FeaturedWork'
import { Hero } from '@/components/portfolio/Hero'
import { Introduction } from '@/components/portfolio/Introduction'
import { SkillsOverview } from '@/components/portfolio/SkillsOverview'
import { profile } from '@/content/portfolio'
import { setPageMetadata } from '@/utils/metadata'

export function HomePage() {
  useEffect(() => {
    setPageMetadata({
      title: `${profile.name} — ${profile.role}`,
      description: profile.summary,
      url: window.location.origin,
    })
  }, [])

  return (
    <>
      <Hero />
      <Introduction />
      <FeaturedWork />
      <SkillsOverview />
      <ExperiencePreview />
      <CredentialsPreview />
      <ContactCta />
    </>
  )
}
