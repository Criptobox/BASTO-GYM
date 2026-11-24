import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { initials } from '../lib/domain'
import { haptic } from '../lib/nav'
import { THEMES, useTheme } from '../lib/theme'
import { useWide } from '../lib/media'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

export function Screen({ eyebrow, title, action, narrow, children }: { eyebrow: string; title: string; action?: ReactNode; narrow?: boolean; children: ReactNode }) {
  return (
    <div className={cx('px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-6 md:px-8', narrow && 'mx-auto md:max-w-[620px]')}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">{eyebrow}</p>
          <h1 tabIndex={-1} className="mt-1 text-[32px] font-extrabold leading-9 tracking-tight">{title}</h1>
          <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-gold" />
        </div>
        {action}
      </header>
      {children}
    </div>
  )
}

/** `accent` pinta una barra lateral según la urgencia: danger = vencido, gold = vence hoy. */
export function Card({ className, children, accent, glow }: { className?: string; children: ReactNode; accent?: 'danger' | 'gold'; glow?: boolean }) {
  return (
    <div className={cx('relative overflow-hidden rounded-3xl border surface-card p-4', glow ? 'border-amber/50' : 'border-line', accent && 'pl-5', className)}>
      {glow && <span aria-hidden className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-amber to-transparent shadow-[0_0_14px_2px_rgb(255_194_31/0.5)]" />}
      {accent && (
        <span
          aria-hidden
          className={cx('absolute inset-y-0 left-0 w-1.5', accent === 'danger' ? 'bg-gradient-to-b from-[#ff8a80] to-[#d63b35]' : 'bg-gold !shadow-none')}
        />
      )}
      {children}
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'outline' | 'dark'; size?: 'md' | 'sm' | 'xs'; block?: boolean }
export function Button({ variant = 'solid', size = 'md', block, className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
        size === 'md' ? 'h-14 px-6 text-base' : size === 'sm' ? 'h-11 px-4 text-sm' : 'h-9 px-3.5 text-xs',
        variant === 'solid' && 'bg-gold text-amber-ink',
        variant === 'outline' && 'border border-amber text-amber',
        variant === 'dark' && 'bg-amber-ink text-[#ffc21f]',
        block && 'w-full',
        className,
      )}
    />
  )
}

export function Pill({ tone = 'muted', children }: { tone?: 'amber' | 'white' | 'muted' | 'danger'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold',
        tone === 'amber' && 'bg-gold text-amber-ink',
        tone === 'white' && 'bg-ink text-bg',
        tone === 'muted' && 'border border-line bg-surface-2 text-muted',
        tone === 'danger' && 'border border-[rgb(255_90_82/0.4)] bg-[rgb(255_90_82/0.14)] text-danger-soft',
      )}
    >
      {children}
    </span>
  )
}

export function Avatar({ name, photo, size = 46 }: { name: string; photo?: string; size?: number }) {
  return photo ? (
    <img src={photo} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
  ) : (
    <div
      style={{ width: size, height: size }}
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-gold font-extrabold text-amber-ink ring-2 ring-amber/40"
      /* tamaño de letra según el círculo */
    >
      <span style={{ fontSize: Math.max(12, Math.round(size * 0.34)) }}>{initials(name)}</span>
    </div>
  )
}

