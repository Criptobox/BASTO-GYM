import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Delete, Dumbbell, Lock, User } from 'lucide-react'
import { useGym, type LoginResult } from '../data/store'
import { LogoMark, type LogoState } from '../components/Logo'
import { isValidPin, PIN_LENGTH } from '../lib/pin'
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
  // La clave es siempre de 4 números: al escribir el cuarto, entra sola (el botón Entrar sigue ahí).
  useEffect(() => { if (pin.length === PIN_LENGTH) void submit() }, [pin]) // eslint-disable-line react-hooks/exhaustive-deps
  const press = (d: string) => { if (!busy && wait <= 0) setPin((p) => (p.length < PIN_LENGTH ? p + d : p)); setError('') }
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

  const dots = PIN_LENGTH
  const keyCls = 'grid h-16 place-items-center rounded-2xl border border-line surface-card text-2xl font-bold transition active:scale-95 active:bg-surface-2 disabled:opacity-40'
  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted"><ArrowLeft size={16} aria-hidden /> Cambiar de usuario</button>
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-[3.25rem] place-items-center rounded-full bg-gold text-xl font-extrabold text-amber-ink ring-2 ring-amber/50">{worker.name.trim().charAt(0).toUpperCase()}</span>
        <div>
          <h1 tabIndex={-1} className="text-2xl font-extrabold tracking-tight">{worker.name}</h1>
          <p className="text-sm text-muted">Escribe tu clave</p>
        </div>
      </div>

      <div key={shake} className={`mb-2 flex justify-center gap-3 ${shake ? '[animation:shake_.35s]' : ''}`} role="img" aria-label={`${pin.length} de ${PIN_LENGTH} dígitos escritos`}>
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

/** Siluetas sencillas de gimnasio, para decorar las tarjetas. Son tenues a propósito. */
const SILHOUETTES = [
  // disco
  <svg key="disc" viewBox="0 0 100 100" className="h-full"><circle cx="50" cy="50" r="46" fill="currentColor" /><circle cx="50" cy="50" r="34" fill="none" stroke="var(--color-surface)" strokeWidth="2.5" opacity=".6" /><circle cx="50" cy="50" r="12" fill="var(--color-surface)" opacity=".75" /></svg>,
  // pesa rusa
  <svg key="kb" viewBox="0 0 100 100" className="h-full"><path d="M32 40 C30 8 70 8 68 40" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" /><circle cx="50" cy="64" r="30" fill="currentColor" /></svg>,
  // mancuerna
  <svg key="db" viewBox="0 0 100 100" className="h-full"><rect x="2" y="30" width="14" height="40" rx="4" fill="currentColor" /><rect x="18" y="20" width="14" height="60" rx="4" fill="currentColor" /><rect x="32" y="44" width="36" height="12" fill="currentColor" /><rect x="68" y="20" width="14" height="60" rx="4" fill="currentColor" /><rect x="84" y="30" width="14" height="40" rx="4" fill="currentColor" /></svg>,
]

