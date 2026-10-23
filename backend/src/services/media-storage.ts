import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'
import { notFound } from '../lib/errors.js'
import type { ImageExtension } from '../lib/image.js'

/**
 * Local media storage. The interface (store/read/remove) is deliberately small
 * so an object-storage adapter can replace it without touching callers
 * (docs/14-dynamic-content-and-media-management.md §10.2).
 */

const MEDIA_ROOT = path.resolve(process.cwd(), env.MEDIA_ROOT)

/** Generated keys only: a UUID plus a detected extension. No client input. */
const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/

export function mediaRootPath(): string {
  return MEDIA_ROOT
}

export async function storeImage(buffer: Buffer, extension: ImageExtension): Promise<string> {
  await mkdir(MEDIA_ROOT, { recursive: true, mode: 0o700 })

  const storageKey = `${randomUUID()}.${extension}`
  // `wx` fails if the file somehow exists, so a key can never be overwritten.
  await writeFile(path.join(MEDIA_ROOT, storageKey), buffer, { flag: 'wx', mode: 0o600 })

  return storageKey
}

export async function readImage(storageKey: string): Promise<Buffer> {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw notFound('Image')
  }

  try {
    return await readFile(path.join(MEDIA_ROOT, storageKey))
  } catch {
    // A missing file is reported exactly like an unknown asset so the endpoint
    // never reveals which stored files exist.
    throw notFound('Image')
  }
}

export async function removeImage(storageKey: string): Promise<void> {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    return
  }

  try {
    await unlink(path.join(MEDIA_ROOT, storageKey))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      // Cleanup failures never fail the request; reconciliation can retry.
      console.error('Failed to remove media file:', (error as Error).message)
    }
  }
}
