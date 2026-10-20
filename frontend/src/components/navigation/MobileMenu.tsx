import { useEffect, useRef } from 'react'
import { Container } from '@/components/layout/Container'
import { navigation } from '@/content/navigation'
import { profile } from '@/content/portfolio'

interface MobileMenuProps {
  id: string
  open: boolean
  onClose: () => void
}

export function MobileMenu({ id, open, onClose }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null)

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
            <li key={item.href}>
              <a
                href={item.href}
                onClick={onClose}
                className="block border-b border-ivory/5 py-4 text-body-lg text-ivory transition-colors duration-150 ease-standard hover:text-gold"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href={`mailto:${profile.email}`}
          onClick={onClose}
          className="mt-6 inline-block text-body-sm text-gold link-underline"
        >
          {profile.email}
        </a>
      </Container>
    </div>
  )
}
