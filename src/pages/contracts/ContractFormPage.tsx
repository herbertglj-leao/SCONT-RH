import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, FileText, StickyNote, Calendar, BarChart2, Plus, Trash2 } from 'lucide-react'
import { contractSchema, type ContractFormData } from '@/schemas/contract.schema'
import { useCreateContract, useUpdateContract, useContract } from '@/hooks/useContracts'
import { useCompanies } from '@/hooks/useMasterData'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

const statusOptions = [
  { value: 'active',     label: 'Ativo' },
  { value: 'suspended',  label: 'Suspenso' },
  { value: 'expired',    label: 'Expirado' },
  { value: 'terminated', label: 'Encerrado' },
]

const periodicidadeOptions = [
  { value: 'Mensal',    label: 'Mensal' },
  { value: 'Trimestral', label: 'Trimestral' },
  { value: 'Semestral', label: 'Semestral' },
  { value: 'Anual',     label: 'Anual' },
]

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <Icon size={15} className="text-metro-navy" />
        <h2 className="text-xs font-bold text-metro-navy uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

export function ContractFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: existing, isLoading: loadingExisting } = useContract(id ?? '')
  const createMutation = useCreateContract()
  const updateMutation = useUpdateContract(id ?? '')

  const { data: companies = [] } = useCompanies()

  const contractorOptions = companies.map(c => ({ value: c.id, label: c.name }))

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: { status: 'active', performance_indicators: [], company_id: '' },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'performance_indicators' })

  useEffect(() => {
    if (existing) {
      reset({
        title:                  existing.title,
        contract_number:        existing.contract_number,
        object:                 existing.object,
        company_id:             existing.company_id,
        value:                  existing.value,
        start_date:             existing.start_date,
        end_date:               existing.end_date ?? '',
        status:                 existing.status,
        performance_indicators: existing.performance_indicators ?? [],
        notes:                  existing.notes ?? '',
      })
    }
  }, [existing, reset])

  const onSubmit = async (data: ContractFormData) => {
    if (isEdit) await updateMutation.mutateAsync(data)
    else await createMutation.mutateAsync(data)
    navigate('/contracts')
  }

  if (isEdit && loadingExisting) return <div className="flex justify-center pt-12"><Spinner /></div>

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-gray-400 hover:text-metro-navy hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-base font-bold text-metro-navy leading-none">{isEdit ? 'Editar Contrato' : 'Novo Contrato'}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Contrato público</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-4">

          <SectionCard icon={FileText} title="Dados Gerais">
            <Input label="Título do Contrato *" error={errors.title?.message} {...register('title')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Número do Contrato *" error={errors.contract_number?.message} {...register('contract_number')} />
              <Select label="Status *" options={statusOptions} error={errors.status?.message} {...register('status')} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Objeto do Contrato *</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-metro-orange focus:ring-2 focus:ring-metro-orange/20 outline-none"
                {...register('object')}
              />
              {errors.object && <span className="text-xs text-red-500">{errors.object.message}</span>}
            </div>
            <Select
              label="Empresa Contratada *"
              options={contractorOptions}
              placeholder="Selecione a empresa"
              error={errors.company_id?.message}
              {...register('company_id')}
            />
          </SectionCard>

          <SectionCard icon={FileText} title="Valor do Contrato">
            <Input
              label="Valor Global (R$)"
              type="number" step="0.01" min="0" placeholder="0,00"
              error={errors.value?.message}
              {...register('value')}
            />
            <p className="text-xs text-gray-400">Os valores empenhados e pagamentos são registrados nas telas de Notas de Empenho e Execução Orçamentária.</p>
          </SectionCard>

          <SectionCard icon={Calendar} title="Vigência">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Data de Início *" type="date" error={errors.start_date?.message} {...register('start_date')} />
              <Input label="Data de Término" type="date" {...register('end_date')} />
            </div>
          </SectionCard>

          {/* Indicadores de Desempenho */}
          <SectionCard icon={BarChart2} title="Indicadores de Desempenho">
            <div className="space-y-3">
              {fields.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">Nenhum indicador cadastrado. Clique em "Adicionar" para incluir.</p>
              )}
              {fields.map((field, idx) => (
                <div key={field.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-metro-navy uppercase tracking-wide">Indicador {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <Input
                    label="Nome do Indicador *"
                    placeholder="Ex: Disponibilidade do Sistema"
                    error={errors.performance_indicators?.[idx]?.nome?.message}
                    {...register(`performance_indicators.${idx}.nome`)}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="Meta *"
                      placeholder="Ex: ≥ 95"
                      error={errors.performance_indicators?.[idx]?.meta?.message}
                      {...register(`performance_indicators.${idx}.meta`)}
                    />
                    <Input
                      label="Unidade *"
                      placeholder="Ex: %, h, dias"
                      error={errors.performance_indicators?.[idx]?.unidade?.message}
                      {...register(`performance_indicators.${idx}.unidade`)}
                    />
                    <Select
                      label="Periodicidade *"
                      options={periodicidadeOptions}
                      placeholder="Selecione"
                      error={errors.performance_indicators?.[idx]?.periodicidade?.message}
                      {...register(`performance_indicators.${idx}.periodicidade`)}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => append({ nome: '', meta: '', unidade: '', periodicidade: '' })}
              >
                <Plus size={14} /> Adicionar Indicador
              </Button>
            </div>
          </SectionCard>

          <SectionCard icon={StickyNote} title="Observações">
            <textarea
              rows={3}
              placeholder="Observações adicionais, referências, links de documentos..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-metro-orange focus:ring-2 focus:ring-metro-orange/20 outline-none"
              {...register('notes')}
            />
          </SectionCard>

          <div className="flex gap-3 pb-6">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>
              {isEdit ? 'Salvar Alterações' : 'Criar Contrato'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
