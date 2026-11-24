import { useState } from 'react'
import { useGym } from '../data/store'
import { makeMoney } from '../lib/format'
import { Button, Field, inputCls, Segmented, Sheet, useToast } from './ui'
import { haptic } from '../lib/nav'

const parse = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : NaN
}
const clean = (s: string) => s.replace(/[^\d.,]/g, '')

/** Abrir el turno: se cuenta el efectivo que hay en la caja (fondo inicial). Propone lo que dejó el turno anterior. */
export function OpenShiftSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const g = useGym()
  const money = makeMoney(g.settings)
  const toast = useToast()
  const left = g.shifts.find((s) => s.closedAt)
  const [mn, setMn] = useState(left?.countedMN != null ? String(left.countedMN) : '')
  const [usd, setUsd] = useState(left?.countedUSD != null ? String(left.countedUSD) : '')
  const ok = !Number.isNaN(parse(mn || '0')) && !Number.isNaN(parse(usd || '0'))
  return (
    <Sheet open={open} onClose={onClose} title="Abrir mi turno">
      <p className="mb-4 text-sm text-muted">
        Cuenta el efectivo que hay ahora en la caja. Con eso se calcula lo que debe haber al cerrar.
        {left?.countedMN != null && <> El turno anterior dejó <b className="text-ink">{money.mn(left.countedMN)}</b> y <b className="text-ink">{money.usd(left.countedUSD ?? 0)}</b>.</>}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Efectivo MN"><input className={inputCls} inputMode="decimal" placeholder="0" value={mn} onChange={(e) => setMn(clean(e.target.value))} /></Field>
        <Field label="Efectivo USD"><input className={inputCls} inputMode="decimal" placeholder="0.00" value={usd} onChange={(e) => setUsd(clean(e.target.value))} /></Field>
      </div>
      <Button
        block className="mt-5" disabled={!ok}
        onClick={() => {
          if (!g.openShift({ mn: parse(mn || '0'), usd: parse(usd || '0') })) return
          haptic(); toast('Turno abierto'); onClose()
        }}
      >
        Abrir turno
      </Button>
    </Sheet>
  )
}

/** Gasto del local o retiro de efectivo durante el turno: se descuenta de lo que debe haber en caja. */
export function CashOutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const g = useGym()
  const toast = useToast()
  const [kind, setKind] = useState<'gasto' | 'retiro'>('gasto')
  const [concept, setConcept] = useState('')
  const [mn, setMn] = useState('')
  const [usd, setUsd] = useState('')
  const [touched, setTouched] = useState(false)
  const nMn = parse(mn || '0')
  const nUsd = parse(usd || '0')
  const amountOk = !Number.isNaN(nMn) && !Number.isNaN(nUsd) && (nMn > 0 || nUsd > 0)
  const conceptOk = concept.trim().length >= 2

  function submit() {
    setTouched(true)
    if (!conceptOk || !amountOk) return
    if (!g.addCashOut({ kind, concept, mn: nMn, usd: nUsd })) return
    haptic(); toast(kind === 'gasto' ? 'Gasto registrado' : 'Retiro registrado')
    setConcept(''); setMn(''); setUsd(''); setTouched(false); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Salida de efectivo">
      <p className="mb-4 text-sm text-muted">Anota el efectivo que sale de la caja para que el cierre cuadre.</p>
      <Segmented label="Tipo de salida" value={kind} onChange={setKind} options={[{ id: 'gasto', label: 'Gasto del local' }, { id: 'retiro', label: 'Retiro' }]} />
      <div className="mt-4 space-y-4">
        <Field label="¿En qué se usó?" error={touched && !conceptOk && 'Escribe el motivo.'}>
          <input className={inputCls} value={concept} onChange={(e) => setConcept(e.target.value)} autoComplete="off" placeholder={kind === 'gasto' ? 'Ej. agua, limpieza' : 'Ej. entrega al administrador'} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="MN" error={touched && !amountOk && 'Indica un monto.'}><input className={inputCls} inputMode="decimal" placeholder="0" value={mn} onChange={(e) => setMn(clean(e.target.value))} /></Field>
          <Field label="USD"><input className={inputCls} inputMode="decimal" placeholder="0.00" value={usd} onChange={(e) => setUsd(clean(e.target.value))} /></Field>
        </div>
      </div>
      <Button block className="mt-5" onClick={submit}>Registrar salida</Button>
    </Sheet>
  )
}
