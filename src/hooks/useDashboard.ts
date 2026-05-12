import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface KPIs {
  totalOS: number
  preventivasDone: number
  irqPending: number
  conformanceRate: number
}

export interface MonthlyPoint {
  month: string
  preventiva: number
  irq: number
}

export function useKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async (): Promise<KPIs> => {
      const { data, error } = await supabase
        .from('maintenance_executions')
        .select('status, plan_type')
      if (error) throw error

      const rows = data ?? []
      const totalOS = rows.length
      const preventivasDone = rows.filter(r => r.plan_type === 'preventiva' && r.status === 'aprovado').length
      const irqPending = rows.filter(r => r.plan_type === 'irq' && r.status === 'pendente').length
      const approved = rows.filter(r => r.status === 'aprovado').length
      const conformanceRate = totalOS > 0 ? Math.round((approved / totalOS) * 100) : 0

      return { totalOS, preventivasDone, irqPending, conformanceRate }
    },
  })
}

export function useMonthlyChart() {
  return useQuery({
    queryKey: ['dashboard', 'monthly'],
    queryFn: async (): Promise<MonthlyPoint[]> => {
      const since = new Date()
      since.setMonth(since.getMonth() - 5)
      since.setDate(1)

      const { data, error } = await supabase
        .from('maintenance_executions')
        .select('plan_type, created_at')
        .gte('created_at', since.toISOString())
      if (error) throw error

      const map: Record<string, { preventiva: number; irq: number }> = {}
      for (const row of data ?? []) {
        const key = new Date(row.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        if (!map[key]) map[key] = { preventiva: 0, irq: 0 }
        if (row.plan_type === 'preventiva') map[key].preventiva++
        else map[key].irq++
      }

      return Object.entries(map).map(([month, counts]) => ({ month, ...counts }))
    },
  })
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['dashboard', 'recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_executions')
        .select('id, status, plan_type, os_number, created_at, plan:maintenance_plans(title), asset:assets(name)')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data ?? []
    },
  })
}
