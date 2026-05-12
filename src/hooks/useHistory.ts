import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MaintenanceHistory } from '@/types'

export function useExecutionHistory(executionId: string) {
  return useQuery({
    queryKey: ['history', executionId],
    queryFn: async (): Promise<MaintenanceHistory[]> => {
      const { data, error } = await supabase
        .from('maintenance_history')
        .select('*, changer:profiles!changed_by(full_name,role)')
        .eq('execution_id', executionId)
        .order('changed_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as MaintenanceHistory[]
    },
    enabled: !!executionId,
  })
}
