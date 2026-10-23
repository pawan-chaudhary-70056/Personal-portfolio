import type { CredentialKind, PublicCertification, PublicEducation } from '@/@types/portfolio'
import { Section } from '@/components/layout/Section'
import { Reveal } from '@/components/ui/Reveal'
import { formatDate, formatDateRange } from '@/utils/formatDate'

interface CredentialItem {
  id: string
  kind: CredentialKind
  title: string
  issuer: string
  detail: string
  period: string
  verificationUrl: string | null
  sortOrder: number
}

function educationPeriod(entry: PublicEducation): string {
  if (entry.startDate && entry.endDate) {
    return formatDateRange(entry.startDate, entry.endDate, false)
  }

  return formatDate(entry.startDate ?? entry.endDate ?? '')
}

function certificationPeriod(entry: PublicCertification): string {
  const issued = entry.issueDate ? `Issued ${formatDate(entry.issueDate)}` : ''
  const expires = entry.expiryDate ? `Expires ${formatDate(entry.expiryDate)}` : ''
  return [issued, expires].filter(Boolean).join(' · ')
}

export function CredentialsPreview({
  education,
  certifications,
}: {
  education: PublicEducation[]
  certifications: PublicCertification[]
}) {
  const items: CredentialItem[] = [
    ...education.map((entry) => ({
      id: `education-${entry.id}`,
      kind: 'education' as const,
      title: entry.qualification,
      issuer: entry.institution,
      detail: entry.fieldOfStudy ?? '',
      period: educationPeriod(entry),
      verificationUrl: null,
      sortOrder: entry.sortOrder,
    })),
    ...certifications.map((entry) => ({
      id: `certification-${entry.id}`,
      kind: 'certification' as const,
      title: entry.name,
      issuer: entry.issuingOrganization,
      detail: entry.credentialId ?? '',
      period: certificationPeriod(entry),
      verificationUrl: entry.credentialUrl,
      sortOrder: entry.sortOrder,
    })),
  ].sort(
    (first, second) =>
      first.sortOrder - second.sortOrder || first.title.localeCompare(second.title),
  )

  return (
    <Section id="credentials" tone="light" labelledBy="credentials-heading">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-20">
        <Reveal>
          <p className="eyebrow text-gold-ink">Credentials</p>
          <h2 id="credentials-heading" className="mt-5 max-w-sm text-h2">
            Education and certifications.
          </h2>
          <p className="mt-5 max-w-sm text-body-sm text-charcoal/65">
            Formal qualifications, kept short and verifiable. Verification links are shown only when
            they point to a real credential.
          </p>
        </Reveal>

        <Reveal delay={80}>
          {items.length > 0 ? (
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {items.map((item) => (
                <li key={item.id} className="border-t border-charcoal/15 pt-5">
                  <p className="eyebrow text-gold-ink">
                    {item.kind === 'education' ? 'Education' : 'Certification'}
                  </p>
                  <h3 className="mt-3 font-serif text-h3 leading-snug text-charcoal">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-body-sm text-charcoal/70">
                    {item.issuer}
                    {item.period ? ` · ${item.period}` : ''}
                  </p>
                  {item.detail ? (
                    <p className="mt-1 text-caption text-muted-light">{item.detail}</p>
                  ) : null}
                  {item.verificationUrl ? (
                    <a
                      href={item.verificationUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="link-underline mt-3 inline-block text-caption text-gold-ink hover:text-charcoal"
                    >
                      Verify credential ↗
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-lg text-charcoal/65">
              Education and certification details will be published shortly.
            </p>
          )}
        </Reveal>
      </div>
    </Section>
  )
}
