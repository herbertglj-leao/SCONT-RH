import { LogOut, Bell } from 'lucide-react'
import { ViewModeToggle } from './ViewModeToggle'
import { useAuth } from '@/hooks/useAuth'

export function Header() {
  const { profile, signOut } = useAuth()

  return (
    <header className="bg-metro-navy text-white h-14 flex items-center justify-between px-4 shrink-0 z-30 shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-metro-orange flex items-center justify-center font-black text-base">
          M
        </div>
        <span className="font-bold text-sm hidden sm:block">Metrô-DF Manutenção</span>
      </div>

      <div className="flex items-center gap-2">
        <ViewModeToggle />
        <button className="p-2 hover:bg-white/10 rounded-lg transition">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-2 ml-1">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium">{profile?.full_name ?? 'Usuário'}</p>
            <p className="text-xs text-white/60 capitalize">{profile?.role}</p>
          </div>
          <button
            onClick={signOut}
            title="Sair"
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
