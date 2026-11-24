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
      <ul className="flex items-center justify-between rounded-full border border-line bg-surface/95 p-1.5 shadow-2xl backdrop-blur">
        {items.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to} end={to === '/'}
              onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); go(to) }}
              className={({ isActive }) =>
                cx(
                  'flex h-14 min-w-[62px] flex-col items-center justify-center gap-0.5 rounded-full px-3 text-[11px] font-bold transition',
                  isActive ? 'bg-amber text-amber-ink' : 'text-muted',
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
