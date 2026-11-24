import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Providers } from './app/shared'
import { workerRoutes } from './app/workerRoutes'

/** App de recepción: lo único que descargan los trabajadores. La administración es otro HTML (admin.html). */
export default function WorkerApp() {
  return (
    <Providers>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes>
          {workerRoutes('explain')}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Providers>
  )
}
