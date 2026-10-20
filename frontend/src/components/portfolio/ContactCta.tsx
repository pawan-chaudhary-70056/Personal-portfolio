import { Section } from '@/components/layout/Section'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Reveal } from '@/components/ui/Reveal'
import { profile } from '@/content/portfolio'

export function ContactCta() {
  return (
    <Section id="contact" tone="dark" labelledBy="contact-heading">
      <Reveal>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="eyebrow text-gold">Contact</p>
            <h2 id="contact-heading" className="mt-5 max-w-2xl text-h1">
              Have a role, project, or collaboration in mind?
            </h2>
            <p className="mt-6 max-w-lg text-body-lg text-ivory/70">
              The fastest way to reach me is email. I reply to every genuine enquiry.
            </p>
          </div>

          <div className="lg:text-right">
            <ButtonLink href={`mailto:${profile.email}`} className="px-8">
              Send an email ↗
            </ButtonLink>
            <p className="mt-4 text-caption tracking-[0.14em] text-muted-dark uppercase">
              {profile.email}
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
