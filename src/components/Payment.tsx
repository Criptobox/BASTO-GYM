import { useState, type FormEvent } from 'react'
import { useGym } from '../data/store'
import { METHODS, chargeFor, type Charge } from '../lib/domain'
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

/** Lo que se va a cobrar en este método, con su texto listo para mostrar. */
export function useCharge(usd: number, method: Method): { ch: Charge | null; label: string | null } {
  const g = useGym()
  const m = makeMoney(g.settings)
  const ch = chargeFor(usd, method, g.settings, g.today)
  return { ch, label: ch ? (ch.currency === 'USD' ? m.usd(ch.paid) : m.mn(ch.paid)) : null }
}

/** Método inicial: MN si ya hay tasa de hoy; si no, USD (que no la necesita). */
export function useDefaultMethod(): Method {
  return useGym().rateFresh ? 'mn' : 'usd'
}

/** USD, Tarjeta o MN. MN y tarjeta se bloquean hasta fijar la tasa de hoy. */
export function MethodPicker({ usd, method, onChange }: { usd: number; method: Method; onChange: (m: Method) => void }) {
  const g = useGym()
  const { ch, label } = useCharge(usd, method)
  return (
    <div>
      <p className="mb-2 text-sm text-muted">Método de pago</p>
      <Segmented
        label="Método de pago" value={method} onChange={onChange}
        options={METHODS.map((o) => ({ ...o, disabled: o.id !== 'usd' && !g.rateFresh }))}
      />
      {!g.rateFresh && (
        <div role="alert" className="mt-4 rounded-2xl border border-amber/60 p-4">
          <p className="mb-3 text-sm font-semibold text-amber">Falta la tasa del USD de hoy. Para cobrar en MN o con tarjeta, fíjala:</p>
          <RateForm />
        </div>
      )}
      {ch && label && (
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          {ch.currency === 'USD' ? 'Se cobra en dólares' : <>Se cobra <b className="text-white">{label}</b> · 1 USD = {ch.rate} MN</>}
        </p>
      )}
    </div>
  )
}
