import { useEffect } from 'react'
import type { PortfolioContent } from '@/@types/portfolio'
import { Section } from '@/components/layout/Section'
import { PageHeader } from '@/components/layout/PageHeader'
import { ContactCta } from '@/components/portfolio/ContactCta'
import { CredentialsPreview } from '@/components/portfolio/CredentialsPreview'
import { PortfolioGate } from '@/components/portfolio/PortfolioGate'
import { SkillsOverview } from '@/components/portfolio/SkillsOverview'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Reveal } from '@/components/ui/Reveal'
import { SafeImage } from '@/components/ui/SafeImage'
import { setPageMetadata } from '@/utils/metadata'
import { biographyParagraphs, biographySummary } from '@/utils/profileText'

const linkLabels = [
  { key: 'websiteUrl', label: 'Website' },
  { key: 'linkedinUrl', label: 'LinkedIn' },
  { key: 'githubUrl', label: 'GitHub' },
] as const

export function AboutPage() {
  return (
    <PortfolioGate loadingLabel="Loading about…">
      {(content) => <AboutContent content={content} />}
    </PortfolioGate>
  )
}

function AboutContent({ content }: { content: PortfolioContent }) {
  const { profile, skills, education, certifications } = content

  useEffect(() => {
    setPageMetadata({
      title: profile ? `About ${profile.displayName} — Portfolio` : 'About — Portfolio',
      description: profile
        ? biographySummary(profile.biography).slice(0, 160)
        : 'Professional background, areas of expertise, and credentials.',
      url: `${window.location.origin}/about`,
    })
  }, [profile])

  const paragraphs = profile ? biographyParagraphs(profile.biography) : []
  const links = profile
    ? linkLabels.flatMap(({ key, label }) => {
        const url = profile[key]
        return url ? [{ label, url }] : []
      })
    : []

  return (
    <>
      <PageHeader
        eyebrow="About"
        title={profile?.displayName ?? 'About the portfolio'}
        intro={profile?.headline ?? null}
        actions={
          <>
            <ButtonLink to="/projects">View projects</ButtonLink>
            <ButtonLink to="/experience" variant="outline">
              View experience
            </ButtonLink>
          </>
        }
        meta={
          profile ? (
            <div className="grid gap-3 border-t border-ivory/10 pt-6 text-caption tracking-[0.14em] text-muted-dark uppercase sm:grid-cols-3">
              <p>{profile.location ?? 'Location not published'}</p>
              <p className="sm:text-center">{profile.publicEmail ?? 'Email not published'}</p>
              <p className="sm:text-right">{links.length > 0 ? 'Profile links below' : 'No links yet'}</p>
            </div>
          ) : null
        }
      />

      <Section id="biography" tone="dark" labelledBy="biography-heading">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-20">
          <Reveal>
            <p className="eyebrow text-gold">Background</p>
            <h2 id="biography-heading" className="mt-5 max-w-md text-h2">
              Background and direction.
            </h2>

            {profile?.portraitUrl ? (
              <SafeImage
                src={profile.portraitUrl}
                alt={profile.portraitAlt ?? ''}
                loading="lazy"
                decoding="async"
                className="mt-10 aspect-4/5 w-full max-w-xs border border-ivory/10 object-cover"
              />
            ) : null}
          </Reveal>

          <Reveal delay={80}>
            {profile ? (
              <div className="max-w-xl space-y-5">
                {paragraphs.length > 0 ? (
                  paragraphs.map((paragraph, index) => (
                    <p
                      key={`${paragraph.slice(0, 32)}-${index}`}
                      className="text-body-lg text-ivory/70"
                    >
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="text-body-lg text-ivory/70">{profile.biography}</p>
                )}
              </div>
            ) : (
              <p className="max-w-xl text-body-lg text-ivory/70">
                The professional profile has not been published yet. Biography, portrait, and
                approved links appear here once they are saved in the admin dashboard.
              </p>
            )}

            {links.length > 0 ? (
              <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-ivory/10 pt-6">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="link-underline text-body-sm text-gold hover:text-ivory"
                    >
                      {link.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </Reveal>
        </div>
      </Section>

      <SkillsOverview skills={skills} />
      <CredentialsPreview education={education} certifications={certifications} />
      <ContactCta profile={profile} />
    </>
  )
}
