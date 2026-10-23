/** Splits plain text into paragraphs on blank lines. */
export function textParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

/** Splits a plain-text biography into paragraphs on blank lines. */
export function biographyParagraphs(biography: string): string[] {
  return textParagraphs(biography)
}

/** The first paragraph, used for concise hero and metadata summaries. */
export function biographySummary(biography: string): string {
  return biographyParagraphs(biography)[0] ?? biography.trim()
}
