import type { AdminMfaStatus, MfaSetup } from '@/@types/admin'
import { apiRequest } from '@/api/client'

export async function fetchMfaStatus(signal?: AbortSignal): Promise<AdminMfaStatus> {
  const response = await apiRequest<{ mfa: AdminMfaStatus }>('/admin/mfa', { signal })
  return response.mfa
}

export async function startMfaSetup(): Promise<MfaSetup> {
  const response = await apiRequest<{ setup: MfaSetup }>('/admin/mfa/setup', { method: 'POST' })
  return response.setup
}

export async function enableMfa(code: string): Promise<string[]> {
  const response = await apiRequest<{ recoveryCodes: string[] }>('/admin/mfa/enable', {
    method: 'POST',
    body: { code },
  })
  return response.recoveryCodes
}

export async function disableMfa(password: string, code: string): Promise<void> {
  await apiRequest<void>('/admin/mfa/disable', {
    method: 'POST',
    body: { password, code },
  })
}

export async function regenerateRecoveryCodes(
  password: string,
  code: string,
): Promise<string[]> {
  const response = await apiRequest<{ recoveryCodes: string[] }>('/admin/mfa/recovery-codes', {
    method: 'POST',
    body: { password, code },
  })
  return response.recoveryCodes
}
