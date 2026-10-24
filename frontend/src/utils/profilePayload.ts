import type { AdminProfile, ProfilePayload } from '@/@types/admin'

export interface ProfileFormValues {
  displayName: string
  headline: string
  biography: string
  location: string
  publicEmail: string
  websiteUrl: string
  linkedinUrl: string
  githubUrl: string
  portraitUrl: string
  /** Id of the picked library asset; empty when an external URL is used. */
  portraitMediaId: string
  portraitAlt: string
}

export function toProfileFormValues(profile: AdminProfile | null): ProfileFormValues {
  return {
    displayName: profile?.displayName ?? '',
    headline: profile?.headline ?? '',
    biography: profile?.biography ?? '',
    location: profile?.location ?? '',
    publicEmail: profile?.publicEmail ?? '',
    websiteUrl: profile?.websiteUrl ?? '',
    linkedinUrl: profile?.linkedinUrl ?? '',
    githubUrl: profile?.githubUrl ?? '',
    portraitUrl: profile?.portraitUrl ?? '',
    portraitMediaId: profile?.portraitMediaId ?? '',
    portraitAlt: profile?.portraitAlt ?? '',
  }
}

function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function toProfilePayload(values: ProfileFormValues): ProfilePayload {
  // The stored record keeps exactly one portrait source; a typed URL wins over a
  // previous pick so the server never receives both.
  const portraitUrl = nullable(values.portraitUrl)
  const portraitMediaId = portraitUrl ? null : nullable(values.portraitMediaId)

  return {
    displayName: values.displayName.trim(),
    headline: values.headline.trim(),
    biography: values.biography.trim(),
    location: nullable(values.location),
    publicEmail: nullable(values.publicEmail),
    websiteUrl: nullable(values.websiteUrl),
    linkedinUrl: nullable(values.linkedinUrl),
    githubUrl: nullable(values.githubUrl),
    portraitUrl,
    portraitMediaId,
    portraitAlt: nullable(values.portraitAlt),
  }
}
