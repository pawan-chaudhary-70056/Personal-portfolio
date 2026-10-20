import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './useReducedMotion'

export type RevealState = 'pending' | 'shown'

const SUPPORTS_INTERSECTION_OBSERVER = typeof IntersectionObserver !== 'undefined'

/**
 * Reveals an element once, when roughly 12% of it enters the viewport
 * (docs/04-animation-guidelines.md §7).
 *
 * Elements are visible by default. They only become "pending" when JavaScript
 * is running and motion is allowed, so content can never stay hidden because
 * observation failed to initialize.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const prefersReducedMotion = useReducedMotion()
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(false)

  const state: RevealState =
    prefersReducedMotion || !SUPPORTS_INTERSECTION_OBSERVER || revealed ? 'shown' : 'pending'

  useEffect(() => {
    if (prefersReducedMotion || !SUPPORTS_INTERSECTION_OBSERVER) {
      return
    }

    const element = ref.current
    if (!element) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [prefersReducedMotion])

  return { ref, state }
}
