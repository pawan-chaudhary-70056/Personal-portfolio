import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type AlertTone = 'error' | 'success' | 'info'

const toneClasses: Record<AlertTone, string> = {
  error: 'border-error/30 bg-error/5 text-error',
  success: 'border-success/30 bg-success/5 text-success-ink',
  info: 'border-info/30 bg-info/5 text-info',
}

interface InlineAlertProps {
  tone?: AlertTone
  children: ReactNode
  className?: string
}

export function InlineAlert({ tone = 'error', children, className }: InlineAlertProps) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('border px-3 py-2.5 text-body-sm', toneClasses[tone], className)}
    >
      {children}
    </p>
  )
}
