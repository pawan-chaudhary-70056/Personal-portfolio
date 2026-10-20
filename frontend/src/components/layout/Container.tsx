import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type ContainerWidth = 'reading' | 'content' | 'wide'

interface ContainerProps {
  children: ReactNode
  width?: ContainerWidth
  className?: string
}

const widthClasses: Record<ContainerWidth, string> = {
  reading: 'max-w-reading',
  content: 'max-w-content',
  wide: 'max-w-wide',
}

export function Container({ children, width = 'content', className }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full px-6 sm:px-8 lg:px-10', widthClasses[width], className)}>
      {children}
    </div>
  )
}
