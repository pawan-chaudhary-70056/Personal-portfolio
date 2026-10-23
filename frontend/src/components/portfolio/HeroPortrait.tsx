import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { PublicHeroEffect } from '@/@types/portfolio'
import { useFinePointer } from '@/hooks/useFinePointer'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/utils/cn'

export interface HeroPortraitImage {
  url: string
  alt: string
  width: number
  height: number
}

interface HeroPortraitProps {
  portrait: HeroPortraitImage | null
  effect: PublicHeroEffect
  displayName: string
  className?: string
  /** Eager, high-priority loading for the homepage hero only. */
  priority?: boolean
}

/** Restrained motion limits: the admin sliders map to these ceilings. */
const MAX_TILT_DEGREES = 10
const MAX_SHIFT_PX = 8

function initialsFrom(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return initials || 'P'
}

/**
 * The managed hero portrait. Pointer tilt and floating motion are progressive
 * enhancements: coarse pointers, reduced motion, a disabled effect, or zero
 * intensity all produce the same static, accessible presentation.
 */
export function HeroPortrait({
  portrait,
  effect,
  displayName,
  className,
  priority = false,
}: HeroPortraitProps) {
  const reducedMotion = useReducedMotion()
  const finePointer = useFinePointer()
  // Track the URL that failed rather than a boolean, so a new asset gets a
  // fresh chance to load without synchronising state inside an effect.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const animationFrame = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current)
      }
    },
    [],
  )

  const showImage = Boolean(portrait) && failedUrl !== portrait?.url
  const interactive =
    showImage && effect.enabled && finePointer && !reducedMotion && effect.tiltIntensity > 0
  const floating =
    showImage && effect.enabled && effect.floating && !reducedMotion && effect.animationIntensity > 0

  const maxTilt = (effect.tiltIntensity / 100) * MAX_TILT_DEGREES
  const maxShift = (effect.animationIntensity / 100) * MAX_SHIFT_PX
  const floatDuration = 14 - (effect.animationIntensity / 100) * 5
  const floatAmplitude = 2 + (effect.animationIntensity / 100) * 4

  function setTransform(x: number, y: number) {
    const frame = frameRef.current
    if (!frame) {
      return
    }

    frame.style.setProperty('--hero-rotate-y', `${(x * 2 * maxTilt).toFixed(2)}deg`)
    frame.style.setProperty('--hero-rotate-x', `${(-y * 2 * maxTilt).toFixed(2)}deg`)
    frame.style.setProperty('--hero-shift-x', `${(-x * 2 * maxShift).toFixed(1)}px`)
    frame.style.setProperty('--hero-shift-y', `${(-y * 2 * maxShift).toFixed(1)}px`)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!interactive || !frameRef.current) {
      return
    }

    const rect = frameRef.current.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) - 0.5
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) - 0.5

    // Coalesce pointer updates into one frame instead of re-rendering React.
    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current)
    }

    animationFrame.current = requestAnimationFrame(() => setTransform(x, y))
  }

  function resetTransform() {
    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current)
    }

    setTransform(0, 0)
  }

  const frameStyle = {
    '--hero-float-duration': `${floatDuration}s`,
    '--hero-float-amplitude': `${floatAmplitude}px`,
  } as CSSProperties

  return (
    <figure
      className={cn('relative mx-auto w-full max-w-[26rem]', className)}
      style={frameStyle}
      data-hero-portrait={showImage ? 'image' : 'fallback'}
    >
      <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 border border-gold/25" />

      <div className="hero-portrait-frame relative overflow-hidden border border-gold/40 bg-gradient-to-b from-charcoal-800 to-charcoal">
        <div className={cn(floating && 'hero-portrait-float')}>
          <div
            ref={frameRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={resetTransform}
            className={cn('hero-portrait-tilt aspect-4/5 w-full', !interactive && 'hero-portrait-static')}
          >
            {showImage && portrait ? (
              <img
                src={portrait.url}
                alt={portrait.alt}
                width={portrait.width}
                height={portrait.height}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={priority ? 'high' : 'auto'}
                onError={() => setFailedUrl(portrait?.url ?? null)}
                className="size-full object-cover object-[50%_38%]"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_50%_35%,rgba(198,170,120,0.16),transparent_65%)] px-6 text-center">
                <span aria-hidden="true" className="font-serif text-h1 text-gold">
                  {initialsFrom(displayName)}
                </span>
                <span className="text-caption tracking-[0.2em] text-gold/80 uppercase">
                  Portrait
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </figure>
  )
}
