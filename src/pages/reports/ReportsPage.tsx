import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { BarChart2, AlertTriangle, CheckCircle, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { useFormMetadata } from '@/hooks/useFormMetadata'
import type { FormFieldMeta } from '@/hooks/useFormMetadata'

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useAllPlans() {
  return useQuery({
    queryKey: ['maintenance_plans', 'all_for_reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_plans')
        .select('id, title, plan_type, forms_catalog:forms_catalog(id, path)')
        .order('title')
      if (error) throw error
      return (data ?? []) as {
        id: string
        title: string
        plan_type: string
        forms_catalog: { id: string; path: string } | null
      }[]
    },
  })
}

function useLocalities() {
  return useQuery({
    queryKey: ['localities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('localities')
        .select('name')
        .order('name')
      if (error) throw error
      return (data ?? []).map(l => l.name as string)
    },
  })
}

interface ExecutionRow {
  id: string
  os_number: string | null
  scheduled_date: string
  status: string
  form_data: Record<string, unknown>
  locality: { name: string } | null
}

// Exclui execuções canceladas
function useExecutionData(planId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['executions', 'report', planId, startDate, endDate],
    queryFn: async (): Promise<ExecutionRow[]> => {
      let q = supabase
        .from('maintenance_executions')
        .select('id, os_number, scheduled_date, status, form_data, locality:localities(name)')
        .eq('plan_id', planId)
        .neq('status', 'cancelada')
        .order('scheduled_date', { ascending: true })
      if (startDate) q = q.gte('scheduled_date', startDate)
      if (endDate)   q = q.lte('scheduled_date', endDate)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as ExecutionRow[]
    },
    enabled: !!planId,
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formKeyFromPath(path: string | null | undefined): string {
  if (!path) return ''
  return (path.split('/').pop() ?? '').replace(/\.html?$/, '')
}

function parseRef(refStr: string | null): { op: string; limit: number } | null {
  if (!refStr) return null
  const m = refStr.match(/(≥|≤|>|<)\s*([\d.,]+)/)
  if (!m) return null
  return { op: m[1], limit: parseFloat(m[2].replace(',', '.')) }
}

function checkRef(refStr: string | null, value: number | null): 'ok' | 'fail' | null {
  if (value === null || !refStr) return null
  const p = parseRef(refStr)
  if (!p) return null
  if (p.op === '≥') return value >= p.limit ? 'ok' : 'fail'
  if (p.op === '≤') return value <= p.limit ? 'ok' : 'fail'
  if (p.op === '>')  return value >  p.limit ? 'ok' : 'fail'
  if (p.op === '<')  return value <  p.limit ? 'ok' : 'fail'
  return null
}

const LINE_COLORS = [
  '#E8571A','#1A2B4A','#2563eb','#16a34a','#9333ea','#ca8a04','#0891b2','#e11d48',
]

// ─── Component ───────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [planId,     setPlanId]     = useState('')
  const [fieldKey,   setFieldKey]   = useState('')
  const [startDate,  setStartDate]  = useState('')
  const [endDate,    setEndDate]    = useState('')
  const [localidade, setLocalidade] = useState('')

  const { data: plans = [], isLoading: loadingPlans } = useAllPlans()
  const selectedPlan = plans.find(p => p.id === planId)
  const formKey = formKeyFromPath(selectedPlan?.forms_catalog?.path)

  const { data: formMeta }                             = useFormMetadata(formKey || null)
  const { data: executions = [], isLoading: loadingExec } = useExecutionData(planId, startDate, endDate)
  const { data: localities = [] }                      = useLocalities()

  // Campos numéricos com referência definida, sem duplicatas
  const numericFields = useMemo<FormFieldMeta[]>(() => {
    const seen = new Set<string>()
    return (formMeta?.fields ?? []).filter(f => {
      if (f.type !== 'number' || !f.ref || seen.has(f.key)) return false
      seen.add(f.key)
      return true
    })
  }, [formMeta])

  const selectedField = numericFields.find(f => f.key === fieldKey)

  const filtered = useMemo(() => {
    return executions
      .filter(ex => !localidade || ex.locality?.name === localidade)
      .map(ex => {
        const raw   = fieldKey ? ex.form_data[fieldKey] : null
        const value = typeof raw === 'number' ? raw
                    : typeof raw === 'string' ? (parseFloat(raw) || null)
                    : null
        return {
          date:       ex.scheduled_date,
          os:         ex.os_number ?? '—',
          locality:   ex.locality?.name ?? '—',
          value,
          compliance: checkRef(selectedField?.ref ?? null, value),
        }
      })
      .filter(r => r.value !== null)
  }, [executions, fieldKey, localidade, selectedField])

  const chartData = useMemo(() => {
    if (!fieldKey) return []
    const byDate: Record<string, Record<string, number | string>> = {}
    filtered.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { date: r.date }
      byDate[r.date][r.locality] = r.value as number
    })
    return Object.values(byDate).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [filtered, fieldKey])

  const localitiesInChart = useMemo(() => {
    const set = new Set<string>()
    filtered.forEach(r => set.add(r.locality))
    return [...set]
  }, [filtered])

  const refParsed  = parseRef(selectedField?.ref ?? null)
  const failCount  = filtered.filter(r => r.compliance === 'fail').length
  const hasFormKey = !!formKey

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
            <BarChart2 size={18} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-metro-navy leading-none">Relatórios e Análise Comparativa</h1>
            <p className="text-xs text-gray-400 mt-0.5">Tendências de medição e degradação de equipamentos</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-gray-400 shrink-0" />

          {/* Plano de Manutenção */}
          <select
            value={planId}
            onChange={e => { setPlanId(e.target.value); setFieldKey('') }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-metro-orange bg-white"
          >
            <option value="">Selecione o plano de manutenção...</option>
            {loadingPlans
              ? <option disabled>Carregando...</option>
              : plans.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))
            }
          </select>

          {/* Parâmetro — só disponível se o plano tem formulário com metadados */}
          <select
            value={fieldKey}
            onChange={e => setFieldKey(e.target.value)}
            disabled={!hasFormKey || numericFields.length === 0}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-metro-orange bg-white disabled:opacity-40"
          >
            <option value="">{hasFormKey ? 'Selecione o parâmetro...' : 'Sem parâmetros (plano sem formulário)'}</option>
            {numericFields.map(f => (
              <option key={f.key} value={f.key}>{f.label}{f.unit ? ` (${f.unit})` : ''}</option>
            ))}
          </select>

          {/* Localidade */}
          <select
            value={localidade}
            onChange={e => setLocalidade(e.target.value)}
            disabled={localities.length === 0}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-metro-orange bg-white disabled:opacity-40"
          >
            <option value="">Todas as localidades</option>
            {localities.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          {/* Período */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-gray-400">De</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-metro-orange bg-white" />
            <span className="text-xs text-gray-400">até</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-metro-orange bg-white" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        {!planId && (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <BarChart2 size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-400">Selecione um plano de manutenção para iniciar a análise</p>
          </div>
        )}

        {planId && loadingExec && <Spinner />}

        {planId && !loadingExec && (
          <>
            {/* Aviso: plano sem formulário vinculado */}
            {planId && !hasFormKey && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                Este plano não possui formulário vinculado — análise de parâmetros indisponível.
                Os registros de OS abaixo (exceto canceladas) estão disponíveis para consulta.
              </div>
            )}

            {/* KPIs */}
            {fieldKey && filtered.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-2xl font-bold text-metro-navy">{filtered.length}</p>
                  <p className="text-xs text-gray-400 mt-1">Registros analisados</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-2xl font-bold text-metro-navy">
                    {(filtered.reduce((s, r) => s + (r.value ?? 0), 0) / filtered.length).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Média — {selectedField?.label} {selectedField?.unit ?? ''}</p>
                </div>
                <div className={`rounded-xl border p-4 ${failCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-2xl font-bold ${failCount > 0 ? 'text-red-700' : 'text-green-700'}`}>{failCount}</p>
                  <p className={`text-xs mt-1 ${failCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {failCount > 0 ? 'Fora da referência' : 'Todos dentro da faixa'}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-2xl font-bold text-metro-navy">{selectedField?.ref ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-1">Referência</p>
                </div>
              </div>
            )}

            {/* Gráfico */}
            {fieldKey && chartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="text-xs font-bold text-metro-navy uppercase tracking-wide mb-1">
                  Tendência — {selectedField?.label}
                </p>
                {selectedField?.ref && (
                  <p className="text-xs text-gray-400 mb-4">
                    Referência: <strong>{selectedField.ref}</strong>
                    <span className="ml-2 text-gray-300">(linha pontilhada no gráfico)</span>
                  </p>
                )}
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                      labelStyle={{ fontWeight: 700, color: '#1A2B4A' }}
                      formatter={(v: number) => [`${v} ${selectedField?.unit ?? ''}`, '']}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    {refParsed && (
                      <ReferenceLine
                        y={refParsed.limit}
                        stroke="#ef4444"
                        strokeDasharray="6 3"
                        label={{ value: `Ref ${selectedField?.ref}`, fill: '#ef4444', fontSize: 11, position: 'insideTopRight' }}
                      />
                    )}
                    {localitiesInChart.map((loc, i) => (
                      <Line
                        key={loc}
                        dataKey={loc}
                        name={loc}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabela de registros */}
            {fieldKey && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs font-bold text-metro-navy uppercase tracking-wide">Registros</p>
                  {failCount > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      <AlertTriangle size={12} /> {failCount} fora da faixa
                    </span>
                  )}
                </div>
                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">Nenhum dado para os filtros selecionados.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="text-left px-5 py-3">OS</th>
                        <th className="text-left px-5 py-3 hidden md:table-cell">Localidade</th>
                        <th className="text-left px-5 py-3">Data Programada</th>
                        <th className="text-right px-5 py-3">Valor Medido</th>
                        <th className="text-center px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((r, i) => (
                        <tr key={i} className={r.compliance === 'fail' ? 'bg-red-50' : ''}>
                          <td className="px-5 py-3 font-mono text-xs text-gray-600">{r.os}</td>
                          <td className="px-5 py-3 text-xs text-gray-600 hidden md:table-cell">{r.locality}</td>
                          <td className="px-5 py-3 text-xs text-gray-600">
                            {new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className={`px-5 py-3 text-right font-bold text-sm ${
                            r.compliance === 'fail' ? 'text-red-700' :
                            r.compliance === 'ok'   ? 'text-green-700' :
                            'text-metro-navy'
                          }`}>
                            {r.value} {selectedField?.unit ?? ''}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {r.compliance === 'ok'   && <CheckCircle size={15} className="text-green-500 mx-auto" />}
                            {r.compliance === 'fail' && <AlertTriangle size={15} className="text-red-500 mx-auto" />}
                            {!r.compliance && <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Sem dados */}
            {planId && executions.length === 0 && !loadingExec && (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <BarChart2 size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">Nenhuma OS encontrada para este plano no período selecionado.</p>
                <p className="text-xs text-gray-300 mt-1">Execuções canceladas são excluídas da análise.</p>
              </div>
            )}

            {/* Plano tem execuções mas parâmetro não foi selecionado */}
            {planId && hasFormKey && !fieldKey && executions.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-400">Selecione um parâmetro para visualizar o gráfico de tendência.</p>
                <p className="text-xs text-gray-300 mt-1">{executions.length} OS(s) encontradas para este plano.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
