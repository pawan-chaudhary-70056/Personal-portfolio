import { useCallback, useEffect, useState } from 'react'
import type { AdminSiteSettings, SiteSettingsPayload } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { getSiteSettings, updateSiteSettings } from '@/api/settings.api'
import { useSession } from '@/auth/useSession'
import { ErrorState } from '@/components/feedback/ErrorState'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { LoadingState } from '@/components/feedback/LoadingState'
import { SiteSettingsForm } from '@/components/forms/SiteSettingsForm'
import { useApiResource } from '@/hooks/useApiResource'
import { toFieldErrors } from '@/utils/apiErrors'
import { setPageMetadata } from '@/utils/metadata'

export function AdminSettingsPage() {
  const { signOutAndClear } = useSession()

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setPageMetadata({
      title: 'Site settings — Portfolio admin',
      description: 'Manage the public site title, description, and social metadata.',
    })
  }, [])

  const fetcher = useCallback((signal: AbortSignal) => getSiteSettings(signal), [])

  const handleUnauthorized = useCallback(
    async (caught: unknown) => {
      if (caught instanceof ApiError && caught.status === 401) {
        await signOutAndClear()
        return true
      }
      return false
    },
    [signOutAndClear],
  )

  const { status, data, error, reload } = useApiResource<AdminSiteSettings>(fetcher, {
    errorMessage: 'Could not load the site settings. Please try again.',
    onError: handleUnauthorized,
  })

  async function handleSubmit(payload: SiteSettingsPayload) {
    setBusy(true)
    setNotice(null)
    setFormError(null)
    setFieldErrors({})

    try {
      await updateSiteSettings(payload)
      setNotice('Site settings saved. The public metadata now uses these values.')
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        if (caught instanceof ApiError) {
          setFormError(caught.message)
          setFieldErrors(toFieldErrors(caught.details))
        } else {
          setFormError('The site settings could not be saved. Please try again.')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header>
        <p className="eyebrow text-gold-ink">Content</p>
        <h1 className="mt-3 text-h2">Site settings</h1>
        <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
          The approved public metadata: site title, default description, canonical URL, and
          the social sharing image. Account credentials, server secrets, and infrastructure
          configuration are intentionally outside this page.
        </p>
      </header>

      <div aria-live="polite" className="mt-6 space-y-3">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
      </div>

      {status === 'loading' && !data && !error ? (
        <div className="mt-10">
          <LoadingState message="Loading site settings…" />
        </div>
      ) : error ? (
        <div className="mt-10">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : data ? (
        <SiteSettingsForm
          key={data.updatedAt ?? 'new-settings'}
          settings={data}
          busy={busy}
          formError={formError}
          fieldErrors={fieldErrors}
          onSubmit={(payload) => void handleSubmit(payload)}
        />
      ) : null}
    </>
  )
}
