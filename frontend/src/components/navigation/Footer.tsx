import { Container } from '@/components/layout/Container'
import { navigation } from '@/content/navigation'
import { profile } from '@/content/portfolio'

const CURRENT_YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="border-t border-ivory/10 bg-charcoal text-ivory">
      <Container className="py-16 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <p className="text-sm font-medium tracking-[0.3em] text-gold uppercase">
              {profile.wordmark}
            </p>
            <p className="mt-5 max-w-sm font-serif text-h3 text-ivory">{profile.name}</p>
            <p className="mt-3 text-body-sm text-ivory/60">{profile.role}</p>
            <p className="mt-1 text-body-sm text-ivory/60">{profile.location}</p>
          </div>

          <nav aria-label="Footer">
            <p className="eyebrow text-muted-dark">Navigate</p>
            <ul className="mt-5 flex flex-col gap-3">
              {navigation.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-body-sm text-ivory/75 transition-colors duration-150 ease-standard hover:text-ivory"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="eyebrow text-muted-dark">Elsewhere</p>
            <ul className="mt-5 flex flex-col gap-3">
              <li>
                <a
                  href={`mailto:${profile.email}`}
                  className="text-body-sm text-ivory/75 transition-colors duration-150 ease-standard hover:text-ivory"
                >
                  {profile.email}
                </a>
              </li>
              {profile.socials.map((social) => (
                <li key={social.url}>
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
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-ivory/10 pt-8 text-caption text-muted-dark sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {CURRENT_YEAR} {profile.name}. All rights reserved.
          </p>
          <a href="#top" className="link-underline text-ivory/70 hover:text-ivory">
            Back to top ↑
          </a>
        </div>
      </Container>
    </footer>
  )
}
