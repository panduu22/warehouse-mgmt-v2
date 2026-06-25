/**
 * Date utilities that enforce Indian Standard Time (Asia/Kolkata).
 * All functions return JavaScript `Date` objects or formatted strings
 * that reflect IST regardless of the server's timezone (Vercel runs UTC).
 */

/**
 * Convert a Date or ISO string to a Date representing the same wall‑time in IST.
 * This is useful for comparisons and MongoDB range queries.
 */
export function toIST(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Convert to UTC milliseconds, then add IST offset (5.5 h = 330 min).
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000;
  const istMs = utcMs + 330 * 60_000;
  return new Date(istMs);
}

/**
 * Format a Date (or ISO string) using the Asia/Kolkata timezone.
 * Pass optional Intl options for dateStyle / timeStyle etc.
 */
export function formatIST(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...options }).format(d);
}

/**
 * Return an ISO‑8601 string (yyyy‑mm‑dd) for the current IST date.
 * Useful for URL query params and API defaults.
 *
 * FIX: Do NOT use toISOString() — it converts back to UTC and returns the
 * wrong date after midnight IST. Instead extract year/month/day directly
 * from the IST-localized representation.
 */
export function isoDateIST(date: Date = new Date()): string {
  // Extract the year, month, and day parts as seen in Asia/Kolkata.
  const parts = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD format
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const d = parts.find(p => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}
