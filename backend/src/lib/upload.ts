import multer from 'multer'
import { env } from '../config/env.js'
import { ApiError } from './errors.js'

const MEGABYTE = 1024 * 1024

/**
 * Maps multipart failures to the API error format. Size limits are enforced by
 * multer while reading the request body, before any bytes reach the database.
 */
export function mapUploadError(error: unknown): Error {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new ApiError(
        413,
        'file_too_large',
        `Images must be ${Math.floor(env.MEDIA_MAX_BYTES / MEGABYTE)} MB or smaller.`,
      )
    }

    return new ApiError(400, 'invalid_upload', 'Upload exactly one image file.')
  }

  return error instanceof Error
    ? error
    : new ApiError(400, 'invalid_upload', 'The image could not be uploaded.')
}
