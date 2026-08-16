/** SPA route table. */
export const ROUTES = {
  home: '/',
  coach: '/coach',
  battle: '/battle',
  puzzle: '/puzzle',
  hunt: '/hunt',
  leaderboard: '/leaderboard',
  profile: '/profile',
  login: '/login',
  register: '/register',
  legal: '/mentions-legales',
  privacy: '/confidentialite',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
