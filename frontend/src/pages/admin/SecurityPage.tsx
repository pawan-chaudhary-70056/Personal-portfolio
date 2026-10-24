import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { AdminMfaStatus, MfaSetup } from '@/@types/admin'
import { ApiError } from '@/api/client'
import {
  disableMfa,
  enableMfa,
  fetchMfaStatus,
  regenerateRecoveryCodes,
  startMfaSetup,
} from '@/api/mfa.api'
import { useSession } from '@/auth/useSession'
import { FormField } from '@/components/forms/FormField'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { inputClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDateTime } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'

function RecoveryCodePanel({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false)

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be denied; the codes remain selectable below.
    }
  }

  return (
    <div className="mt-6 border border-gold/60 bg-gold/10 p-5">
      <h2 className="text-h3">Save your recovery codes</h2>
      <p className="mt-2 max-w-2xl text-body-sm text-charcoal/80">
        Each code signs you in once if you lose access to your authenticator app. They are shown
        only now — storing them in a password manager is recommended.
      </p>

      <ul className="mt-4 grid gap-2 font-mono text-body-sm sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code} className="border border-charcoal/15 bg-ivory px-3 py-2 tracking-[0.12em]">
            {code}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => void copyCodes()}
        className="mt-4 min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
      >
        {copied ? 'Copied' : 'Copy all codes'}
      </button>
    </div>
  )
}

