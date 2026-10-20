import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { signIn } from '@/api/auth.api'
import { useSession } from '@/auth/useSession'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { FormField } from '@/components/forms/FormField'
import { inputClassName } from '@/components/ui/fieldStyles'
import { setPageMetadata } from '@/utils/metadata'

export function AdminLoginPage() {
  const { status, signInAs } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const requestedPath = (location.state as { from?: string } | null)?.from
  const destination = requestedPath?.startsWith('/admin') ? requestedPath : '/admin'

  useEffect(() => {
    setPageMetadata({
      title: 'Admin sign in — Portfolio',
      description: 'Restricted administrative access.',
    })
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      navigate(destination, { replace: true })
    }
  }, [status, navigate, destination])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const { admin } = await signIn(email.trim(), password)
      signInAs(admin)
      navigate(destination, { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Sign-in failed. Check your connection and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-charcoal text-ivory">
      <div className="mx-auto flex w-full max-w-content flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium tracking-[0.3em] text-gold uppercase">Portfolio</p>
            <p className="mt-1 text-caption tracking-[0.14em] text-ivory/50 uppercase">
              Restricted area
            </p>
          </div>

          <div className="bg-ivory p-8 text-charcoal sm:p-10">
            <h1 className="text-h3">Sign in</h1>
            <p className="mt-2 text-body-sm text-charcoal/70">
              Administrative access is limited to the portfolio owner.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

              <FormField id="email" label="Email" required>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  className={inputClassName}
                />
              </FormField>

              <FormField id="password" label="Password" required>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  className={inputClassName}
                />
              </FormField>

              <button
                type="submit"
                disabled={submitting}
                className="min-h-12 w-full bg-gold px-6 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d] disabled:opacity-60"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-caption text-muted-light">
              There is no public registration. Accounts are provisioned by the site owner.
            </p>
          </div>

          <p className="mt-8 text-center">
            <Link
              to="/"
              className="link-underline text-body-sm text-ivory/60 hover:text-ivory"
            >
              ← Back to portfolio
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
