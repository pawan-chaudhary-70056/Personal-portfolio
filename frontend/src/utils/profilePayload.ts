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
    portraitAlt: profile?.portraitAlt ?? '',
  }
}

function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function toProfilePayload(values: ProfileFormValues): ProfilePayload {
  return {
    displayName: values.displayName.trim(),
    headline: values.headline.trim(),
    biography: values.biography.trim(),
    location: nullable(values.location),
    publicEmail: nullable(values.publicEmail),
    websiteUrl: nullable(values.websiteUrl),
    linkedinUrl: nullable(values.linkedinUrl),
    githubUrl: nullable(values.githubUrl),
    portraitUrl: nullable(values.portraitUrl),
    portraitAlt: nullable(values.portraitAlt),
  }
}
