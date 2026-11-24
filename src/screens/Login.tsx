import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Delete } from 'lucide-react'
import { useGym, type LoginResult } from '../data/store'
import { Avatar } from '../components/ui'
import { LogoMark, type LogoState } from '../components/Logo'
import { isValidPin } from '../lib/pin'
import { haptic } from '../lib/nav'
import { DEMO, DEMO_LOGINS } from '../data/demo'
import { adminUrl } from '../app/shared'
import type { Worker } from '../lib/types'

const home = (role: Worker['role']) => (role === 'admin' ? '/admin' : '/')

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

export function PinStep({ worker, onBack, onLogoState }: { worker: Worker; onBack: () => void; onLogoState: (s: LogoState) => void }) {
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

/** Marco común de las pantallas de acceso: logo, nombre del gimnasio y el logo enorme y translúcido de fondo. */
export function LoginShell({ eyebrow, logoState, onLogoTap, children }: { eyebrow: string; logoState: LogoState; onLogoTap?: () => void; children: ReactNode }) {
  const g = useGym()
  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Logo enorme y casi transparente de fondo: decorativo */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 opacity-[0.13] [mask-image:linear-gradient(to_bottom,transparent_0%,#000_25%,#000_80%,transparent_100%)]">
        <LogoMark size={Math.min(640, typeof window === 'undefined' ? 560 : Math.round(window.innerWidth * 1.35))} state="default" label="" />
      </div>
      <div className="relative mx-auto max-w-[430px] px-5 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <div className="mb-8 flex items-center gap-4">
          <div onClick={onLogoTap} className="select-none"><LogoMark size={72} state={logoState} /></div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber">{eyebrow}</p>
            <p className="text-xl font-extrabold leading-tight tracking-tight">{g.settings.gymName}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Una pesa por trabajador: discos a los lados y la barra en medio con su nombre. */
function DumbbellCard({ worker, onPick }: { worker: Worker; onPick: () => void }) {
  const locked = !worker.pinHash
  const plate = (h: string, w = 'w-3.5') => <span aria-hidden className={`${h} ${w} shrink-0 rounded-md ${locked ? 'bg-surface-2' : 'bg-gold'}`} />
  const side = (flip: boolean) => (
    <span aria-hidden className={`flex shrink-0 items-center gap-1 ${flip ? 'flex-row-reverse' : ''}`}>
      {plate('h-[4.5rem]')}{plate('h-14')}<span className={`h-4 w-2 shrink-0 rounded-sm ${locked ? 'bg-line' : 'bg-line'}`} />
    </span>
  )
  return (
    <button
      onClick={onPick} disabled={locked}
      className="flex w-full items-center transition active:scale-[0.98] disabled:opacity-55"
    >
      {side(false)}
      <span className="relative flex min-w-0 flex-1 items-center gap-4 rounded-xl border border-line surface-card px-4 py-4 text-left">
        <Avatar name={worker.name} size={48} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-extrabold">{worker.name}</span>
          <span className="text-sm text-muted">{locked ? 'Sin clave: pídesela al administrador' : 'Toca para entrar'}</span>
        </span>
      </span>
      {side(true)}
    </button>
  )
}

/** Acceso de trabajadores. La administración entra por otra página (admin.html), con 3 toques seguidos en el logo. */
export function Login() {
  const g = useGym()
  const nav = useNavigate()
  const [picked, setPicked] = useState<Worker | null>(null)
  const [logoState, setLogoState] = useState<LogoState>('default')
  const taps = useRef<number[]>([])
  if (g.session) return <Navigate to={home(g.session.role)} replace />

  const people = g.workers.filter((w) => w.active && w.role === 'worker').sort((a, b) => a.name.localeCompare(b.name))
  const logoTap = () => {
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < 1500), now]
    if (taps.current.length < 3) return
    taps.current = []
    if (DEMO) nav('/admin/acceso') // la demo es un solo archivo: no hay otra página
    else window.location.assign(adminUrl)
  }
  return (
    <LoginShell eyebrow="Acceso" logoState={logoState} onLogoTap={logoTap}>
      {g.needsSetup ? (
        <div className="rounded-3xl border border-amber/50 bg-surface p-5">
          <h1 tabIndex={-1} className="mb-1 text-2xl font-extrabold tracking-tight">Falta configurar la app</h1>
          <p className="text-muted">Todavía no hay cuentas. El administrador debe entrar primero y crear las claves de los trabajadores.</p>
        </div>
      ) : picked ? (
        <PinStep worker={picked} onBack={() => setPicked(null)} onLogoState={setLogoState} />
      ) : (
        <>
          <h1 tabIndex={-1} className="mb-1 text-3xl font-extrabold tracking-tight">¿Quién eres?</h1>
          <p className="mb-6 text-muted">Elige tu nombre para entrar. Cada cobro y cada cierre queda a nombre de quien lo hizo.</p>
          <ul className="space-y-4">
            {people.map((w) => <li key={w.id}><DumbbellCard worker={w} onPick={() => setPicked(w)} /></li>)}
            {people.length === 0 && <li className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">Todavía no hay trabajadores. Pídele al administrador que los agregue.</li>}
          </ul>
          {DEMO && (
            <aside className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-4 text-sm">
              <p className="mb-1 font-bold text-amber">Modo demostración</p>
              <p className="mb-2 text-muted">Datos de ejemplo. Claves de prueba:</p>
              <ul className="space-y-0.5">
                {DEMO_LOGINS.filter((d) => d.name !== 'Administrador').map((d) => <li key={d.name}><b>{d.name}</b> · <span className="tabular-nums">{d.pin}</span></li>)}
              </ul>
              <p className="mt-2 text-muted">Administrador (clave 9999): toca 3 veces seguidas el logo.</p>
            </aside>
          )}
        </>
      )}
    </LoginShell>
  )
}