export function AdminSecurityPage() {
  const { signOutAndClear } = useSession()

  const fetcher = useCallback((signal: AbortSignal) => fetchMfaStatus(signal), [])
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
  const { status, data, error, reload } = useApiResource<AdminMfaStatus>(fetcher, {
    errorMessage: 'Your security settings could not be loaded. Please try again.',
    onError: handleUnauthorized,
  })

  const [setup, setSetup] = useState<MfaSetup | null>(null)
  const [busy, setBusy] = useState<'setup' | 'enable' | 'disable' | 'regenerate' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  const [enableCode, setEnableCode] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')

  useEffect(() => {
    setPageMetadata({
      title: 'Security — Portfolio admin',
      description: 'Two-factor authentication and recovery codes for your account.',
    })
  }, [])

  async function beginSetup() {
    setBusy('setup')
    setActionError(null)
    setNotice(null)
    setRecoveryCodes(null)

    try {
      setSetup(await startMfaSetup())
    } catch (caught) {
      if (await handleUnauthorized(caught)) return
      setActionError(
        caught instanceof ApiError ? caught.message : 'The setup could not be started.',
      )
    } finally {
      setBusy(null)
    }
  }

  async function handleEnable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('enable')
    setActionError(null)
    setNotice(null)

    try {
      const codes = await enableMfa(enableCode.trim())
      setRecoveryCodes(codes)
      setSetup(null)
      setEnableCode('')
      setNotice('Two-factor authentication is enabled.')
      reload()
    } catch (caught) {
      if (await handleUnauthorized(caught)) return
      setActionError(caught instanceof ApiError ? caught.message : 'The code was not accepted.')
    } finally {
      setBusy(null)
    }
  }

  async function handleRegenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('regenerate')
    setActionError(null)
    setNotice(null)

    try {
      const codes = await regenerateRecoveryCodes(password, code.trim())
      setRecoveryCodes(codes)
      setPassword('')
      setCode('')
      setNotice('New recovery codes generated. The old codes no longer work.')
      reload()
    } catch (caught) {
      if (await handleUnauthorized(caught)) return
      setActionError(caught instanceof ApiError ? caught.message : 'The codes could not be regenerated.')
    } finally {
      setBusy(null)
    }
  }

  async function handleDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('disable')
    setActionError(null)
    setNotice(null)

    try {
      await disableMfa(password, code.trim())
      setPassword('')
      setCode('')
      setNotice('Two-factor authentication is disabled.')
      setRecoveryCodes(null)
      reload()
    } catch (caught) {
      if (await handleUnauthorized(caught)) return
      setActionError(caught instanceof ApiError ? caught.message : 'It could not be disabled.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <header>
        <p className="eyebrow text-gold-ink">Security</p>
        <h1 className="mt-3 text-h2">Two-factor authentication</h1>
        <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
          Add a time-based code from an authenticator app to your sign-in. Recovery codes cover a
          lost or replaced device. Changes apply to this account only.
        </p>
      </header>

      <div aria-live="polite" className="mt-6 space-y-3">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
        {actionError ? <InlineAlert tone="error">{actionError}</InlineAlert> : null}
      </div>

      {status === 'loading' && !data ? (
        <p role="status" className="mt-8 text-body-sm text-muted-light">
          Loading security settings…
        </p>
      ) : status === 'error' || !data ? (
        <div className="mt-8">
          <InlineAlert tone="error">{error ?? 'Your security settings could not be loaded.'}</InlineAlert>
        </div>
      ) : (
        <>
          <section aria-labelledby="status-heading" className="mt-10 border border-charcoal/15 p-5">
            <h2 id="status-heading" className="text-caption tracking-[0.14em] text-muted-light uppercase">
              Status
            </h2>
            <p className="mt-2 font-serif text-h3 text-charcoal">
              {data.enabled ? 'Enabled' : 'Not enabled'}
            </p>
            <p className="mt-2 text-body-sm text-charcoal/70">
              {data.enabled
                ? `Since ${data.enabledAt ? formatDateTime(data.enabledAt) : 'enrolment'}. ${data.recoveryCodesRemaining} recovery ${
                    data.recoveryCodesRemaining === 1 ? 'code' : 'codes'
                  } remaining.`
                : 'Sign-in requires only your password. Enable the second factor to require a code as well.'}
            </p>
          </section>

          {recoveryCodes ? <RecoveryCodePanel codes={recoveryCodes} /> : null}

          {!data.enabled ? (
            <section aria-labelledby="setup-heading" className="mt-10">
              <h2 id="setup-heading" className="text-h3">
                Set up an authenticator app
              </h2>

              {!setup ? (
                <div className="mt-4">
                  <p className="max-w-2xl text-body-sm text-charcoal/70">
                    Use any TOTP app (1Password, Authy, Google Authenticator, or similar). You will
                    enter a six-digit code once to confirm the device works.
                  </p>
                  <button
                    type="button"
                    onClick={() => void beginSetup()}
                    disabled={busy === 'setup'}
                    className="mt-5 min-h-12 bg-gold px-6 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d] disabled:opacity-60"
                  >
                    {busy === 'setup' ? 'Preparing…' : 'Set up two-factor authentication'}
                  </button>
                </div>
              ) : (
                <div className="mt-4 border border-charcoal/15 p-5">
                  <p className="text-body-sm text-charcoal/70">
                    Add this account manually in your app, or paste the setup URI if it accepts one.
                  </p>

                  <div className="mt-4">
                    <p className="text-caption tracking-[0.14em] text-muted-light uppercase">
                      Account
                    </p>
                    <p className="mt-1 text-body-sm text-charcoal">
                      {setup.issuer} ({setup.digits} digits, {setup.periodSeconds}s)
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-caption tracking-[0.14em] text-muted-light uppercase">
                      Secret key
                    </p>
                    <p className="mt-1 break-all border border-charcoal/15 bg-charcoal/[0.03] p-3 font-mono text-body-sm">
                      {setup.secret}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-caption tracking-[0.14em] text-muted-light uppercase">
                      Setup URI
                    </p>
                    <p className="mt-1 break-all border border-charcoal/15 bg-charcoal/[0.03] p-3 font-mono text-caption text-charcoal/70">
                      {setup.otpauthUri}
                    </p>
                  </div>

                  <form onSubmit={handleEnable} className="mt-6 max-w-xs space-y-4" noValidate>
                    <FormField
                      id="enable-code"
                      label="Code from the app"
                      required
                      hint="Six digits, renewed every 30 seconds."
                    >
                      <input
                        id="enable-code"
                        name="code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        maxLength={32}
                        value={enableCode}
                        onChange={(event) => setEnableCode(event.target.value)}
                        className={inputClassName}
                      />
                    </FormField>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={busy === 'enable' || enableCode.trim().length < 6}
                        className="min-h-11 bg-gold px-5 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d] disabled:opacity-60"
                      >
                        {busy === 'enable' ? 'Enabling…' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSetup(null)
                          setEnableCode('')
                        }}
                        className="min-h-11 border border-charcoal/30 px-5 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </section>
          ) : (
            <>
              <section aria-labelledby="regenerate-heading" className="mt-12 border-t border-charcoal/15 pt-10">
                <h2 id="regenerate-heading" className="text-h3">
                  Regenerate recovery codes
                </h2>
                <p className="mt-2 max-w-2xl text-body-sm text-charcoal/70">
                  Replaces every unused code. Confirm with your password and a current code.
                </p>

                <form onSubmit={handleRegenerate} className="mt-5 grid max-w-xl gap-4 sm:grid-cols-2" noValidate>
                  <FormField id="regenerate-password" label="Password" required>
                    <input
                      id="regenerate-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField id="regenerate-code" label="Authenticator code" required>
                    <input
                      id="regenerate-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      className={inputClassName}
                    />
                  </FormField>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={
                        busy === 'regenerate' ||
                        password.length === 0 ||
                        code.trim().length !== 6
                      }
                      className="min-h-11 border border-charcoal/30 px-5 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-60"
                    >
                      {busy === 'regenerate' ? 'Regenerating…' : 'Generate new codes'}
                    </button>
                  </div>
                </form>
              </section>

              <section aria-labelledby="disable-heading" className="mt-12 border-t border-charcoal/15 pt-10">
                <h2 id="disable-heading" className="text-h3">
                  Disable two-factor authentication
                </h2>
                <p className="mt-2 max-w-2xl text-body-sm text-charcoal/70">
                  Sign-in will require only your password afterwards. Unused recovery codes are
                  deleted, and your other sessions are signed out.
                </p>

                <form onSubmit={handleDisable} className="mt-5 grid max-w-xl gap-4 sm:grid-cols-2" noValidate>
                  <FormField id="disable-password" label="Password" required>
                    <input
                      id="disable-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField
                    id="disable-code"
                    label="Code or recovery code"
                    required
                    hint="Authenticator code or one unused recovery code."
                  >
                    <input
                      id="disable-code"
                      type="text"
                      autoComplete="one-time-code"
                      required
                      maxLength={32}
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      className={inputClassName}
                    />
                  </FormField>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={busy === 'disable' || password.length === 0 || code.trim().length < 6}
                      className="min-h-11 bg-error px-5 text-body-sm font-medium text-white transition-colors duration-150 ease-standard hover:bg-[#9c1e14] disabled:opacity-60"
                    >
                      {busy === 'disable' ? 'Disabling…' : 'Disable two-factor authentication'}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
        </>
      )}
    </>
  )
}
