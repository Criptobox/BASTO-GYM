import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Providers } from './app/shared'
import { adminRoutes } from './app/adminRoutes'

/** Panel de administración: página propia (admin.html), con rutas en el hash para no depender del servidor. */
export default function AdminApp() {
  return (
    <Providers>
      <HashRouter>
        <Routes>
          {adminRoutes('explain')}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </HashRouter>
    </Providers>
  )
}
