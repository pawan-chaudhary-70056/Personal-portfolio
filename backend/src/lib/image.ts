/**
 * Image validation for uploads.
 *
 * Browsers supply a filename and a MIME type, and neither is trustworthy. This
 * module detects the real format from the file signature, parses the dimensions
 * from the header (so no image library is needed to decode untrusted input), and
 * rejects anything outside the allowlist.
 */

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type AllowedImageMime = (typeof ALLOWED_IMAGE_TYPES)[number]

export type ImageExtension = 'jpg' | 'png' | 'webp'

export interface ImageInfo {
  mimeType: AllowedImageMime
  extension: ImageExtension
  width: number
  height: number
}

/** Bounds decompression work and layout size for the hero frame. */
export const MAX_IMAGE_EDGE = 8000
export const MAX_IMAGE_PIXELS = 30_000_000

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function pngInfo(buffer: Buffer): ImageInfo | null {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return null
  }

  // The first chunk after the signature must be IHDR.
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    return null
  }

  return {
    mimeType: 'image/png',
    extension: 'png',
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

function jpegInfo(buffer: Buffer): ImageInfo | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null
  }

  let offset = 2

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      // Some encoders pad between segments with junk; skip to the next marker.
      offset += 1
      continue
    }

    let marker = buffer[offset + 1] ?? 0
    while (marker === 0xff) {
      offset += 1
      marker = buffer[offset + 1] ?? 0
    }

    // Standalone markers carry no length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }

    if (marker === 0xd9) {
      return null
    }

    const segmentLength = buffer.readUInt16BE(offset + 2)
    if (segmentLength < 2) {
      return null
    }

    // SOF0..SOF15, excluding DHT (C4), JPG (C8), and DAC (CC).
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc

    if (isStartOfFrame) {
      const height = buffer.readUInt16BE(offset + 5)
      const width = buffer.readUInt16BE(offset + 7)

      return { mimeType: 'image/jpeg', extension: 'jpg', width, height }
    }

    offset += 2 + segmentLength
  }

  return null
}

function webpInfo(buffer: Buffer): ImageInfo | null {
  if (
    buffer.length < 30 ||
    buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
    buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
  ) {
    return null
  }

  const format = buffer.subarray(12, 16).toString('ascii')

  if (format === 'VP8X') {
    // Extended format stores canvas dimensions minus one as 24-bit values.
    const width = 1 + buffer.readUIntLE(24, 3)
    const height = 1 + buffer.readUIntLE(27, 3)
    return { mimeType: 'image/webp', extension: 'webp', width, height }
  }

  if (format === 'VP8 ') {
    // Lossy key frame: 3-byte frame tag, then the 9d 01 2a start code.
    if (
      buffer.length < 30 ||
      buffer[23] !== 0x9d ||
      buffer[24] !== 0x01 ||
      buffer[25] !== 0x2a
    ) {
      return null
    }

    const width = buffer.readUInt16LE(26) & 0x3fff
    const height = buffer.readUInt16LE(28) & 0x3fff
    return { mimeType: 'image/webp', extension: 'webp', width, height }
  }

  if (format === 'VP8L') {
    if (buffer[20] !== 0x2f) {
      return null
    }

    const bits = buffer.readUInt32LE(21)
    const width = (bits & 0x3fff) + 1
    const height = ((bits >> 14) & 0x3fff) + 1
    return { mimeType: 'image/webp', extension: 'webp', width, height }
  }

  return null
}

/** Returns parsed metadata for an allowed image, or null when it is not one. */
export function inspectImage(buffer: Buffer): ImageInfo | null {
  const info = pngInfo(buffer) ?? jpegInfo(buffer) ?? webpInfo(buffer)

  if (!info) {
    return null
  }

  if (info.width < 1 || info.height < 1) {
    return null
  }

  if (info.width > MAX_IMAGE_EDGE || info.height > MAX_IMAGE_EDGE) {
    return null
  }

  if (info.width * info.height > MAX_IMAGE_PIXELS) {
    return null
  }

  return info
}
