import type {
  AdminCertification,
  AdminEducation,
  AdminExperience,
  AdminSkill,
  CertificationPayload,
  EducationPayload,
  ExperiencePayload,
  SkillPayload,
} from '@/@types/admin'

export interface SkillFormValues {
  name: string
  category: string
  description: string
  sortOrder: string
  published: boolean
}

export function toSkillFormValues(skill?: AdminSkill): SkillFormValues {
  return {
    name: skill?.name ?? '',
    category: skill?.category ?? '',
    description: skill?.description ?? '',
    sortOrder: String(skill?.sortOrder ?? 0),
    published: skill?.published ?? true,
  }
}

export function toSkillPayload(values: SkillFormValues): SkillPayload {
  const sortOrder = Number.parseInt(values.sortOrder, 10)

  return {
    name: values.name.trim(),
    category: values.category.trim(),
    description: values.description.trim() || null,
    sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
    published: values.published,
  }
}

export interface ExperienceFormValues {
  role: string
  organization: string
  employmentType: string
  location: string
  description: string
  startDate: string
  endDate: string
  isCurrent: boolean
  sortOrder: string
  published: boolean
}

/** The API returns ISO timestamps for date-only columns; inputs need `YYYY-MM-DD`. */
function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : ''
}

export function toExperienceFormValues(entry?: AdminExperience): ExperienceFormValues {
  return {
    role: entry?.role ?? '',
    organization: entry?.organization ?? '',
    employmentType: entry?.employmentType ?? '',
    location: entry?.location ?? '',
    description: entry?.description ?? '',
    startDate: toDateInput(entry?.startDate ?? null),
    endDate: toDateInput(entry?.endDate ?? null),
    isCurrent: entry?.isCurrent ?? true,
    sortOrder: String(entry?.sortOrder ?? 0),
    published: entry?.published ?? true,
  }
}

export function toExperiencePayload(values: ExperienceFormValues): ExperiencePayload {
  const sortOrder = Number.parseInt(values.sortOrder, 10)
  const endDate = values.isCurrent ? null : values.endDate || null

  return {
    role: values.role.trim(),
    organization: values.organization.trim(),
    employmentType: values.employmentType.trim() || null,
    location: values.location.trim() || null,
    description: values.description.trim() || null,
    startDate: values.startDate,
    endDate,
    isCurrent: values.isCurrent,
    published: values.published,
    sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
  }
}

export interface EducationFormValues {
  institution: string
  qualification: string
  fieldOfStudy: string
  description: string
  startDate: string
  endDate: string
  sortOrder: string
  published: boolean
}

export function toEducationFormValues(entry?: AdminEducation): EducationFormValues {
  return {
    institution: entry?.institution ?? '',
    qualification: entry?.qualification ?? '',
    fieldOfStudy: entry?.fieldOfStudy ?? '',
    description: entry?.description ?? '',
    startDate: toDateInput(entry?.startDate ?? null),
    endDate: toDateInput(entry?.endDate ?? null),
    sortOrder: String(entry?.sortOrder ?? 0),
    published: entry?.published ?? true,
  }
}

export function toEducationPayload(values: EducationFormValues): EducationPayload {
  const sortOrder = Number.parseInt(values.sortOrder, 10)

  return {
    institution: values.institution.trim(),
    qualification: values.qualification.trim(),
    fieldOfStudy: values.fieldOfStudy.trim() || null,
    description: values.description.trim() || null,
    startDate: values.startDate || null,
    endDate: values.endDate || null,
    sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
    published: values.published,
  }
}

export interface CertificationFormValues {
  name: string
  issuingOrganization: string
  issueDate: string
  expiryDate: string
  credentialId: string
  credentialUrl: string
  sortOrder: string
  published: boolean
}

export function toCertificationFormValues(
  entry?: AdminCertification,
): CertificationFormValues {
  return {
    name: entry?.name ?? '',
    issuingOrganization: entry?.issuingOrganization ?? '',
    issueDate: toDateInput(entry?.issueDate ?? null),
    expiryDate: toDateInput(entry?.expiryDate ?? null),
    credentialId: entry?.credentialId ?? '',
    credentialUrl: entry?.credentialUrl ?? '',
    sortOrder: String(entry?.sortOrder ?? 0),
    published: entry?.published ?? true,
  }
}

export function toCertificationPayload(
  values: CertificationFormValues,
): CertificationPayload {
  const sortOrder = Number.parseInt(values.sortOrder, 10)

  return {
    name: values.name.trim(),
    issuingOrganization: values.issuingOrganization.trim(),
    issueDate: values.issueDate || null,
    expiryDate: values.expiryDate || null,
    credentialId: values.credentialId.trim() || null,
    credentialUrl: values.credentialUrl.trim() || null,
    sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
    published: values.published,
  }
}
