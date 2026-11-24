import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { initials } from '../lib/domain'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

export function Screen({ eyebrow, title, action, children }: { eyebrow: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">{eyebrow}</p>
          <h1 tabIndex={-1} className="mt-1 text-[32px] font-extrabold leading-9 tracking-tight">{title}</h1>
        </div>
        {action}
      </header>
      {children}
    </div>
  )
}

/** `accent` pinta una barra lateral según la urgencia: danger = vencido, gold = vence hoy. */
export function Card({ className, children, accent }: { className?: string; children: ReactNode; accent?: 'danger' | 'gold' }) {
  return (
    <div className={cx('relative overflow-hidden rounded-3xl border border-line surface-card p-4', accent && 'pl-5', className)}>
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
        variant === 'dark' && 'bg-amber-ink text-amber',
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
        tone === 'white' && 'bg-white text-black',
        tone === 'muted' && 'border border-line bg-surface-2 text-muted',
        tone === 'danger' && 'border border-[rgb(255_90_82/0.4)] bg-[rgb(255_90_82/0.14)] text-[#ff9a92]',
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
      className="grid shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold"
    >
      {initials(name)}
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
  'h-14 w-full rounded-2xl border border-line bg-[#131417] px-4 text-base text-white shadow-[inset_0_2px_6px_rgb(0_0_0/0.35)] placeholder:text-faint focus:border-amber focus:shadow-[inset_0_2px_6px_rgb(0_0_0/0.35),0_0_0_3px_rgb(255_194_31/0.2)] focus:outline-none'

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
      onClose={() => openRef.current && onClose()}
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

const ToastCtx = createContext<(text: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null)
  const timer = useRef<number>(undefined)
  const show = useCallback((text: string) => {
    window.clearTimeout(timer.current)
    setMsg({ id: Date.now(), text })
    timer.current = window.setTimeout(() => setMsg(null), 2600)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[104px] z-[60] flex justify-center px-4">
        {msg && <div key={msg.id} className="toast rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-xl">✓ {msg.text}</div>}
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
            value === o.id ? 'border-amber bg-gold text-amber-ink' : 'border-line text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export { cx }
