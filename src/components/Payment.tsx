import { Banknote, CreditCard, DollarSign } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useGym } from '../data/store'
import { METHODS, isCovered, partUsd, remainingUsd, settle, type ChangeInput, type PartInput, type Settlement } from '../lib/domain'
import { makeMoney } from '../lib/format'
import type { Method } from '../lib/types'
import { Button, Field, inputCls, Segmented } from './ui'

/** Fija la tasa del USD para hoy. Avisa si se aleja mucho de la anterior (típico error de un cero). */
export function RateForm({ onDone }: { onDone?: () => void }) {
  const g = useGym()
  const prev = g.settings.usdRate
  const [v, setV] = useState(prev > 0 ? String(prev) : '')
  const n = Number(v.replace(',', '.'))
  const ok = Number.isFinite(n) && n > 0
  const far = ok && prev > 0 && Math.abs(n - prev) / prev > 0.25

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!ok) return
    g.setRate(n)
    onDone?.()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="1 USD equivale a (MN)">
        <input className={inputCls} inputMode="decimal" autoComplete="off" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Ej. 120" />
      </Field>
      {far && <p role="alert" className="text-sm text-amber">Es muy distinta a la anterior ({prev}). Revisa que no falte o sobre un cero.</p>}
      <Button type="submit" block disabled={!ok}>Guardar tasa de hoy</Button>
    </form>
  )
}

type Raw = Record<Method, string>
const EMPTY: Raw = { usd: '', tarjeta: '', mn: '' }
const parseAmount = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export interface PaymentSplitState {
  raw: Raw
  inputs: PartInput[]
  /** Vuelto entregado (si se recibió de más). */
  change: ChangeInput | undefined
  settlement: Settlement
  /** USD que faltan (positivo) o sobran (negativo), contando el vuelto ya escrito. */
  remaining: number
  /** USD recibidos de más (sin contar el vuelto): lo que hay que devolver. */
  overpay: number
  ready: boolean
  changeMethod: 'usd' | 'mn'
  changeRaw: string
  set(method: Method, value: string): void
  /** Todo el precio en un solo método. */
  payAll(method: Method): void
  /** Completa ese método con lo que falta (sumado a lo que ya tenga). */
  fillRest(method: Method): void
  setChangeMethod(m: 'usd' | 'mn'): void
  setChangeRaw(v: string): void
  /** Escribe el vuelto exacto en esa moneda. */
  fillChange(m: 'usd' | 'mn'): void
  reset(): void
}

/**
 * Estado de un pago que puede combinar USD, tarjeta y MN, y dar vuelto en efectivo si se recibe de más.
 * Cada monto va en la moneda de su método (tarjeta y MN en pesos). Se reinicia solo cuando cambia el precio.
 */
