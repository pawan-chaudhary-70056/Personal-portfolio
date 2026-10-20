import { useEffect, useState } from 'react'

/**
 * Reports whether the page has scrolled beyond `threshold` pixels.
 * Used by the header to switch from transparent to solid.
 */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > threshold)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return scrolled
}
