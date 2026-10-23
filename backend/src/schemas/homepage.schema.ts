import { z } from 'zod'
import { recordIdSchema } from './common.schema.js'
import { heroDraftFields } from './hero.schema.js'

/**
 * The documented homepage sections (docs/09-admin-dashboard.md §18). The hero is
 * always rendered first and is not part of the orderable catalog. Adding a
 * section here is the only place the allowlist changes; unknown keys are
 * rejected by validation.
 */
export const HOMEPAGE_SECTIONS = [
  { key: 'about', label: 'About' },
  { key: 'work', label: 'Selected work' },
  { key: 'skills', label: 'Skills' },
  { key: 'experience', label: 'Experience' },
  { key: 'credentials', label: 'Education and certifications' },
  { key: 'contact', label: 'Contact' },
] as const

export const SECTION_KEYS = HOMEPAGE_SECTIONS.map((section) => section.key) as [
  'about',
  'work',
  'skills',
  'experience',
  'credentials',
  'contact',
]

export type SectionKey = (typeof SECTION_KEYS)[number]

export const DEFAULT_SECTION_ORDER: SectionKey[] = [...SECTION_KEYS]

const sectionKeySchema = z.enum(SECTION_KEYS)

/** Bounds keep one request from writing an unbounded number of references. */
export const MAX_FEATURED_PROJECTS = 12

const uniqueSections = (values: SectionKey[]) => new Set(values).size === values.length

const sectionOrderSchema = z
  .array(sectionKeySchema)
  .max(SECTION_KEYS.length)
  .refine(uniqueSections, 'Each section may appear only once.')

const hiddenSectionsSchema = z
  .array(sectionKeySchema)
  .max(SECTION_KEYS.length)
  .refine(uniqueSections, 'Each section may appear only once.')

const featuredProjectIdsSchema = z
  .array(recordIdSchema)
  .max(MAX_FEATURED_PROJECTS, `Feature at most ${MAX_FEATURED_PROJECTS} projects.`)
  .refine((ids) => new Set(ids).size === ids.length, 'Each project may be featured once.')

/**
 * Partial update of the homepage draft: hero presentation plus the section
 * order, visibility, and featured project references. Merged with stored values
 * before validation so a PATCH can send only the fields it changes.
 */
export const homepageDraftSchema = z
  .object({
    ...heroDraftFields,
    sectionOrder: sectionOrderSchema,
    hiddenSections: hiddenSectionsSchema,
    featuredProjectIds: featuredProjectIdsSchema,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export type HomepageDraftInput = z.infer<typeof homepageDraftSchema>
