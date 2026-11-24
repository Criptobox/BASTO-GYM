import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useGym } from '../data/store'
import { Button, Field, inputCls } from '../components/ui'
import { isValidPin } from '../lib/pin'
import type { LogoState } from '../components/Logo'
import { LoginShell, PinStep } from './Login'
import { workerUrl } from '../app/shared'
import { DEMO } from '../data/demo'

/** Primer uso: el administrador crea su clave. Así no existen claves de fábrica. */
function Setup() {
  const g = useGym()
  const nav = useNavigate()
  const [name, setName] = useState('Administrador')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const nameOk = name.trim().length >= 3
  const ok = nameOk && isValidPin(pin) && pin === pin2

  async function submit(e: FormEvent) {
    e.preventDefault(); setTouched(true)
    if (!ok || busy) return
    setBusy(true); setError('')
    try { await g.setupAdmin(name, pin); nav('/admin', { replace: true }) }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear la clave.') }
    finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <h1 tabIndex={-1} className="text-3xl font-extrabold tracking-tight">Bienvenido</h1>
      <p className="text-muted">Crea la clave del administrador. Con ella entrarás al panel y podrás dar su clave a cada trabajador.</p>
      <Field label="Tu nombre" error={touched && !nameOk && 'Escribe tu nombre.'}>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </Field>
      <Field label="Clave (4 números)" error={touched && !isValidPin(pin) && 'Usa 4 números.'}>
        <input className={inputCls} type="password" inputMode="numeric" autoComplete="new-password" value={pin} maxLength={4} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
      </Field>
      <Field label="Repite la clave" error={touched && isValidPin(pin) && pin !== pin2 && 'No coinciden.'}>
        <input className={inputCls} type="password" inputMode="numeric" autoComplete="new-password" value={pin2} maxLength={4} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
      </Field>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" block disabled={busy}>{busy ? 'Creando…' : 'Crear y entrar'}</Button>
    </form>
  )
}


/** Acceso del administrador: página propia. Si todavía no existe ninguna cuenta, aquí se crea la primera. */
export function AdminLogin() {
  const g = useGym()
  const nav = useNavigate()
  const [logoState, setLogoState] = useState<LogoState>('default')
  if (g.session) return <Navigate to={g.session.role === 'admin' ? '/admin' : '/'} replace />
  const admins = g.workers.filter((w) => w.active && w.role === 'admin')
  const back = () => (DEMO ? nav('/login') : window.location.assign(workerUrl))
  return (
    <LoginShell eyebrow="Administración" logoState={logoState}>
      {g.needsSetup ? <Setup /> : admins.length > 0 ? (
        <PinStep worker={admins[0]} onBack={back} onLogoState={setLogoState} />
      ) : (
        <p className="text-muted">No hay ninguna cuenta de administrador activa.</p>
      )}
    </LoginShell>
  )
}
