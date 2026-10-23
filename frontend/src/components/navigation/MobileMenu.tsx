import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { navigation } from '@/content/navigation'
import { usePortfolio } from '@/portfolio/usePortfolio'
import { cn } from '@/utils/cn'

interface MobileMenuProps {
  id: string
  open: boolean
  onClose: () => void
}

export function MobileMenu({ id, open, onClose }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { content } = usePortfolio()
  const email = content?.profile?.publicEmail ?? null

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div id={id} ref={panelRef} className="border-t border-ivory/10 bg-charcoal md:hidden">
      <Container className="py-6">
        <ul className="flex flex-col">
          {navigation.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'block border-b border-ivory/5 py-4 text-body-lg transition-colors duration-150 ease-standard',
                    isActive ? 'text-gold' : 'text-ivory hover:text-gold',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {email ? (
          <a
            href={`mailto:${email}`}
            onClick={onClose}
            className="mt-6 inline-block text-body-sm text-gold link-underline"
          >
            {email}
          </a>
        ) : null}
      </Container>
    </div>
  )
}
