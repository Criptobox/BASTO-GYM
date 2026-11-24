import { useState } from 'react'
import { useGym } from '../data/store'
import { shiftDifference, cashDifference, type CashStatus } from '../lib/domain'
import { formatTime, makeMoney, plural } from '../lib/format'
import { Button, Card, Field, inputCls, Pill, Screen, Sheet } from '../components/ui'
import { LogoMark } from '../components/Logo'
import { CashOutSheet, OpenShiftSheet } from '../components/Cash'

const STATUS: Record<CashStatus, string> = { cuadra: 'Cuadra', faltante: 'Faltante', sobrante: 'Sobrante' }
const tone = (s: CashStatus) => (s === 'cuadra' ? 'muted' : s === 'faltante' ? 'danger' : 'amber') as 'muted' | 'danger' | 'amber'

const parse = (raw: string) => (raw === '' ? null : Number(raw.replace(',', '.')))
const valid = (n: number | null): n is number => n !== null && Number.isFinite(n) && n >= 0

export function Close() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const [rawMN, setRawMN] = useState('')
  const [rawUSD, setRawUSD] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [openSheet, setOpenSheet] = useState(false)
  const [outSheet, setOutSheet] = useState(false)
  const sum = g.shiftSummary

  // Sin turno propio: nada que cerrar todavía.
  const mine = g.shift.id !== 'none' && g.shift.workerId === g.session?.id
  if (!mine) {
    return (
      <Screen eyebrow="Cierre de caja" title="Sin turno abierto">
        <Card className="text-center !py-8">
          <p className="text-muted">No tienes un turno abierto. Ábrelo para empezar a cobrar.</p>
        </Card>
        <Button block className="mt-6" onClick={() => setOpenSheet(true)}>Abrir mi turno</Button>
        <OpenShiftSheet open={openSheet} onClose={() => setOpenSheet(false)} />
      </Screen>
    )
  }

  // Turno cerrado: solo lectura (no se puede modificar).
  if (!g.shiftOpen) {
    const d = shiftDifference(g.shift)
    return (
      <Screen eyebrow="Cierre de caja" title="Turno cerrado">
        <Card className="text-center !py-8">
          <LogoMark size={72} state="inactive" label="Turno cerrado" className="mx-auto" />
          <p className="mt-3 text-sm text-muted">Cerrado a las {formatTime(g.shift.closedAt!, g.settings.locale)}{g.shift.closedBy && g.shift.closedBy !== g.shift.worker ? ` por ${g.shift.closedBy}` : ''}</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight">{money.usd(sum.total)}</p>
          <p className="text-sm text-muted">cobrado en el turno (valor en USD)</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {d.balanced ? <Pill>La caja cuadra</Pill> : (
              <>
                {d.mn.status !== 'cuadra' && <Pill tone={tone(d.mn.status)}>MN: {STATUS[d.mn.status]} {money.mn(d.mn.amount)}</Pill>}
                {d.usd.status !== 'cuadra' && <Pill tone={tone(d.usd.status)}>USD: {STATUS[d.usd.status]} {money.usd(d.usd.amount)}</Pill>}
              </>
            )}
          </div>
        </Card>
        <Button block className="mt-6" onClick={() => setOpenSheet(true)}>Abrir nuevo turno</Button>
        <Button block variant="outline" className="mt-3" onClick={g.logout}>Salir</Button>
        <OpenShiftSheet open={openSheet} onClose={() => setOpenSheet(false)} />
      </Screen>
    )
  }

  const mn = parse(rawMN)
  const usd = parse(rawUSD)
  const ready = valid(mn) && valid(usd)
  const dMN = valid(mn) ? cashDifference(mn, sum.expected.mn) : null
  const dUSD = valid(usd) ? cashDifference(usd, sum.expected.usd) : null
  const cm = sum.cash.mn, cu = sum.cash.usd

  const row = (label: string, a: string, b: string, strong = false) => (
    <div className={`grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 py-1.5 ${strong ? 'border-t border-line pt-2.5 font-extrabold' : 'text-muted'}`}>
      <dt className={strong ? '' : 'text-sm'}>{label}</dt>
      <dd className="min-w-[4.5rem] text-right tabular-nums">{a}</dd>
      <dd className="min-w-[4.5rem] text-right tabular-nums">{b}</dd>
    </div>
  )

  return (
    <Screen eyebrow="Cierre de caja" title="Resumen del turno">
      <div className="grid grid-cols-2 gap-3">
        <Card><p className="text-sm text-muted">Mensualidades</p><p className="text-2xl font-extrabold tracking-tight">{money.usd(sum.memberships.total)}</p><p className="text-xs text-muted">{plural(sum.memberships.count, 'cobro', 'cobros')}</p></Card>
        <Card><p className="text-sm text-muted">Ventas</p><p className="text-2xl font-extrabold tracking-tight">{money.usd(sum.sales.total)}</p><p className="text-xs text-muted">{plural(sum.sales.count, 'venta', 'ventas')}</p></Card>
      </div>

      <Card className="mt-3">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs font-bold uppercase tracking-[0.1em] text-faint">
          <span>Lo que debería haber</span><span className="min-w-[4.5rem] text-right">MN</span><span className="min-w-[4.5rem] text-right">USD</span>
        </div>
        <dl className="mt-1">
          {row('Fondo inicial', money.mnNum(cm.opening), money.usdNum(cu.opening))}
          {row('+ Cobros en efectivo', money.mnNum(cm.received), money.usdNum(cu.received))}
          {(cm.change > 0 || cu.change > 0) && row('− Vuelto', money.mnNum(cm.change), money.usdNum(cu.change))}
          {(cm.outs > 0 || cu.outs > 0) && row('− Salidas', money.mnNum(cm.outs), money.usdNum(cu.outs))}
          {row('Efectivo esperado', money.mnNum(sum.expected.mn), money.usdNum(sum.expected.usd), true)}
        </dl>
        <p className="mt-2 text-xs text-muted">Además, cobrado con tarjeta: <b className="text-white">{money.mn(sum.expected.card)}</b> (no va en la caja).</p>
      </Card>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-amber">Salidas de efectivo</h2>
        <Button size="xs" variant="outline" onClick={() => setOutSheet(true)}>+ Registrar</Button>
      </div>
      <ul className="mt-2 space-y-2">
        {g.shiftCashOuts.map((o) => (
          <li key={o.id}>
            <Card className="flex items-center gap-3 !rounded-2xl !p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{o.concept}</p>
                <p className="text-xs text-muted">{o.kind === 'gasto' ? 'Gasto' : 'Retiro'} · {formatTime(o.at, g.settings.locale)}</p>
              </div>
              <p className="text-right text-sm font-bold">{[o.mn > 0 && money.mn(o.mn), o.usd > 0 && money.usd(o.usd)].filter(Boolean).join(' + ')}</p>
            </Card>
          </li>
        ))}
        {g.shiftCashOuts.length === 0 && <li className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">Sin salidas en este turno.</li>}
      </ul>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="MN contados">
          <input className={inputCls} inputMode="decimal" placeholder="0" value={rawMN} onChange={(e) => setRawMN(e.target.value.replace(/[^\d.,]/g, ''))} />
        </Field>
        <Field label="USD contados">
          <input className={inputCls} inputMode="decimal" placeholder="0.00" value={rawUSD} onChange={(e) => setRawUSD(e.target.value.replace(/[^\d.,]/g, ''))} />
        </Field>
      </div>

      <div className="mt-3 space-y-2 rounded-2xl border border-amber p-4" aria-live="polite">
        <div className="flex items-center justify-between"><span className="font-bold">Diferencia MN</span>
          {dMN ? <Pill tone={tone(dMN.status)}>{dMN.status === 'cuadra' ? 'Cuadra' : `${STATUS[dMN.status]} ${money.mn(dMN.amount)}`}</Pill> : <span className="text-sm text-muted">Cuenta el efectivo</span>}
        </div>
        <div className="flex items-center justify-between"><span className="font-bold">Diferencia USD</span>
          {dUSD ? <Pill tone={tone(dUSD.status)}>{dUSD.status === 'cuadra' ? 'Cuadra' : `${STATUS[dUSD.status]} ${money.usd(dUSD.amount)}`}</Pill> : <span className="text-sm text-muted">Cuenta el efectivo</span>}
        </div>
      </div>
      <p className="mt-3 text-center text-sm text-muted">Si no tienes MN o USD, escribe 0. Al cerrar, el turno ya no se puede modificar.</p>

      <Button block className="mt-5" disabled={!ready} onClick={() => setConfirm(true)}>Cerrar turno</Button>
      <CashOutSheet open={outSheet} onClose={() => setOutSheet(false)} />

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="¿Cerrar el turno?">
        <p className="text-muted">
          Contaste <b className="text-white">{money.mn(valid(mn) ? mn : 0)}</b> y <b className="text-white">{money.usd(valid(usd) ? usd : 0)}</b>.{' '}
          {dMN && dUSD && dMN.status === 'cuadra' && dUSD.status === 'cuadra' ? 'La caja cuadra. ' : (
            <>
              {dMN && dMN.status !== 'cuadra' && <>En MN hay un <b className="text-white">{STATUS[dMN.status].toLowerCase()} de {money.mn(dMN.amount)}</b>. </>}
              {dUSD && dUSD.status !== 'cuadra' && <>En USD hay un <b className="text-white">{STATUS[dUSD.status].toLowerCase()} de {money.usd(dUSD.amount)}</b>. </>}
            </>
          )}
          Esta acción no se puede deshacer.
        </p>
        <Button block className="mt-5" onClick={() => { g.closeShift({ mn: mn!, usd: usd! }); setConfirm(false) }}>Sí, cerrar turno</Button>
        <Button block variant="outline" className="mt-3" onClick={() => setConfirm(false)}>Revisar de nuevo</Button>
      </Sheet>
    </Screen>
  )
}
