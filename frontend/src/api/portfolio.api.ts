import type {
  PortfolioContent,
  PublicCertification,
  PublicEducation,
  PublicExperience,
  PublicHero,
  PublicHomepage,
  PublicProfile,
  PublicProject,
  PublicSkill,
} from '@/@types/portfolio'
import { apiRequest } from '@/api/client'

/**
 * Loads every public portfolio collection in parallel. Each endpoint returns
 * published/approved fields only; the homepage never talks to the database.
 */
export async function getPortfolioContent(signal?: AbortSignal): Promise<PortfolioContent> {
  const [hero, profile, projects, skills, experience, education, certifications, homepage] =
    await Promise.all([
      apiRequest<{ hero: PublicHero }>('/hero', { signal }),
      apiRequest<{ profile: PublicProfile | null }>('/profile', { signal }),
      apiRequest<{ projects: PublicProject[] }>('/projects', { signal }),
      apiRequest<{ skills: PublicSkill[] }>('/skills', { signal }),
      apiRequest<{ experience: PublicExperience[] }>('/experience', { signal }),
      apiRequest<{ education: PublicEducation[] }>('/education', { signal }),
      apiRequest<{ certifications: PublicCertification[] }>('/certifications', { signal }),
      apiRequest<{ homepage: PublicHomepage }>('/portfolio/homepage', { signal }),
    ])

  return {
    hero: hero.hero,
    profile: profile.profile,
    projects: projects.projects,
    skills: skills.skills,
    experience: experience.experience,
    education: education.education,
    certifications: certifications.certifications,
    homepage: homepage.homepage,
  }
}
