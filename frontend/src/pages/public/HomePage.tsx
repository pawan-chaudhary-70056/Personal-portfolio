import { Fragment, useEffect, type ReactNode } from 'react'
import type { HomepageSectionKey } from '@/@types/portfolio'
import { ContactCta } from '@/components/portfolio/ContactCta'
import { CredentialsPreview } from '@/components/portfolio/CredentialsPreview'
import { ExperiencePreview } from '@/components/portfolio/ExperiencePreview'
import { FeaturedWork } from '@/components/portfolio/FeaturedWork'
import { Hero } from '@/components/portfolio/Hero'
import { Introduction } from '@/components/portfolio/Introduction'
import { SkillsOverview } from '@/components/portfolio/SkillsOverview'
import { Container } from '@/components/layout/Container'
import { usePortfolio } from '@/portfolio/usePortfolio'
import { setPageMetadata } from '@/utils/metadata'
import { biographySummary } from '@/utils/profileText'

export function HomePage() {
  const { status, content, error, reload } = usePortfolio()

  useEffect(() => {
    if (status !== 'ready' || !content) {
      return
    }

    const { profile, homepage } = content
    const site = homepage.site

    // Approved site settings take precedence; the profile is the fallback when
    // the owner has not filled them in yet.
    setPageMetadata({
      title:
        site.siteTitle ||
        (profile ? `${profile.displayName} — ${profile.headline}` : 'Portfolio'),
      description:
        site.siteDescription ||
        (profile
          ? biographySummary(profile.biography).slice(0, 160)
          : 'A professional portfolio of selected work, skills, and experience.'),
      url: site.canonicalUrl ?? window.location.origin,
      image: site.socialImageUrl ?? undefined,
    })
  }, [status, content])

  if (status === 'loading' && !content) {
    return (
      <section data-tone="dark" aria-busy="true" className="bg-charcoal text-ivory">
        <Container className="flex min-h-svh flex-col justify-center py-24">
          <p role="status" className="text-caption tracking-[0.14em] text-ivory/70 uppercase">
            Loading portfolio…
          </p>
          <div aria-hidden="true" className="mt-10 max-w-3xl space-y-5">
            <div className="h-3 w-40 bg-ivory/10" />
            <div className="h-16 w-full bg-ivory/10" />
            <div className="h-16 w-4/5 bg-ivory/10" />
            <div className="h-3 w-2/3 bg-ivory/10" />
          </div>
        </Container>
      </section>
    )
  }

  if (status === 'error' || !content) {
    return (
      <section data-tone="dark" className="bg-charcoal text-ivory">
        <Container className="flex min-h-svh flex-col justify-center py-24">
          <p className="eyebrow text-gold">Portfolio</p>
          <h1 className="mt-5 max-w-2xl text-h2">The portfolio is temporarily unavailable.</h1>
          <p role="alert" className="mt-5 max-w-xl text-body-lg text-ivory/70">
            {error ?? 'The portfolio could not be loaded. Please try again.'}
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-8 min-h-12 w-fit bg-gold px-6 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d]"
          >
            Try again
          </button>
        </Container>
      </section>
    )
  }

  // The hero always renders first; every other section follows the published
  // order and visibility configured in the dashboard.
  const sections: Record<HomepageSectionKey, ReactNode> = {
    about: <Introduction profile={content.profile} />,
    work: (
      <FeaturedWork
        projects={content.projects}
        featuredIds={content.homepage.featuredProjects.map((project) => project.id)}
      />
    ),
    skills: <SkillsOverview skills={content.skills} />,
    experience: <ExperiencePreview experience={content.experience} />,
    credentials: (
      <CredentialsPreview
        education={content.education}
        certifications={content.certifications}
      />
    ),
    contact: <ContactCta profile={content.profile} />,
  }

  return (
    <>
      <Hero
        profile={content.profile}
        hero={content.hero}
        projectCount={content.projects.length}
        hasExperience={content.experience.length > 0}
      />
      {content.homepage.sections.map((section) =>
        section.visible ? (
          <Fragment key={section.key}>{sections[section.key]}</Fragment>
        ) : null,
      )}
    </>
  )
}
