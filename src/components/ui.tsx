import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { initials } from '../lib/domain'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

export function Screen({ eyebrow, title, action, children }: { eyebrow: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber">{eyebrow}</p>
          <h1 className="mt-1 text-[32px] font-extrabold leading-9 tracking-tight">{title}</h1>
        </div>
        {action}
      </header>
      {children}
    </div>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-3xl border border-line bg-surface p-4', className)}>{children}</div>
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'outline' | 'dark'; size?: 'md' | 'sm'; block?: boolean }
export function Button({ variant = 'solid', size = 'md', block, className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
        size === 'md' ? 'h-14 px-6 text-base' : 'h-11 px-4 text-sm',
        variant === 'solid' && 'bg-amber text-amber-ink',
        variant === 'outline' && 'border border-amber text-amber',
        variant === 'dark' && 'bg-amber-ink text-amber',
        block && 'w-full',
        className,
      )}
    />
  )
}

export function Pill({ tone = 'muted', children }: { tone?: 'amber' | 'white' | 'muted'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold',
        tone === 'amber' && 'bg-amber text-amber-ink',
        tone === 'white' && 'bg-white text-black',
        tone === 'muted' && 'border border-line bg-surface-2 text-muted',
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
  'h-14 w-full rounded-2xl border border-line bg-surface px-4 text-base text-white placeholder:text-faint focus:border-amber focus:outline-none'

/** Hoja inferior accesible: Escape cierra, bloquea el scroll del fondo. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 [animation:fade-in_.2s]" onClick={onClose} />
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className="relative max-h-[88dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[32px] border border-b-0 border-line bg-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 [animation:sheet-in_.25s_ease-out]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-surface-2" />
        <h2 className="mb-4 text-xl font-extrabold">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id} type="button" role="radio" aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            'h-11 rounded-full border px-5 text-sm font-semibold transition active:scale-95',
            value === o.id ? 'border-amber bg-amber text-amber-ink' : 'border-line text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export { cx }
