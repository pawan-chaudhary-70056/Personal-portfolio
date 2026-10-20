import { Outlet } from 'react-router-dom'
import { Footer } from '@/components/navigation/Footer'
import { Header } from '@/components/navigation/Header'

export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-charcoal">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-60 focus:bg-gold focus:px-4 focus:py-2 focus:text-body-sm focus:text-charcoal"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
