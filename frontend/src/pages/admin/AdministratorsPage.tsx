import { useCallback, useEffect, useState } from 'react'
import type { AdminAccount, AdminRole, AdministratorListResponse } from '@/@types/admin'
import { ApiError } from '@/api/client'
import {
  createAdministrator,
  listAdministrators,
  resetAdministratorPassword,
  updateAdministrator,
} from '@/api/administrators.api'
import { useSession } from '@/auth/useSession'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { inputClassName, selectClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDateTime } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'

const emptyForm = { name: '', email: '', password: '', role: 'EDITOR' as AdminRole }

export function AdminAdministratorsPage() {
  const { admin, signOutAndClear } = useSession()

  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [resetTarget, setResetTarget] = useState<AdminAccount | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  const [deactivateTarget, setDeactivateTarget] = useState<AdminAccount | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    setPageMetadata({
      title: 'Administrators — Portfolio admin',
      description: 'Manage administrator accounts and roles.',
    })
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

  const { status, data, error: loadError, reload } = useApiResource<AdministratorListResponse>(
    listAdministrators,
    {
      errorMessage: 'Administrator accounts could not be loaded.',
      onError: handleUnauthorized,
    },
  )

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setCreating(true)
    setNotice(null)
    setActionError(null)

    try {
      await createAdministrator(form)
      setNotice(`“${form.name}” can now sign in.`)
      setForm(emptyForm)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError ? caught.message : 'The account could not be created.',
        )
      }
    } finally {
      setCreating(false)
    }
  }

  async function changeRole(account: AdminAccount, role: AdminRole) {
    setBusyId(account.id)
    setNotice(null)
    setActionError(null)

    try {
      await updateAdministrator(account.id, { role })
      setNotice(`${account.name} is now ${role === 'OWNER' ? 'an owner' : 'an editor'}.`)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError ? caught.message : 'The role could not be changed.',
        )
      }
      reload()
    } finally {
      setBusyId(null)
    }
  }

  async function toggleActive(account: AdminAccount) {
    setBusyId(account.id)
    setNotice(null)
    setActionError(null)

    try {
      await updateAdministrator(account.id, { isActive: !account.isActive })
      setNotice(
        account.isActive
          ? `${account.name} can no longer sign in.`
          : `${account.name} can sign in again.`,
      )
      setDeactivateTarget(null)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError ? caught.message : 'The account could not be updated.',
        )
      }
      setDeactivateTarget(null)
    } finally {
      setBusyId(null)
      setDeactivating(false)
    }
  }

  async function confirmResetPassword() {
    if (!resetTarget) return

    setResetting(true)
    setNotice(null)
    setActionError(null)

    try {
      await resetAdministratorPassword(resetTarget.id, resetPassword)
      setNotice(`The password for ${resetTarget.name} was reset. Their sessions were revoked.`)
      setResetTarget(null)
      setResetPassword('')
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError ? caught.message : 'The password could not be reset.',
        )
      }
    } finally {
      setResetting(false)
    }
  }

  const accounts = data?.administrators ?? []
  const loading = status === 'loading'
  const error = actionError ?? (status === 'error' ? loadError : null)

  return (
    <>
      <header>
        <p className="eyebrow text-gold-ink">Security</p>
        <h1 className="mt-3 text-h2">Administrators</h1>
        <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
          Owners can manage accounts, site settings, sessions, health, analytics, and the activity
          log. Editors manage portfolio content, media, and the inbox. At least one active owner is
          always required.
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

      <section aria-labelledby="new-admin-heading" className="mt-8 border border-charcoal/15 p-5">
        <h2 id="new-admin-heading" className="text-h3 text-charcoal">
          Add an administrator
        </h2>
        <form onSubmit={(event) => void handleCreate(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="admin-name" className="block text-caption tracking-[0.14em] text-muted-light uppercase">
              Name
            </label>
            <input
              id="admin-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              minLength={2}
              maxLength={120}
              className={`${inputClassName} mt-2`}
            />
          </div>
          <div>
            <label htmlFor="admin-email" className="block text-caption tracking-[0.14em] text-muted-light uppercase">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
              className={`${inputClassName} mt-2`}
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-caption tracking-[0.14em] text-muted-light uppercase">
              Initial password
            </label>
            <input
              id="admin-password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
              minLength={12}
              autoComplete="new-password"
              className={`${inputClassName} mt-2`}
            />
            <p className="mt-1 text-caption text-muted-light">At least 12 characters.</p>
          </div>
          <div>
            <label htmlFor="admin-role" className="block text-caption tracking-[0.14em] text-muted-light uppercase">
              Role
            </label>
            <select
              id="admin-role"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as AdminRole })}
              className={`${selectClassName} mt-2`}
            >
              <option value="EDITOR">Editor</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="min-h-11 bg-gold px-5 py-3 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d] disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </section>

      <div className="mt-8">
        {loading && !data ? (
          <p role="status" className="text-body-sm text-muted-light">
            Loading administrators…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <caption className="sr-only">
                Administrator accounts with role, status, last sign-in, and actions
              </caption>
              <thead>
                <tr className="border-b border-charcoal/20">
                  <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                    Account
                  </th>
                  <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                    Role
                  </th>
                  <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                    Last sign-in
                  </th>
                  <th scope="col" className="py-3 text-caption tracking-[0.14em] text-muted-light uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b border-charcoal/10 align-top">
                    <td className="py-4 pr-4">
                      <p className="text-body-sm font-medium text-charcoal">
                        {account.name}
                        {account.id === admin?.id ? (
                          <span className="ml-2 text-caption text-muted-light">(you)</span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-caption text-muted-light">{account.email}</p>
                      <p className="mt-1 text-caption text-muted-light">
                        {account.isActive ? 'Active' : 'Deactivated'}
                      </p>
                    </td>
                    <td className="py-4 pr-4">
                      <label className="sr-only" htmlFor={`role-${account.id}`}>
                        Role for {account.name}
                      </label>
                      <select
                        id={`role-${account.id}`}
                        value={account.role}
                        disabled={busyId === account.id}
                        onChange={(event) =>
                          void changeRole(account, event.target.value as AdminRole)
                        }
                        className={`${selectClassName} max-w-36`}
                      >
                        <option value="EDITOR">Editor</option>
                        <option value="OWNER">Owner</option>
                      </select>
                    </td>
                    <td className="py-4 pr-4 text-caption text-muted-light">
                      {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : 'Never'}
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(account)
                            setResetPassword('')
                          }}
                          className="text-caption text-charcoal underline underline-offset-4"
                        >
                          Reset password
                        </button>
                        <button
                          type="button"
                          disabled={busyId === account.id || account.id === admin?.id}
                          onClick={() =>
                            account.isActive
                              ? setDeactivateTarget(account)
                              : void toggleActive(account)
                          }
                          className="text-caption text-error underline underline-offset-4 disabled:opacity-40"
                        >
                          {account.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Deactivate this account?"
        description={
          deactivateTarget
            ? `${deactivateTarget.name} will be signed out immediately and cannot sign in again until reactivated.`
            : ''
        }
        confirmLabel="Deactivate"
        destructive
        busy={deactivating || busyId !== null}
        onConfirm={() => {
          if (deactivateTarget) {
            setDeactivating(true)
            void toggleActive(deactivateTarget)
          }
        }}
        onCancel={() => setDeactivateTarget(null)}
      />

      {resetTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/70 p-4"
        >
          <div className="w-full max-w-md border border-charcoal/20 bg-ivory p-6 text-charcoal">
        <form
          className=""
          onSubmit={(event) => {
            event.preventDefault()
            void confirmResetPassword()
          }}
        >
          <h2 id="reset-password-title" className="text-h3">
            Reset password
          </h2>
          <p className="mt-3 text-body-sm text-charcoal/75">
            Set a new password for {resetTarget?.name}. Every existing session for that account is
            revoked.
          </p>
          <label htmlFor="reset-password" className="mt-4 block text-caption tracking-[0.14em] text-muted-light uppercase">
            New password
          </label>
          <input
            id="reset-password"
            type="password"
            value={resetPassword}
            onChange={(event) => setResetPassword(event.target.value)}
            minLength={12}
            required
            autoComplete="new-password"
            className={`${inputClassName} mt-2`}
          />

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              disabled={resetting}
              className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetting || resetPassword.length < 12}
              className="min-h-11 bg-gold px-4 text-body-sm font-medium text-charcoal disabled:opacity-60"
            >
              {resetting ? 'Saving…' : 'Reset password'}
            </button>
          </div>
        </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
