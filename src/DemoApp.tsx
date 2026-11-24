import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Providers } from './app/shared'
import { workerRoutes } from './app/workerRoutes'
import { adminRoutes } from './app/adminRoutes'

/** Solo para la demo publicada (un único archivo): reúne recepción y administración y navega en memoria. */
export default function DemoApp() {
  return (
    <Providers>
      <MemoryRouter>
        <Routes>
          {workerRoutes('redirect')}
          {adminRoutes('redirect')}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MemoryRouter>
    </Providers>
  )
}
