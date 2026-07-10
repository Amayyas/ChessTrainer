import { Outlet } from 'react-router-dom'
import BottomBar from '@/components/Layout/BottomBar'
import Sidebar from '@/components/Layout/Sidebar'
import SkipLink from '@/components/Layout/SkipLink'

export default function AppLayout() {
  return (
    <div className="min-h-dvh bg-ivoire">
      <SkipLink />
      <Sidebar />
      <BottomBar />

      {/* pb-20 clears the mobile bottom bar; md:pl-64 clears the desktop sidebar. */}
      <main id="contenu" className="min-w-[375px] px-4 pb-20 pt-6 md:pb-8 md:pl-64 md:pr-8">
        <Outlet />
      </main>
    </div>
  )
}
