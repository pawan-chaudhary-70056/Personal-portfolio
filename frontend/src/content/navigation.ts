export interface NavigationItem {
  label: string
  href: string
}

/**
 * Homepage navigation uses section anchors because this release is a single
 * page. When `/about`, `/projects`, and `/experience` pages ship
 * (docs/02-portfolio-requirements.md §6), these hrefs become routes.
 */
export const primaryNavigation: NavigationItem[] = [
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#work' },
  { label: 'Skills', href: '#skills' },
  { label: 'Experience', href: '#experience' },
]

export const contactNavigation: NavigationItem = { label: 'Contact', href: '#contact' }

export const navigation: NavigationItem[] = [...primaryNavigation, contactNavigation]
