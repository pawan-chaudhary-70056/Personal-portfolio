import { useCallback, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { MobileMenu } from '@/components/navigation/MobileMenu'
import { contactNavigation, primaryNavigation } from '@/content/navigation'
import { useScrolled } from '@/hooks/useScrolled'
import { cn } from '@/utils/cn'

const MOBILE_MENU_ID = 'mobile-navigation'
/** Static brand wordmark; the owner's name is rendered in the footer. */
const WORDMARK = 'Portfolio'

export function Header() {
  const scrolled = useScrolled(16)
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    toggleRef.current?.focus()
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-[250ms] ease-standard',
        scrolled || menuOpen
          ? 'border-b border-ivory/10 bg-charcoal/95 backdrop-blur-sm'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <Container className="flex h-20 items-center justify-between gap-6">
        <Link
          to="/"
          className="text-sm font-medium tracking-[0.3em] text-ivory uppercase transition-colors duration-150 ease-standard hover:text-gold"
        >
          {WORDMARK}
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          <ul className="flex items-center gap-8">
            {primaryNavigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'nav-link transition-colors duration-150 ease-standard',
                      isActive ? 'text-gold' : 'text-ivory/75 hover:text-ivory',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <NavLink
            to={contactNavigation.to}
            className={({ isActive }) =>
              cn('nav-link text-gold', isActive && 'text-ivory')
            }
          >
            {contactNavigation.label}
          </NavLink>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls={MOBILE_MENU_ID}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
          className="relative -mr-2 flex h-11 w-11 items-center justify-center text-ivory md:hidden"
        >
          <span aria-hidden="true" className="flex w-6 flex-col gap-1.5">
            <span
              className={cn(
                'h-px w-full bg-current transition-transform duration-[250ms] ease-standard',
                menuOpen && 'translate-y-[3.5px] rotate-45',
              )}
            />
            <span
              className={cn(
                'h-px w-full bg-current transition-transform duration-[250ms] ease-standard',
                menuOpen && '-translate-y-[3.5px] -rotate-45',
              )}
            />
          </span>
        </button>
      </Container>

      <MobileMenu id={MOBILE_MENU_ID} open={menuOpen} onClose={closeMenu} />
    </header>
  )
}
