import { useCallback, useEffect, useState } from 'react'
import type { AdminProfile, ProfilePayload } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { getProfile, updateProfile } from '@/api/profile.api'
import { useSession } from '@/auth/useSession'
import { ErrorState } from '@/components/feedback/ErrorState'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { LoadingState } from '@/components/feedback/LoadingState'
import { ProfileForm } from '@/components/forms/ProfileForm'
import { useApiResource } from '@/hooks/useApiResource'
import { toFieldErrors } from '@/utils/apiErrors'
import { setPageMetadata } from '@/utils/metadata'

export function AdminProfilePage() {
  const { signOutAndClear } = useSession()

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setPageMetadata({
      title: 'Profile — Portfolio admin',
      description: 'Manage the public professional profile.',
    })
  }, [])

  const fetcher = useCallback((signal: AbortSignal) => getProfile(signal), [])

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

  const { status, data, error, reload } = useApiResource<AdminProfile | null>(fetcher, {
    errorMessage: 'Could not load the profile. Please try again.',
    onError: handleUnauthorized,
  })

  async function handleSubmit(payload: ProfilePayload) {
    setBusy(true)
    setNotice(null)
    setFormError(null)
    setFieldErrors({})

    try {
      await updateProfile(payload)
      setNotice('Profile saved and published.')
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        if (caught instanceof ApiError) {
          setFormError(caught.message)
          setFieldErrors(toFieldErrors(caught.details))
        } else {
          setFormError('The profile could not be saved. Please try again.')
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
        <h1 className="mt-3 text-h2">Profile</h1>
        <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
          The public professional introduction: name, headline, biography, approved links,
          and portrait. Only the fields on this page are published; account credentials stay
          separate.
        </p>
      </header>

      <div aria-live="polite" className="mt-6 space-y-3">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
        {status === 'ready' && !data ? (
          <InlineAlert tone="info">
            No public profile exists yet. Save the required fields to create it.
          </InlineAlert>
        ) : null}
      </div>

      {status === 'loading' && !data && !error ? (
        <div className="mt-10">
          <LoadingState message="Loading profile…" />
        </div>
      ) : error ? (
        <div className="mt-10">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : (
        <ProfileForm
          key={data?.updatedAt ?? 'new-profile'}
          profile={data}
          busy={busy}
          formError={formError}
          fieldErrors={fieldErrors}
          onSubmit={(payload) => void handleSubmit(payload)}
        />
      )}
    </>
  )
}
