import { useEffect, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function getInitialPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/**
 * Tracks `prefers-reduced-motion: reduce`.
 * Animated components use this to render their final state immediately.
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialPreference)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}
