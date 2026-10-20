import type { ReactNode } from 'react'
import { Container } from '@/components/layout/Container'
import { cn } from '@/utils/cn'

type SectionTone = 'dark' | 'light'

interface SectionProps {
  id: string
  tone?: SectionTone
  labelledBy?: string
  className?: string
  children: ReactNode
}

/**
 * Section wrapper. `data-tone` switches the focus-ring color so keyboard focus
 * stays visible on ivory surfaces (gold is too low-contrast there).
 */
export function Section({ id, tone = 'dark', labelledBy, className, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-tone={tone}
      className={cn(
        'scroll-mt-20 py-20 sm:py-24 lg:py-32',
        tone === 'light' ? 'bg-ivory text-charcoal' : 'bg-charcoal text-ivory',
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  )
}
