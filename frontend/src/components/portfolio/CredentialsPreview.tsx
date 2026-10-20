import { Section } from '@/components/layout/Section'
import { Reveal } from '@/components/ui/Reveal'
import { credentials } from '@/content/portfolio'

export function CredentialsPreview() {
  return (
    <Section id="credentials" tone="light" labelledBy="credentials-heading">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-20">
        <Reveal>
          <p className="eyebrow text-gold-ink">Credentials</p>
          <h2 id="credentials-heading" className="mt-5 max-w-sm text-h2">
            Education and certifications.
          </h2>
          <p className="mt-5 max-w-sm text-body-sm text-charcoal/65">
            Formal qualifications, kept short and verifiable. Verification links are shown only when
            they point to a real credential.
          </p>
        </Reveal>

        <Reveal delay={80}>
          {credentials.length > 0 ? (
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {credentials.map((credential) => (
                <li key={credential.id} className="border-t border-charcoal/15 pt-5">
                  <p className="eyebrow text-gold-ink">
                    {credential.kind === 'education' ? 'Education' : 'Certification'}
                  </p>
                  <h3 className="mt-3 font-serif text-h3 leading-snug text-charcoal">
                    {credential.title}
                  </h3>
                  <p className="mt-2 text-body-sm text-charcoal/70">
                    {credential.issuer} · {credential.year}
                    {credential.sample ? (
                      <span className="ml-3 text-caption tracking-wide text-muted-light uppercase">
                        Sample
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-lg text-charcoal/65">
              Education and certification details will be published shortly.
            </p>
          )}
        </Reveal>
      </div>
    </Section>
  )
}
