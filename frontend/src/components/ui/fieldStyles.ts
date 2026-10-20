/**
 * Shared control styling for public and admin forms.
 *
 * The border is charcoal/50 (~3.4:1 against ivory) so field boundaries meet the
 * WCAG non-text contrast requirement; focus uses the global gold-ink ring.
 */
export const inputClassName =
  'w-full border border-charcoal/50 bg-white px-3 py-2.5 text-body-sm text-charcoal ' +
  'placeholder:text-muted-light transition-colors duration-150 ease-standard ' +
  'hover:border-charcoal/70 focus-visible:border-charcoal'

export const textareaClassName = `${inputClassName} min-h-40 resize-y leading-relaxed`

export const selectClassName = `${inputClassName} pr-8`

export const checkboxClassName =
  'size-4 shrink-0 accent-charcoal border border-charcoal/50'
