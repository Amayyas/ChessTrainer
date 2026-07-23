import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/Layout/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import RegisterPage from '@/features/auth/RegisterPage'
import RequireAuth from '@/features/auth/RequireAuth'
import BattlePage from '@/features/battle/BattlePage'
import CoachPage from '@/features/coach/CoachPage'
import HomePage from '@/features/home/HomePage'
import HuntPage from '@/features/hunt/HuntPage'
import LeaderboardPage from '@/features/leaderboard/LeaderboardPage'
import NotFoundPage from '@/features/NotFoundPage'
import { useProgressionSync } from '@/features/progression/useProgressionSync'
import ProfilePage from '@/features/profile/ProfilePage'
import PuzzlePage from '@/features/puzzle/PuzzlePage'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

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
        <Route path={ROUTES.coach} element={<CoachPage />} />
        <Route path={ROUTES.battle} element={<BattlePage />} />
        <Route path={ROUTES.puzzle} element={<PuzzlePage />} />
        <Route path={ROUTES.hunt} element={<HuntPage />} />
        <Route
          path={ROUTES.leaderboard}
          element={
            <RequireAuth>
              <LeaderboardPage />
            </RequireAuth>
          }
        />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
