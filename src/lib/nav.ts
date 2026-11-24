import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'

type VT = (o: { update: () => void; types?: string[] }) => unknown
const startVT = () => (document as unknown as { startViewTransition?: VT }).startViewTransition?.bind(document)

/** Navega con View Transitions; en navegadores sin soporte navega sin animación. */
export function useViewNavigate(order?: string[]) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (to: string) => {
    const go = () => navigate(to)
    const start = startVT()
    if (!start || to === pathname) return go()
    const types = order ? [order.indexOf(to) > order.indexOf(pathname) ? 'forward' : 'backward'] : []
    start({ update: () => flushSync(go), types })
  }
}

/** Al cambiar de pantalla: vuelve arriba y mueve el foco al título (lectores de pantalla). */
export function useRouteReset() {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    window.scrollTo(0, 0)
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
  }, [pathname])
}

/** Vibración corta al confirmar (solo Android; en iOS no hace nada). */
export const haptic = (ms = 12) => { try { navigator.vibrate?.(ms) } catch { /* sin soporte */ } }

/** Cierra la sesión tras un rato sin tocar nada, para que nadie use el cobro de otra persona. El turno sigue abierto. */
export function useIdleLogout(onIdle: () => void, ms = 5 * 60_000) {
  const cb = useRef(onIdle)
  cb.current = onIdle
  useEffect(() => {
    let t = window.setTimeout(() => cb.current(), ms)
    const reset = () => { window.clearTimeout(t); t = window.setTimeout(() => cb.current(), ms) }
    const evs = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => { window.clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, reset)) }
  }, [ms])
}
