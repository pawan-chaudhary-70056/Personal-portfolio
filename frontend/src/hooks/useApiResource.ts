import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/api/client'

export type ResourceStatus = 'loading' | 'ready' | 'error'

interface ResourceState<T> {
  status: ResourceStatus
  data: T | null
  error: string | null
}

interface ResourceOptions {
  errorMessage?: string
  /**
   * Inspects a failure before it becomes an error state. Return true to swallow
   * it (for example when the caller redirects to the sign-in page).
   */
  onError?: (error: unknown) => boolean | Promise<boolean>
}

/**
 * Loads a resource when `fetcher` changes and exposes loading, ready, and error
 * states. State updates happen asynchronously after the request resolves, never
 * synchronously during the effect.
 */
export function useApiResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  { errorMessage = 'Something went wrong. Please try again.', onError }: ResourceOptions = {},
) {
  const [state, setState] = useState<ResourceState<T>>({
    status: 'loading',
    data: null,
    error: null,
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    fetcher(controller.signal)
      .then((result) => {
        if (active) {
          setState({ status: 'ready', data: result, error: null })
        }
      })
      .catch(async (error: unknown) => {
        if (!active || controller.signal.aborted) {
          return
        }

        if (onError && (await onError(error))) {
          return
        }

        if (!active) {
          return
        }

        setState({
          status: 'error',
          data: null,
          error: error instanceof ApiError ? error.message : errorMessage,
        })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [fetcher, version, errorMessage, onError])

  const reload = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading', error: null }))
    setVersion((current) => current + 1)
  }, [])

  return { ...state, reload }
}
