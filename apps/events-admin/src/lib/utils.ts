import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
}

const DATE_WITH_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}

/**
 * Formats a date string to a human-readable format
 * @param dateString - ISO date string or Date-compatible string
 * @param options - Either Intl.DateTimeFormatOptions or `true` to include time
 */
export function formatDate(
  dateString: string,
  options?: Intl.DateTimeFormatOptions | boolean
): string {
  if (!dateString) return '-'
  try {
    const formatOptions =
      options === true
        ? DATE_WITH_TIME_OPTIONS
        : options === false || options === undefined
          ? DEFAULT_DATE_OPTIONS
          : options
    return new Intl.DateTimeFormat('en-US', formatOptions).format(new Date(dateString))
  } catch {
    return '-'
  }
}
