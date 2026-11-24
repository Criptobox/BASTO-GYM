import { useMemo, useState } from 'react'
import { useGym } from '../data/store'
import { addDays, formatShortDate, toISODate } from '../lib/dates'
import { METHODS, shiftDifference, summarize, type CashStatus } from '../lib/domain'
import { formatTime, makeMoney } from '../lib/format'
import { Button, Card, Field, cx, inputCls, Pill, Sheet, useToast } from '../components/ui'
import { AdminHeader, Stat, td, th } from './AdminLayout'

type Range = 'hoy' | 'semana' | 'mes'
const RANGES: { id: Range; label: string }[] = [{ id: 'hoy', label: 'Hoy' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }]
const LABEL: Record<CashStatus, string> = { cuadra: 'Cuadra', faltante: 'Faltante', sobrante: 'Sobrante' }

export function Closings() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const [range, setRange] = useState<Range>('semana')
  const [sel, setSel] = useState<string | null>(null)
  const toast = useToast()
  const [forcing, setForcing] = useState(false)
  const [mnRaw, setMnRaw] = useState('')
  const [usdRaw, setUsdRaw] = useState('')

  const rows = useMemo(() => {
    const from = range === 'hoy' ? g.today : range === 'semana' ? addDays(g.today, -6) : addDays(g.today, -29)
    return g.shifts
      .filter((s) => toISODate(new Date(s.openedAt)) >= from)
      .map((s) => {
        const mv = g.movements.filter((m) => m.shiftId === s.id)
        const sum = summarize(mv)
        const diff = s.closedAt ? shiftDifference(s) : null
        return { s, mv, sum, diff }
      })
  }, [g.shifts, g.movements, g.today, range])

  const current = rows.find((r) => r.s.id === sel) ?? rows.find((r) => r.mv.length > 0) ?? rows[0]
  const totals = rows.reduce((a, r) => ({ m: a.m + r.sum.memberships.total, v: a.v + r.sum.sales.total, d: a.d + (r.diff && !r.diff.balanced ? 1 : 0) }), { m: 0, v: 0, d: 0 })
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
        <Stat label="Mensualidades cobradas" value={money.usd(totals.m)} />
        <Stat label="Ventas de productos" value={money.usd(totals.v)} />
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
                  <td data-label="Mensualidades" className={td}>{money.usd(sum.memberships.total)}</td>
                  <td data-label="Ventas" className={td}>{money.usd(sum.sales.total)}</td>
                  <td data-label="Caja" className={td}>{!diff ? <Pill tone="amber">Abierto</Pill> : diff.balanced ? <Pill>Cuadra</Pill> : (
                    <div className="flex flex-wrap gap-1.5">
                      {diff.mn.status !== 'cuadra' && <Pill tone={diff.mn.status === 'faltante' ? 'white' : 'amber'}>MN {LABEL[diff.mn.status].toLowerCase()} {money.mn(diff.mn.amount)}</Pill>}
                      {diff.usd.status !== 'cuadra' && <Pill tone={diff.usd.status === 'faltante' ? 'white' : 'amber'}>USD {LABEL[diff.usd.status].toLowerCase()} {money.usd(diff.usd.amount)}</Pill>}
                    </div>
                  )}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted">No hay turnos en este periodo.</td></tr>}
            </tbody>
          </table>
        </div>

        {current && (
          <Card className="!p-5">
            <h2 className="text-lg font-extrabold">Detalle · {current.s.worker}, {formatShortDate(toISODate(new Date(current.s.openedAt)), g.settings.locale)}</h2>
            <p className="mb-3 text-sm text-muted">
              Movimientos del turno{current.s.closedBy && current.s.closedBy !== current.s.worker ? ` · cerrado por ${current.s.closedBy}` : ''}
            </p>
            {!current.s.closedAt && current.s.id === g.shift.id && (
              <Button size="sm" variant="outline" className="mb-3" onClick={() => { setMnRaw(''); setUsdRaw(''); setForcing(true) }}>
                Cerrar este turno
              </Button>
            )}
            <ul className="divide-y divide-line">
              {[...current.mv].sort((a, b) => a.at.localeCompare(b.at)).map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <span className="w-14 shrink-0 text-xs text-muted">{formatTime(m.at, g.settings.locale)}</span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{m.label}</p><p className="text-xs text-muted">{METHODS.find((o) => o.id === m.method)?.label}{m.rate ? ` · 1 USD = ${m.rate} MN` : ''}</p></div>
                  <div className="text-right"><p className="font-bold">{money.usd(m.amount)}</p>{m.method !== 'usd' && <p className="text-xs text-muted">{money.mn(m.paid)}</p>}</div>
                </li>
              ))}
              {current.mv.length === 0 && <li className="py-6 text-center text-sm text-muted">Sin movimientos.</li>}
            </ul>
          </Card>
        )}
      </div>

      <Sheet open={forcing} onClose={() => setForcing(false)} title={`Cerrar el turno de ${g.shift.worker}`}>
        <p className="mb-4 text-sm text-muted">
          Úsalo si el trabajador no pudo cerrar su turno. Cuenta el efectivo y escríbelo; el cierre quedará registrado a tu nombre.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="MN contados"><input className={inputCls} inputMode="decimal" value={mnRaw} onChange={(e) => setMnRaw(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0" /></Field>
          <Field label="USD contados"><input className={inputCls} inputMode="decimal" value={usdRaw} onChange={(e) => setUsdRaw(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0.00" /></Field>
        </div>
        <Button
          block className="mt-5"
          disabled={mnRaw === '' || usdRaw === '' || !Number.isFinite(Number(mnRaw.replace(',', '.'))) || !Number.isFinite(Number(usdRaw.replace(',', '.')))}
          onClick={() => { g.closeShift({ mn: Number(mnRaw.replace(',', '.')), usd: Number(usdRaw.replace(',', '.')) }); setForcing(false); toast('Turno cerrado') }}
        >
          Cerrar turno
        </Button>
      </Sheet>
    </>
  )
}
