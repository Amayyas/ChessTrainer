/** SPA route table. */
export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  coach: '/coach',
  battle: '/battle',
  puzzle: '/puzzle',
  hunt: '/hunt',
  leaderboard: '/leaderboard',
  profile: '/profile',
  login: '/login',
  register: '/register',
  forgotPassword: '/mot-de-passe-oublie',
  resetPassword: '/nouveau-mot-de-passe',
  legal: '/mentions-legales',
  privacy: '/confidentialite',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
