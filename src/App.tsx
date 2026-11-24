import { BrowserRouter, MemoryRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { DEMO } from './data/demo'
import { GymProvider, useGym } from './data/store'
import { BottomNav, SideRail } from './components/BottomNav'
import { useWide } from './lib/media'
import { ToastProvider } from './components/ui'
import { ReceiptProvider } from './components/Receipt'
import { useIdleLogout, useRouteReset } from './lib/nav'
import { useAppBadge } from './lib/badge'
import { pendingClients } from './lib/domain'
import { Login } from './screens/Login'
import { Home } from './screens/Home'
import { Enroll } from './screens/Enroll'
import { Payments } from './screens/Payments'
import { Store } from './screens/Store'
import { Close } from './screens/Close'
import { AdminLayout } from './admin/AdminLayout'
import { Overview } from './admin/Overview'
import { Clients } from './admin/Clients'
import { Products } from './admin/Products'
import { Closings } from './admin/Closings'
import { Workers } from './admin/Workers'
import { SettingsPage } from './admin/Settings'
import type { Worker } from './lib/types'

/** Solo deja pasar a quien tiene sesión y el rol correcto; cierra la sesión por inactividad. */
function RequireRole({ role }: { role: Worker['role'] }) {
  const g = useGym()
  useIdleLogout(g.logout)
  if (!g.session) return <Navigate to="/login" replace />
  if (g.session.role !== role) return <Navigate to={g.session.role === 'admin' ? '/admin' : '/'} replace />
  return <Outlet />
}

function WorkerShell() {
  useRouteReset()
  const g = useGym()
  const wide = useWide()
  useAppBadge(g.session ? pendingClients(g.clients, g.today).length : 0) // número rojo en el icono de la app instalada
  return (
    wide ? (
      <div className="mx-auto flex min-h-dvh max-w-[1180px]">
        <SideRail />
        <main className="min-w-0 flex-1"><Outlet /></main>
      </div>
    ) : (
      <div className="mx-auto min-h-dvh max-w-[430px] pb-28">
        <main><Outlet /></main>
        <BottomNav />
      </div>
    )
  )
}

// La demo publicada no puede usar rutas en la URL (el visor solo admite #nombre): navega en memoria.
const Router = DEMO ? MemoryRouter : BrowserRouter

export default function App() {
  return (
    <GymProvider>
      <ToastProvider>
       <ReceiptProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireRole role="worker" />}>
              <Route element={<WorkerShell />}>
                <Route path="/" element={<Home />} />
                <Route path="/inscribir" element={<Enroll />} />
                <Route path="/pagos" element={<Payments />} />
                <Route path="/tienda" element={<Store />} />
                <Route path="/cierre" element={<Close />} />
              </Route>
            </Route>
            <Route element={<RequireRole role="admin" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Overview />} />
                <Route path="clientes" element={<Clients />} />
                <Route path="productos" element={<Products />} />
                <Route path="cierres" element={<Closings />} />
                <Route path="trabajadores" element={<Workers />} />
                <Route path="ajustes" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
       </ReceiptProvider>
      </ToastProvider>
    </GymProvider>
  )
}
