import type { CSSProperties } from 'react'
import type { PublicHero, PublicProfile } from '@/@types/portfolio'
import { Container } from '@/components/layout/Container'
import { HeroPortrait } from '@/components/portfolio/HeroPortrait'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { biographySummary } from '@/utils/profileText'

const enterDelay = (milliseconds: number) =>
  ({ '--enter-delay': `${milliseconds}ms` }) as CSSProperties

interface HeroProps {
  profile: PublicProfile | null
  hero: PublicHero
  projectCount: number
  hasExperience: boolean
}

export function Hero({ profile, hero, projectCount, hasExperience }: HeroProps) {
  const projectLabel = `${projectCount} published ${projectCount === 1 ? 'project' : 'projects'}`
  const contactHref = profile?.publicEmail
    ? `mailto:${profile.publicEmail}`
    : (profile?.websiteUrl ?? profile?.githubUrl ?? null)
  const contactLabel = profile?.publicEmail ?? (profile?.websiteUrl ? 'Website ↗' : 'GitHub ↗')

  return (
    <section id="top" data-tone="dark" className="bg-charcoal text-ivory">
      <div className="flex min-h-svh flex-col justify-between pt-28 pb-10 sm:pt-32">
        <Container className="flex flex-1 items-center py-10">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.62fr)] lg:gap-16">
            <div>
              <p className="hero-enter eyebrow text-gold" style={enterDelay(0)}>
                {profile?.displayName ?? 'Portfolio'}
              </p>

              <h1 className="hero-enter mt-6 max-w-3xl text-display" style={enterDelay(90)}>
                {profile?.headline ?? 'Profile coming soon.'}
              </h1>

              <p
                className="hero-enter mt-8 max-w-xl text-body-lg text-ivory/70"
                style={enterDelay(240)}
              >
                {profile
                  ? biographySummary(profile.biography)
                  : 'The portfolio owner has not published a professional profile yet.'}
              </p>

              {profile && (projectCount > 0 || hasExperience) ? (
                <div className="hero-enter mt-10 flex flex-wrap gap-4" style={enterDelay(360)}>
                  {projectCount > 0 ? (
                    <ButtonLink to="/projects">Explore selected work</ButtonLink>
                  ) : null}
                  {hasExperience ? (
                    <ButtonLink to="/experience" variant="outline">
                      View experience
                    </ButtonLink>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="hero-enter w-full" style={enterDelay(300)}>
              <HeroPortrait
                portrait={hero.portrait}
                effect={hero.effect}
                displayName={profile?.displayName ?? 'Portfolio'}
                priority
              />
            </div>
          </div>
        </Container>

        <Container className="mt-16">
          <div
            className="hero-enter grid gap-3 border-t border-ivory/10 pt-6 text-caption tracking-[0.14em] text-muted-dark uppercase sm:grid-cols-3"
            style={enterDelay(480)}
          >
            <p>{profile?.location ?? 'Location not published'}</p>
            <p className="sm:text-center">
              {projectCount > 0 ? projectLabel : 'Selected work coming soon'}
            </p>
            {contactHref && contactLabel ? (
              <a
                href={contactHref}
                {...(contactHref.startsWith('http')
                  ? { target: '_blank', rel: 'noreferrer noopener' }
                  : {})}
                className="hover:text-ivory sm:text-right"
              >
                {contactLabel}
              </a>
            ) : (
              <p className="sm:text-right">Profile links not published</p>
            )}
          </div>
        </Container>
      </div>
    </section>
  )
}
