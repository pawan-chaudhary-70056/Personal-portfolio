import type { ReactNode } from 'react'
import type { PortfolioContent } from '@/@types/portfolio'
import { Container } from '@/components/layout/Container'
import { usePortfolio } from '@/portfolio/usePortfolio'

interface PortfolioGateProps {
  loadingLabel: string
  children: (content: PortfolioContent) => ReactNode
}

/**
 * Public sub-pages share one content request, so they also share its loading
 * and error surfaces. The render prop only runs with a complete payload.
 */
export function PortfolioGate({ loadingLabel, children }: PortfolioGateProps) {
  const { status, content, error, reload } = usePortfolio()

  if (status === 'ready' && content) {
    return <>{children(content)}</>
  }

  if (status === 'error') {
    return (
      <section data-tone="dark" className="bg-charcoal text-ivory">
        <Container className="flex min-h-svh flex-col justify-center py-24">
          <p className="eyebrow text-gold">Portfolio</p>
          <h1 className="mt-5 max-w-2xl text-h2">This page is temporarily unavailable.</h1>
          <p role="alert" className="mt-5 max-w-xl text-body-lg text-ivory/70">
            {error ?? 'The portfolio could not be loaded. Please try again.'}
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-8 min-h-12 w-fit bg-gold px-6 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d]"
          >
            Try again
          </button>
        </Container>
      </section>
    )
  }

  return (
    <section data-tone="dark" aria-busy="true" className="bg-charcoal text-ivory">
      <Container className="flex min-h-svh flex-col justify-center py-24">
        <p role="status" className="text-caption tracking-[0.14em] text-ivory/70 uppercase">
          {loadingLabel}
        </p>
        <div aria-hidden="true" className="mt-10 max-w-3xl space-y-5">
          <div className="h-3 w-40 bg-ivory/10" />
          <div className="h-16 w-full bg-ivory/10" />
          <div className="h-16 w-4/5 bg-ivory/10" />
        </div>
      </Container>
    </section>
  )
}
