import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '@/auth/useSession'
import { cn } from '@/utils/cn'

interface NavLinkConfig {
  to: string
  label: string
  end: boolean
  ownerOnly?: boolean
}

const navGroups: { label: string; links: NavLinkConfig[] }[] = [
  {
    label: 'Dashboard',
    links: [{ to: '/admin', label: 'Overview', end: true }],
  },
  {
    label: 'Portfolio content',
    links: [
      { to: '/admin/profile', label: 'Profile', end: false },
      { to: '/admin/homepage', label: 'Homepage', end: false },
      { to: '/admin/settings', label: 'Site settings', end: false, ownerOnly: true },
      { to: '/admin/projects', label: 'Projects', end: false },
      { to: '/admin/project-categories', label: 'Project categories', end: false },
      { to: '/admin/skills', label: 'Skills', end: false },
      { to: '/admin/skill-categories', label: 'Skill categories', end: false },
      { to: '/admin/experience', label: 'Experience', end: false },
      { to: '/admin/education', label: 'Education', end: false },
      { to: '/admin/certifications', label: 'Certifications', end: false },
      { to: '/admin/media', label: 'Media', end: false },
    ],
  },
  {
    label: 'Inbox',
    links: [{ to: '/admin/messages', label: 'Messages', end: false }],
  },
  {
    label: 'Maintenance',
    links: [
      { to: '/admin/trash', label: 'Trash', end: false },
      { to: '/admin/revisions', label: 'Revisions', end: false },
      { to: '/admin/scheduling', label: 'Scheduling', end: false },
      { to: '/admin/health', label: 'Health', end: false, ownerOnly: true },
      { to: '/admin/analytics', label: 'Analytics', end: false, ownerOnly: true },
    ],
  },
  {
    label: 'Security',
    links: [
      { to: '/admin/security', label: 'My security', end: false },
      { to: '/admin/audit-logs', label: 'Activity log', end: false, ownerOnly: true },
      { to: '/admin/sessions', label: 'Sessions', end: false, ownerOnly: true },
      { to: '/admin/administrators', label: 'Administrators', end: false, ownerOnly: true },
    ],
  },
]

function groupHeadingId(label: string): string {
  return `admin-nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

interface AdminNavProps {
  onNavigate?: () => void
  onSignOut: () => void
  signingOut: boolean
  role: 'OWNER' | 'EDITOR' | undefined
}

function AdminNav({ onNavigate, onSignOut, signingOut, role }: AdminNavProps) {
  return (
    <>
      <nav aria-label="Admin" className="space-y-6">
        {navGroups.map((group) => {
          const links = group.links.filter((link) => !link.ownerOnly || role === 'OWNER')

          if (links.length === 0) {
            return null
          }

          const headingId = groupHeadingId(group.label)

          return (
            <div key={group.label}>
              <p
                id={headingId}
                className="px-4 text-caption tracking-[0.14em] text-ivory/60 uppercase"
              >
                {group.label}
              </p>
              <ul aria-labelledby={headingId} className="mt-2 space-y-1">
                {links.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      end={link.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'block border-l-2 px-4 py-2.5 text-body-sm transition-colors duration-150 ease-standard',
                          isActive
                            ? 'border-gold bg-ivory/5 text-gold'
                            : 'border-transparent text-ivory/70 hover:border-ivory/30 hover:bg-ivory/5 hover:text-ivory',
                        )
                      }
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-ivory/10 px-4 pt-4">
        <Link
          to="/"
          onClick={onNavigate}
          className="block text-body-sm text-ivory/60 transition-colors duration-150 ease-standard hover:text-ivory"
        >
          View portfolio ↗
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="block w-full text-left text-body-sm text-ivory/60 transition-colors duration-150 ease-standard hover:text-ivory disabled:opacity-50"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </>
  )
}

export function AdminLayout() {
  const { admin, signOutAndClear } = useSession()
  const navigate = useNavigate()
  const [navOpen, setNavOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOutAndClear()
      navigate('/admin/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-svh bg-ivory text-charcoal lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-60 focus:bg-gold focus:px-4 focus:py-2 focus:text-body-sm focus:text-charcoal"
      >
        Skip to admin content
      </a>

      <aside className="hidden bg-charcoal text-ivory lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:overflow-y-auto lg:pb-6">
        <div className="px-4 py-6">
          <p className="text-sm font-medium tracking-[0.3em] text-gold uppercase">Portfolio</p>
          <p className="mt-1 text-caption tracking-[0.14em] text-ivory/50 uppercase">Admin</p>
        </div>

        <AdminNav onSignOut={handleSignOut} signingOut={signingOut} role={admin?.role} />

        <div className="mt-6 border-t border-ivory/10 px-4 pt-4">
          <p className="text-body-sm text-ivory">{admin?.name}</p>
          <p className="truncate text-caption text-ivory/50">{admin?.email}</p>
        </div>
      </aside>

      <div className="flex min-h-svh flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-ivory/10 bg-charcoal px-5 py-3 text-ivory lg:hidden">
          <p className="text-sm font-medium tracking-[0.3em] text-gold uppercase">
            Portfolio
            <span className="ml-2 text-caption tracking-[0.14em] text-ivory/50 uppercase">
              Admin
            </span>
          </p>
          <button
            type="button"
            aria-expanded={navOpen}
            aria-controls="admin-navigation"
            onClick={() => setNavOpen((open) => !open)}
            className="min-h-11 px-2 text-body-sm text-ivory"
          >
            {navOpen ? 'Close' : 'Menu'}
          </button>
        </header>

        {navOpen ? (
          <div
            id="admin-navigation"
            className="flex flex-col bg-charcoal pt-3 pb-4 text-ivory lg:hidden"
          >
            <AdminNav
              onNavigate={() => setNavOpen(false)}
              onSignOut={handleSignOut}
              signingOut={signingOut}
              role={admin?.role}
            />
          </div>
        ) : null}

        <main id="admin-main" className="flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          <div className="mx-auto w-full max-w-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
