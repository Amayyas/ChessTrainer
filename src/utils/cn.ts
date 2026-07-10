type ClassValue = string | number | false | null | undefined

/**
 * Minimal class-name joiner. Filters out falsy values so conditional classes
 * can be written inline: cn('base', isActive && 'active'). Kept dependency-free
 * on purpose — the project has no need for the full clsx/tailwind-merge stack yet.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
