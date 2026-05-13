import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, ClipboardList } from 'lucide-react'
import { useAllExecutions } from '@/hooks/useExecutions'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import type { ExecutionStatus, PlanType } from '@/types'

const STATUS_OPTIONS: { value: ExecutionStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_analise', label: 'Em Análise' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'rejeitado', label: 'Rejeitado' },
]

const TYPE_OPTIONS: { value: PlanType | ''; label: string }[] = [
  { value: '', label: 'Todos os tipos' },
  { value: 'preventiva', label: 'Preventiva' },
  { value: 'irq', label: 'IRQ' },
]

export function FormsListPage() {
  const { data: executions, isLoading } = useAllExecutions()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<PlanType | ''>('')

  const filtered = (executions ?? []).filter(e => {
    const matchSearch =
      !search ||
      (e.os_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.equipment?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.plan?.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.psa_item ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || e.status === statusFilter
    const matchType = !typeFilter || e.plan_type === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const statusCounts = {
    pendente: (executions ?? []).filter(e => e.status === 'pendente').length,
    em_analise: (executions ?? []).filter(e => e.status === 'em_analise').length,
    rejeitado: (executions ?? []).filter(e => e.status === 'rejeitado').length,
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-metro-navy">Gerenciador de Formulários</h1>
        <p className="text-sm text-gray-500">{filtered.length} formulários</p>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statusCounts.pendente > 0 && (
          <button
            onClick={() => setStatusFilter(statusFilter === 'pendente' ? '' : 'pendente')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${statusFilter === 'pendente' ? 'bg-yellow-400 text-yellow-900' : 'bg-yellow-100 text-yellow-800'}`}
          >
            {statusCounts.pendente} pendentes
          </button>
        )}
        {statusCounts.em_analise > 0 && (
          <button
            onClick={() => setStatusFilter(statusFilter === 'em_analise' ? '' : 'em_analise')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${statusFilter === 'em_analise' ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-800'}`}
          >
            {statusCounts.em_analise} em análise
          </button>
        )}
        {statusCounts.rejeitado > 0 && (
          <button
            onClick={() => setStatusFilter(statusFilter === 'rejeitado' ? '' : 'rejeitado')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${statusFilter === 'rejeitado' ? 'bg-red-400 text-white' : 'bg-red-100 text-red-800'}`}
          >
            {statusCounts.rejeitado} rejeitados
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Buscar OS, ativo, plano ou PSA..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-metro-orange bg-white"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as ExecutionStatus | '')}
            className="pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-metro-orange bg-white appearance-none"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as PlanType | '')}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-metro-orange bg-white appearance-none"
        >
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          <ClipboardList size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Nenhum formulário encontrado.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(exec => (
            <Link key={exec.id} to={`/forms/${exec.id}`}>
              <Card className="p-3 hover:border-metro-orange transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-12 rounded-full shrink-0 ${
                    exec.status === 'pendente'    ? 'bg-yellow-400' :
                    exec.status === 'em_analise'  ? 'bg-blue-400' :
                    exec.status === 'aprovado'    ? 'bg-green-500' :
                                                    'bg-red-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-metro-navy text-sm truncate">{exec.plan?.title ?? '—'}</p>
                      <Badge status={exec.status} />
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${exec.plan_type === 'preventiva' ? 'bg-orange-100 text-metro-orange' : 'bg-blue-100 text-blue-700'}`}>
                        {exec.plan_type === 'preventiva' ? 'Prev.' : 'IRQ'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span>{exec.equipment?.name ?? '—'}</span>
                      <span>OS: {exec.os_number ?? '—'}</span>
                      <span>{new Date(exec.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
