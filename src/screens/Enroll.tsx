import { useState, type FormEvent } from 'react'
import { useGym } from '../data/store'
import { PLANS, findByCarnet, isValidCarnet, whatsappLink } from '../lib/domain'
import { PaymentSplit, usePaymentSplit } from '../components/Payment'
import { useReceipt } from '../components/Receipt'
import type { Movement } from '../lib/types'
import { addPlan, formatDate } from '../lib/dates'
import { makeMoney } from '../lib/format'
import { Button, Card, Field, inputCls, Screen, Segmented, Sheet, useLatest } from '../components/ui'
import { haptic } from '../lib/nav'
import type { Client, PlanId } from '../lib/types'

export function Enroll() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [carnet, setCarnet] = useState('')
  const [plan, setPlan] = useState<PlanId>('mes')
  const [done, setDone] = useState<Client | null>(null)
  const [doneMovement, setDoneMovement] = useState<Movement | null>(null)
  const showReceipt = useReceipt()
  const [touched, setTouched] = useState(false)
  const shown = useLatest(done)

  const phoneOk = phone.replace(/\D/g, '').length >= 7
  const carnetOk = isValidCarnet(carnet)
  const duplicate = carnetOk ? findByCarnet(g.clients, carnet) : undefined
  const valid = name.trim().length >= 3 && carnetOk && !duplicate && phoneOk
  const next = addPlan(g.today, plan)
  const price = g.settings.planPrices[plan]
  const split = usePaymentSplit(price)

  function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!valid || !split.ready || !g.shiftOpen) return
    const r = g.enroll({ name, phone, carnet, plan, parts: split.inputs, change: split.change })
    if (!r) return
    setDone(r.client); setDoneMovement(r.movement); haptic()
  }
  function reset() {
    setDone(null); setName(''); setPhone(''); setCarnet(''); setPlan('mes'); setTouched(false); split.reset()
  }
  const err = (bad: boolean, msg: string) => touched && bad && msg

  return (
    <Screen eyebrow="Recepción" title="Nuevo cliente">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nombre completo" error={err(name.trim().length < 3, 'Escribe el nombre completo.')}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" autoCapitalize="words" placeholder="Nombre y apellidos" />
        </Field>
        <Field
          label="Carnet"
          error={err(!carnetOk || !!duplicate, duplicate ? `Ya está inscrito: ${duplicate.name}.` : 'Escribe el carnet (5 a 15 letras o números).')}
        >
          <input className={inputCls} value={carnet} onChange={(e) => setCarnet(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Número de carnet" />
        </Field>
        <Field label="Teléfono (WhatsApp)" error={err(!phoneOk, 'Ingresa un teléfono válido.')}>
          <input className={inputCls} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" placeholder="Número de teléfono" />
        </Field>

        <div>
          <p className="mb-2 text-sm text-muted">Plan</p>
          <Segmented label="Plan" value={plan} onChange={setPlan} options={PLANS.map((p) => ({ id: p.id, label: p.label }))} />
        </div>
        <PaymentSplit split={split} totalUsd={price} />

        <Card className="grid grid-cols-3 gap-2 !rounded-2xl !p-4">
          <div><p className="text-xs text-muted">Inicio</p><p className="text-sm font-bold">{formatDate(g.today, g.settings.locale)}</p></div>
          <div><p className="text-xs text-muted">Próximo pago</p><p className="text-sm font-bold text-amber">{formatDate(next, g.settings.locale)}</p></div>
          <div><p className="text-xs text-muted">Total</p><p className="text-sm font-bold">{money.usd(price)}</p></div>
        </Card>

        {touched && !split.ready && <p role="alert" className="text-sm text-danger">Completa el pago para poder inscribir.</p>}
        <Button type="submit" block disabled={!g.shiftOpen}>Inscribir y cobrar</Button>
        {!g.shiftOpen && <p className="text-center text-sm text-muted">Abre tu turno en Inicio para registrar cobros.</p>}
      </form>

      <Sheet open={!!done} onClose={reset} title="¡Cliente inscrito!">
        {shown && (
          <>
            <p className="text-muted"><b className="text-white">{shown.name}</b> quedó inscrito con vigencia hasta el {formatDate(shown.nextDue, g.settings.locale)}.</p>
            <a
              href={whatsappLink(shown.phone, g.settings.countryCode, `¡Bienvenido/a a ${g.settings.gymName}, ${shown.name.split(' ')[0]}! Tu membresía está activa hasta el ${formatDate(shown.nextDue, g.settings.locale)}. 💪`)}
              target="_blank" rel="noreferrer"
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full border border-amber font-bold text-amber"
            >
              Enviar bienvenida por WhatsApp
            </a>
            {doneMovement && <Button block variant="outline" className="mt-3" onClick={() => showReceipt(doneMovement)}>Ver recibo</Button>}
            <Button block className="mt-3" onClick={reset}>Inscribir otro cliente</Button>
          </>
        )}
      </Sheet>
    </Screen>
  )
}
