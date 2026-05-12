import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { Spinner } from '@/components/ui/Spinner'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { HomePage } from '@/pages/home/HomePage'
import { AccessManagementPage } from '@/pages/admin/AccessManagementPage'
import { ContractsListPage } from '@/pages/contracts/ContractsListPage'
import { ContractDetailPage } from '@/pages/contracts/ContractDetailPage'
import { ContractFormPage } from '@/pages/contracts/ContractFormPage'
import { MaintenancePlansPage } from '@/pages/maintenance/MaintenancePlansPage'
import { MaintenanceExecutionsPage } from '@/pages/maintenance/MaintenanceExecutionsPage'
import { IRQExecutionsPage } from '@/pages/irq/IRQExecutionsPage'
import { FieldSelectPage } from '@/pages/field/FieldSelectPage'
import { FieldFormPage } from '@/pages/field/FieldFormPage'
import { FieldSuccessPage } from '@/pages/field/FieldSuccessPage'
import { FormsListPage } from '@/pages/forms/FormsListPage'
import { FormDetailPage } from '@/pages/forms/FormDetailPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import type { UserRole } from '@/types'

function RequireAuth({ roles }: { roles?: UserRole[] }) {
  const { profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.status !== 'approved') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="font-bold text-metro-navy text-xl mb-2">Acesso Pendente</h2>
        <p className="text-gray-500 text-sm">Seu cadastro está aguardando aprovação do administrador.</p>
      </div>
    </div>
  )
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export const router = createBrowserRouter([
  { path: '/login',    element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // Public field operator routes (no auth required)
  { path: '/field/select',       element: <FieldSelectPage /> },
  { path: '/field/form/:planId', element: <FieldFormPage /> },
  { path: '/field/success',      element: <FieldSuccessPage /> },

  {
    element: <RequireAuth />,
    children: [
      { path: '/',                        element: <HomePage /> },
      { path: '/contracts',               element: <ContractsListPage /> },
      { path: '/contracts/new',           element: <ContractFormPage /> },
      { path: '/contracts/:id',           element: <ContractDetailPage /> },
      { path: '/contracts/:id/edit',      element: <ContractFormPage /> },
      { path: '/maintenance',             element: <MaintenancePlansPage /> },
      { path: '/maintenance/executions',  element: <MaintenanceExecutionsPage /> },
      { path: '/irq',                     element: <IRQExecutionsPage /> },
      { path: '/forms',                   element: <FormsListPage /> },
      { path: '/forms/:id',               element: <FormDetailPage /> },
      { path: '/dashboard',               element: <DashboardPage /> },
      {
        element: <RequireAuth roles={['admin']} />,
        children: [
          { path: '/admin/access', element: <AccessManagementPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
