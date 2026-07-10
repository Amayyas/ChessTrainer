/**
 * Table des routes de la SPA (cahier des charges, section 4.3).
 * Les routes d'authentification (/login, /register) sont ajoutees au module M10.
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
