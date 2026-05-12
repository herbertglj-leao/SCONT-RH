import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const { error } = await signIn(data.email, data.password)
    if (error) { setServerError(error); return }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-metro-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-metro-orange flex items-center justify-center font-black text-white text-2xl shadow-lg">
            M
          </div>
          <div>
            <p className="font-black text-metro-navy text-lg leading-tight">Metrô-DF</p>
            <p className="text-xs text-gray-500 leading-tight">Sistema de Manutenção</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-metro-navy font-bold text-xl mb-1">Entrar</h1>
          <p className="text-gray-500 text-sm mb-5">Acesse sua conta para continuar</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            {serverError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{serverError}</p>
            )}
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Entrar
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Sem conta?{' '}
            <Link to="/register" className="text-metro-orange font-medium hover:underline">
              Solicitar acesso
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
