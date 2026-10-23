import { apiRequest } from '@/api/client'

export interface ContactMessagePayload {
  name: string
  email: string
  subject: string
  message: string
  /** Honeypot field. Real visitors never fill it. */
  website?: string
}

/** Submits a contact enquiry. Resolves only after the server stores it. */
export async function submitContactMessage(payload: ContactMessagePayload): Promise<string> {
  const response = await apiRequest<{ message: string }>('/contact', {
    method: 'POST',
    body: payload,
  })

  return response.message
}
