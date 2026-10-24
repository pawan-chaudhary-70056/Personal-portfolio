import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AdminMedia } from '@/@types/admin'
import { listMedia } from '@/api/media.api'
import { MediaPicker } from '@/components/admin/MediaPicker'

vi.mock('@/api/media.api', () => ({
  listMedia: vi.fn(),
}))

const asset: AdminMedia = {
  id: 'asset-1',
  url: '/api/admin/media/asset-1/file',
  originalFilename: 'cover.png',
  mimeType: 'image/png',
  sizeBytes: 1024,
  width: 800,
  height: 600,
  altText: 'A project cover',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  referenced: false,
}

beforeAll(() => {
  // jsdom does not implement the dialog methods the picker relies on.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MediaPicker', () => {
  it('lists library images and returns the chosen asset', async () => {
    vi.mocked(listMedia).mockResolvedValue({
      items: [asset],
      total: 1,
      page: 1,
      pageSize: 8,
      pageCount: 1,
    })

    const onSelect = vi.fn()
    const onClose = vi.fn()

    render(<MediaPicker open selectedId={null} onSelect={onSelect} onClose={onClose} />)

    fireEvent.click(await screen.findByRole('button', { name: /cover\.png/i }))

    expect(onSelect).toHaveBeenCalledWith(asset)
    expect(onClose).toHaveBeenCalled()
  })

  it('marks the current selection and shows an empty state', async () => {
    vi.mocked(listMedia).mockResolvedValue({
      items: [asset],
      total: 1,
      page: 1,
      pageSize: 8,
      pageCount: 1,
    })

    const { unmount } = render(
      <MediaPicker open selectedId="asset-1" onSelect={vi.fn()} onClose={vi.fn()} />,
    )

    const selected = await screen.findByRole('button', { name: /cover\.png/i })
    expect(selected.getAttribute('aria-pressed')).toBe('true')
    unmount()

    vi.mocked(listMedia).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 8,
      pageCount: 0,
    })

    render(<MediaPicker open selectedId={null} onSelect={vi.fn()} onClose={vi.fn()} />)

    expect(await screen.findByText('No images yet.')).toBeTruthy()
  })
})
