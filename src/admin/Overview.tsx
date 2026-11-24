import { useGym } from '../data/store'
import { addDays, formatShortDate, toISODate } from '../lib/dates'
import { dueInfo } from '../lib/domain'
import { makeMoney } from '../lib/format'
import { Avatar, Card, Pill } from '../components/ui'
import { AdminHeader, Stat } from './AdminLayout'

export function Overview() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const month = g.today.slice(0, 7)
  const day = (iso: string) => toISODate(new Date(iso))

  const monthTotal = g.movements.filter((m) => day(m.at).startsWith(month)).reduce((n, m) => n + m.amount, 0)
  const active = g.clients.filter((c) => c.nextDue >= g.today).length
  const overdue = g.clients.filter((c) => c.nextDue < g.today).length
  const lowStock = g.products.filter((p) => p.stock <= 5).length

  const days = Array.from({ length: 7 }, (_, i) => addDays(g.today, i - 6))
  const totals = days.map((d) => g.movements.filter((m) => day(m.at) === d).reduce((n, m) => n + m.amount, 0))
  const max = Math.max(...totals, 1)
  const soon = g.clients
    .filter((c) => c.nextDue >= g.today && c.nextDue <= addDays(g.today, 7))
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue))

  return (
    <>
      <AdminHeader eyebrow="Panorama" title="Resumen" />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <Stat label="Ingresos del mes" value={money.usd(monthTotal)} />
        <Stat label="Clientes activos" value={active} />
        <Stat label="Pagos vencidos" value={overdue} tone="amber" />
        <Stat label="Productos con poco stock" value={lowStock} tone="amber" />
        <Stat label="Tasa USD de hoy" value={g.rateFresh ? `${g.settings.usdRate} MN` : 'Sin fijar'} tone={g.rateFresh ? undefined : 'amber'} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="!p-6">
          <h2 className="font-bold">Ingresos · últimos 7 días</h2>
          <div className="mt-6 flex h-52 items-end gap-3" role="img" aria-label={`Ingresos diarios de los últimos 7 días: ${totals.map(money.usd).join(', ')}`}>
            {totals.map((t, i) => (
              <div key={days[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs text-muted">{t ? money.usd(t) : ''}</span>
                <div className="w-full rounded-t-xl bg-amber" style={{ height: `${Math.max((t / max) * 100, t ? 4 : 1)}%`, opacity: i === 6 ? 1 : 0.55 }} />
                <span className="text-xs text-muted">{formatShortDate(days[i], g.settings.locale)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="!p-6">
          <h2 className="font-bold">Vencen en los próximos 7 días</h2>
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
