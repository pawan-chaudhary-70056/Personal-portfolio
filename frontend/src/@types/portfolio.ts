/**
 * Public portfolio content types.
 * These mirror the shape the backend API will return (`docs/07-backend-api.md`),
 * so wiring the homepage to real data later is a data-source swap, not a rewrite.
 */

export type CredentialKind = 'education' | 'certification'

export interface SocialLink {
  label: string
  url: string
}

export interface FocusArea {
  label: string
  description: string
}

export interface Profile {
  name: string
  wordmark: string
  role: string
  location: string
  availability: string
  headline: string
  summary: string
  /** Longer About copy. Each entry renders as its own paragraph. */
  about: string[]
  email: string
  socials: SocialLink[]
  focusAreas: FocusArea[]
}

export interface Project {
  id: string
  slug: string
  title: string
  summary: string
  year: string
  category: string
  technologies: string[]
  liveUrl?: string
  repositoryUrl?: string
  imageUrl?: string
  imageAlt?: string
  featured: boolean
  /** Marks illustrative content that must be replaced before launch. */
  sample?: boolean
}

export interface SkillGroup {
  id: string
  label: string
  items: string[]
}

export interface ExperienceEntry {
  id: string
  role: string
  organization: string
  period: string
  current?: boolean
  summary: string
  sample?: boolean
}

export interface CredentialEntry {
  id: string
  title: string
  issuer: string
  year: string
  kind: CredentialKind
  sample?: boolean
}
