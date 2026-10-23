import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SafeImage } from './SafeImage'

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(cleanup)

describe('SafeImage', () => {
  it('renders the image with its props while the load has not failed', () => {
    render(<SafeImage src="/cover.png" alt="Cover" loading="lazy" className="object-cover" />)

    const image = screen.getByRole('img', { name: 'Cover' })
    expect(image.getAttribute('src')).toBe('/cover.png')
    expect(image.getAttribute('class')).toBe('object-cover')
    expect(image.getAttribute('loading')).toBe('lazy')
  })

  it('swaps to the fallback when the browser reports a load failure', () => {
    render(
      <SafeImage
        src="/missing.png"
        alt="Cover"
        fallback={<span>Image unavailable</span>}
      />,
    )

    fireEvent.error(screen.getByRole('img', { name: 'Cover' }))

    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('Image unavailable')).toBeTruthy()
  })

  it('renders nothing when the load fails and no fallback is given', () => {
    const { container } = render(<SafeImage src="/missing.png" alt="Cover" />)

    fireEvent.error(screen.getByRole('img', { name: 'Cover' }))

    expect(container.innerHTML).toBe('')
  })
})
