import type { CSSProperties, ReactNode } from 'react'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { cn } from '@/utils/cn'

interface RevealProps {
  children: ReactNode
  /** Stagger delay in milliseconds. Keep values small (0–200). */
  delay?: number
  className?: string
}

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const { ref, state } = useScrollReveal<HTMLDivElement>()
  const style = { '--reveal-delay': `${delay}ms` } as CSSProperties

  return (
    <div ref={ref} data-reveal={state} style={style} className={cn(className)}>
      {children}
    </div>
  )
}
