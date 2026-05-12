import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, FileText, Calendar, DollarSign } from 'lucide-react'
import { useContracts } from '@/hooks/useContracts'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'active',     label: 'Ativos' },
  { value: 'suspended',  label: 'Suspensos' },
  { value: 'expired',    label: 'Expirados' },
  { value: 'terminated', label: 'Encerrados' },
]

export function ContractsListPage() {
  const { profile } = useAuth()
  const { data: contracts = [], isLoading } = useContracts()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const canCreate = profile?.role === 'admin' || profile?.role === 'gestor'

  const filtered = contracts.filter(c => {
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.contract_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.contractor?.company_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || c.status === statusFilter
    return matchSearch && matchStatus
  })

  if (isLoading) return <Spinner />

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <FileText size={22} className="text-metro-orange" />
          <h1 className="text-xl font-bold text-metro-navy">Contratos</h1>
          <span className="bg-metro-bg text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </div>
        {canCreate && (
          <Link to="/contracts/new">
            <Button size="sm"><Plus size={16} /> Novo</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título, número ou empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-metro-orange bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-metro-orange bg-white"
        >
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum contrato encontrado.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(contract => (
          <Link key={contract.id} to={`/contracts/${contract.id}`}>
            <Card className="hover:shadow-md transition group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-metro-navy text-sm truncate group-hover:text-metro-orange transition">
                      {contract.title}
                    </p>
                    <Badge status={contract.status} />
                  </div>
                  <p className="text-xs text-gray-400 font-mono mb-1">#{contract.contract_number}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{contract.object}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {contract.contractor?.company_name ?? contract.contractor?.full_name ?? '—'}
                  </p>
                </div>
                <div className="shrink-0 text-right space-y-1">
                  {contract.value != null && (
                    <div className="flex items-center gap-1 justify-end text-xs text-gray-500">
                      <DollarSign size={11} />
                      {contract.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  )}
                  <div className="flex items-center gap-1 justify-end text-xs text-gray-400">
                    <Calendar size={11} />
                    {new Date(contract.start_date).toLocaleDateString('pt-BR')}
                    {contract.end_date && ` → ${new Date(contract.end_date).toLocaleDateString('pt-BR')}`}
                  </div>
                  {contract.sla_response_hours && (
                    <p className="text-xs text-blue-500">SLA {contract.sla_response_hours}h resposta</p>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
