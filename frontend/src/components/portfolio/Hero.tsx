import type { CSSProperties } from 'react'
import { Container } from '@/components/layout/Container'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { CONTENT_IS_PLACEHOLDER, featuredProjects, profile } from '@/content/portfolio'

const enterDelay = (milliseconds: number) =>
  ({ '--enter-delay': `${milliseconds}ms` }) as CSSProperties

export function Hero() {
  const projectCount = String(featuredProjects.length).padStart(2, '0')

  return (
    <section id="top" data-tone="dark" className="bg-charcoal text-ivory">
      <div className="flex min-h-svh flex-col justify-between pt-28 pb-10 sm:pt-32">
        <Container className="flex flex-1 flex-col justify-center">
          <p className="hero-enter eyebrow text-gold" style={enterDelay(0)}>
            {profile.role}
          </p>

          <h1 className="hero-enter mt-6 max-w-5xl text-display" style={enterDelay(90)}>
            {profile.headline}
          </h1>

          <p
            className="hero-enter mt-8 max-w-xl text-body-lg text-ivory/70"
            style={enterDelay(240)}
          >
            {profile.summary}
          </p>

          <div className="hero-enter mt-10 flex flex-wrap gap-4" style={enterDelay(360)}>
            <ButtonLink href="#work">Explore selected work</ButtonLink>
            <ButtonLink href="#experience" variant="outline">
              View experience
            </ButtonLink>
          </div>
        </Container>

        <Container className="mt-16">
          <div
            className="hero-enter grid gap-3 border-t border-ivory/10 pt-6 text-caption tracking-[0.14em] text-muted-dark uppercase sm:grid-cols-3"
            style={enterDelay(480)}
          >
            <p>{profile.availability}</p>
            <p className="sm:text-center">{profile.location}</p>
            {CONTENT_IS_PLACEHOLDER ? (
              <p className="text-gold/80 sm:text-right">
                Placeholder content — edit src/content/portfolio.ts
              </p>
            ) : (
              <p className="sm:text-right">{projectCount} selected projects</p>
            )}
          </div>
        </Container>
      </div>
    </section>
  )
}
