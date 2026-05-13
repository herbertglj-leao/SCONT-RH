import { z } from 'zod'

export const performanceIndicatorSchema = z.object({
  nome:          z.string().min(1, 'Nome obrigatório'),
  meta:          z.string().min(1, 'Meta obrigatória'),
  unidade:       z.string().min(1, 'Unidade obrigatória'),
  periodicidade: z.string().min(1, 'Periodicidade obrigatória'),
})

export const contractSchema = z.object({
  title:                   z.string().min(3, 'Título obrigatório'),
  contract_number:         z.string().min(1, 'Número do contrato obrigatório'),
  object:                  z.string().min(10, 'Descreva o objeto do contrato'),
  company_id:              z.string().uuid('Selecione a empresa contratada'),
  value:                   z.coerce.number().positive('Valor deve ser positivo').nullable().optional(),
  start_date:              z.string().min(1, 'Data de início obrigatória'),
  end_date:                z.string().nullable().optional(),
  status:                  z.enum(['active', 'suspended', 'expired', 'terminated']),
  performance_indicators:  z.array(performanceIndicatorSchema).default([]),
  notes:                   z.string().nullable().optional(),
})

export type ContractFormData = z.infer<typeof contractSchema>
