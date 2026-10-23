import { useState, type ImgHTMLAttributes, type ReactNode } from 'react'

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  /** Rendered instead of the image when the browser reports a load failure. */
  fallback?: ReactNode
}

/**
 * Images point at external URLs (media CDN or the content platform). If one
 * 404s, the browser would otherwise render a broken-image glyph on the public
 * site, so every public image swaps to its fallback instead.
 */
export function SafeImage({ src, alt, fallback = null, ...rest }: SafeImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) return <>{fallback}</>

  return <img src={src} alt={alt} onError={() => setFailed(true)} {...rest} />
}
