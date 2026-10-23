import type { ReactNode } from 'react'
import { Container } from '@/components/layout/Container'

interface PageHeaderProps {
  eyebrow: string
  title: string
  intro?: string | null
  actions?: ReactNode
  meta?: ReactNode
}

/**
 * Editorial page opener for public sub-pages. It owns the offset that clears
 * the fixed header and the single `h1` for the route.
 */
export function PageHeader({ eyebrow, title, intro, actions, meta }: PageHeaderProps) {
  return (
    <header
      data-tone="dark"
      className="border-b border-ivory/10 bg-charcoal pt-32 pb-14 text-ivory sm:pt-40 sm:pb-20"
    >
      <Container>
        <p className="eyebrow text-gold">{eyebrow}</p>
        <h1 className="mt-6 max-w-4xl text-h1">{title}</h1>
        {intro ? <p className="mt-6 max-w-2xl text-body-lg text-ivory/70">{intro}</p> : null}
        {actions ? <div className="mt-10 flex flex-wrap gap-4">{actions}</div> : null}
        {meta ? <div className="mt-12">{meta}</div> : null}
      </Container>
    </header>
  )
}
