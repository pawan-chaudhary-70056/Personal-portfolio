import { useEffect } from 'react'
import { Section } from '@/components/layout/Section'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { setPageMetadata } from '@/utils/metadata'

export function NotFoundPage() {
  useEffect(() => {
    setPageMetadata({
      title: 'Page not found — Portfolio',
      description: 'The page you requested could not be found.',
    })
  }, [])

  return (
    <Section id="not-found" tone="dark" labelledBy="not-found-heading" className="min-h-svh pt-40">
      <p className="eyebrow text-gold">404</p>
      <h1 id="not-found-heading" className="mt-5 max-w-2xl text-h1">
        This page does not exist.
      </h1>
      <p className="mt-5 max-w-md text-body-lg text-ivory/70">
        The address may be mistyped, or the page may have moved. The homepage is the best place to
        start again.
      </p>
      <div className="mt-10">
        <ButtonLink href="/">Back to homepage</ButtonLink>
      </div>
    </Section>
  )
}
