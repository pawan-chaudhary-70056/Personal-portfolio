import { useEffect, useState } from 'react'

const FINE_POINTER_QUERY = '(pointer: fine)'

function getInitialPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(FINE_POINTER_QUERY).matches
}

/**
 * True on devices with a precise pointer (mouse, trackpad). Touch-first devices
 * get the static presentation instead of a tilt that can never be triggered.
 */
export function useFinePointer(): boolean {
  const [hasFinePointer, setHasFinePointer] = useState(getInitialPreference)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(FINE_POINTER_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setHasFinePointer(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return hasFinePointer
}
