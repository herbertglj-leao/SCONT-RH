import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-7xl font-black text-metro-orange mb-2">404</div>
        <h2 className="font-bold text-metro-navy text-xl mb-4">Página não encontrada</h2>
        <Link to="/"><Button>Voltar ao início</Button></Link>
      </div>
    </div>
  )
}
