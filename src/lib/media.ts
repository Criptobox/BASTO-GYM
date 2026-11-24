import { useEffect, useState } from 'react'

/** ¿La pantalla tiene al menos `px` de ancho? Se actualiza al girar o redimensionar. */
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`
  const [match, setMatch] = useState(() => (typeof window === 'undefined' ? true : window.matchMedia(query).matches))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

/** Tablas en escritorio, tarjetas compactas en móvil. */
export const useWide = () => useMinWidth(768)
