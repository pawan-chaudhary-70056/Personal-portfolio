/**
 * Public portfolio content types.
 * These mirror the fields returned by the public API (`docs/07-backend-api.md`).
 * Only approved, published content is ever returned by these endpoints.
 */

export type CredentialKind = 'education' | 'certification'

export interface PublicProfile {
  displayName: string
  headline: string
  biography: string
  location: string | null
  publicEmail: string | null
  websiteUrl: string | null
  linkedinUrl: string | null
  githubUrl: string | null
  portraitUrl: string | null
  portraitAlt: string | null
}

export interface PublicScreenshot {
  id: string
  url: string
  alt: string
  caption: string | null
  sortOrder: number
}

export interface PublicProject {
  id: string
  title: string
  slug: string
  summary: string
  description: string
  category: string
  year: string
  technologies: string[]
  liveUrl: string | null
  repositoryUrl: string | null
  imageUrl: string | null
  imageAlt: string | null
  screenshots: PublicScreenshot[]
  featured: boolean
  publishedAt: string | null
}

export interface PublicSkill {
  id: string
  name: string
  category: string
  description: string | null
  sortOrder: number
}

export interface PublicExperience {
  id: string
  role: string
  organization: string
  employmentType: string | null
  location: string | null
  description: string | null
  startDate: string
  endDate: string | null
  isCurrent: boolean
  sortOrder: number
}

export interface PublicEducation {
  id: string
  institution: string
  qualification: string
  fieldOfStudy: string | null
  description: string | null
  startDate: string | null
  endDate: string | null
  sortOrder: number
}

export interface PublicCertification {
  id: string
  name: string
  issuingOrganization: string
  issueDate: string | null
  expiryDate: string | null
  credentialId: string | null
  credentialUrl: string | null
  sortOrder: number
}

export interface PublicHeroPortrait {
  url: string
  alt: string
  width: number
  height: number
  mimeType: string
}

export interface PublicHeroEffect {
  enabled: boolean
  tiltIntensity: number
  animationIntensity: number
  floating: boolean
}

export interface PublicHero {
  /** Null when nothing is published, visibility is off, or the image is gone. */
  portrait: PublicHeroPortrait | null
  effect: PublicHeroEffect
}

export type HomepageSectionKey =
  | 'about'
  | 'work'
  | 'skills'
  | 'experience'
  | 'credentials'
  | 'contact'

export interface PublicHomepageSection {
  key: HomepageSectionKey
  visible: boolean
}

export interface PublicFeaturedProject {
  id: string
  title: string
  slug: string
}

export interface PublicSiteSettings {
  siteTitle: string
  siteDescription: string
  canonicalUrl: string | null
  socialImageUrl: string | null
}

export interface PublicHomepage {
  /** Published section layout; the hero is always rendered first. */
  sections: PublicHomepageSection[]
  featuredProjects: PublicFeaturedProject[]
  site: PublicSiteSettings
}

export interface PortfolioContent {
  hero: PublicHero
  profile: PublicProfile | null
  projects: PublicProject[]
  skills: PublicSkill[]
  experience: PublicExperience[]
  education: PublicEducation[]
  certifications: PublicCertification[]
  homepage: PublicHomepage
}
