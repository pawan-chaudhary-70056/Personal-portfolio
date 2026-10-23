import { useEffect } from 'react'
import type { PortfolioContent } from '@/@types/portfolio'
import { ContactForm } from '@/components/forms/ContactForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { PortfolioGate } from '@/components/portfolio/PortfolioGate'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Reveal } from '@/components/ui/Reveal'
import { setPageMetadata } from '@/utils/metadata'

const linkLabels = [
  { key: 'websiteUrl', label: 'Website' },
  { key: 'linkedinUrl', label: 'LinkedIn' },
  { key: 'githubUrl', label: 'GitHub' },
] as const

export function ContactPage() {
  return (
    <PortfolioGate loadingLabel="Loading contact details…">
      {(content) => <ContactContent content={content} />}
    </PortfolioGate>
  )
}

function ContactContent({ content }: { content: PortfolioContent }) {
  const { profile } = content
  const email = profile?.publicEmail ?? null
  const links = profile
    ? linkLabels.flatMap(({ key, label }) => {
        const url = profile[key]
        return url ? [{ label, url }] : []
      })
    : []

  useEffect(() => {
    setPageMetadata({
      title: 'Contact — Portfolio',
      description: 'Contact details and a message form for professional roles, collaborations, and enquiries.',
      url: `${window.location.origin}/contact`,
    })
  }, [])

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Start a conversation."
        intro="For roles, collaborations, or questions about the work, send a message below. Email is the most reliable route if you prefer to write directly."
      />

      <Section id="contact" tone="light" labelledBy="contact-form-heading">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-20">
          <Reveal>
            <p className="eyebrow text-gold-ink">Enquiry</p>
            <h2 id="contact-form-heading" className="mt-5 max-w-lg text-h2">
              Send a message.
            </h2>
            <p className="mt-5 max-w-md text-body-sm text-charcoal/70">
              Required fields are marked. Messages are stored privately and read by the portfolio
              owner only.
            </p>

            <ContactForm />
          </Reveal>

          <Reveal delay={80}>
            <p className="eyebrow text-gold-ink">Direct</p>
            <h2 className="mt-5 max-w-sm text-h3">Prefer email?</h2>
            <p className="mt-4 max-w-sm text-body-sm text-charcoal/70">
              {email
                ? 'Write directly to the address below. I read every genuine enquiry.'
                : 'A public email address has not been published, so the form is the best way to get in touch.'}
            </p>

            {email ? (
              <div className="mt-8">
                <ButtonLink href={`mailto:${email}`} tone="light">
                  Send an email ↗
                </ButtonLink>
                <p className="mt-4 break-all text-caption tracking-[0.14em] text-muted-light uppercase">
                  {email}
                </p>
              </div>
            ) : null}

            <dl className="mt-10 border-t border-charcoal/15 text-body-sm">
              <div className="flex items-baseline justify-between gap-6 border-b border-charcoal/10 py-4">
                <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">
                  Location
                </dt>
                <dd className="text-right text-charcoal">{profile?.location ?? 'Not published'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 border-b border-charcoal/10 py-4">
                <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">Email</dt>
                <dd className="text-right break-all text-charcoal">
                  {email ?? 'Not published'}
                </dd>
              </div>
            </dl>

            {links.length > 0 ? (
              <div className="mt-10">
                <p className="eyebrow text-gold-ink">Elsewhere</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="link-underline text-body-sm text-charcoal/75 hover:text-charcoal"
                      >
                        {link.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Reveal>
        </div>
      </Section>
    </>
  )
}
