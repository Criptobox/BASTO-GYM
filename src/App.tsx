import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { GymProvider } from './data/store'
import { BottomNav } from './components/BottomNav'
import { Home } from './screens/Home'
import { Enroll } from './screens/Enroll'
import { Payments } from './screens/Payments'
import { Store } from './screens/Store'
import { Close } from './screens/Close'

export default function App() {
  return (
    <GymProvider>
      <BrowserRouter>
        <div className="mx-auto min-h-dvh max-w-[430px] pb-28 sm:border-x sm:border-line">
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/inscribir" element={<Enroll />} />
              <Route path="/pagos" element={<Payments />} />
              <Route path="/tienda" element={<Store />} />
              <Route path="/cierre" element={<Close />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </BrowserRouter>
    </GymProvider>
  )
}
