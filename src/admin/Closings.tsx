import { Receipt } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useGym } from '../data/store'
import { addDays, formatShortDate, toISODate } from '../lib/dates'
import { shiftDifference, summarize, type CashStatus } from '../lib/domain'
import type { Movement, PaymentPart } from '../lib/types'
import { useWide } from '../lib/media'
import { formatTime, makeMoney } from '../lib/format'
import { Button, Card, Field, IconTitle, Pill, Sheet, cx, inputCls, useToast } from '../components/ui'
import { AdminHeader, Stat, StatGrid, td, th } from './AdminLayout'

type Range = 'hoy' | 'semana' | 'mes'
const RANGES: { id: Range; label: string }[] = [{ id: 'hoy', label: 'Hoy' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }]
const LABEL: Record<CashStatus, string> = { cuadra: 'Cuadra', faltante: 'Faltante', sobrante: 'Sobrante' }

export function Closings() {
  const g = useGym()
  const wide = useWide()
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
  const label = (p: PaymentPart) => (p.method === 'usd' ? money.usd(p.paid) : p.method === 'mn' ? money.mn(p.paid) : `${money.mn(p.paid)} tarjeta`)
  const how = (m: Movement) => m.parts.map(label).join(' + ')
  const cash = (diff: ReturnType<typeof shiftDifference> | null) =>
    !diff ? <Pill tone="amber">Abierto</Pill> : diff.balanced ? <Pill>Cuadra</Pill> : (
      <div className="flex flex-wrap justify-end gap-1.5">
        {diff.mn.status !== 'cuadra' && <Pill tone={diff.mn.status === 'faltante' ? 'danger' : 'amber'}>MN {LABEL[diff.mn.status].toLowerCase()} {money.mn(diff.mn.amount)}</Pill>}
        {diff.usd.status !== 'cuadra' && <Pill tone={diff.usd.status === 'faltante' ? 'danger' : 'amber'}>USD {LABEL[diff.usd.status].toLowerCase()} {money.usd(diff.usd.amount)}</Pill>}
      </div>
    )
  const when = (iso: string) => `${formatShortDate(toISODate(new Date(iso)), g.settings.locale)} · ${part(iso)}`

  return (
    <>
      <AdminHeader eyebrow="Control de caja" title="Cierres por trabajador" action={
        <div role="radiogroup" aria-label="Periodo" className="flex gap-2">
          {RANGES.map((r) => (
            <button key={r.id} role="radio" aria-checked={range === r.id} onClick={() => setRange(r.id)}
              className={cx('h-11 rounded-full border px-5 text-sm font-semibold', range === r.id ? 'border-amber bg-gold text-amber-ink' : 'border-line')}>{r.label}</button>
          ))}
        </div>
      } />
      <StatGrid>
        <Stat label="Mensualidades" value={money.usd(totals.m)} />
        <Stat label="Ventas" value={money.usd(totals.v)} />
        <Stat label="Cierres con diferencia" value={totals.d} tone="amber" />
      </StatGrid>
      <div className="mt-4 grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
        {!wide ? (
          <ul className="space-y-2">
            {rows.map(({ s, sum, diff }) => (
              <li key={s.id}>
                <button
                  onClick={() => setSel(s.id)} aria-pressed={current?.s.id === s.id}
                  className={cx('surface-card w-full rounded-2xl border p-3 text-left transition active:scale-[0.99]', current?.s.id === s.id ? 'border-amber/70' : 'border-line')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold leading-tight">{when(s.openedAt)}</p>
                      <p className="mt-0.5 text-xs text-muted">{s.worker} · Mens. {money.usd(sum.memberships.total)} · Ventas {money.usd(sum.sales.total)}</p>
                    </div>
                    <div className="shrink-0">{cash(diff)}</div>
                  </div>
                </button>
              </li>
            ))}
            {rows.length === 0 && <li className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">No hay turnos en este periodo.</li>}
          </ul>
        ) : (
        <div className="overflow-x-auto rounded-3xl border border-line surface-card">
          <table className="w-full min-w-[620px]">
            <thead><tr className="border-b border-line"><th className={th}>Fecha</th><th className={th}>Trabajador</th><th className={th}>Mensualidades</th><th className={th}>Ventas</th><th className={th}>Caja</th></tr></thead>
            <tbody>
              {rows.map(({ s, sum, diff }) => (
                <tr key={s.id} onClick={() => setSel(s.id)} className={cx('cursor-pointer border-b border-line last:border-0', current?.s.id === s.id && 'bg-surface-2')}>
                  <td className={`${td} font-semibold`}>
                    <button className="text-left" onClick={() => setSel(s.id)}>{formatShortDate(toISODate(new Date(s.openedAt)), g.settings.locale)} · {part(s.openedAt)}</button>
                  </td>
                  <td className={td}>{s.worker}</td>
                  <td className={td}>{money.usd(sum.memberships.total)}</td>
                  <td className={td}>{money.usd(sum.sales.total)}</td>
                  <td className={td}>{cash(diff)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted">No hay turnos en este periodo.</td></tr>}
            </tbody>
          </table>
        </div>
        )}

        {current && (
          <Card className="!p-5">
            <IconTitle icon={<Receipt size={17} />} className="text-lg">Detalle · {current.s.worker}, {formatShortDate(toISODate(new Date(current.s.openedAt)), g.settings.locale)}</IconTitle>
            <p className="mb-3 text-sm text-muted">
              Movimientos del turno{current.s.closedBy && current.s.closedBy !== current.s.worker ? ` · cerrado por ${current.s.closedBy}` : ''}
            </p>
            <p className="mb-3 rounded-xl border border-line px-3 py-2 text-xs text-muted">
              Fondo inicial: <b className="text-ink">{money.mn(current.s.openingMN ?? 0)}</b> y <b className="text-ink">{money.usd(current.s.openingUSD ?? 0)}</b>
            </p>
            {!current.s.closedAt && current.s.id === g.shift.id && (
              <Button size="sm" variant="outline" className="mb-3" onClick={() => { setMnRaw(''); setUsdRaw(''); setForcing(true) }}>
                Cerrar este turno
              </Button>
            )}
            <ul className="divide-y divide-line">
              {[...current.mv].sort((a, b) => a.at.localeCompare(b.at)).map((m) => (
                <li key={m.id} className="flex items-start gap-3 py-2.5">
                  <span className="w-12 shrink-0 pt-0.5 text-xs text-muted">{formatTime(m.at, g.settings.locale)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight">{m.label}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {m.parts.length > 1 && <span className="mr-1.5 rounded-full border border-amber/50 px-1.5 py-px font-bold text-amber">Mixto</span>}
                      {how(m)}{m.change ? ` · vuelto ${label(m.change)}` : ''}{m.parts.some((p) => p.rate) ? ` · tasa ${m.parts.find((p) => p.rate)?.rate}` : ''}
                    </p>
                  </div>
                  <p className="font-bold">{money.usd(m.amount)}</p>
                </li>
              ))}
              {current.mv.length === 0 && <li className="py-6 text-center text-sm text-muted">Sin movimientos.</li>}
            </ul>
            {g.cashOuts.filter((o) => o.shiftId === current.s.id).length > 0 && (
              <>
                <p className="mb-1 mt-4 text-xs font-bold uppercase tracking-[0.12em] text-faint">Salidas de efectivo</p>
                <ul className="divide-y divide-line">
                  {g.cashOuts.filter((o) => o.shiftId === current.s.id).map((o) => (
                    <li key={o.id} className="flex items-start gap-3 py-2.5">
                      <span className="w-12 shrink-0 pt-0.5 text-xs text-muted">{formatTime(o.at, g.settings.locale)}</span>
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-tight">{o.concept}</p><p className="text-xs text-muted">{o.kind === 'gasto' ? 'Gasto' : 'Retiro'}</p></div>
                      <p className="text-sm font-bold text-danger-soft">− {[o.mn > 0 && money.mn(o.mn), o.usd > 0 && money.usd(o.usd)].filter(Boolean).join(' + ')}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
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
