import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HandCoins, LogOut, Moon, ShoppingBag, Search, Sun, TrendingUp, UserPlus } from 'lucide-react'
import { useGym } from '../data/store'
import { dueInfo, isFrozen, normalizeCarnet, pendingClients } from '../lib/domain'
import { formatTime, makeMoney, plural } from '../lib/format'
import { Avatar, Button, Card, inputCls, Screen, Sheet, Split, SwipeRow, cx } from '../components/ui'
import { THEMES, useTheme } from '../lib/theme'
import { PaySheet } from '../components/PaySheet'
import { accentFor, DuePill } from './Payments'
import { useClientPanel } from '../components/ClientDetail'
import { StatusPill } from '../components/ClientStatus'
import { AlertedTag } from '../components/Alert'
import { RateForm } from '../components/Payment'
import { CashOutSheet, OpenShiftSheet } from '../components/Cash'
import type { Client } from '../lib/types'

export function Home() {
  const g = useGym()
  const nav = useNavigate()
  const money = makeMoney(g.settings)
  const [q, setQ] = useState('')
  const [paying, setPaying] = useState<Client | null>(null)
  const [rateOpen, setRateOpen] = useState(false)
  const sum = g.shiftSummary
  const cp = useClientPanel((c) => setPaying(c))
  const searchRef = useRef<HTMLInputElement>(null)
  const [theme, setTheme] = useTheme()
  const [openSheet, setOpenSheet] = useState(false)
  const [outSheet, setOutSheet] = useState(false)

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return pendingClients(g.clients, g.today)
    const digits = term.replace(/\D/g, '')
    const carnet = normalizeCarnet(term)
    return g.clients.filter(
      (c) => c.name.toLowerCase().includes(term) || (digits && c.phone.replace(/\D/g, '').includes(digits)) || (carnet.length >= 3 && c.carnet.includes(carnet)),
    )
  }, [q, g.clients, g.today])

  return (
    <Screen
      eyebrow={g.shiftOpen ? `Turno abierto · desde ${formatTime(g.shift.openedAt, g.settings.locale)}` : 'Sin turno abierto'}
      title={`Hola, ${g.session?.name}`}
      action={
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setTheme(THEMES[(THEMES.findIndex((t) => t.id === theme) + 1) % THEMES.length].id)}
            aria-label={`Tema: ${THEMES.find((t) => t.id === theme)?.label}. Tocar para cambiar`}
            className="grid size-12 place-items-center rounded-2xl border border-line text-muted active:scale-95"
          >
            {theme === 'oscuro' ? <Moon size={20} aria-hidden /> : theme === 'claro' ? <Sun size={20} aria-hidden /> : <span aria-hidden className="text-xs font-extrabold">A</span>}
          </button>
          <button onClick={g.logout} aria-label="Salir" className="grid size-12 place-items-center rounded-2xl border border-line text-muted active:scale-95">
            <LogOut size={20} aria-hidden />
          </button>
        </div>
      }
    >
     <Split side={cp.panel} empty="Toca un cliente de la lista para ver su ficha, su historial y cobrarle.">
      {!g.shiftOpen && (
        <div className="mb-3 rounded-3xl border border-amber bg-surface p-4">
          <p className="font-extrabold">Todavía no abriste tu turno</p>
          <p className="mb-3 text-sm text-muted">Ábrelo para poder cobrar. Todo lo que registres quedará a tu nombre.</p>
          <Button block onClick={() => setOpenSheet(true)}>Abrir mi turno</Button>
        </div>
      )}

      {/* Lo que se hace casi todo el día, a un toque */}
      <div className="mb-3 grid grid-cols-3 gap-3">
        {[
          { label: 'Cobrar', Icon: HandCoins, run: () => { searchRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); searchRef.current?.focus({ preventScroll: true }) } },
          { label: 'Inscribir', Icon: UserPlus, run: () => nav('/inscribir') },
          { label: 'Vender', Icon: ShoppingBag, run: () => nav('/tienda') },
        ].map(({ label, Icon, run }, i) => (
          <button
            key={label} onClick={run} disabled={!g.shiftOpen}
            className={cx(
              'relative flex h-28 flex-col items-center justify-center gap-2.5 overflow-hidden rounded-3xl text-base font-extrabold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
              i === 0 ? 'bg-gold text-amber-ink' : 'border border-amber/50 surface-card',
            )}
          >
            <span aria-hidden className={cx('grid size-12 place-items-center rounded-2xl', i === 0 ? 'bg-black/15' : 'bg-gold text-amber-ink')}>
              <Icon size={26} strokeWidth={2.3} />
            </span>
            {label}
            {i !== 0 && <span aria-hidden className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-amber to-transparent shadow-[0_0_12px_2px_rgb(255_194_31/0.45)]" />}
          </button>
        ))}
      </div>

      {/* Tasa del día: lo primero que se necesita para cobrar en MN */}
      {g.rateFresh ? (
        <div className="flex items-center gap-4 rounded-3xl border border-amber/50 bg-surface p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold text-amber-ink"><TrendingUp size={22} aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Tasa del día</p>
            <p className="whitespace-nowrap text-lg font-extrabold tracking-tight">1 USD = {g.settings.usdRate} MN</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRateOpen(true)}>Cambiar</Button>
        </div>
      ) : (
        <div role="alert" className="flex items-center gap-4 rounded-3xl bg-ink p-4 text-bg">
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">Falta la tasa del USD de hoy</p>
            <p className="text-sm">Sin ella no se puede cobrar en MN ni con tarjeta.</p>
          </div>
          <Button variant="dark" size="sm" onClick={() => setRateOpen(true)}>Fijar</Button>
        </div>
      )}

      <div className="relative mt-3 overflow-hidden rounded-3xl border border-amber/50 surface-card p-5">
        <span aria-hidden className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-amber to-transparent shadow-[0_0_14px_2px_rgb(255_194_31/0.5)]" />
        <p className="text-sm font-semibold text-muted">En caja ahora (efectivo)</p>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber">MN</p>
            <p className="truncate text-[32px] font-extrabold leading-tight tracking-tight text-gold">{money.mnNum(sum.expected.mn)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber">USD</p>
            <p className="truncate text-[32px] font-extrabold leading-tight tracking-tight text-gold">{money.usdNum(sum.expected.usd)}</p>
          </div>
        </div>
        {g.shiftOpen && (
          <button onClick={() => setOutSheet(true)} className="mt-3 rounded-full border border-amber/60 px-3.5 py-1.5 text-xs font-bold text-amber active:scale-95">
            − Registrar gasto o retiro
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card>
          <p className="text-sm text-muted">Mensualidades</p>
          <p className="text-2xl font-extrabold tracking-tight">{money.usd(sum.memberships.total)}</p>
          <p className="text-xs text-muted">{plural(sum.memberships.count, 'cobro', 'cobros')}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Ventas</p>
          <p className="text-2xl font-extrabold tracking-tight">{money.usd(sum.sales.total)}</p>
          <p className="text-xs text-muted">{plural(sum.sales.count, 'venta', 'ventas')}</p>
        </Card>
      </div>

      <div className="relative mt-4">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
        <input
          ref={searchRef} type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre, carnet o teléfono" aria-label="Buscar cliente"
          className={`${inputCls} pl-11`}
        />
      </div>

      <h2 className="mb-3 mt-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-amber after:h-px after:flex-1 after:bg-gradient-to-r after:from-amber/40 after:to-transparent">
        {q ? `Resultados (${list.length})` : 'Por cobrar hoy'}
      </h2>
      <ul className="space-y-3">
        {list.map((c) => {
          const info = dueInfo(c.nextDue, g.today)
          const due = info.state === 'vencido' || info.state === 'hoy'
          return (
            <li key={c.id}>
              <SwipeRow label="Cobrar" disabled={!g.shiftOpen || isFrozen(c) || !(due || q)} onTrigger={() => setPaying(c)}>
              <Card glow accent={isFrozen(c) ? undefined : accentFor(info)} className={cx('flex items-center gap-3 !p-3.5 !pl-5', cp.selected === c.id && 'card-selected')}>
                <button onClick={() => cp.open(c.id)} aria-label={`Ver ficha de ${c.name}`} aria-current={cp.selected === c.id || undefined} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">{isFrozen(c) ? <StatusPill client={c} today={g.today} /> : <DuePill info={info} />}<AlertedTag client={c} /></div>
                  </div>
                </button>
                {!isFrozen(c) && (due || q) ? (
                  <Button variant="outline" size="sm" disabled={!g.shiftOpen} onClick={() => setPaying(c)}>Cobrar</Button>
                ) : null}
              </Card>
              </SwipeRow>
            </li>
          )
        })}
        {list.length === 0 && (
          <li className="rounded-3xl border border-dashed border-line p-8 text-center text-muted">
            {q ? 'No se encontró ningún cliente.' : '🎉 No hay pagos pendientes por hoy.'}
          </li>
        )}
      </ul>

     </Split>
      <PaySheet client={paying} onClose={() => setPaying(null)} />
      {cp.sheet}
      <OpenShiftSheet open={openSheet} onClose={() => setOpenSheet(false)} />
      <CashOutSheet open={outSheet} onClose={() => setOutSheet(false)} />
      <Sheet open={rateOpen} onClose={() => setRateOpen(false)} title="Tasa del USD de hoy">
        <p className="mb-4 text-sm text-muted">Es el valor del dólar en MN para hoy. Se usa para calcular los cobros en MN y con tarjeta.</p>
        <RateForm onDone={() => setRateOpen(false)} />
      </Sheet>
    </Screen>
  )
}
