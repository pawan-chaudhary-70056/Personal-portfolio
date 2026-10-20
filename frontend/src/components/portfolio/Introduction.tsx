import { Section } from '@/components/layout/Section'
import { Reveal } from '@/components/ui/Reveal'
import { profile } from '@/content/portfolio'

export function Introduction() {
  return (
    <Section id="about" tone="light" labelledBy="about-heading">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-20">
        <Reveal>
          <p className="eyebrow text-gold-ink">About</p>
          <h2 id="about-heading" className="mt-5 max-w-md text-h2">
            Considered engineering, considered design.
          </h2>
        </Reveal>

        <Reveal delay={80}>
          <div className="max-w-xl space-y-5">
            {profile.about.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="text-body-lg text-charcoal/75">
                {paragraph}
              </p>
            ))}
          </div>

          <dl className="mt-12 grid gap-x-10 gap-y-8 border-t border-charcoal/15 pt-8 sm:grid-cols-2">
            {profile.focusAreas.map((area) => (
              <div key={area.label}>
                <dt className="font-serif text-h3 text-charcoal">{area.label}</dt>
                <dd className="mt-2 text-body-sm text-charcoal/70">{area.description}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </Section>
  )
}
