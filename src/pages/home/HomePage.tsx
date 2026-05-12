import { Link } from 'react-router-dom'
import {
  FileText, Wrench, Zap, ClipboardList,
  BarChart2, Users, Clock
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

interface ActionCard {
  to: string
  label: string
  icon: React.ElementType
  color: 'orange' | 'navy' | 'gray'
}

const cardsByRole: Record<UserRole, ActionCard[]> = {
  admin: [
    { to: '/admin/access',  label: 'Gestão de Acesso',  icon: Users,          color: 'orange' },
    { to: '/contracts',     label: 'Contratos',          icon: FileText,       color: 'navy' },
    { to: '/forms',         label: 'Formulários',        icon: ClipboardList,  color: 'navy' },
    { to: '/dashboard',     label: 'Dashboard',          icon: BarChart2,      color: 'gray' },
  ],
  gestor: [
    { to: '/contracts',  label: 'Contratos',    icon: FileText,      color: 'orange' },
    { to: '/forms',      label: 'Formulários',  icon: ClipboardList, color: 'navy' },
    { to: '/dashboard',  label: 'Dashboard',    icon: BarChart2,     color: 'navy' },
    { to: '/maintenance',label: 'Preventiva',   icon: Wrench,        color: 'gray' },
  ],
  fiscalizacao: [
    { to: '/forms',       label: 'Formulários Pendentes', icon: Clock,         color: 'orange' },
    { to: '/maintenance', label: 'Preventiva',            icon: Wrench,        color: 'navy' },
    { to: '/irq',         label: 'IRQ',                   icon: Zap,           color: 'navy' },
    { to: '/dashboard',   label: 'Dashboard',             icon: BarChart2,     color: 'gray' },
  ],
  contratada: [
    { to: '/forms',      label: 'Meus Formulários',   icon: ClipboardList,  color: 'orange' },
    { to: '/contracts',  label: 'Meus Contratos',     icon: FileText,       color: 'navy' },
    { to: '/maintenance',label: 'Preventiva',         icon: Wrench,         color: 'navy' },
    { to: '/irq',        label: 'IRQ',                icon: Zap,            color: 'gray' },
  ],
}

const colorClasses = {
  orange: 'bg-metro-orange text-white',
  navy:   'bg-metro-navy text-white',
  gray:   'bg-white text-metro-navy border border-gray-200',
}

export function HomePage() {
  const { profile } = useAuth()
  if (!profile) return null

  const cards = cardsByRole[profile.role] ?? []
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide capitalize">{today}</p>
        <h1 className="text-xl font-bold text-metro-navy">
          Olá, {profile.full_name?.split(' ')[0] ?? 'Usuário'} 👋
        </h1>
        <p className="text-sm text-gray-500 capitalize">{profile.role} · {profile.company_name ?? 'Metrô-DF'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map(card => (
          <Link
            key={card.to}
            to={card.to}
            className={`rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition hover:scale-[1.02] active:scale-95 ${colorClasses[card.color]}`}
          >
            <card.icon size={28} strokeWidth={1.8} />
            <span className="font-semibold text-sm leading-tight">{card.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
