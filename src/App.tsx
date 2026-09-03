import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/Layout/AppLayout'
import RouteFallback from '@/components/Layout/RouteFallback'
import RequireAuth from '@/features/auth/RequireAuth'
import LandingPage from '@/features/home/LandingPage'
import { useProgressionSync } from '@/features/progression/useProgressionSync'
import { ROUTES } from '@/routes'
import AuthLinkLanding from '@/features/auth/AuthLinkLanding'
import DocumentHead from '@/features/seo/DocumentHead'
import { useAuthStore } from '@/store/useAuthStore'

// The public landing on '/' stays eager so the first paint — the one Lighthouse
// measures — needs no extra chunk. Every other route is split out, the dashboard
// included: it is behind a visit to '/dashboard', not the address a new visitor
// or a crawler lands on, so it has no claim on the initial bundle.
const DashboardPage = lazy(() => import('@/features/home/HomePage'))
const CoachPage = lazy(() => import('@/features/coach/CoachPage'))
const BattlePage = lazy(() => import('@/features/battle/BattlePage'))
const PuzzlePage = lazy(() => import('@/features/puzzle/PuzzlePage'))
const HuntPage = lazy(() => import('@/features/hunt/HuntPage'))
const LeaderboardPage = lazy(() => import('@/features/leaderboard/LeaderboardPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'))
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
    <>
      {/* Redirects an emailed link to the screen it was for, wherever Supabase
          happened to land it. Renders nothing. */}
      <AuthLinkLanding />
      {/* Keeps the title and canonical in step with the route. Renders nothing. */}
      <DocumentHead />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.home} element={<LandingPage />} />
          <Route
            path={ROUTES.dashboard}
            element={
              <Suspense fallback={<RouteFallback />}>
                <DashboardPage />
              </Suspense>
            }
          />
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
            path={ROUTES.forgotPassword}
            element={
              <Suspense fallback={<RouteFallback />}>
                <ForgotPasswordPage />
              </Suspense>
            }
          />
          <Route
            path={ROUTES.resetPassword}
            element={
              <Suspense fallback={<RouteFallback />}>
                <ResetPasswordPage />
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
    </>
  )
}
