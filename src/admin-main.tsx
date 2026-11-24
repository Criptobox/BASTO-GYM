import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AdminApp from './AdminApp'
import './index.css'
import { applyTheme, readTheme } from './lib/theme'

applyTheme(readTheme())

createRoot(document.getElementById('root')!).render(<StrictMode><AdminApp /></StrictMode>)
