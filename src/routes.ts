/** SPA route table (specification, sections 4.3 and 2.6). */
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
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
