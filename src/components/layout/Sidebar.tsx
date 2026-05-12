import { NavLink } from 'react-router-dom'
import {
  Home, FileText, Wrench, Zap, ClipboardList,
  BarChart2, Users, Settings
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { to: '/',              label: 'Início',           icon: Home,          roles: ['admin','gestor','fiscalizacao','contratada'] },
  { to: '/contracts',     label: 'Contratos',        icon: FileText,      roles: ['admin','gestor','contratada'] },
  { to: '/maintenance',   label: 'Preventiva',       icon: Wrench,        roles: ['admin','gestor','fiscalizacao','contratada'] },
  { to: '/irq',           label: 'IRQ',              icon: Zap,           roles: ['admin','gestor','fiscalizacao','contratada'] },
  { to: '/forms',         label: 'Formulários',      icon: ClipboardList, roles: ['admin','gestor','fiscalizacao','contratada'] },
  { to: '/dashboard',     label: 'Dashboard',        icon: BarChart2,     roles: ['admin','gestor','fiscalizacao'] },
  { to: '/admin/access',  label: 'Gestão de Acesso', icon: Users,         roles: ['admin'] },
  { to: '/admin/settings',label: 'Configurações',    icon: Settings,      roles: ['admin'] },
]

export function Sidebar() {
  const { profile } = useAuth()

  const visible = navItems.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  )

  return (
    <aside className="w-60 bg-metro-navy text-white flex flex-col shrink-0 h-full overflow-y-auto">
      <nav className="flex-1 p-3 space-y-1">
        {visible.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-metro-orange text-white shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
