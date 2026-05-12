export type UserRole = 'admin' | 'fiscalizacao' | 'contratada' | 'gestor'
export type ProfileStatus = 'pending' | 'approved' | 'rejected'
export type ContractStatus = 'active' | 'suspended' | 'expired' | 'terminated'
export type AssetType = 'equipment' | 'location' | 'building'
export type ExecutionStatus = 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado'

export interface Profile {
  id: string
  user_id: string
  role: UserRole
  full_name: string | null
  company_name: string | null
  status: ProfileStatus
  created_at: string
}

export interface Contract {
  id: string
  contractor_profile_id: string
  title: string
  contract_number: string
  object: string
  value: number | null
  start_date: string
  end_date: string | null
  status: ContractStatus
  sla_response_hours: number | null
  sla_completion_hours: number | null
  documents: ContractDocument[]
  notes: string | null
  created_by: string
  created_at: string
  contractor?: Pick<Profile, 'id' | 'full_name' | 'company_name'>
  assets?: Asset[]
}

export interface ContractDocument {
  name: string
  url: string
}

export interface Asset {
  id: string
  contract_id: string
  name: string
  type: AssetType
  description: string | null
  location: string | null
  created_at: string
}

export interface MaintenancePlan {
  id: string
  asset_id: string
  title: string
  frequency: string
  next_due: string | null
  created_at: string
}

export interface MaintenanceExecution {
  id: string
  plan_id: string
  scheduled_date: string
  executed_date: string | null
  status: ExecutionStatus
  notes: string | null
  rejection_reason: string | null
  executed_by: string | null
  form_data: Record<string, unknown>
  created_at: string
}
