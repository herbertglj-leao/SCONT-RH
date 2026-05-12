import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { MaintenanceExecution, PlanType, ExecutionStatus } from '@/types'

export function useExecutions(planType?: PlanType) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['executions', planType, profile?.id, profile?.role],
    queryFn: async (): Promise<MaintenanceExecution[]> => {
      let query = supabase
        .from('maintenance_executions')
        .select('*, plan:maintenance_plans(id,title,plan_type), asset:assets(id,name,location)')
        .order('created_at', { ascending: false })

      if (planType) query = query.eq('plan_type', planType)

      if (profile?.role === 'contratada') {
        const contractsRes = await supabase
          .from('contracts')
          .select('id')
          .eq('contractor_profile_id', profile.id)
        const contractIds = (contractsRes.data ?? []).map(c => c.id)
        if (contractIds.length === 0) return []

        const assetsRes = await supabase
          .from('assets')
          .select('id')
          .in('contract_id', contractIds)
        const ids = (assetsRes.data ?? []).map(a => a.id)
        if (ids.length === 0) return []
        query = query.in('asset_id', ids)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as MaintenanceExecution[]
    },
    enabled: !!profile,
  })
}

export function useExecution(id: string) {
  return useQuery({
    queryKey: ['executions', id],
    queryFn: async (): Promise<MaintenanceExecution> => {
      const { data, error } = await supabase
        .from('maintenance_executions')
        .select('*, plan:maintenance_plans(id,title,plan_type), asset:assets(id,name,location)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as MaintenanceExecution
    },
    enabled: !!id,
  })
}

export function useSubmitExecution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      plan_id: string
      asset_id: string
      plan_type: PlanType
      os_number: string
      psa_item: string
      form_data: Record<string, unknown>
    }) => {
      const { error } = await supabase.from('maintenance_executions').insert({
        ...data,
        status: 'pendente',
        scheduled_date: new Date().toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['executions'] }),
  })
}

export function useUpdateExecutionStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: ExecutionStatus; rejection_reason?: string }) => {
      const { error } = await supabase
        .from('maintenance_executions')
        .update({ status, ...(rejection_reason ? { rejection_reason } : {}) })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['executions'] }),
  })
}
