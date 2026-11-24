import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { GymProvider, useGym } from './data/store'
import { BottomNav } from './components/BottomNav'
import { ToastProvider } from './components/ui'
import { useIdleLogout, useRouteReset } from './lib/nav'
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
  return (
    <div className="mx-auto min-h-dvh max-w-[430px] pb-28 sm:border-x sm:border-line">
      <main><Outlet /></main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <GymProvider>
      <ToastProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </ToastProvider>
    </GymProvider>
  )
}