export function Field({ label, error, children }: { label: string; error?: string | false; children: ReactNode }) {
  return (
    <div>
      <label className="block">
        <span className="mb-2 block text-sm text-muted">{label}</span>
        {children}
      </label>
      {error && <p role="alert" className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  )
}

export const inputCls =
  'h-14 w-full rounded-2xl border border-line bg-field px-4 text-base text-ink shadow-[inset_0_2px_6px_rgb(0_0_0/0.18)] placeholder:text-faint focus:border-amber focus:shadow-[inset_0_2px_6px_rgb(0_0_0/0.35),0_0_0_3px_rgb(255_194_31/0.2)] focus:outline-none'

/**
 * Hoja inferior con <dialog> nativo: el navegador aporta capa superior, foco contenido,
 * Esc / gesto atrás, retorno del foco y fondo inerte. No se bloquea el scroll del body.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const openRef = useRef(open)
  const titleId = useId()
  openRef.current = open

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  // Safari aún no soporta closedby="any": cerrar al tocar fuera (pulsar y soltar fuera).
  const outside = (e: React.PointerEvent<HTMLDialogElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
  }
  const pressedOutside = useRef(false)
  const needsFallback = typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as object)}
      // React hace "subir" el evento close desde un diálogo anidado hasta su padre: solo cuenta el propio.
      onClose={(e) => { if (e.target === e.currentTarget && openRef.current) onClose() }}
      onPointerDown={needsFallback ? (e) => { pressedOutside.current = outside(e) } : undefined}
      onPointerUp={needsFallback ? (e) => { if (pressedOutside.current && outside(e)) e.currentTarget.close() } : undefined}
    >
      <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-surface-2" aria-hidden />
        <h1 id={titleId} className="mb-4 text-xl font-extrabold">{title}</h1>
        {children}
      </div>
    </dialog>
  )
}

/** Último valor no nulo: mantiene el contenido visible mientras la hoja se anima al cerrarse. */
export function useLatest<T>(value: T | null): T | null {
  const last = useRef(value)
  if (value !== null) last.current = value
  return value ?? last.current
}

export interface ToastAction { label: string; onClick: () => void }
const ToastCtx = createContext<(text: string, action?: ToastAction) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ id: number; text: string; action?: ToastAction } | null>(null)
  const timer = useRef<number>(undefined)
  const show = useCallback((text: string, action?: ToastAction) => {
    window.clearTimeout(timer.current)
    setMsg({ id: Date.now(), text, action })
    // con botón de acción dura más, para dar tiempo a tocarlo
    timer.current = window.setTimeout(() => setMsg(null), action ? 7000 : 2600)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[104px] z-[60] flex justify-center px-4">
        {msg && (
          <div key={msg.id} className="toast pointer-events-auto flex items-center gap-3 rounded-full bg-ink py-2 pl-5 pr-2 text-sm font-bold text-bg shadow-xl">
            <span>✓ {msg.text}</span>
            {msg.action && (
              <button
                onClick={() => { msg.action!.onClick(); setMsg(null) }}
                className="h-8 rounded-full bg-black px-3.5 text-xs font-bold text-[#ffc21f] active:scale-95"
              >
                {msg.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; disabled?: boolean }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id} type="button" role="radio" aria-checked={value === o.id} disabled={o.disabled}
          onClick={() => onChange(o.id)}
          className={cx(
            'h-11 rounded-full border px-5 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:active:scale-100',
            value === o.id ? 'border-amber bg-gold text-amber-ink' : 'border-line text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export { cx }

/** Tema de la app: automático (según el teléfono), claro u oscuro. Se guarda en este dispositivo. */
export function ThemeSwitch() {
  const [theme, setTheme] = useTheme()
  return <Segmented label="Tema" value={theme} onChange={setTheme} options={THEMES.map((t) => ({ id: t.id, label: t.label }))} />
}

/**
 * Tarjeta que se desliza hacia la izquierda para ejecutar una acción (p. ej. cobrar).
 * Es un atajo: la acción siempre tiene también un botón visible. Solo capta gestos horizontales.
 */
export function SwipeRow({ onTrigger, label, disabled, children }: { onTrigger: () => void; label: string; disabled?: boolean; children: ReactNode }) {
  const [dx, setDx] = useState(0)
  const [drag, setDrag] = useState(false)
  const st = useRef<{ x: number; y: number; id: number; lock: boolean | null } | null>(null)
  const MAX = 120, GO = 84
  if (disabled) return <>{children}</>
  const end = (e: React.PointerEvent) => {
    const s = st.current
    st.current = null
    setDrag(false)
    if (s && s.lock && -dx >= GO) { haptic(18); onTrigger() }
    setDx(0)
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* ya liberado */ }
  }
  return (
    <div className="relative overflow-hidden rounded-3xl">
      <div aria-hidden className="absolute inset-0 flex items-center justify-end rounded-3xl bg-gold pr-6 text-sm font-extrabold text-amber-ink" style={{ opacity: Math.min(1, -dx / GO) }}>
        {label} →
      </div>
      <div
        className="relative touch-pan-y"
        style={{ transform: `translateX(${dx}px)`, transition: drag ? 'none' : 'transform 0.25s cubic-bezier(0.32,0.72,0,1)' }}
        onPointerDown={(e) => { if (e.pointerType === 'mouse') return; st.current = { x: e.clientX, y: e.clientY, id: e.pointerId, lock: null } }}
        onPointerMove={(e) => {
          const s = st.current
          if (!s) return
          const mx = e.clientX - s.x, my = e.clientY - s.y
          if (s.lock === null && Math.abs(mx) + Math.abs(my) > 8) {
            s.lock = Math.abs(mx) > Math.abs(my) * 1.4 && mx < 0
            if (s.lock) { setDrag(true); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* sin captura */ } }
            else st.current = null
          }
          if (s.lock) setDx(Math.max(-MAX, Math.min(0, mx)))
        }}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {children}
      </div>
    </div>
  )
}

/** Móvil: solo la lista. Tableta/escritorio: lista a la izquierda y detalle fijo a la derecha. */
export function Split({ side, empty, children }: { side: ReactNode; empty: string; children: ReactNode }) {
  const wide = useWide()
  if (!wide) return <>{children}</>
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-start gap-6">
      <div className="min-w-0">{children}</div>
      <aside aria-label="Ficha del cliente" className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-3xl border border-line surface-card p-5">
        {side ?? <p className="grid min-h-60 place-items-center text-center text-muted">{empty}</p>}
      </aside>
    </div>
  )
}

/** Brillo dorado fino en el borde de abajo, como en las tarjetas del acceso. */
export function Glow() {
  return <span aria-hidden className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-amber to-transparent shadow-[0_0_14px_2px_rgb(255_194_31/0.45)]" />
}

/** Bloque con título numerado (paso 1, 2, 3…) o con icono, para ordenar formularios largos. */
export function Section({ title, step, icon, action, children, className }: { title: string; step?: number; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('relative overflow-hidden rounded-3xl border border-line surface-card p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.14em] text-amber">
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-lg bg-gold text-[13px] font-extrabold text-amber-ink">{step ?? icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Título de tarjeta con su icono en un cuadro dorado (mismo lenguaje que los botones de Inicio). */
export function IconTitle({ icon, children, className }: { icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <h2 className={cx('flex items-center gap-2.5 font-bold', className)}>
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-xl bg-gold text-amber-ink">{icon}</span>
      {children}
    </h2>
  )
}
