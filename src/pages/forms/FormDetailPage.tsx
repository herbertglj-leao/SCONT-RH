import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ChevronLeft, CheckCircle, XCircle, Clock, Eye,
  ChevronDown, ChevronUp, User
} from 'lucide-react'
import { useExecution, useUpdateExecutionStatus } from '@/hooks/useExecutions'
import { useExecutionHistory } from '@/hooks/useHistory'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'

const rejectSchema = z.object({
  rejection_reason: z.string().min(10, 'Descreva o motivo (mínimo 10 caracteres)'),
})
type RejectForm = z.infer<typeof rejectSchema>

const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  rejection_reason: 'Motivo de Rejeição',
}

const STATUS_PT: Record<string, string> = {
  pendente: 'Pendente',
  em_analise: 'Em Análise',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

export function FormDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [showHistory, setShowHistory] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const { data: exec, isLoading } = useExecution(id ?? '')
  const { data: history } = useExecutionHistory(id ?? '')
  const updateStatus = useUpdateExecutionStatus()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-metro-bg flex items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!exec) {
    return <div className="p-4 text-center text-gray-500">Formulário não encontrado.</div>
  }

  const isFiscalizacao = profile?.role === 'fiscalizacao'
  const isContratada = profile?.role === 'contratada'

  async function handleStartAnalysis() {
    if (exec?.status !== 'pendente') return
    setActionLoading(true)
    try {
      await updateStatus.mutateAsync({ id: exec.id, status: 'em_analise' })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleApprove() {
    if (!exec) return
    setActionLoading(true)
    try {
      await updateStatus.mutateAsync({ id: exec.id, status: 'aprovado' })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject(data: RejectForm) {
    if (!exec) return
    setActionLoading(true)
    try {
      await updateStatus.mutateAsync({
        id: exec.id,
        status: 'rejeitado',
        rejection_reason: data.rejection_reason,
      })
      setShowRejectModal(false)
      reset()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleResubmit() {
    if (!exec) return
    setActionLoading(true)
    try {
      await updateStatus.mutateAsync({ id: exec.id, status: 'pendente' })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-metro-bg pb-8">
      {/* Header */}
      <div className="bg-metro-navy px-4 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm truncate">{exec.plan?.title ?? '—'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge status={exec.status} />
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${exec.plan_type === 'preventiva' ? 'bg-orange-200 text-metro-orange' : 'bg-blue-200 text-blue-700'}`}>
                {exec.plan_type === 'preventiva' ? 'Preventiva' : 'IRQ'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">

        {/* Identification */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-metro-navy uppercase tracking-wide mb-3">Identificação</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Ativo</p>
              <p className="font-medium text-metro-navy">{exec.asset?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Localidade</p>
              <p className="font-medium text-metro-navy">{exec.asset?.location ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Número da OS</p>
              <p className="font-medium text-metro-navy">{exec.os_number ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Item da PSA</p>
              <p className="font-medium text-metro-navy">{exec.psa_item ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Submetido em</p>
              <p className="font-medium text-metro-navy">{new Date(exec.created_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>

        {/* Form data */}
        {Object.keys(exec.form_data).length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-metro-navy uppercase tracking-wide mb-3">Dados do Formulário</p>
            <div className="space-y-3">
              {Object.entries(exec.form_data).map(([key, value]) => (
                <div key={key} className="border-b border-gray-50 pb-2 last:border-0">
                  <p className="text-xs text-gray-400">{key}</p>
                  <p className="text-sm font-medium text-metro-navy">
                    {typeof value === 'boolean'
                      ? (value ? 'Sim ✓' : 'Não ✗')
                      : String(value ?? '—')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejection reason */}
        {exec.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Motivo da Rejeição</p>
            <p className="text-sm text-red-800">{exec.rejection_reason}</p>
          </div>
        )}

        {/* Fiscalização actions */}
        {isFiscalizacao && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-metro-navy uppercase tracking-wide mb-3">Ações de Fiscalização</p>
            <div className="flex gap-3 flex-wrap">
              {exec.status === 'pendente' && (
                <Button variant="secondary" onClick={handleStartAnalysis} loading={actionLoading} className="flex-1">
                  <Eye size={15} /> Iniciar Análise
                </Button>
              )}
              {(exec.status === 'em_analise' || exec.status === 'pendente') && (
                <>
                  <Button onClick={handleApprove} loading={actionLoading} className="flex-1 !bg-green-600 hover:!bg-green-700">
                    <CheckCircle size={15} /> Aprovar
                  </Button>
                  <Button variant="danger" onClick={() => setShowRejectModal(true)} loading={actionLoading} className="flex-1">
                    <XCircle size={15} /> Rejeitar
                  </Button>
                </>
              )}
              {exec.status === 'aprovado' && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle size={16} /> Formulário aprovado
                </div>
              )}
              {exec.status === 'rejeitado' && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
                  <XCircle size={16} /> Aguardando correção da contratada
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contratada resubmit */}
        {isContratada && exec.status === 'rejeitado' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-metro-navy uppercase tracking-wide mb-2">Ação da Contratada</p>
            <p className="text-sm text-gray-500 mb-3">
              Corrija os problemas indicados no motivo de rejeição e reenvie para análise.
            </p>
            <Button onClick={handleResubmit} loading={actionLoading} className="w-full">
              <Clock size={15} /> Reenviar para Análise
            </Button>
          </div>
        )}

        {/* Audit log */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4"
            onClick={() => setShowHistory(!showHistory)}
          >
            <p className="text-xs font-bold text-metro-navy uppercase tracking-wide">
              Histórico de Alterações {history?.length ? `(${history.length})` : ''}
            </p>
            {showHistory
              ? <ChevronUp size={16} className="text-gray-400" />
              : <ChevronDown size={16} className="text-gray-400" />
            }
          </button>
          {showHistory && (
            <div className="border-t border-gray-100">
              {!history || history.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Nenhuma alteração registrada.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {history.map(entry => (
                    <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="w-7 h-7 bg-metro-navy/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <User size={13} className="text-metro-navy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400">
                          {new Date(entry.changed_at).toLocaleString('pt-BR')}
                          {entry.changer?.full_name ? ` · ${entry.changer.full_name}` : ''}
                        </p>
                        <p className="text-sm text-metro-navy mt-0.5">
                          <span className="font-medium">{FIELD_LABELS[entry.field_name] ?? entry.field_name}:</span>{' '}
                          <span className="text-gray-400 line-through text-xs">
                            {STATUS_PT[entry.old_value ?? ''] ?? entry.old_value ?? '—'}
                          </span>
                          {' → '}
                          <span className="font-semibold">
                            {STATUS_PT[entry.new_value ?? ''] ?? entry.new_value ?? '—'}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      <Modal
        open={showRejectModal}
        onClose={() => { setShowRejectModal(false); reset() }}
        title="Rejeitar Formulário"
      >
        <form onSubmit={handleSubmit(handleReject)} className="space-y-4">
          <p className="text-sm text-gray-500">
            Descreva claramente o motivo da rejeição para que a contratada possa corrigir.
          </p>
          <div>
            <label className="block text-xs font-semibold text-metro-navy mb-1">
              Motivo da Rejeição *
            </label>
            <textarea
              {...register('rejection_reason')}
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-metro-orange resize-none"
              placeholder="Descreva o motivo da rejeição..."
            />
            {errors.rejection_reason && (
              <p className="text-xs text-red-500 mt-1">{errors.rejection_reason.message}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowRejectModal(false); reset() }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" variant="danger" loading={actionLoading} className="flex-1">
              Confirmar Rejeição
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
