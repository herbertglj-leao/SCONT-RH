import { z } from 'zod'

export const assetSchema = z.object({
  name:        z.string().min(2, 'Nome obrigatório'),
  type:        z.enum(['equipment', 'location', 'building']),
  description: z.string().nullable().optional(),
  location:    z.string().nullable().optional(),
})

export type AssetFormData = z.infer<typeof assetSchema>