/** Marco común de las pantallas de acceso: franjas doradas, logo enorme translúcido y la marca arriba. */
export function LoginShell({ eyebrow, logoState, onLogoTap, children }: { eyebrow: string; logoState: LogoState; onLogoTap?: () => void; children: ReactNode }) {
  const g = useGym()
  const words = g.settings.gymName.trim().split(/\s+/)
  const last = words.length > 1 ? words.pop() : null
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div aria-hidden className="carbon pointer-events-none absolute inset-0" />
      {/* franja dorada arriba a la izquierda y curva brillante abajo */}
      <div aria-hidden className="pointer-events-none absolute -left-4 -top-4 h-28 w-64 opacity-70 [clip-path:polygon(0_0,100%_0,0_100%)] [background:linear-gradient(100deg,var(--color-amber),transparent_75%)]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-1/4 h-64 w-[150%] rounded-[50%] border-t-2 border-amber/70 shadow-[0_-10px_30px_-6px_rgb(255_194_31/0.35)]" />
      {/* Logo enorme y casi transparente de fondo: decorativo */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 opacity-[0.11] [mask-image:linear-gradient(to_bottom,transparent_0%,#000_25%,#000_80%,transparent_100%)]">
        <LogoMark size={Math.min(520, typeof window === 'undefined' ? 520 : Math.round(window.innerWidth * 1.35))} state="default" label="" />
      </div>
      <div className="relative mx-auto max-w-[430px] px-5 pb-40 pt-[max(2.5rem,env(safe-area-inset-top))] md:max-w-[520px]">
        <div className="mb-9 flex items-center gap-4">
          <div onClick={onLogoTap} className="select-none"><LogoMark size={76} state={logoState} className={logoState === 'default' ? 'logo-active' : ''} /></div>
          <span aria-hidden className="h-16 w-px shrink-0 bg-amber/60" />
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-muted">{eyebrow}</p>
            <p className="text-[26px] font-extrabold leading-tight tracking-tight">
              {words.join(' ')}{last && <> <span className="text-gold">{last}</span></>}
            </p>
            <p className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              <Dumbbell size={13} aria-hidden className="shrink-0 rotate-45 text-amber" /> Centro de entrenamiento
            </p>
          </div>
        </div>
        {/* en pantallas anchas el contenido va en un panel, para que el logo de fondo no estorbe al leer ni al teclear */}
        <div className="md:rounded-[2rem] md:border md:border-line md:bg-bg/70 md:p-8 md:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] md:backdrop-blur-sm">{children}</div>
      </div>
    </div>
  )
}

/** Tarjeta de un trabajador: avatar dorado, flecha, brillo dorado abajo y una silueta de gimnasio. */
function WorkerCard({ worker, index, onPick }: { worker: Worker; index: number; onPick: () => void }) {
  const locked = !worker.pinHash
  return (
    <button onClick={onPick} disabled={locked} className="group relative block w-full overflow-hidden rounded-2xl text-left transition active:scale-[0.98] disabled:opacity-55">
      <span className={`relative flex items-center gap-4 rounded-2xl border px-4 py-4 surface-card shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] ${locked ? 'border-line' : 'border-amber/70'}`}>
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-10 flex items-center text-ink opacity-[0.07] [mask-image:linear-gradient(to_right,transparent,#000_60%)]" style={{ width: '9rem' }}>
          <span className="ml-auto block h-[120%]">{SILHOUETTES[index % SILHOUETTES.length]}</span>
        </span>
        {!locked && <span aria-hidden className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-amber to-transparent shadow-[0_0_14px_2px_rgb(255_194_31/0.6)]" />}
        <span className={`relative grid size-[3.1rem] shrink-0 place-items-center rounded-full text-xl font-extrabold ${locked ? 'bg-surface-2 text-muted ring-2 ring-line' : 'bg-gold text-amber-ink ring-2 ring-amber/50 ring-offset-2 ring-offset-transparent'}`}>
          {worker.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block truncate text-xl font-extrabold">{worker.name}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted"><User size={15} aria-hidden className="shrink-0" />{locked ? 'Sin clave: pídesela al administrador' : 'Toca para entrar'}</span>
        </span>
        {locked ? <Lock size={18} aria-hidden className="relative text-faint" /> : <ChevronRight size={26} strokeWidth={2.6} aria-hidden className="relative text-amber transition group-active:translate-x-0.5" />}
      </span>
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
          <h1 tabIndex={-1} className="text-[34px] font-extrabold leading-tight tracking-tight">¿Quién eres<span className="text-gold">?</span></h1>
          <span aria-hidden className="mb-4 mt-2 block h-1 w-12 rounded-full bg-gold" />
          <p className="mb-6 text-muted">Elige tu nombre para entrar. Cada cobro y cada cierre queda a nombre de quien lo hizo.</p>
          <ul className="space-y-4">
            {people.map((w, i) => <li key={w.id}><WorkerCard worker={w} index={i} onPick={() => setPicked(w)} /></li>)}
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
