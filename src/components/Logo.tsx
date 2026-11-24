import { cx } from './ui'
import logoUrl from '../../brand/logo.svg'

/**
 * Logo de BASTO GYM (brand/logo.svg → public/logo.svg) con sus estados:
 *  - default   : normal
 *  - active    : resplandor dorado y destellos (seleccionado / éxito)
 *  - inactive  : gris (desactivado, bloqueado, turno cerrado)
 *  - loading   : anillo dorado que gira alrededor (trabajando)
 * `badge` añade el globo rojo con número (avisos pendientes).
 * Es vector: nítido a cualquier tamaño. Iconos PNG: `node scripts/build-logo.cjs`.
 */
export type LogoState = 'default' | 'active' | 'inactive' | 'loading'

function Sparkle({ x, y, s, delay }: { x: number; y: number; s: number; delay: string }) {
  return (
    <svg
      viewBox="-10 -10 20 20" width={s} height={s} aria-hidden
      className="logo-sparkle pointer-events-none absolute"
      style={{ left: `${x}%`, top: `${y}%`, animationDelay: delay, translate: '-50% -50%' }}
    >
      <path d="M0 -10 L2 -2 L10 0 L2 2 L0 10 L-2 2 L-10 0 L-2 -2 Z" fill="#FFE9A0" />
    </svg>
  )
}

export function LogoMark({
  size = 64, state = 'default', badge = 0, className, label = 'BASTO GYM',
}: { size?: number; state?: LogoState; badge?: number; className?: string; label?: string }) {
  const loading = state === 'loading'
  const inner = loading ? Math.round(size * 0.66) : size
  const text = badge > 0 ? `${label}, ${badge} ${badge === 1 ? 'aviso' : 'avisos'}` : label
  return (
    <span
      className={cx('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
      role={loading ? 'status' : undefined}
      aria-busy={loading || undefined}
    >
      {loading && (
        <svg viewBox="0 0 100 100" className="logo-ring absolute inset-0 size-full" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="#F5B400" strokeWidth="5" pathLength="100" strokeDasharray="9.5 3" />
        </svg>
      )}
      <img
        src={logoUrl} width={inner} height={inner} alt={loading ? 'Cargando' : text}
        className={cx(state === 'active' && 'logo-active', state === 'inactive' && 'logo-inactive')}
      />
      {state === 'active' && (
        <>
          <Sparkle x={8} y={22} s={size * 0.16} delay="0s" />
          <Sparkle x={94} y={30} s={size * 0.12} delay="0.5s" />
          <Sparkle x={86} y={84} s={size * 0.14} delay="1s" />
        </>
      )}
      {badge > 0 && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 grid h-[1.35rem] min-w-[1.35rem] place-items-center rounded-full bg-[#E5272B] px-1 text-[11px] font-extrabold leading-none text-white shadow-[0_0_0_2px_#0a0a0a]"
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </span>
  )
}

export function Logo({ name = 'BASTO GYM', size = 44, state }: { name?: string; size?: number; state?: LogoState }) {
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark size={size} state={state} />
      <span className="text-xl font-extrabold leading-none tracking-tight">{name}</span>
    </span>
  )
}
