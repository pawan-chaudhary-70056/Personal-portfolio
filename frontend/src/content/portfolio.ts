import type {
  CredentialEntry,
  ExperienceEntry,
  Profile,
  Project,
  SkillGroup,
} from '@/@types/portfolio'

/**
 * Single source of truth for homepage content until the backend API is wired up.
 *
 * TODO(owner): replace every value below with real information, then set
 * CONTENT_IS_PLACEHOLDER to false. While it is true, the homepage displays a
 * small "Placeholder content" notice and labels sample entries, so nothing on
 * screen looks like a real claim about you.
 */
export const CONTENT_IS_PLACEHOLDER = true

export const profile: Profile = {
  name: 'Your Name',
  wordmark: 'Portfolio',
  role: 'Software Development / Cybersecurity',
  location: 'Kathmandu, Nepal',
  availability: 'Open to engineering roles and collaboration',
  headline: 'Building secure digital experiences.',
  summary:
    'A refined personal portfolio showcasing selected projects, technical expertise, and professional experience — with an emphasis on secure, maintainable engineering.',
  about: [
    'This section should describe how you work, what you care about, and the kind of problems you want to solve. Keep it specific and verifiable: the projects, tools, and responsibilities you can actually speak about in an interview.',
    'Aim for two or three short paragraphs. Recruiters scan this page in seconds, so lead with the strongest, most concrete statement about your capability.',
  ],
  email: 'hello@example.com',
  socials: [],
  focusAreas: [
    {
      label: 'Full-stack development',
      description: 'Typed frontends and structured backend services.',
    },
    {
      label: 'Application security',
      description: 'Authentication, access control, and hardened defaults.',
    },
    {
      label: 'Data and interfaces',
      description: 'Relational modelling and accessible interface design.',
    },
  ],
}

export const featuredProjects: Project[] = [
  {
    id: 'project-portfolio',
    slug: 'portfolio-platform',
    title: 'Portfolio & Admin Platform',
    summary:
      'A luxury portfolio with a secure, session-based admin dashboard for managing projects, experience, and credentials.',
    year: '2026',
    category: 'Full-stack',
    technologies: ['React', 'TypeScript', 'Express', 'PostgreSQL', 'Prisma'],
    featured: true,
    sample: true,
  },
  {
    id: 'project-notes-api',
    slug: 'secure-notes-api',
    title: 'Secure Notes API',
    summary:
      'A small REST service demonstrating server-side sessions, role checks, input validation, and audit logging.',
    year: '2025',
    category: 'Backend',
    technologies: ['Node.js', 'Express', 'Prisma', 'Zod'],
    featured: true,
    sample: true,
  },
  {
    id: 'project-dashboard',
    slug: 'content-dashboard',
    title: 'Content Dashboard',
    summary:
      'A dashboard pattern for searchable tables, draft and publish states, confirmation dialogs, and clear save feedback.',
    year: '2025',
    category: 'Interface',
    technologies: ['React', 'Tailwind CSS', 'TypeScript'],
    featured: true,
    sample: true,
  },
  {
    id: 'project-toolkit',
    slug: 'access-review-toolkit',
    title: 'Access Review Toolkit',
    summary:
      'A command-line utility for reviewing account access, generating findings reports, and tracking remediations.',
    year: '2025',
    category: 'Security tooling',
    technologies: ['Node.js', 'SQL', 'GitHub Actions'],
    featured: true,
    sample: true,
  },
]

export const skillGroups: SkillGroup[] = [
  {
    id: 'languages',
    label: 'Languages',
    items: ['TypeScript', 'JavaScript', 'HTML', 'CSS', 'SQL'],
  },
  {
    id: 'frontend',
    label: 'Frontend',
    items: ['React', 'Tailwind CSS', 'Vite', 'Responsive layouts', 'Accessibility'],
  },
  {
    id: 'backend',
    label: 'Backend',
    items: ['Node.js', 'Express', 'Prisma', 'REST APIs', 'Zod validation'],
  },
  {
    id: 'security',
    label: 'Security',
    items: ['Session authentication', 'Access control', 'OWASP fundamentals', 'Security headers'],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: ['Git', 'Docker', 'Vitest', 'Playwright', 'Linux'],
  },
]

export const experience: ExperienceEntry[] = [
  {
    id: 'experience-1',
    role: 'Software Development Intern',
    organization: 'Sample Organisation',
    period: '2025 — Present',
    current: true,
    summary:
      'Contributed to internal web tooling, reviewed pull requests, and documented application behaviour. Replace this entry with your own role, dates, and verified responsibilities.',
    sample: true,
  },
  {
    id: 'experience-2',
    role: 'Freelance Web Developer',
    organization: 'Independent',
    period: '2024 — 2025',
    summary:
      'Built responsive websites and small full-stack features for local clients. Replace this entry with real project outcomes and measurable results.',
    sample: true,
  },
]

export const credentials: CredentialEntry[] = [
  {
    id: 'credential-1',
    title: 'BSc (Hons) Computer Science',
    issuer: 'Sample University',
    year: '2025',
    kind: 'education',
    sample: true,
  },
  {
    id: 'credential-2',
    title: 'Web Application Security Fundamentals',
    issuer: 'Sample Certification Body',
    year: '2024',
    kind: 'certification',
    sample: true,
  },
]
