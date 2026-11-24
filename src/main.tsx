import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@entry' // WorkerApp (recepción); en la demo, DemoApp
import './index.css'
import { applyTheme, readTheme } from './lib/theme'

applyTheme(readTheme())

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
