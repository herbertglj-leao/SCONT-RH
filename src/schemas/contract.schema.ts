import { z } from 'zod'

export const contractSchema = z.object({
  title:                 z.string().min(3, 'Título obrigatório'),
  contract_number:       z.string().min(1, 'Número do contrato obrigatório'),
  object:                z.string().min(10, 'Descreva o objeto do contrato'),
  contractor_profile_id: z.string().uuid('Selecione a contratada'),
  value:                 z.coerce.number().positive('Valor deve ser positivo').nullable().optional(),
  start_date:            z.string().min(1, 'Data de início obrigatória'),
  end_date:              z.string().nullable().optional(),
  status:                z.enum(['active', 'suspended', 'expired', 'terminated']),
  sla_response_hours:    z.coerce.number().int().positive().nullable().optional(),
  sla_completion_hours:  z.coerce.number().int().positive().nullable().optional(),
  notes:                 z.string().nullable().optional(),
})

export type ContractFormData = z.infer<typeof contractSchema>
