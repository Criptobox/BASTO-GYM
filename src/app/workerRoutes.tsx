import { Outlet, Route } from 'react-router-dom'
import { useGym } from '../data/store'
import { BottomNav, SideRail } from '../components/BottomNav'
import { useWide } from '../lib/media'
import { useRouteReset } from '../lib/nav'
import { useAppBadge } from '../lib/badge'
import { pendingClients } from '../lib/domain'
import { Login } from '../screens/Login'
import { Home } from '../screens/Home'
import { Enroll } from '../screens/Enroll'
import { Payments } from '../screens/Payments'
import { Store } from '../screens/Store'
import { Close } from '../screens/Close'
import { RequireRole } from './shared'

function WorkerShell() {
  useRouteReset()
  const g = useGym()
  const wide = useWide()
  useAppBadge(g.session ? pendingClients(g.clients, g.today).length : 0) // número rojo en el icono de la app instalada
  return (
    <>
      {/* mismo ambiente que el acceso: fibra de carbono y una franja dorada en la esquina */}
      <div aria-hidden className="carbon pointer-events-none fixed inset-0 -z-10" />
      <div aria-hidden className="pointer-events-none fixed -left-4 -top-4 -z-10 h-24 w-56 opacity-40 [clip-path:polygon(0_0,100%_0,0_100%)] [background:linear-gradient(100deg,var(--color-amber),transparent_75%)]" />
      {wide ? (
        <div className="mx-auto flex min-h-dvh max-w-[1180px]">
          <SideRail />
          <main className="min-w-0 flex-1"><Outlet /></main>
        </div>
      ) : (
        <div className="mx-auto min-h-dvh max-w-[430px] pb-28">
          <main><Outlet /></main>
          <BottomNav />
        </div>
      )}
    </>
  )
}

/** Rutas de recepción. `wrong` define qué pasa si entra alguien con sesión de administrador. */
export const workerRoutes = (wrong: 'redirect' | 'explain') => (
  <>
    <Route path="/login" element={<Login />} />
    <Route element={<RequireRole role="worker" wrong={wrong} />}>
      <Route element={<WorkerShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/inscribir" element={<Enroll />} />
        <Route path="/pagos" element={<Payments />} />
        <Route path="/tienda" element={<Store />} />
        <Route path="/cierre" element={<Close />} />
      </Route>
    </Route>
  </>
)
