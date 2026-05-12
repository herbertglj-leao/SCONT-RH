import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'
import { TrendingUp, Wrench, Zap, CheckSquare } from 'lucide-react'
import { useKPIs, useMonthlyChart, useRecentActivity } from '@/hooks/useDashboard'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

interface KPICardProps {
  label: string
  value: number | string
  icon: React.ElementType
  color: 'orange' | 'navy' | 'green' | 'blue'
}

function KPICard({ label, value, icon: Icon, color }: KPICardProps) {
  const colorMap = {
    orange: 'bg-metro-orange text-white',
    navy:   'bg-metro-navy text-white',
    green:  'bg-green-600 text-white',
    blue:   'bg-blue-600 text-white',
  }
  return (
    <div className={`rounded-2xl p-4 shadow-sm ${colorMap[color]}`}>
      <Icon size={22} strokeWidth={1.8} className="opacity-80 mb-2" />
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs font-medium opacity-80 mt-1 leading-tight">{label}</p>
    </div>
  )
}

export function DashboardPage() {
  const { data: kpis, isLoading: loadingKPIs } = useKPIs()
  const { data: monthly, isLoading: loadingChart } = useMonthlyChart()
  const { data: recent, isLoading: loadingRecent } = useRecentActivity()

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-metro-navy">Dashboard</h1>
        <p className="text-sm text-gray-500">Visão geral das manutenções</p>
      </div>

      {/* KPI cards */}
      {loadingKPIs ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            label="Total de OS"
            value={kpis?.totalOS ?? 0}
            icon={TrendingUp}
            color="navy"
          />
          <KPICard
            label="Preventivas Aprovadas"
            value={kpis?.preventivasDone ?? 0}
            icon={Wrench}
            color="orange"
          />
          <KPICard
            label="IRQs Pendentes"
            value={kpis?.irqPending ?? 0}
            icon={Zap}
            color="blue"
          />
          <KPICard
            label="Taxa de Conformidade"
            value={`${kpis?.conformanceRate ?? 0}%`}
            icon={CheckSquare}
            color="green"
          />
        </div>
      )}

      {/* Monthly chart */}
      <Card className="p-4">
        <p className="text-xs font-bold text-metro-navy uppercase tracking-wide mb-4">
          Últimos 6 Meses — Registros por Tipo
        </p>
        {loadingChart ? (
          <Spinner />
        ) : !monthly || monthly.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sem dados para o período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                labelStyle={{ fontWeight: 700, color: '#1A2B4A' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="preventiva" name="Preventiva" fill="#F47920" radius={[4, 4, 0, 0]} />
              <Bar dataKey="irq" name="IRQ" fill="#1A2B4A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Recent activity */}
      <Card className="p-4">
        <p className="text-xs font-bold text-metro-navy uppercase tracking-wide mb-3">
          Atividade Recente
        </p>
        {loadingRecent ? (
          <Spinner />
        ) : !recent || recent.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma atividade recente.</p>
        ) : (
          <div className="space-y-2">
            {recent.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <div className={`w-1.5 h-8 rounded-full shrink-0 ${
                  item.status === 'pendente'   ? 'bg-yellow-400' :
                  item.status === 'em_analise' ? 'bg-blue-400'   :
                  item.status === 'aprovado'   ? 'bg-green-500'  :
                                                  'bg-red-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-metro-navy truncate">
                    {(item.plan as { title?: string } | null)?.title ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(item.asset as { name?: string } | null)?.name ?? '—'} · OS: {item.os_number ?? '—'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge status={item.status} />
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
