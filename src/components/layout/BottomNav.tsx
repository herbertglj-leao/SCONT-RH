import { NavLink } from 'react-router-dom'
import { Home, FileText, ClipboardList, BarChart2, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

interface BottomNavItem {
  to: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

const bottomItems: BottomNavItem[] = [
  { to: '/',             label: 'Início',      icon: Home,          roles: ['admin','gestor','fiscalizacao','contratada'] },
  { to: '/contracts',    label: 'Contratos',   icon: FileText,      roles: ['admin','gestor','contratada'] },
  { to: '/forms',        label: 'Formulários', icon: ClipboardList, roles: ['admin','gestor','fiscalizacao','contratada'] },
  { to: '/dashboard',    label: 'Dashboard',   icon: BarChart2,     roles: ['admin','gestor','fiscalizacao'] },
  { to: '/admin/access', label: 'Acessos',     icon: Users,         roles: ['admin'] },
]

export function BottomNav() {
  const { profile } = useAuth()

  const visible = bottomItems.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  )

  return (
    <nav className="bg-white border-t border-gray-200 flex items-center justify-around h-16 shrink-0 px-2">
      {visible.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center gap-1 flex-1 py-1 rounded-xl transition',
              isActive ? 'text-metro-orange' : 'text-gray-500',
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
