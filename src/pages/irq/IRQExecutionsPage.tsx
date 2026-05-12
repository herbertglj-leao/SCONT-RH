import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Search, Filter } from 'lucide-react'
import { useExecutions } from '@/hooks/useExecutions'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import type { ExecutionStatus } from '@/types'

const STATUS_OPTIONS: { value: ExecutionStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_analise', label: 'Em Análise' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'rejeitado', label: 'Rejeitado' },
]

export function IRQExecutionsPage() {
  const { data: executions, isLoading } = useExecutions('irq')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | ''>('')

  const filtered = (executions ?? []).filter(e => {
    const matchSearch =
      !search ||
      (e.os_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.asset?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.plan?.title ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || e.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-metro-navy">IRQ — Inspeção/Intervenção Rápida</h1>
        <p className="text-sm text-gray-500">{filtered.length} registros</p>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Buscar OS, ativo ou plano..."
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
      </div>

      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          <Zap size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Nenhum registro de IRQ encontrado.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(exec => (
            <Link key={exec.id} to={`/forms/${exec.id}`}>
              <Card className="p-4 hover:border-metro-orange transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-metro-navy text-sm truncate">{exec.plan?.title ?? '—'}</p>
                    <Badge status={exec.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{exec.asset?.name ?? '—'}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>OS: {exec.os_number ?? '—'}</span>
                    <span>PSA: {exec.psa_item ?? '—'}</span>
                    <span>{new Date(exec.created_at).toLocaleDateString('pt-BR')}</span>
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
