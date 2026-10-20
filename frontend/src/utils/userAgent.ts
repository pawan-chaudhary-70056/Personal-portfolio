/**
 * Turns a raw user-agent string into a short, non-identifying device summary.
 * The stored string is only ever rendered as text, never parsed as markup.
 */
export function describeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) {
    return 'Unknown device'
  }

  const browser =
    /Edg\//.test(userAgent)
      ? 'Edge'
      : /OPR\//.test(userAgent)
        ? 'Opera'
        : /Chrome\//.test(userAgent)
          ? 'Chrome'
          : /Firefox\//.test(userAgent)
            ? 'Firefox'
            : /Safari\//.test(userAgent)
              ? 'Safari'
              : 'Browser'

  const platform =
    /iPhone|iPad|iPod/.test(userAgent)
      ? 'iOS'
      : /Android/.test(userAgent)
        ? 'Android'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(userAgent)
            ? 'macOS'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : null

  return platform ? `${browser} on ${platform}` : browser
}
