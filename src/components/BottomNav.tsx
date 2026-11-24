import { NavLink } from 'react-router-dom'
import { CreditCard, Home, Receipt, ShoppingBag, UserPlus } from 'lucide-react'
import { cx } from './ui'
import { useViewNavigate } from '../lib/nav'

const items = [
  { to: '/', label: 'Inicio', Icon: Home },
  { to: '/inscribir', label: 'Inscribir', Icon: UserPlus },
  { to: '/pagos', label: 'Pagos', Icon: CreditCard },
  { to: '/tienda', label: 'Tienda', Icon: ShoppingBag },
  { to: '/cierre', label: 'Cierre', Icon: Receipt },
]

export function BottomNav() {
  const go = useViewNavigate(items.map((i) => i.to))
  return (
    <nav
      aria-label="Principal"
      className="vt-static fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <ul className="flex items-center justify-between rounded-full border border-line bg-panel/95 p-1.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.07)] backdrop-blur">
        {items.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to} end={to === '/'}
              onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); go(to) }}
              className={({ isActive }) =>
                cx(
                  'flex h-14 min-w-[62px] flex-col items-center justify-center gap-0.5 rounded-full px-3 text-[11px] font-bold transition',
                  isActive ? 'bg-gold text-amber-ink' : 'text-muted',
                )
              }
            >
              <Icon size={20} aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Tableta y escritorio: la navegación va a la izquierda, siempre visible. */
export function SideRail() {
  const go = useViewNavigate(items.map((i) => i.to))
  return (
    <nav aria-label="Principal" className="vt-static sticky top-0 flex h-dvh w-24 shrink-0 flex-col items-center gap-2 border-r border-line bg-panel/60 px-2 py-8">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to} to={to} end={to === '/'}
          onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); go(to) }}
          className={({ isActive }) => cx('flex h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition', isActive ? 'bg-gold text-amber-ink' : 'text-muted hover:bg-surface-2')}
        >
          <Icon size={22} aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
