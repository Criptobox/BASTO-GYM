import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { GymProvider, useGym } from '../data/store'
import { ToastProvider, Button } from '../components/ui'
import { ReceiptProvider } from '../components/Receipt'
import { LogoMark } from '../components/Logo'
import { useIdleLogout } from '../lib/nav'
import type { Worker } from '../lib/types'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GymProvider>
      <ToastProvider>
        <ReceiptProvider>{children}</ReceiptProvider>
      </ToastProvider>
    </GymProvider>
  )
}

/** Dirección de la administración (otro HTML) y de la app de trabajadores. */
export const adminUrl = `${import.meta.env.BASE_URL}admin.html`
export const workerUrl = import.meta.env.BASE_URL

/** Hay sesión, pero de la otra área: se explica en vez de mandar a una ruta que aquí no existe. */
function WrongArea({ session, to }: { session: Worker; to: 'admin' | 'worker' }) {
  const g = useGym()
  return (
    <div className="mx-auto grid min-h-dvh max-w-[430px] content-center gap-4 px-5">
      <LogoMark size={64} label="" />
      <h1 tabIndex={-1} className="text-2xl font-extrabold tracking-tight">{session.name}, esta es otra aplicación</h1>
      <p className="text-muted">{to === 'admin' ? 'Entraste como administrador. El panel está en su propia página.' : 'Entraste como trabajador. La recepción está en su propia página.'}</p>
      <a href={to === 'admin' ? adminUrl : workerUrl} className="inline-flex h-14 items-center justify-center rounded-full bg-gold text-base font-bold text-amber-ink">{to === 'admin' ? 'Abrir administración' : 'Abrir recepción'}</a>
      <Button variant="outline" onClick={g.logout}>Cerrar sesión</Button>
    </div>
  )
}

/**
 * Solo deja pasar a quien tiene sesión y el rol correcto; cierra la sesión por inactividad.
 * `wrong`: qué hacer si la sesión es de la otra área (en la demo, que reúne ambas, redirige).
 */
export function RequireRole({ role, wrong }: { role: Worker['role']; wrong: 'redirect' | 'explain' }) {
  const g = useGym()
  useIdleLogout(g.logout)
  if (!g.session) return <Navigate to={role === 'admin' ? '/admin/acceso' : '/login'} replace />
  if (g.session.role !== role) {
    return wrong === 'explain'
      ? <WrongArea session={g.session} to={role === 'admin' ? 'worker' : 'admin'} />
      : <Navigate to={g.session.role === 'admin' ? '/admin' : '/'} replace />
  }
  return <Outlet />
}
