import { Link } from 'react-router-dom'
import type { PublicProfile } from '@/@types/portfolio'
import { Section } from '@/components/layout/Section'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Reveal } from '@/components/ui/Reveal'

const linkLabels = [
  { key: 'websiteUrl', label: 'Website' },
  { key: 'linkedinUrl', label: 'LinkedIn' },
  { key: 'githubUrl', label: 'GitHub' },
] as const

export function ContactCta({ profile }: { profile: PublicProfile | null }) {
  const email = profile?.publicEmail ?? null
  const links = profile
    ? linkLabels.flatMap(({ key, label }) => {
        const url = profile[key]
        return url ? [{ label, url }] : []
      })
    : []

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
              {email
                ? 'The fastest way to reach me is email. I reply to every genuine enquiry.'
                : 'Contact details have not been published yet. Check back soon.'}
            </p>
          </div>

          <div className="lg:text-right">
            {email ? (
              <>
                <ButtonLink href={`mailto:${email}`} className="px-8">
                  Send an email ↗
                </ButtonLink>
                <p className="mt-4 text-caption tracking-[0.14em] text-muted-dark uppercase">
                  {email}
                </p>
                <Link
                  to="/contact"
                  className="link-underline mt-4 block text-body-sm text-ivory/70 hover:text-ivory"
                >
                  Contact page →
                </Link>
              </>
            ) : (
              <ButtonLink to="/contact" className="px-8">
                Go to contact
              </ButtonLink>
            )}

            {links.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 lg:justify-end">
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
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
