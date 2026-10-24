import { useCallback, useEffect, useState } from 'react'
import type {
  AdminHomepage,
  AdminMedia,
  HeroDraftPayload,
  HomepageLayoutPayload,
} from '@/@types/admin'
import { ApiError } from '@/api/client'
import {
  getAdminHomepage,
  publishHomepage,
  removeHeroPortrait,
  selectHeroPortrait,
  updateHomepageDraft,
  uploadHeroPortrait,
} from '@/api/homepage.api'
import { getProfile } from '@/api/profile.api'
import { useSession } from '@/auth/useSession'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { MediaPicker } from '@/components/admin/MediaPicker'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { HeroPortraitForm, type HeroBusyAction } from '@/components/forms/HeroPortraitForm'
import { HomepageSectionsForm } from '@/components/forms/HomepageSectionsForm'
import { useApiResource } from '@/hooks/useApiResource'
import { toFieldErrors } from '@/utils/apiErrors'
import { setPageMetadata } from '@/utils/metadata'

interface HomepageData {
  homepage: AdminHomepage
  displayName: string
}

export function AdminHomepagePage() {
  const { signOutAndClear } = useSession()

  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<HeroBusyAction>(null)
  // The object URL is created in the event handler alongside its file, and the
  // cleanup effect only revokes it, so no state is set from an effect.
  const [selection, setSelection] = useState<{ file: File; url: string } | null>(null)
  const [formVersion, setFormVersion] = useState(0)
  const [sectionsVersion, setSectionsVersion] = useState(0)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    setPageMetadata({
      title: 'Homepage — Portfolio admin',
      description:
        'Manage the homepage hero, section order and visibility, and featured projects.',
    })
  }, [])

  useEffect(() => {
    if (!selection) {
      return
    }

    return () => URL.revokeObjectURL(selection.url)
  }, [selection])

  const fetcher = useCallback(async (signal: AbortSignal): Promise<HomepageData> => {
    const [homepage, profile] = await Promise.all([
      getAdminHomepage(signal),
      getProfile(signal),
    ])

    return {
      homepage,
      displayName: profile?.displayName ?? 'Portfolio owner',
    }
  }, [])

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

  const {
    status,
    data,
    error: loadError,
    reload,
  } = useApiResource<HomepageData>(fetcher, {
    errorMessage: 'The homepage settings could not be loaded. Please try again.',
    onError: handleUnauthorized,
  })

  function handleSelectFile(file: File | null) {
    setActionError(null)
    setFieldErrors({})

    if (!file) {
      setSelection(null)
      return
    }

    const limits = data?.homepage.limits

    if (limits && file.type && !limits.allowedTypes.includes(file.type)) {
      setSelection(null)
      setActionError('Choose a JPEG, PNG, or WebP image.')
      return
    }

    if (limits && file.size > limits.maxBytes) {
      const megabytes = Math.round((limits.maxBytes / (1024 * 1024)) * 10) / 10
      setSelection(null)
      setActionError(`Images must be ${megabytes} MB or smaller.`)
      return
    }

    setSelection({ file, url: URL.createObjectURL(file) })
  }

  async function run(
    kind: Exclude<HeroBusyAction, null>,
    action: () => Promise<unknown>,
    message: string,
    { resetForm = true }: { resetForm?: boolean } = {},
  ) {
    setBusy(kind)
    setActionError(null)
    setNotice(null)
    setFieldErrors({})

    try {
      await action()
      setNotice(message)

      // Re-mount the form from the saved state, except after an upload where the
      // administrator may already be typing alt text for the new image.
      if (resetForm) {
        setFormVersion((version) => version + 1)
      }

      reload()
    } catch (caught) {
      if (await handleUnauthorized(caught)) {
        return
      }

      if (caught instanceof ApiError) {
        setActionError(caught.message)
        setFieldErrors(toFieldErrors(caught.details))
      } else {
        setActionError('The change could not be saved. Please try again.')
      }
    } finally {
      setBusy(null)
    }
  }

  function handleUpload() {
    if (!selection) {
      return
    }

    const file = selection.file

    void run(
      'upload',
      async () => {
        await uploadHeroPortrait(file)
        setSelection(null)
      },
      'Portrait uploaded as a draft. Publish when it looks right.',
      { resetForm: false },
    )
  }

  function handleChoosePortrait(asset: AdminMedia) {
    // A pending local file would otherwise hide the chosen library image.
    setSelection(null)
    setPickerOpen(false)

    void run(
      'select',
      () => selectHeroPortrait(asset.id),
      'Library image selected as the draft portrait. Publish when it looks right.',
    )
  }

  function handleSave(payload: HeroDraftPayload) {
    void run(
      'save',
      () => updateHomepageDraft(payload),
      'Draft saved. Publish to update the public homepage.',
    )
  }

  function handleSaveSections(payload: HomepageLayoutPayload) {
    void run(
      'sections',
      async () => {
        await updateHomepageDraft(payload)
        setSectionsVersion((version) => version + 1)
      },
      'Homepage layout saved as a draft. Publish to apply it.',
      { resetForm: false },
    )
  }

  function handlePublish() {
    void run('publish', async () => {
      await publishHomepage()
      setSectionsVersion((version) => version + 1)
    }, 'Changes published. The public homepage now shows this version.')
  }

  function confirmRemove() {
    setRemoveOpen(false)
    void run(
      'remove',
      removeHeroPortrait,
      'Draft portrait removed. Publish to restore the fallback on the public homepage.',
    )
  }

  if (status === 'loading' && !data) {
    return (
      <p role="status" className="text-body-sm text-muted-light">
        Loading homepage settings…
      </p>
    )
  }

  if (status === 'error' || !data) {
    return (
      <div className="max-w-xl">
        <InlineAlert tone="error">
          {loadError ?? 'The homepage settings could not be loaded.'}
        </InlineAlert>
        <button
          type="button"
          onClick={reload}
          className="mt-6 min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
        >
          Retry
        </button>
      </div>
    )
  }

  const { homepage, displayName } = data
  const error = actionError

  return (
    <>
      <header>
        <p className="eyebrow text-gold-ink">Content</p>
        <h1 className="mt-3 text-h2">Homepage</h1>
        <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
          Manage the hero portrait and effect, the order and visibility of the homepage
          sections, and which published projects are featured. Draft changes stay private
          until you publish.
        </p>
      </header>

      <div aria-live="polite" className="mt-6 space-y-3">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
        {error ? (
          <InlineAlert tone="error">
            {error}{' '}
            <button type="button" onClick={reload} className="underline">
              Retry
            </button>
          </InlineAlert>
        ) : null}
      </div>

      <HeroPortraitForm
        key={`hero-${formVersion}`}
        homepage={homepage}
        displayName={displayName}
        busy={busy}
        formError={null}
        fieldErrors={fieldErrors}
        selectedFile={selection?.file ?? null}
        previewUrl={selection?.url ?? null}
        onSelectFile={handleSelectFile}
        onChooseFromLibrary={() => setPickerOpen(true)}
        onUpload={handleUpload}
        onSave={handleSave}
        onPublish={handlePublish}
        onRemove={() => setRemoveOpen(true)}
      />

      <HomepageSectionsForm
        key={`sections-${sectionsVersion}`}
        homepage={homepage}
        busy={busy === 'sections'}
        formError={null}
        fieldErrors={fieldErrors}
        onSave={handleSaveSections}
      />

      <MediaPicker
        open={pickerOpen}
        selectedId={homepage.draft.portrait?.id ?? null}
        onClose={() => setPickerOpen(false)}
        onSelect={handleChoosePortrait}
      />

      <ConfirmDialog
        open={removeOpen}
        title="Remove the draft portrait?"
        description="The draft will return to the built-in monogram fallback. The public homepage keeps showing the current portrait until you publish."
        confirmLabel="Remove portrait"
        busy={busy === 'remove'}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveOpen(false)}
      />
    </>
  )
}
