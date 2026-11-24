import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useGym } from '../data/store'
import { cashDifference, summarize, type CashStatus } from '../lib/domain'
import { formatTime, makeMoney, plural } from '../lib/format'
import { Button, Card, Field, inputCls, Pill, Screen, Sheet } from '../components/ui'

const STATUS: Record<CashStatus, string> = { cuadra: 'Cuadra', faltante: 'Faltante', sobrante: 'Sobrante' }

export function Close() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const [raw, setRaw] = useState('')
  const [confirm, setConfirm] = useState(false)
  const sum = summarize(g.shiftMovements)
  const expected = sum.byMethod.efectivo

  // Turno cerrado: vista de solo lectura (no se puede modificar).
  if (!g.shiftOpen) {
    const diff = cashDifference(g.shift.countedCash ?? 0, g.shift.expectedCash ?? 0)
    return (
      <Screen eyebrow="Cierre de caja" title="Turno cerrado">
        <Card className="text-center !py-8">
          <Lock className="mx-auto text-amber" aria-hidden />
          <p className="mt-3 text-sm text-muted">Cerrado a las {formatTime(g.shift.closedAt!, g.settings.locale)}</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight">{money(sum.total)}</p>
          <p className="text-sm text-muted">cobrado en el turno</p>
          <div className="mt-4"><Pill tone={diff.status === 'cuadra' ? 'muted' : diff.status === 'faltante' ? 'white' : 'amber'}>
            {diff.status === 'cuadra' ? 'La caja cuadra' : `${STATUS[diff.status]} ${money(diff.amount)}`}
          </Pill></div>
        </Card>
        <Button block className="mt-6" onClick={g.openShift}>Abrir nuevo turno</Button>
      </Screen>
    )
  }

  const counted = raw === '' ? null : Number(raw.replace(',', '.'))
  const valid = counted !== null && Number.isFinite(counted) && counted >= 0
  const diff = valid ? cashDifference(counted, expected) : null

  return (
    <Screen eyebrow="Cierre de caja" title="Resumen del turno">
      <div className="grid grid-cols-2 gap-3">
        <Card><p className="text-sm text-muted">Mensualidades</p><p className="text-2xl font-extrabold tracking-tight">{money(sum.memberships.total)}</p><p className="text-xs text-muted">{plural(sum.memberships.count, 'cobro', 'cobros')}</p></Card>
        <Card><p className="text-sm text-muted">Ventas</p><p className="text-2xl font-extrabold tracking-tight">{money(sum.sales.total)}</p><p className="text-xs text-muted">{plural(sum.sales.count, 'venta', 'ventas')}</p></Card>
      </div>

      <Card className="mt-3 !p-0">
        <p className="px-4 pt-4 text-sm text-muted">Lo que debería haber</p>
        <dl className="px-4 pb-1">
          {([['Efectivo', sum.byMethod.efectivo], ['Tarjeta', sum.byMethod.tarjeta], ['Transferencia', sum.byMethod.transferencia]] as const).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-t border-line py-3 first:border-0 [&:nth-child(1)]:mt-1">
              <dt className="font-bold">{k}</dt><dd className="font-extrabold">{money(v)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="mt-4">
        <Field label="Efectivo contado">
          <input className={inputCls} inputMode="decimal" placeholder={money(0)} value={raw} onChange={(e) => setRaw(e.target.value.replace(/[^\d.,]/g, ''))} />
        </Field>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl border border-amber p-4" aria-live="polite">
        <span className="font-bold">Diferencia</span>
        {diff ? (
          <Pill tone={diff.status === 'cuadra' ? 'muted' : diff.status === 'faltante' ? 'white' : 'amber'}>
            {diff.status === 'cuadra' ? 'Cuadra' : `${STATUS[diff.status]} ${money(diff.amount)}`}
          </Pill>
        ) : <span className="text-sm text-muted">Cuenta el efectivo</span>}
      </div>
      <p className="mt-3 text-center text-sm text-muted">Al cerrar, el turno ya no se puede modificar.</p>

      <Button block className="mt-5" disabled={!valid} onClick={() => setConfirm(true)}>Cerrar turno</Button>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="¿Cerrar el turno?">
        <p className="text-muted">
          Contaste <b className="text-white">{money(counted ?? 0)}</b> en efectivo
          {diff && diff.status !== 'cuadra' ? <> y hay un <b className="text-white">{STATUS[diff.status].toLowerCase()} de {money(diff.amount)}</b></> : ' y la caja cuadra'}.
          Esta acción no se puede deshacer.
        </p>
        <Button block className="mt-5" onClick={() => { g.closeShift(counted!); setConfirm(false) }}>Sí, cerrar turno</Button>
        <Button block variant="outline" className="mt-3" onClick={() => setConfirm(false)}>Revisar de nuevo</Button>
      </Sheet>
    </Screen>
  )
}
