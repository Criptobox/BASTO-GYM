import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useGym } from '../data/store'
import { METHODS, partUsd, remainingUsd, settle, type PartInput, type Settlement } from '../lib/domain'
import { makeMoney } from '../lib/format'
import type { Method } from '../lib/types'
import { Button, Field, inputCls } from './ui'

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
  settlement: Settlement
  /** USD que faltan (positivo) o sobran (negativo). */
  remaining: number
  ready: boolean
  set(method: Method, value: string): void
  /** Todo el precio en un solo método. */
  payAll(method: Method): void
  /** Completa ese método con lo que falta (sumado a lo que ya tenga). */
  fillRest(method: Method): void
  reset(): void
}

/**
 * Estado de un pago que puede combinar USD, tarjeta y MN. Cada monto va en la moneda de su método
 * (tarjeta y MN en pesos). Se reinicia solo cuando cambia el precio.
 */
export function usePaymentSplit(totalUsd: number): PaymentSplitState {
  const g = useGym()
  const [raw, setRaw] = useState<Raw>(EMPTY)
  const rate = g.rateFresh ? g.settings.usdRate : 0
  const inputs: PartInput[] = METHODS.map((m) => ({ method: m.id, paid: parseAmount(raw[m.id]) })).filter((i) => i.paid > 0)
  const settlement = settle(totalUsd, inputs, g.settings, g.today)
  const remaining = remainingUsd(totalUsd, inputs, rate)

  useEffect(() => setRaw(EMPTY), [totalUsd])

  const fmt = (method: Method, usd: number) =>
    usd <= 0 ? '' : method === 'usd' ? (Math.ceil(usd * 100) / 100).toFixed(2) : String(Math.round(usd * rate))
  const reset = useCallback(() => setRaw(EMPTY), [])

  return {
    raw, inputs, settlement, remaining, ready: settlement.ok,
    set: (method, value) => setRaw((r) => ({ ...r, [method]: value.replace(/[^\d.,]/g, '') })),
    payAll: (method) => setRaw({ ...EMPTY, [method]: fmt(method, totalUsd) }),
    fillRest: (method) => {
      const others = inputs.filter((i) => i.method !== method).reduce((n, i) => n + partUsd(i.method, i.paid, rate || 1), 0)
      setRaw((r) => ({ ...r, [method]: fmt(method, totalUsd - others) }))
    },
    reset,
  }
}

const ROW: Record<Method, { label: string; unit: string }> = {
  usd: { label: 'USD', unit: 'US$' },
  tarjeta: { label: 'Tarjeta', unit: 'MN' },
  mn: { label: 'MN', unit: 'MN' },
}

/**
 * Cómo se paga: un atajo "Todo en…" para el caso común y una fila por método para combinarlos
 * (por ejemplo 10 USD y el resto en MN). Muestra en vivo lo que falta. MN y tarjeta se bloquean
 * hasta fijar la tasa de hoy.
 */
export function PaymentSplit({ split, totalUsd }: { split: PaymentSplitState; totalUsd: number }) {
  const g = useGym()
  const money = makeMoney(g.settings)
  const rate = g.settings.usdRate
  const { remaining, settlement } = split
  const covered = settlement.ok
  const over = !settlement.ok && settlement.reason === 'over'
  const short = !settlement.ok && settlement.reason === 'short'
  const quick = [
    { m: 'usd' as const, label: 'Todo en USD' },
    { m: 'tarjeta' as const, label: 'Todo con tarjeta' },
    { m: 'mn' as const, label: 'Todo en MN' },
  ]
  return (
    <div>
      <p className="mb-2 text-sm text-muted">Cómo se paga · total {money.usd(totalUsd)}{g.rateFresh ? ` (≈ ${money.mn(Math.round(totalUsd * rate))})` : ''}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {quick.map(({ m, label }) => (
          <button
            key={m} type="button" onClick={() => split.payAll(m)} disabled={m !== 'usd' && !g.rateFresh}
            className="h-10 rounded-full border border-amber/60 px-4 text-sm font-semibold text-amber transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
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
              <span className="w-[4.2rem] shrink-0 text-sm font-bold">{ROW[id].label}</span>
              <div className="relative min-w-0 flex-1">
                <input
                  className="h-11 w-full rounded-xl border border-line bg-[#131417] pl-3 pr-11 text-right text-base font-semibold tabular-nums text-white placeholder:text-faint focus:border-amber focus:outline-none"
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

      <p
        role="status" aria-live="polite"
        className={`mt-3 text-sm font-semibold ${covered ? 'text-ok' : over ? 'text-danger' : 'text-muted'}`}
      >
        {covered ? '✓ Pago completo'
          : over ? `Sobra ${money.usd(-remaining)}. Baja algún monto: el vuelto no se registra.`
          : short ? `Falta ${money.usd(remaining)}${g.rateFresh ? ` · ≈ ${money.mn(Math.round(remaining * rate))}` : ''}`
          : 'Elige un método o combínalos.'}
      </p>
    </div>
  )
}
