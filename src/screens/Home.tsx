import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Search, TrendingUp } from 'lucide-react'
import { useGym } from '../data/store'
import { dueInfo, isFrozen, normalizeCarnet, pendingClients } from '../lib/domain'
import { formatTime, makeMoney, plural } from '../lib/format'
import { Avatar, Button, Card, inputCls, Pill, Screen, Sheet } from '../components/ui'
import { PaySheet } from '../components/PaySheet'
import { accentFor, DuePill } from './Payments'
import { ClientSheet } from '../components/ClientDetail'
import { StatusPill } from '../components/ClientStatus'
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
  const [detail, setDetail] = useState<string | null>(null)
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
        <button onClick={g.logout} aria-label="Salir" className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line text-muted active:scale-95">
          <LogOut size={20} aria-hidden />
        </button>
      }
    >
      {!g.shiftOpen && (
        <div className="mb-3 rounded-3xl border border-amber bg-surface p-4">
          <p className="font-extrabold">Todavía no abriste tu turno</p>
          <p className="mb-3 text-sm text-muted">Ábrelo para poder cobrar. Todo lo que registres quedará a tu nombre.</p>
          <Button block onClick={() => setOpenSheet(true)}>Abrir mi turno</Button>
        </div>
      )}

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
        <div role="alert" className="flex items-center gap-4 rounded-3xl bg-white p-4 text-black">
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">Falta la tasa del USD de hoy</p>
            <p className="text-sm">Sin ella no se puede cobrar en MN ni con tarjeta.</p>
          </div>
          <Button variant="dark" size="sm" onClick={() => setRateOpen(true)}>Fijar</Button>
        </div>
      )}

      <div className="mt-3 rounded-3xl bg-gold p-5 text-amber-ink">
        <p className="text-sm font-semibold">En caja ahora (efectivo)</p>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em]">MN</p>
            <p className="truncate text-[32px] font-extrabold leading-tight tracking-tight">{money.mnNum(sum.expected.mn)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em]">USD</p>
            <p className="truncate text-[32px] font-extrabold leading-tight tracking-tight">{money.usdNum(sum.expected.usd)}</p>
          </div>
        </div>
        {g.shiftOpen && (
          <button onClick={() => setOutSheet(true)} className="mt-3 rounded-full bg-black/80 px-3.5 py-1.5 text-xs font-bold text-amber active:scale-95">
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
          type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre, carnet o teléfono" aria-label="Buscar cliente"
          className={`${inputCls} pl-11`}
        />
      </div>

      <h2 className="mb-3 mt-6 text-xs font-bold uppercase tracking-[0.14em] text-amber">
        {q ? `Resultados (${list.length})` : 'Por cobrar hoy'}
      </h2>
      <ul className="space-y-3">
        {list.map((c) => {
          const info = dueInfo(c.nextDue, g.today)
          const due = info.state === 'vencido' || info.state === 'hoy'
          return (
            <li key={c.id}>
              <Card accent={isFrozen(c) ? undefined : accentFor(info)} className="flex items-center gap-3 !p-3.5 !pl-5">
                <button onClick={() => setDetail(c.id)} aria-label={`Ver ficha de ${c.name}`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.name}</p>
                    <div className="mt-1">{isFrozen(c) ? <StatusPill client={c} today={g.today} /> : <DuePill info={info} />}</div>
                  </div>
                </button>
                {!isFrozen(c) && (due || q) ? (
                  <Button variant="outline" size="sm" disabled={!g.shiftOpen} onClick={() => setPaying(c)}>Cobrar</Button>
                ) : null}
              </Card>
            </li>
          )
        })}
        {list.length === 0 && (
          <li className="rounded-3xl border border-dashed border-line p-8 text-center text-muted">
            {q ? 'No se encontró ningún cliente.' : '🎉 No hay pagos pendientes por hoy.'}
          </li>
        )}
      </ul>

      <Button block className="mt-6" disabled={!g.shiftOpen} onClick={() => nav('/tienda')}>Venta en mostrador</Button>
      <PaySheet client={paying} onClose={() => setPaying(null)} />
      <ClientSheet clientId={detail} onClose={() => setDetail(null)} onPay={(c) => { setDetail(null); setPaying(c) }} />
      <OpenShiftSheet open={openSheet} onClose={() => setOpenSheet(false)} />
      <CashOutSheet open={outSheet} onClose={() => setOutSheet(false)} />
      <Sheet open={rateOpen} onClose={() => setRateOpen(false)} title="Tasa del USD de hoy">
        <p className="mb-4 text-sm text-muted">Es el valor del dólar en MN para hoy. Se usa para calcular los cobros en MN y con tarjeta.</p>
        <RateForm onDone={() => setRateOpen(false)} />
      </Sheet>
    </Screen>
  )
}
