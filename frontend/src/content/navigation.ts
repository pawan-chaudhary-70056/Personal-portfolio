export interface NavigationItem {
  label: string
  to: string
}

/**
 * Public navigation uses real routes (docs/02-portfolio-requirements.md §5.1).
 * Skills, education, and certifications live on the About page, which the
 * homepage links to; they do not get separate top-level navigation items.
 */
export const primaryNavigation: NavigationItem[] = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Projects', to: '/projects' },
  { label: 'Experience', to: '/experience' },
]

export const contactNavigation: NavigationItem = { label: 'Contact', to: '/contact' }

export const navigation: NavigationItem[] = [...primaryNavigation, contactNavigation]
