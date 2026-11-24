import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { GymProvider } from './data/store'
import { BottomNav } from './components/BottomNav'
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
import { SettingsPage } from './admin/Settings'
import { Outlet } from 'react-router-dom'

function WorkerShell() {
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
      <BrowserRouter>
        <Routes>
          <Route element={<WorkerShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/inscribir" element={<Enroll />} />
            <Route path="/pagos" element={<Payments />} />
            <Route path="/tienda" element={<Store />} />
            <Route path="/cierre" element={<Close />} />
            <Route path="*" element={<Home />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Overview />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="productos" element={<Products />} />
            <Route path="cierres" element={<Closings />} />
            <Route path="ajustes" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </GymProvider>
  )
}
