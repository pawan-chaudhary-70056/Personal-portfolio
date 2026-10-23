import type { PublicSkill } from '@/@types/portfolio'
import { Section } from '@/components/layout/Section'
import { Reveal } from '@/components/ui/Reveal'

interface SkillGroup {
  label: string
  items: PublicSkill[]
}

function groupSkills(skills: PublicSkill[]): SkillGroup[] {
  const groups: SkillGroup[] = []

  for (const skill of skills) {
    const existing = groups.find((group) => group.label === skill.category)

    if (existing) {
      existing.items.push(skill)
    } else {
      groups.push({ label: skill.category, items: [skill] })
    }
  }

  return groups
}

export function SkillsOverview({ skills }: { skills: PublicSkill[] }) {
  const groups = groupSkills(skills)

  return (
    <Section id="skills" tone="light" labelledBy="skills-heading">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-20">
        <Reveal>
          <p className="eyebrow text-gold-ink">Capabilities</p>
          <h2 id="skills-heading" className="mt-5 max-w-sm text-h2">
            Tools and practices I work with.
          </h2>
          <p className="mt-5 max-w-sm text-body-sm text-charcoal/65">
            Grouped by area rather than scored with arbitrary percentages — the work above is the
            evidence.
          </p>
        </Reveal>

        <Reveal delay={80}>
          {groups.length > 0 ? (
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {groups.map((group) => (
                <li key={group.label} className="border-t border-charcoal/15 pt-5">
                  <p className="eyebrow text-gold-ink">{group.label}</p>
                  <ul className="mt-4 space-y-2">
                    {group.items.map((item) => (
                      <li key={item.id} className="text-body-sm text-charcoal/75">
                        {item.name}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-lg text-charcoal/65">Skills will be published shortly.</p>
          )}
        </Reveal>
      </div>
    </Section>
  )
}
