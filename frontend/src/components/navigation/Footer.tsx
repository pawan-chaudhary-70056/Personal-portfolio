import { Link } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { navigation } from '@/content/navigation'
import { usePortfolio } from '@/portfolio/usePortfolio'

const CURRENT_YEAR = new Date().getFullYear()

const linkLabels = [
  { key: 'websiteUrl', label: 'Website' },
  { key: 'linkedinUrl', label: 'LinkedIn' },
  { key: 'githubUrl', label: 'GitHub' },
] as const

export function Footer() {
  const { content } = usePortfolio()
  const profile = content?.profile ?? null
  const email = profile?.publicEmail ?? null
  const socials = profile
    ? linkLabels.flatMap(({ key, label }) => {
        const url = profile[key]
        return url ? [{ label, url }] : []
      })
    : []
  const displayName = profile?.displayName ?? 'Portfolio'

  return (
    <footer className="border-t border-ivory/10 bg-charcoal text-ivory">
      <Container className="py-16 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Link
              to="/"
              className="text-sm font-medium tracking-[0.3em] text-gold uppercase transition-colors duration-150 ease-standard hover:text-ivory"
            >
              Portfolio
            </Link>
            <p className="mt-5 max-w-sm font-serif text-h3 text-ivory">{displayName}</p>
            {profile?.headline ? (
              <p className="mt-3 text-body-sm text-ivory/60">{profile.headline}</p>
            ) : null}
            {profile?.location ? (
              <p className="mt-1 text-body-sm text-ivory/60">{profile.location}</p>
            ) : null}
          </div>

          <nav aria-label="Footer">
            <p className="eyebrow text-muted-dark">Navigate</p>
            <ul className="mt-5 flex flex-col gap-3">
              {navigation.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-body-sm text-ivory/75 transition-colors duration-150 ease-standard hover:text-ivory"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="eyebrow text-muted-dark">Elsewhere</p>
            {email || socials.length > 0 ? (
              <ul className="mt-5 flex flex-col gap-3">
                {email ? (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="text-body-sm text-ivory/75 transition-colors duration-150 ease-standard hover:text-ivory"
                    >
                      {email}
                    </a>
                  </li>
                ) : null}
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-body-sm text-ivory/75 transition-colors duration-150 ease-standard hover:text-ivory"
                    >
                      {social.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 max-w-xs text-body-sm text-ivory/60">
                Contact details have not been published yet.
              </p>
            )}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-ivory/10 pt-8 text-caption text-muted-dark sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {CURRENT_YEAR} {displayName}. All rights reserved.
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0 })}
            className="link-underline w-fit text-ivory/70 hover:text-ivory"
          >
            Back to top ↑
          </button>
        </div>
      </Container>
    </footer>
  )
}
