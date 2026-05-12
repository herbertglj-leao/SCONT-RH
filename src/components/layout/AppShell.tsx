import type { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { useViewMode } from '@/hooks/useViewMode'

export function AppShell({ children }: { children: ReactNode }) {
  const { isDesktop } = useViewMode()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {isDesktop && <Sidebar />}
        <main className="flex-1 overflow-y-auto bg-metro-bg">
          {children}
        </main>
      </div>
      {!isDesktop && <BottomNav />}
    </div>
  )
}
