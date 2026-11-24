import { useMemo, useState } from 'react'
import { useGym } from '../data/store'
import { addDays, formatShortDate, toISODate } from '../lib/dates'
import { cashDifference, summarize, type CashStatus } from '../lib/domain'
import { formatTime, makeMoney } from '../lib/format'
import { Card, cx, Pill } from '../components/ui'
import { AdminHeader, Stat, td, th } from './AdminLayout'

type Range = 'hoy' | 'semana' | 'mes'
const RANGES: { id: Range; label: string }[] = [{ id: 'hoy', label: 'Hoy' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }]
const LABEL: Record<CashStatus, string> = { cuadra: 'Cuadra', faltante: 'Faltante', sobrante: 'Sobrante' }

export function Closings() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const [range, setRange] = useState<Range>('semana')
  const [sel, setSel] = useState<string | null>(null)

  const rows = useMemo(() => {
    const from = range === 'hoy' ? g.today : range === 'semana' ? addDays(g.today, -6) : addDays(g.today, -29)
    return g.shifts
      .filter((s) => toISODate(new Date(s.openedAt)) >= from)
      .map((s) => {
        const mv = g.movements.filter((m) => m.shiftId === s.id)
        const sum = summarize(mv)
        const diff = s.closedAt ? cashDifference(s.countedCash ?? 0, s.expectedCash ?? 0) : null
        return { s, mv, sum, diff }
      })
  }, [g.shifts, g.movements, g.today, range])

  const current = rows.find((r) => r.s.id === sel) ?? rows.find((r) => r.mv.length > 0) ?? rows[0]
  const totals = rows.reduce((a, r) => ({ m: a.m + r.sum.memberships.total, v: a.v + r.sum.sales.total, d: a.d + (r.diff && r.diff.status !== 'cuadra' ? 1 : 0) }), { m: 0, v: 0, d: 0 })
  const part = (iso: string) => (new Date(iso).getHours() < 14 ? 'Mañana' : 'Tarde')

  return (
    <>
      <AdminHeader eyebrow="Control de caja" title="Cierres por trabajador" action={
        <div role="radiogroup" aria-label="Periodo" className="flex gap-2">
          {RANGES.map((r) => (
            <button key={r.id} role="radio" aria-checked={range === r.id} onClick={() => setRange(r.id)}
              className={cx('h-11 rounded-full border px-5 text-sm font-semibold', range === r.id ? 'border-amber bg-amber text-amber-ink' : 'border-line')}>{r.label}</button>
          ))}
        </div>
      } />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Mensualidades cobradas" value={money(totals.m)} />
        <Stat label="Ventas de productos" value={money(totals.v)} />
        <Stat label="Cierres con diferencia" value={totals.d} tone="amber" />
      </div>
      <div className="mt-4 grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
          <table className="rtable w-full md:min-w-[620px]">
            <thead><tr className="border-b border-line"><th className={th}>Fecha</th><th className={th}>Trabajador</th><th className={th}>Mensualidades</th><th className={th}>Ventas</th><th className={th}>Caja</th></tr></thead>
            <tbody>
              {rows.map(({ s, sum, diff }) => (
                <tr key={s.id} onClick={() => setSel(s.id)} className={cx('cursor-pointer border-b border-line last:border-0', current?.s.id === s.id && 'bg-surface-2')}>
                  <td data-label="Fecha" className={`${td} font-semibold`}>
                    <button className="text-left" onClick={() => setSel(s.id)}>{formatShortDate(toISODate(new Date(s.openedAt)), g.settings.locale)} · {part(s.openedAt)}</button>
                  </td>
                  <td data-label="Trabajador" className={td}>{s.worker}</td>
                  <td data-label="Mensualidades" className={td}>{money(sum.memberships.total)}</td>
                  <td data-label="Ventas" className={td}>{money(sum.sales.total)}</td>
                  <td data-label="Caja" className={td}>{diff ? <Pill tone={diff.status === 'cuadra' ? 'muted' : diff.status === 'faltante' ? 'white' : 'amber'}>{LABEL[diff.status]}{diff.amount ? ` ${money(diff.amount)}` : ''}</Pill> : <Pill tone="amber">Abierto</Pill>}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted">No hay turnos en este periodo.</td></tr>}
            </tbody>
          </table>
        </div>

        {current && (
          <Card className="!p-5">
            <h2 className="text-lg font-extrabold">Detalle · {current.s.worker}, {formatShortDate(toISODate(new Date(current.s.openedAt)), g.settings.locale)}</h2>
            <p className="mb-3 text-sm text-muted">Movimientos del turno</p>
            <ul className="divide-y divide-line">
              {[...current.mv].sort((a, b) => a.at.localeCompare(b.at)).map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <span className="w-14 shrink-0 text-xs text-muted">{formatTime(m.at, g.settings.locale)}</span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{m.label}</p><p className="text-xs capitalize text-muted">{m.method}</p></div>
                  <span className="font-bold">{money(m.amount)}</span>
                </li>
              ))}
              {current.mv.length === 0 && <li className="py-6 text-center text-sm text-muted">Sin movimientos.</li>}
            </ul>
          </Card>
        )}
      </div>
    </>
  )
}
