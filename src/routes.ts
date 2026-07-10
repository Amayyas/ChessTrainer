/**
 * SPA route table (specification, section 4.3).
 * Authentication routes (/login, /register) are added in module M10.
 */
export const ROUTES = {
  home: '/',
  coach: '/coach',
  battle: '/battle',
  puzzle: '/puzzle',
  hunt: '/hunt',
  leaderboard: '/leaderboard',
  profile: '/profile',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
