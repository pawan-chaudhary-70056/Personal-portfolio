import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LoginMonitoring } from '@/@types/admin'
import { getLoginMonitoring } from '@/api/admin.api'
import { LoginMonitoringPanel } from '@/components/admin/LoginMonitoringPanel'

vi.mock('@/api/admin.api', () => ({
  getLoginMonitoring: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const report: LoginMonitoring = {
  windowDays: 7,
  totals: { failedLogins: 2, failedMfaCodes: 1, successfulLogins: 4 },
  bySource: [
    { ipAddress: '203.0.113.9', failures: 2, lastFailureAt: '2026-10-24T10:00:00.000Z' },
  ],
  recent: [
    {
      id: 'evt-1',
      action: 'AUTH_LOGIN_FAILED',
      email: 'owner@example.com',
      reason: 'bad_password',
      ipAddress: '203.0.113.9',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: '2026-10-24T10:00:00.000Z',
    },
    {
      id: 'evt-2',
      action: 'AUTH_MFA_FAILED',
      email: null,
      reason: null,
      ipAddress: null,
      userAgent: null,
      createdAt: '2026-10-24T09:00:00.000Z',
    },
  ],
}

describe('LoginMonitoringPanel', () => {
  it('renders the totals, sources, and recent failures', async () => {
    vi.mocked(getLoginMonitoring).mockResolvedValue(report)

    render(<LoginMonitoringPanel />)

    expect(
      await screen.findByRole('heading', { name: 'Sign-in monitoring' }),
    ).toBeTruthy()

    // Totals read from the definition list, label followed by its value.
    const failedTotal = screen.getByText('Failed sign-ins').parentElement
    expect(failedTotal?.textContent).toContain('2')
    const mfaTotal = screen.getByText('Failed verification codes').parentElement
    expect(mfaTotal?.textContent).toContain('1')
    const successTotal = screen.getByText('Successful sign-ins').parentElement
    expect(successTotal?.textContent).toContain('4')

    // The source breakdown keeps addresses as plain text.
    expect(screen.getByText('203.0.113.9')).toBeTruthy()
    expect(screen.getByText(/2 failures/)).toBeTruthy()

    // Failures show the targeted account and a readable reason.
    expect(await screen.findByText(/owner@example\.com · Wrong password/)).toBeTruthy()
    // An MFA failure without metadata falls back to safe placeholders.
    expect(await screen.findByText(/Failed verification code — Unknown account/)).toBeTruthy()
  })

  it('reloads the summary when the window changes', async () => {
    vi.mocked(getLoginMonitoring).mockResolvedValue(report)

    render(<LoginMonitoringPanel />)
    await screen.findByRole('heading', { name: 'Sign-in monitoring' })

    fireEvent.change(screen.getByLabelText('Window'), { target: { value: '30' } })

    expect(getLoginMonitoring).toHaveBeenCalledWith(30, expect.any(AbortSignal))
    expect(await screen.findByText(/2 failures/)).toBeTruthy()
  })

  it('shows an error state with a retry when the summary cannot load', async () => {
    vi.mocked(getLoginMonitoring).mockRejectedValue(new Error('network down'))

    render(<LoginMonitoringPanel />)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Sign-in activity could not be loaded.')

    vi.mocked(getLoginMonitoring).mockResolvedValue(report)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: 'Sign-in monitoring' })).toBeTruthy()
    expect(await screen.findByText(/2 failures/)).toBeTruthy()
  })
})
