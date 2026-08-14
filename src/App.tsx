import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/Layout/AppLayout'
import RouteFallback from '@/components/Layout/RouteFallback'
import RequireAuth from '@/features/auth/RequireAuth'
import HomePage from '@/features/home/HomePage'
import { useProgressionSync } from '@/features/progression/useProgressionSync'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

// The home route stays eager so the landing paint — the one Lighthouse measures
// — needs no extra chunk. Every other route is split out, which keeps the board,
// the react-chessboard library and the engine wrapper out of the initial bundle
// until a mode that needs them is opened.
const CoachPage = lazy(() => import('@/features/coach/CoachPage'))
const BattlePage = lazy(() => import('@/features/battle/BattlePage'))
const PuzzlePage = lazy(() => import('@/features/puzzle/PuzzlePage'))
const HuntPage = lazy(() => import('@/features/hunt/HuntPage'))
const LeaderboardPage = lazy(() => import('@/features/leaderboard/LeaderboardPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'))
const NotFoundPage = lazy(() => import('@/features/NotFoundPage'))
const LegalPage = lazy(() => import('@/features/legal/LegalPage'))
const PrivacyPage = lazy(() => import('@/features/legal/PrivacyPage'))

export default function App() {
  const initialise = useAuthStore((state) => state.initialise)

  // Restores the stored session and follows sign-in/sign-out for the whole app.
  useEffect(() => initialise(), [initialise])

  // Mirrors the progression to Supabase for a signed-in account (deliverable 5).
  useProgressionSync()

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route
          path={ROUTES.coach}
          element={
            <Suspense fallback={<RouteFallback />}>
              <CoachPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.battle}
          element={
            <Suspense fallback={<RouteFallback />}>
              <BattlePage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.puzzle}
          element={
            <Suspense fallback={<RouteFallback />}>
              <PuzzlePage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.hunt}
          element={
            <Suspense fallback={<RouteFallback />}>
              <HuntPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.leaderboard}
          element={
            <RequireAuth>
              <Suspense fallback={<RouteFallback />}>
                <LeaderboardPage />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path={ROUTES.login}
          element={
            <Suspense fallback={<RouteFallback />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.register}
          element={
            <Suspense fallback={<RouteFallback />}>
              <RegisterPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.profile}
          element={
            <Suspense fallback={<RouteFallback />}>
              <ProfilePage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.legal}
          element={
            <Suspense fallback={<RouteFallback />}>
              <LegalPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.privacy}
          element={
            <Suspense fallback={<RouteFallback />}>
              <PrivacyPage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}
