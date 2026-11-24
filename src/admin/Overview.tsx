import { Link } from 'react-router-dom'
import { BarChart3, CalendarClock, Check } from 'lucide-react'
import { useGym } from '../data/store'
import { addDays, formatShortDate, toISODate } from '../lib/dates'
import { alertToday, dueInfo, pendingClients, upcomingClients } from '../lib/domain'
import { makeMoney } from '../lib/format'
import { Avatar, Button, Card, IconTitle, Pill } from '../components/ui'
import { AdminHeader, Stat } from './AdminLayout'

/** Primer uso: lo mínimo que el administrador debe dejar listo para que recepción pueda cobrar. */
function SetupGuide() {
  const g = useGym()
  if (g.settings.setupDismissed) return null
  const staff = g.workers.filter((w) => w.role === 'worker' && w.active)
  const steps = [
    { done: g.rateFresh, title: 'Fija la tasa del USD de hoy', hint: 'Sin ella recepción no puede cobrar en MN ni con tarjeta.', to: '/admin/ajustes', cta: 'Ir a Ajustes' },
    { done: !!g.settings.pricesReviewed, title: 'Revisa los precios de los planes', hint: 'Están en USD. Los de ahora son de ejemplo.', to: '/admin/ajustes', cta: 'Revisar precios', alt: () => g.setSettings({ pricesReviewed: true }), altLabel: 'Ya están bien' },
    { done: staff.length > 0 && staff.every((w) => w.pinHash), title: 'Dale una clave a cada trabajador', hint: staff.length ? 'Sin clave no pueden entrar, y así cada turno queda a su nombre.' : 'Agrega al menos un trabajador.', to: '/admin/trabajadores', cta: 'Ir a Trabajadores' },
    { done: g.products.length > 0, title: 'Carga tus productos', hint: 'Para poder vender en mostrador.', to: '/admin/productos', cta: 'Ir a Productos' },
  ]
  const left = steps.filter((s) => !s.done).length
  return (
    <Card className="mb-4 !p-5" accent="gold">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold">{left ? 'Deja tu gimnasio listo' : '¡Todo listo para abrir!'}</h2>
          <p className="text-sm text-muted">{left ? `Faltan ${left} de ${steps.length} pasos antes del primer turno.` : 'Recepción ya puede abrir turno y cobrar.'}</p>
        </div>
        {left === 0 && <Button size="xs" variant="outline" onClick={() => g.setSettings({ setupDismissed: true })}>Cerrar guía</Button>}
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3">
            <span aria-hidden className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${s.done ? 'bg-ok text-amber-ink' : 'border border-line text-muted'}`}>{s.done ? <Check size={16} /> : i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className={`font-bold ${s.done ? 'text-muted line-through' : ''}`}>{s.title}<span className="sr-only">{s.done ? ' (hecho)' : ' (pendiente)'}</span></p>
              {!s.done && (
                <>
                  <p className="text-sm text-muted">{s.hint}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link to={s.to} className="inline-flex h-9 items-center rounded-full bg-gold px-3.5 text-xs font-bold text-amber-ink">{s.cta}</Link>
                    {s.alt && <Button size="xs" variant="outline" onClick={s.alt}>{s.altLabel}</Button>}
                  </div>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

/** Cuánto cobró cada trabajador hoy y en los últimos 7 días, y si tiene el turno abierto ahora. */
function ByWorker() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const day = (iso: string) => toISODate(new Date(iso))
  const weekStart = addDays(g.today, -6)
  const shiftWorker = new Map(g.shifts.map((s) => [s.id, { id: s.workerId, name: s.worker }]))
  const rows = g.workers
    .filter((w) => w.role === 'worker')
    .map((w) => {
      const mine = g.movements.filter((m) => (m.workerId ?? shiftWorker.get(m.shiftId)?.id) === w.id || (!m.workerId && !shiftWorker.get(m.shiftId)?.id && (m.worker ?? shiftWorker.get(m.shiftId)?.name) === w.name))
      const today = mine.filter((m) => day(m.at) === g.today)
      const week = mine.filter((m) => day(m.at) >= weekStart)
      const open = g.shifts.some((s) => !s.closedAt && (s.workerId === w.id || s.worker === w.name))
      return { w, today, week, open, sum: (l: typeof mine) => l.reduce((n, m) => n + m.amount, 0) }
    })
    .sort((a, b) => b.sum(b.week) - a.sum(a.week))
  if (rows.length === 0) return null
  return (
    <>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-amber">Por trabajador</h2>
      <ul className="mb-6 grid gap-2 sm:gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {rows.map(({ w, today, week, open, sum }) => (
          <li key={w.id} className="flex items-center gap-3 rounded-2xl border border-line surface-card p-3.5 sm:rounded-3xl sm:p-4">
            <Avatar name={w.name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-bold">
                {w.name}
                {open && <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[11px] font-bold text-ok">Turno abierto</span>}
                {!w.active && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">Inactivo</span>}
              </p>
              <p className="text-xs text-muted">Hoy {today.length} {today.length === 1 ? 'cobro' : 'cobros'} · 7 días {money.usd(sum(week))}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Hoy</p>
              <p className="whitespace-nowrap text-xl font-extrabold tracking-tight text-gold">{money.usd(sum(today))}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

export function Overview() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const month = g.today.slice(0, 7)
  const day = (iso: string) => toISODate(new Date(iso))

  const todayMovs = g.movements.filter((m) => day(m.at) === g.today)
  const sumKind = (k: 'mensualidad' | 'venta') => todayMovs.filter((m) => m.kind === k).reduce((n, m) => n + m.amount, 0)
  const todayMemb = todayMovs.filter((m) => m.kind === 'mensualidad')
  const todaySales = todayMovs.filter((m) => m.kind === 'venta')
  const monthTotal = g.movements.filter((m) => day(m.at).startsWith(month)).reduce((n, m) => n + m.amount, 0)
  const active = g.clients.filter((c) => c.nextDue >= g.today).length
  const overdue = g.clients.filter((c) => c.nextDue < g.today).length
  const lowStock = g.products.filter((p) => p.stock <= 5).length
  // clientes a los que toca avisar (vencidos, de hoy y próximos) y todavía no se avisó hoy
  const withoutAlert = [...pendingClients(g.clients, g.today), ...upcomingClients(g.clients, g.today)].filter((c) => !alertToday(g.alerts, c.id, g.today)).length

  const days = Array.from({ length: 7 }, (_, i) => addDays(g.today, i - 6))
  const totals = days.map((d) => g.movements.filter((m) => day(m.at) === d).reduce((n, m) => n + m.amount, 0))
  const max = Math.max(...totals, 1)
  const soon = g.clients
    .filter((c) => c.nextDue >= g.today && c.nextDue <= addDays(g.today, 7))
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue))

  return (
    <>
      <AdminHeader eyebrow="Panorama" title="Resumen" />
      <SetupGuide />
      <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-amber">Hoy</h2>
      <div className="mb-6 grid gap-2 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <Stat label="Recibido hoy" value={money.usd(sumKind('mensualidad') + sumKind('venta'))} />
        <Stat label={`Suscripciones (${todayMemb.length})`} value={money.usd(sumKind('mensualidad'))} />
        <Stat label={`Ventas (${todaySales.length})`} value={money.usd(sumKind('venta'))} />
        <Stat label="Clientes inscritos" value={g.clients.length} />
      </div>
      <ByWorker />
      <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-amber">En general</h2>
      <div className="grid gap-2 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <Stat label="Ingresos del mes" value={money.usd(monthTotal)} />
        <Stat label="Clientes activos" value={active} />
        <Stat label="Pagos vencidos" value={overdue} tone="amber" />
        <Stat label="Productos con poco stock" value={lowStock} tone="amber" />
        <Stat label="Sin avisar hoy" value={withoutAlert} tone={withoutAlert > 0 ? 'amber' : undefined} />
        <Stat label="Tasa USD de hoy" value={g.rateFresh ? `${g.settings.usdRate} MN` : 'Sin fijar'} tone={g.rateFresh ? undefined : 'amber'} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="!p-6">
          <IconTitle icon={<BarChart3 size={17} />}>Ingresos · últimos 7 días</IconTitle>
          <div className="mt-6 flex h-52 items-end gap-3" role="img" aria-label={`Ingresos diarios de los últimos 7 días: ${totals.map(money.usd).join(', ')}`}>
            {totals.map((t, i) => (
              <div key={days[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs text-muted">{t ? money.usd(t) : ''}</span>
                <div className="w-full rounded-t-xl bg-gold" style={{ height: `${Math.max((t / max) * 100, t ? 4 : 1)}%`, filter: i === 6 ? 'none' : 'brightness(0.78) saturate(0.85)' }} />
                <span className="text-xs text-muted">{formatShortDate(days[i], g.settings.locale)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="!p-6">
          <IconTitle icon={<CalendarClock size={17} />}>Vencen en los próximos 7 días</IconTitle>
          <ul className="mt-4 space-y-3">
            {soon.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <Avatar name={c.name} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-muted">{dueInfo(c.nextDue, g.today).text}</p>
                </div>
                <Pill>{formatShortDate(c.nextDue, g.settings.locale)}</Pill>
              </li>
            ))}
            {soon.length === 0 && <li className="text-sm text-muted">Nadie vence esta semana.</li>}
          </ul>
        </Card>
      </div>
    </>
  )
}
