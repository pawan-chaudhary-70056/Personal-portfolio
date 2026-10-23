import { useState, type FormEvent } from 'react'
import { ApiError } from '@/api/client'
import { submitContactMessage } from '@/api/contact.api'
import { FormField } from '@/components/forms/FormField'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { inputClassName, textareaClassName } from '@/components/ui/fieldStyles'
import { toFieldErrors } from '@/utils/apiErrors'

interface ContactFormValues {
  name: string
  email: string
  subject: string
  message: string
  website: string
}

const EMPTY_VALUES: ContactFormValues = {
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values: ContactFormValues): Record<string, string> {
  const errors: Record<string, string> = {}

  if (values.name.trim().length < 2) {
    errors.name = 'Enter your name (at least 2 characters).'
  }

  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (values.subject.trim().length > 150) {
    errors.subject = 'Keep the subject under 150 characters.'
  }

  if (values.message.trim().length < 10) {
    errors.message = 'Tell me a little more — at least 10 characters.'
  }

  return errors
}

const GENERIC_ERROR = 'The message could not be sent. Please try again.'

export function ContactForm() {
  const [values, setValues] = useState<ContactFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting) {
      return
    }

    setFormError(null)
    setConfirmation(null)

    const nextErrors = validate(values)
    setErrors(nextErrors)

    const firstInvalid = Object.keys(nextErrors)[0]
    if (firstInvalid) {
      document.getElementById(`contact-${firstInvalid}`)?.focus()
      return
    }

    setSubmitting(true)

    try {
      const message = await submitContactMessage({
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
        website: values.website,
      })

      setConfirmation(message)
      setValues(EMPTY_VALUES)
    } catch (caught) {
      if (caught instanceof ApiError) {
        const fieldErrors = toFieldErrors(caught.details)

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors)
        } else if (caught.status === 429) {
          setFormError('Too many messages have been sent. Please wait a few minutes and try again.')
        } else {
          setFormError(GENERIC_ERROR)
        }
      } else {
        setFormError(GENERIC_ERROR)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <div role="status" className="mt-10 border border-success/30 bg-success/5 p-6">
        <p className="font-serif text-h3 text-charcoal">Message received.</p>
        <p className="mt-2 max-w-md text-body-sm text-charcoal/70">{confirmation}</p>
        <button
          type="button"
          onClick={() => setConfirmation(null)}
          className="mt-6 min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
        >
          Send another message
        </button>
      </div>
    )
  }

  const invalid = (field: string) => (errors[field] ? true : undefined)
  const describedBy = (field: string) => (errors[field] ? `contact-${field}-error` : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-6">
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

      {/* Honeypot: visually hidden and skipped by keyboard and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => update('website', event.target.value)}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="contact-name" label="Name" required error={errors.name}>
          <input
            id="contact-name"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            autoComplete="name"
            maxLength={100}
            aria-invalid={invalid('name')}
            aria-describedby={describedBy('name')}
            className={inputClassName}
          />
        </FormField>

        <FormField id="contact-email" label="Email" required error={errors.email}>
          <input
            id="contact-email"
            type="email"
            value={values.email}
            onChange={(event) => update('email', event.target.value)}
            autoComplete="email"
            maxLength={254}
            aria-invalid={invalid('email')}
            aria-describedby={describedBy('email')}
            className={inputClassName}
          />
        </FormField>
      </div>

      <FormField
        id="contact-subject"
        label="Subject"
        hint="Optional. A short summary of the enquiry."
        error={errors.subject}
      >
        <input
          id="contact-subject"
          value={values.subject}
          onChange={(event) => update('subject', event.target.value)}
          maxLength={150}
          aria-invalid={invalid('subject')}
          aria-describedby={describedBy('subject')}
          className={inputClassName}
        />
      </FormField>

      <FormField
        id="contact-message"
        label="Message"
        required
        hint={`${values.message.length}/5000 characters.`}
        error={errors.message}
      >
        <textarea
          id="contact-message"
          rows={6}
          value={values.message}
          onChange={(event) => update('message', event.target.value)}
          maxLength={5000}
          aria-invalid={invalid('message')}
          aria-describedby={describedBy('message')}
          className={textareaClassName}
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-12 bg-gold px-6 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d] disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send message'}
        </button>
        <p className="max-w-xs text-caption text-muted-light">
          Your details are used only to reply to this enquiry.
        </p>
      </div>
    </form>
  )
}