export function usePaymentSplit(totalUsd: number): PaymentSplitState {
  const g = useGym()
  const [raw, setRaw] = useState<Raw>(EMPTY)
  const [changeMethod, setChangeMethod] = useState<'usd' | 'mn'>('usd')
  const [changeRaw, setChangeRaw] = useState('')
  const rate = g.rateFresh ? g.settings.usdRate : 0
  const inputs: PartInput[] = METHODS.map((m) => ({ method: m.id, paid: parseAmount(raw[m.id]) })).filter((i) => i.paid > 0)
  const changeAmount = parseAmount(changeRaw)
  const change: ChangeInput | undefined = changeAmount > 0 ? { method: changeMethod, paid: changeAmount } : undefined
  const settlement = settle(totalUsd, inputs, g.settings, g.today, change)
  const remaining = remainingUsd(totalUsd, inputs, rate, change)
  const overpay = Math.max(0, -remainingUsd(totalUsd, inputs, rate))
  const hasOverpay = overpay > 0.005 && !isCovered(overpay, rate)

  const resetAll = useCallback(() => { setRaw(EMPTY); setChangeRaw('') }, [])
  useEffect(() => resetAll(), [totalUsd, resetAll])
  // Si ya no se recibe de más, el vuelto escrito deja de tener sentido.
  useEffect(() => { if (!hasOverpay && changeRaw !== '') setChangeRaw('') }, [hasOverpay]) // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (method: Method, usd: number) =>
    usd <= 0 ? '' : method === 'usd' ? (Math.ceil(usd * 100) / 100).toFixed(2) : String(Math.round(usd * rate))

  return {
    raw, inputs, change, settlement, remaining, overpay, ready: settlement.ok, changeMethod, changeRaw,
    set: (method, value) => setRaw((r) => ({ ...r, [method]: value.replace(/[^\d.,]/g, '') })),
    payAll: (method) => { setRaw({ ...EMPTY, [method]: fmt(method, totalUsd) }); setChangeRaw('') },
    fillRest: (method) => {
      const others = inputs.filter((i) => i.method !== method).reduce((n, i) => n + partUsd(i.method, i.paid, rate || 1), 0)
      setRaw((r) => ({ ...r, [method]: fmt(method, totalUsd - others) }))
    },
    setChangeMethod: (m) => { setChangeMethod(m); setChangeRaw('') },
    setChangeRaw: (v) => setChangeRaw(v.replace(/[^\d.,]/g, '')),
    fillChange: (m) => {
      setChangeMethod(m)
      setChangeRaw(m === 'usd' ? (Math.round(overpay * 100) / 100).toFixed(2) : String(Math.round(overpay * rate)))
    },
    reset: resetAll,
  }
}

const ROW: Record<Method, { label: string; unit: string }> = {
  usd: { label: 'USD', unit: 'US$' },
  tarjeta: { label: 'Tarjeta', unit: 'MN' },
  mn: { label: 'MN', unit: 'MN' },
}

/**
 * Cómo se paga: un atajo "Todo en…" para el caso común y una fila por método para combinarlos
 * (por ejemplo 10 USD y el resto en MN). Si se recibe de más, pide el vuelto. Muestra en vivo lo que falta.
 * MN y tarjeta se bloquean hasta fijar la tasa de hoy.
 */
