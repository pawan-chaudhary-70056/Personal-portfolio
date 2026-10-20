import { Section } from '@/components/layout/Section'
import { Reveal } from '@/components/ui/Reveal'
import { experience } from '@/content/portfolio'

export function ExperiencePreview() {
  return (
    <Section
      id="experience"
      tone="dark"
      labelledBy="experience-heading"
      className="bg-charcoal-900"
    >
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-gold">Experience</p>
            <h2 id="experience-heading" className="mt-5 max-w-2xl text-h2">
              Where the work has happened.
            </h2>
          </div>
          <p className="text-caption tracking-[0.14em] text-muted-dark uppercase">
            {experience.length} {experience.length === 1 ? 'Entry' : 'Entries'}
          </p>
        </div>
      </Reveal>

      {experience.length > 0 ? (
        <ol className="mt-14 border-t border-ivory/10">
          {experience.map((entry, index) => (
            <li key={entry.id} className="border-b border-ivory/10">
              <Reveal delay={index * 60}>
                <div className="grid gap-3 py-8 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-10">
                  <p className="flex items-center gap-2 text-caption tracking-[0.14em] text-muted-dark uppercase">
                    {entry.current ? (
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" />
                    ) : null}
                    {entry.period}
                  </p>

                  <div>
                    <h3 className="text-h3 text-ivory">{entry.role}</h3>
                    <p className="mt-1 text-body-sm text-gold">
                      {entry.organization}
                      {entry.sample ? (
                        <span className="ml-3 text-caption tracking-wide text-muted-dark uppercase">
                          Sample
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-3 max-w-xl text-body-sm text-ivory/65">{entry.summary}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-12 max-w-md text-body-lg text-ivory/60">
          Experience entries will appear here once they are published.
        </p>
      )}
    </Section>
  )
}
