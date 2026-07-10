import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/Layout/AppLayout'
import BattlePage from '@/features/battle/BattlePage'
import CoachPage from '@/features/coach/CoachPage'
import HomePage from '@/features/home/HomePage'
import HuntPage from '@/features/hunt/HuntPage'
import LeaderboardPage from '@/features/leaderboard/LeaderboardPage'
import NotFoundPage from '@/features/NotFoundPage'
import ProfilePage from '@/features/profile/ProfilePage'
import PuzzlePage from '@/features/puzzle/PuzzlePage'
import { ROUTES } from '@/routes'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.coach} element={<CoachPage />} />
        <Route path={ROUTES.battle} element={<BattlePage />} />
        <Route path={ROUTES.puzzle} element={<PuzzlePage />} />
        <Route path={ROUTES.hunt} element={<HuntPage />} />
        <Route path={ROUTES.leaderboard} element={<LeaderboardPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
