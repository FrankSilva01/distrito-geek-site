import { ArrowUp } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

/**
 * Aparece só depois que há rolagem suficiente para o botão fazer sentido, para não cobrir
 * conteúdo em telas curtas. Respeita prefers-reduced-motion no salto até o topo.
 */
export function BackToTop({ showAfter = 600 }: { showAfter?: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const sync = () => setVisible(window.scrollY > showAfter)
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    return () => window.removeEventListener('scroll', sync)
  }, [showAfter])
  if (!visible) return null
  const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <button type="button" className="back-to-top" aria-label="Voltar ao topo da página" onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })}>
      <ArrowUp aria-hidden="true"/>
    </button>
  )
}