export function PaymentSplit({ split, totalUsd }: { split: PaymentSplitState; totalUsd: number }) {
  const g = useGym()
  const money = makeMoney(g.settings)
  const rate = g.settings.usdRate
  const { remaining, settlement } = split
  const covered = settlement.ok
  const over = !settlement.ok && settlement.reason === 'over'
  const short = !settlement.ok && settlement.reason === 'short'
  const showChange = split.overpay > 0.005 && !isCovered(split.overpay, g.rateFresh ? rate : 0)
  const quick = [
    { m: 'usd' as const, label: 'Todo en USD', Icon: DollarSign },
    { m: 'tarjeta' as const, label: 'Todo con tarjeta', Icon: CreditCard },
    { m: 'mn' as const, label: 'Todo en MN', Icon: Banknote },
  ]
  return (
    <div>
      <p className="mb-2 text-sm text-muted">Cómo se paga · total {money.usd(totalUsd)}{g.rateFresh ? ` (≈ ${money.mn(Math.round(totalUsd * rate))})` : ''}</p>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {quick.map(({ m, label, Icon }) => (
          <button
            key={m} type="button" onClick={() => split.payAll(m)} disabled={m !== 'usd' && !g.rateFresh}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-amber/50 surface-card px-1 py-3 text-xs font-bold leading-tight transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-gold text-amber-ink"><Icon size={18} strokeWidth={2.4} /></span>
            {label}
          </button>
        ))}
      </div>

      {!g.rateFresh && (
        <div role="alert" className="mb-3 rounded-2xl border border-amber/60 p-4">
          <p className="mb-3 text-sm font-semibold text-amber">Falta la tasa del USD de hoy. Para cobrar en MN o con tarjeta, fíjala:</p>
          <RateForm />
        </div>
      )}

      <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-faint">o combina</p>
      <ul className="space-y-2">
        {METHODS.map(({ id }) => {
          const off = id !== 'usd' && !g.rateFresh
          const active = split.raw[id] !== ''
          const aria = id === 'usd' ? 'Monto en USD' : id === 'tarjeta' ? 'Monto con tarjeta, en MN' : 'Monto en MN'
          return (
            <li key={id} className={`flex items-center gap-2 rounded-2xl border p-2 pl-3 ${active ? 'border-amber/60 bg-amber/5' : 'border-line'} ${off ? 'opacity-40' : ''}`}>
              <span className="flex w-[5.3rem] shrink-0 items-center gap-1.5 text-sm font-bold">{(() => { const I = id === 'usd' ? DollarSign : id === 'tarjeta' ? CreditCard : Banknote; return <I size={16} aria-hidden className="shrink-0 text-amber" /> })()}{ROW[id].label}</span>
              <div className="relative min-w-0 flex-1">
                <input
                  className="h-11 w-full rounded-xl border border-line bg-field pl-3 pr-11 text-right text-base font-semibold tabular-nums text-ink placeholder:text-faint focus:border-amber focus:outline-none"
                  inputMode="decimal" autoComplete="off" placeholder="0" aria-label={aria} disabled={off}
                  value={split.raw[id]} onChange={(e) => split.set(id, e.target.value)}
                />
                <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-faint">{ROW[id].unit}</span>
              </div>
              <button
                type="button" onClick={() => split.fillRest(id)} disabled={off || remaining <= 0.005}
                className="h-11 shrink-0 rounded-xl border border-line px-3 text-xs font-bold text-amber transition active:scale-95 disabled:opacity-30"
              >
                Resto
              </button>
            </li>
          )
        })}
      </ul>

      {showChange && (
        <div className="mt-3 rounded-2xl border border-amber/60 bg-amber/5 p-3">
          <p className="mb-2 text-sm font-semibold">
            Recibes de más: <span className="text-amber">{money.usd(split.overpay)}</span>
            {g.rateFresh ? <span className="text-muted"> (≈ {money.mn(Math.round(split.overpay * rate))})</span> : null}. Da el vuelto en efectivo:
          </p>
          <div className="flex items-center gap-2">
            <Segmented
              label="Moneda del vuelto" value={split.changeMethod} onChange={(m) => split.fillChange(m)}
              options={[{ id: 'usd', label: 'USD' }, { id: 'mn', label: 'MN', disabled: !g.rateFresh }]}
            />
            <div className="relative min-w-0 flex-1">
              <input
                className="h-11 w-full rounded-xl border border-line bg-field pl-3 pr-11 text-right text-base font-semibold tabular-nums text-ink placeholder:text-faint focus:border-amber focus:outline-none"
                inputMode="decimal" autoComplete="off" placeholder="0" aria-label="Monto del vuelto"
                value={split.changeRaw} onChange={(e) => split.setChangeRaw(e.target.value)}
              />
              <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-faint">{split.changeMethod === 'usd' ? 'US$' : 'MN'}</span>
            </div>
          </div>
        </div>
      )}

      <p
        role="status" aria-live="polite"
        className={`mt-3 text-sm font-semibold ${covered ? 'text-ok' : over ? 'text-danger' : 'text-muted'}`}
      >
        {covered ? (split.change ? `✓ Pago completo · vuelto ${split.change.method === 'usd' ? money.usd(split.change.paid) : money.mn(split.change.paid)}` : '✓ Pago completo')
          : over ? (showChange ? `Falta el vuelto: devuelve ${money.usd(-remaining)}${g.rateFresh ? ` (≈ ${money.mn(Math.round(-remaining * rate))})` : ''}.` : `Sobra ${money.usd(-remaining)}.`)
          : short ? `Falta ${money.usd(remaining)}${g.rateFresh ? ` · ≈ ${money.mn(Math.round(remaining * rate))}` : ''}`
          : 'Elige un método o combínalos.'}
      </p>
    </div>
  )
}
