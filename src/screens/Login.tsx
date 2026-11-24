import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Delete } from 'lucide-react'
import { useGym, type LoginResult } from '../data/store'
import { Avatar, Button, Field, inputCls } from '../components/ui'
import { LogoMark, type LogoState } from '../components/Logo'
import { isValidPin } from '../lib/pin'
import { haptic } from '../lib/nav'
import { DEMO, DEMO_LOGINS } from '../data/demo'
import type { Worker } from '../lib/types'

const home = (role: Worker['role']) => (role === 'admin' ? '/admin' : '/')

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
      <Field label="Clave (4 a 6 números)" error={touched && !isValidPin(pin) && 'Usa de 4 a 6 números.'}>
        <input className={inputCls} type="password" inputMode="numeric" autoComplete="new-password" value={pin} maxLength={6} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
      </Field>
      <Field label="Repite la clave" error={touched && isValidPin(pin) && pin !== pin2 && 'No coinciden.'}>
        <input className={inputCls} type="password" inputMode="numeric" autoComplete="new-password" value={pin2} maxLength={6} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
      </Field>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" block disabled={busy}>{busy ? 'Creando…' : 'Crear y entrar'}</Button>
    </form>
  )
}

function message(r: Extract<LoginResult, { ok: false }>): string {
  switch (r.reason) {
    case 'pin': return r.retryIn > 0 ? `Clave incorrecta. Espera ${r.retryIn} s para volver a intentar.` : `Clave incorrecta. Te quedan ${r.attemptsLeft} intentos antes del bloqueo.`
    case 'locked': return `Demasiados intentos. Espera ${r.retryIn} s.`
    case 'other-shift': return `${r.owner} tiene un turno abierto. Pídele que lo cierre o avisa al administrador.`
    case 'nopin': return 'Todavía no tienes clave. Pídesela al administrador.'
    case 'inactive': return 'Este usuario está desactivado.'
    case 'error': return r.message
  }
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

function PinStep({ worker, onBack, onLogoState }: { worker: Worker; onBack: () => void; onLogoState: (s: LogoState) => void }) {
  const g = useGym()
  const nav = useNavigate()
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const [wait, setWait] = useState(0)
  const pinRef = useRef(pin)
  pinRef.current = pin

  // El logo refleja lo que pasa: verificando = anillo que gira; bloqueado = gris.
  useEffect(() => { onLogoState(busy ? 'loading' : wait > 0 ? 'inactive' : 'default') }, [busy, wait, onLogoState])
  useEffect(() => () => onLogoState('default'), [onLogoState])

  // Cuenta atrás cuando la cuenta queda bloqueada temporalmente.
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function submit() {
    const p = pinRef.current
    if (busy || wait > 0 || !isValidPin(p)) return
    setBusy(true); setError('')
    const r = await g.login(worker.id, p)
    setBusy(false)
    if (r.ok) { haptic(); nav(home(r.role), { replace: true }); return }
    setPin(''); setShake((n) => n + 1); setError(message(r))
    if ((r.reason === 'pin' || r.reason === 'locked') && r.retryIn > 0) setWait(r.retryIn)
  }
  const press = (d: string) => { if (!busy && wait <= 0) setPin((p) => (p.length < 6 ? p + d : p)); setError('') }
  const del = () => setPin((p) => p.slice(0, -1))

  // Teclado físico (computadora).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') del()
      else if (e.key === 'Enter') void submit()
      else if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const dots = Math.max(4, pin.length)
  const keyCls = 'grid h-16 place-items-center rounded-2xl border border-line bg-surface text-2xl font-bold transition active:scale-95 active:bg-surface-2 disabled:opacity-40'
  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted"><ArrowLeft size={16} aria-hidden /> Cambiar de usuario</button>
      <div className="mb-6 flex items-center gap-3">
        <Avatar name={worker.name} size={52} />
        <div>
          <h1 tabIndex={-1} className="text-2xl font-extrabold tracking-tight">{worker.name}</h1>
          <p className="text-sm text-muted">Escribe tu clave</p>
        </div>
      </div>

      <div key={shake} className={`mb-2 flex justify-center gap-3 ${shake ? '[animation:shake_.35s]' : ''}`} role="img" aria-label={`${pin.length} de 4 a 6 dígitos escritos`}>
        {Array.from({ length: dots }, (_, i) => (
          <span key={i} className={`size-4 rounded-full border-2 ${i < pin.length ? 'border-amber bg-gold' : 'border-line'}`} />
        ))}
      </div>
      <p role="alert" className="mb-4 min-h-10 text-center text-sm text-danger">{wait > 0 && !error.includes('turno') ? `Espera ${wait} s para volver a intentar.` : error}</p>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) => <button key={k} className={keyCls} disabled={busy || wait > 0} onClick={() => press(k)} aria-label={k}>{k}</button>)}
        <button className={keyCls} onClick={del} aria-label="Borrar" disabled={!pin}><Delete size={22} aria-hidden /></button>
        <button className={keyCls} disabled={busy || wait > 0} onClick={() => press('0')} aria-label="0">0</button>
        <button className={`${keyCls} !border-amber !bg-gold !text-amber-ink`} disabled={!isValidPin(pin) || busy || wait > 0} onClick={() => void submit()}>Entrar</button>
      </div>
    </div>
  )
}

