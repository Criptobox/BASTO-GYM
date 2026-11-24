import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, LogOut, Package, Receipt, Settings, UserCog, Users } from 'lucide-react'
import { LogoMark } from '../components/Logo'
import { Backdrop } from '../components/Backdrop'
import { useGym } from '../data/store'
import { cx } from '../components/ui'
import { useRouteReset, useViewNavigate } from '../lib/nav'

const items = [
  { to: '/admin', label: 'Resumen', Icon: BarChart3, end: true },
  { to: '/admin/clientes', label: 'Clientes', Icon: Users },
  { to: '/admin/productos', label: 'Productos', Icon: Package },
  { to: '/admin/cierres', label: 'Cierres', Icon: Receipt },
  { to: '/admin/trabajadores', label: 'Trabajadores', Icon: UserCog },
  { to: '/admin/ajustes', label: 'Ajustes', Icon: Settings },
]

export function AdminLayout() {
  const { settings, session, logout } = useGym()
  const { pathname } = useLocation()
  const go = useViewNavigate()
  useRouteReset()
  useEffect(() => {
    document.querySelector('[aria-label="Administración"] [aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [pathname])
  return (
    <div className="relative min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <Backdrop />
      <aside className="vt-static relative border-b border-line bg-panel lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-6 pt-6 lg:pt-8">
          <LogoMark size={44} className="logo-active" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber">{session?.name ?? 'Administrador'}</p>
            <p className="truncate text-xl font-extrabold leading-tight tracking-tight">{settings.gymName}</p>
          </div>
        </div>
        <nav aria-label="Administración" className="no-scrollbar flex gap-1 overflow-x-auto p-3 lg:mt-4 lg:flex-col lg:p-4">
          {items.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); go(to) }}
              className={({ isActive }) =>
                cx(
                  'flex h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold transition',
                  isActive ? 'bg-gold text-amber-ink' : 'text-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <Icon size={18} aria-hidden /> {label}
            </NavLink>
          ))}
          <button onClick={logout} className="flex h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold text-muted hover:text-ink lg:mt-6">
            <LogOut size={18} aria-hidden /> Salir
          </button>
        </nav>
      </aside>
      <main className="relative min-w-0 px-5 py-8 lg:px-10">
        <Outlet />
      </main>
    </div>
  )
}

export function AdminHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">{eyebrow}</p>
        <h1 tabIndex={-1} className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-gold" />
      </div>
      {action}
    </header>
  )
}

export function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'amber' }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line surface-card p-3.5 sm:rounded-3xl sm:p-5">
      <p className="text-xs leading-snug text-muted sm:text-sm">{label}</p>
      <p className={cx('mt-0.5 whitespace-nowrap text-2xl font-extrabold tracking-tight sm:mt-1 sm:text-[28px]', tone === 'amber' && 'text-amber')}>{value}</p>
    </div>
  )
}

/** Totales: 2 por fila en móvil (el último, si queda solo, ocupa todo el ancho) y 3 en pantallas anchas. */
export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">{children}</div>
}

export const th = 'px-4 py-3 text-left text-sm font-semibold text-muted'
export const td = 'px-4 py-3.5 text-sm'
