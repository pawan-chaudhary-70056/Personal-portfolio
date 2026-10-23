import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

type ButtonVariant = 'primary' | 'outline'
type ButtonTone = 'dark' | 'light'

interface ButtonLinkBaseProps {
  children: ReactNode
  variant?: ButtonVariant
  /** Surface the button sits on, so the outline variant stays visible. */
  tone?: ButtonTone
  className?: string
}

type ButtonLinkDestination =
  | { to: string; href?: undefined; external?: undefined }
  | { href: string; to?: undefined; external?: boolean }

export type ButtonLinkProps = ButtonLinkBaseProps & ButtonLinkDestination

const variantClasses: Record<ButtonVariant, Record<ButtonTone, string>> = {
  // Gold (#C6AA78) with charcoal text: 8.48:1 contrast on any surface.
  primary: {
    dark: 'bg-gold text-charcoal hover:bg-[#d3bb8d] active:bg-[#b99e6c]',
    light: 'bg-gold text-charcoal hover:bg-[#d3bb8d] active:bg-[#b99e6c]',
  },
  outline: {
    dark: 'border border-ivory/25 text-ivory hover:border-ivory/60 hover:bg-ivory/5 active:bg-ivory/10',
    light:
      'border border-charcoal/25 text-charcoal hover:border-charcoal/60 hover:bg-charcoal/5 active:bg-charcoal/10',
  },
}

export function ButtonLink({
  children,
  variant = 'primary',
  tone = 'dark',
  className,
  ...destination
}: ButtonLinkProps) {
  const classes = cn(
    'inline-flex min-h-12 items-center justify-center gap-2 px-6 text-body-sm font-medium tracking-wide',
    'transition-[background-color,border-color,color] duration-150 ease-standard',
    variantClasses[variant][tone],
    className,
  )

  if (destination.to !== undefined) {
    return (
      <Link to={destination.to} className={classes}>
        {children}
      </Link>
    )
  }

  const { href, external } = destination
  const externalProps = external ? { target: '_blank', rel: 'noreferrer noopener' } : {}

  return (
    <a href={href} {...externalProps} className={classes}>
      {children}
    </a>
  )
}
