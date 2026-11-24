import { Route } from 'react-router-dom'
import { AdminLogin } from '../screens/AdminLogin'
import { AdminLayout } from '../admin/AdminLayout'
import { Overview } from '../admin/Overview'
import { Clients } from '../admin/Clients'
import { Products } from '../admin/Products'
import { Closings } from '../admin/Closings'
import { Workers } from '../admin/Workers'
import { SettingsPage } from '../admin/Settings'
import { RequireRole } from './shared'

export const adminRoutes = (wrong: 'redirect' | 'explain') => (
  <>
    <Route path="/admin/acceso" element={<AdminLogin />} />
    <Route element={<RequireRole role="admin" wrong={wrong} />}>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Overview />} />
        <Route path="clientes" element={<Clients />} />
        <Route path="productos" element={<Products />} />
        <Route path="cierres" element={<Closings />} />
        <Route path="trabajadores" element={<Workers />} />
        <Route path="ajustes" element={<SettingsPage />} />
      </Route>
    </Route>
  </>
)