/**
 * Dos entradas separadas: `/login` es solo para trabajadores; la administración entra por `/admin/acceso`,
 * a la que se llega con 3 toques seguidos en el logo (no hay ningún botón a la vista).
 */
export function Login({ mode = 'worker' }: { mode?: 'worker' | 'admin' }) {
  const g = useGym()
  const nav = useNavigate()
  const [picked, setPicked] = useState<Worker | null>(null)
  const [logoState, setLogoState] = useState<LogoState>('default')
  const taps = useRef<number[]>([])
  if (g.session) return <Navigate to={home(g.session.role)} replace />

  const admin = mode === 'admin'
  const people = g.workers
    .filter((w) => w.active && (w.role === 'admin') === admin)
    .sort((a, b) => a.name.localeCompare(b.name))
  const only = admin && people.length === 1 ? people[0] : null
  const who = picked ?? only
  const logoTap = () => {
    if (admin) return
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < 1500), now]
    if (taps.current.length >= 3) { taps.current = []; nav('/admin/acceso') }
  }
  return (
    <div className="mx-auto min-h-dvh max-w-[430px] px-5 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mb-8 flex items-center gap-4">
        <div onClick={logoTap} className="select-none"><LogoMark size={72} state={logoState} /></div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber">{admin ? 'Administración' : 'Acceso'}</p>
          <p className="text-xl font-extrabold leading-tight tracking-tight">{g.settings.gymName}</p>
        </div>
      </div>

      {g.needsSetup ? (
        admin ? <Setup /> : (
          <div className="rounded-3xl border border-amber/50 bg-surface p-5">
            <h1 tabIndex={-1} className="mb-1 text-2xl font-extrabold tracking-tight">Falta configurar la app</h1>
            <p className="text-muted">Todavía no hay cuentas. El administrador debe entrar primero y crear su clave y las de los trabajadores.</p>
          </div>
        )
      ) : who ? <PinStep worker={who} onBack={() => (only ? nav('/login') : setPicked(null))} onLogoState={setLogoState} /> : (
        <>
          <h1 tabIndex={-1} className="mb-1 text-3xl font-extrabold tracking-tight">{admin ? 'Administración' : '¿Quién eres?'}</h1>
          <p className="mb-5 text-muted">{admin ? 'Elige tu cuenta de administrador.' : 'Elige tu nombre para entrar. Cada cobro y cada cierre queda a nombre de quien lo hizo.'}</p>
          <ul className="space-y-3">
            {people.map((w) => (
              <li key={w.id}>
                <button
                  onClick={() => setPicked(w)} disabled={!w.pinHash}
                  className="flex w-full items-center gap-4 rounded-3xl border border-line surface-card p-4 text-left transition active:scale-[0.98] disabled:opacity-50"
                >
                  <Avatar name={w.name} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{w.name}</span>
                    <span className="text-sm text-muted">{!w.pinHash ? 'Sin clave: pídesela al administrador' : w.role === 'admin' ? 'Administración' : 'Trabajador'}</span>
                  </span>
                </button>
              </li>
            ))}
            {people.length === 0 && <li className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">Todavía no hay trabajadores. Pídele al administrador que los agregue.</li>}
          </ul>
          {DEMO && (
            <aside className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-4 text-sm">
              <p className="mb-1 font-bold text-amber">Modo demostración</p>
              <p className="mb-2 text-muted">Datos de ejemplo. Claves de prueba:</p>
              <ul className="space-y-0.5">
                {DEMO_LOGINS.filter((d) => (d.name === 'Admin' || d.name === 'Administrador') === admin).map((d) => <li key={d.name}><b>{d.name}</b> · <span className="tabular-nums">{d.pin}</span></li>)}
              </ul>
              {!admin && <p className="mt-2 text-muted">Administrador: toca 3 veces seguidas el logo.</p>}
            </aside>
          )}
        </>
      )}
    </div>
  )
}
