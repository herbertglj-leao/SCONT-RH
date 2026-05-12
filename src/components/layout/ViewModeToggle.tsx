import { Monitor, Smartphone } from 'lucide-react'
import { useViewMode } from '@/hooks/useViewMode'

export function ViewModeToggle() {
  const { mode, toggle } = useViewMode()

  return (
    <button
      onClick={toggle}
      title={mode === 'desktop' ? 'Mudar para Mobile' : 'Mudar para Desktop'}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-white hover:bg-white/10 transition text-xs font-medium"
    >
      {mode === 'desktop' ? (
        <><Monitor size={14} /> Desktop</>
      ) : (
        <><Smartphone size={14} /> Mobile</>
      )}
    </button>
  )
}
