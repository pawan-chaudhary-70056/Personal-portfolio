import type { PublicProfile } from '@/@types/portfolio'
import { Section } from '@/components/layout/Section'
import { Reveal } from '@/components/ui/Reveal'
import { biographyParagraphs } from '@/utils/profileText'

const linkLabels = [
  { key: 'websiteUrl', label: 'Website' },
  { key: 'linkedinUrl', label: 'LinkedIn' },
  { key: 'githubUrl', label: 'GitHub' },
] as const

export function Introduction({ profile }: { profile: PublicProfile | null }) {
  if (!profile) {
    return (
      <Section id="about" tone="light" labelledBy="about-heading">
        <p className="eyebrow text-gold-ink">About</p>
        <h2 id="about-heading" className="mt-5 max-w-xl text-h2">
          The professional profile has not been published yet.
        </h2>
        <p className="mt-5 max-w-xl text-body-lg text-charcoal/70">
          Biography, portrait, and approved professional links will appear here once they
          are saved in the admin dashboard.
        </p>
      </Section>
    )
  }

  const paragraphs = biographyParagraphs(profile.biography)
  const links = linkLabels.flatMap(({ key, label }) => {
    const url = profile[key]
    return url ? [{ label, url }] : []
  })

  return (
    <Section id="about" tone="light" labelledBy="about-heading">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-20">
        <Reveal>
          <p className="eyebrow text-gold-ink">About</p>
          <h2 id="about-heading" className="mt-5 max-w-md text-h2">
            Considered engineering, considered design.
          </h2>

          {profile.portraitUrl ? (
            <img
              src={profile.portraitUrl}
              alt={profile.portraitAlt ?? ''}
              loading="lazy"
              decoding="async"
              className="mt-10 aspect-4/5 w-full max-w-xs border border-charcoal/10 object-cover"
            />
          ) : null}
        </Reveal>

        <Reveal delay={80}>
          <div className="max-w-xl space-y-5">
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <p key={`${paragraph.slice(0, 32)}-${index}`} className="text-body-lg text-charcoal/75">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-body-lg text-charcoal/75">{profile.biography}</p>
            )}
          </div>

          {links.length > 0 ? (
            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-charcoal/15 pt-6">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-underline text-body-sm text-gold-ink hover:text-charcoal"
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
  )
}
