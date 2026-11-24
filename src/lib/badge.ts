import { useEffect } from 'react'

/**
 * Número rojo sobre el icono de la app instalada (Badging API). Solo funciona si la app
 * está instalada y el sistema lo permite; en cualquier otro caso no hace nada.
 */
export function useAppBadge(count: number) {
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
    if (!nav.setAppBadge) return
    const apply = count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge?.()
    apply?.catch(() => { /* sin permiso o sin instalar */ })
    return () => { nav.clearAppBadge?.().catch(() => {}) }
  }, [count])
}
