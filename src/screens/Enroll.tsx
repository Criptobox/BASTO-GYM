import { useRef, useState, type FormEvent } from 'react'
import { Camera } from 'lucide-react'
import { useGym } from '../data/store'
import { METHODS, PLANS, whatsappLink } from '../lib/domain'
import { addPlan, formatDate } from '../lib/dates'
import { makeMoney } from '../lib/format'
import { Button, Card, Field, inputCls, Screen, Segmented, Sheet } from '../components/ui'
import type { Client, Method, PlanId } from '../lib/types'
import { blobToDataURL, CLIENT_PHOTO, toWebP } from '../lib/image'

export function Enroll() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const fileRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<string>()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState<PlanId>('mes')
  const [method, setMethod] = useState<Method>('efectivo')
  const [done, setDone] = useState<Client | null>(null)
  const [touched, setTouched] = useState(false)

  const phoneOk = phone.replace(/\D/g, '').length >= 10
  const emailOk = email === '' || /^\S+@\S+\.\S+$/.test(email)
  const valid = name.trim().length >= 3 && phoneOk && emailOk
  const next = addPlan(g.today, plan)

  async function onFile(f?: File) {
    if (f) try { setPhoto(await blobToDataURL(await toWebP(f, CLIENT_PHOTO))) } catch { /* imagen inválida: se ignora */ }
  }
  function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!valid || !g.shiftOpen) return
    setDone(g.enroll({ name, phone, email, plan, photo, method }))
  }
  function reset() {
    setDone(null); setName(''); setPhone(''); setEmail(''); setPhoto(undefined); setPlan('mes'); setTouched(false)
  }
  const err = (bad: boolean, msg: string) => touched && bad && msg

  return (
    <Screen eyebrow="Recepción" title="Nuevo cliente">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <button
          type="button" onClick={() => fileRef.current?.click()}
          className="flex w-full items-center gap-4 rounded-3xl border border-line bg-surface p-4 text-left active:scale-[0.99]"
        >
          {photo ? (
            <img src={photo} alt="Foto del cliente" className="size-16 rounded-full object-cover" />
          ) : (
            <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-amber"><Camera size={26} aria-hidden /></span>
          )}
          <span>
            <span className="block font-bold">Foto del cliente</span>
            <span className="text-sm text-muted">{photo ? 'Toca para cambiarla' : 'Toca para tomar foto'}</span>
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => onFile(e.target.files?.[0])} />

        <Field label="Nombre completo" error={err(name.trim().length < 3, 'Escribe el nombre completo.')}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" placeholder="Ej. María Fernanda López" />
        </Field>
        <Field label="Teléfono (WhatsApp)" error={err(!phoneOk, 'Ingresa un teléfono de 10 dígitos.')}>
          <input className={inputCls} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="55 1234 5678" />
        </Field>
        <Field label="Correo (opcional)" error={err(!emailOk, 'El correo no parece válido.')}>
          <input className={inputCls} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
        </Field>

        <div>
          <p className="mb-2 text-sm text-muted">Plan</p>
          <Segmented label="Plan" value={plan} onChange={setPlan} options={PLANS.map((p) => ({ id: p.id, label: p.label }))} />
        </div>
        <div>
          <p className="mb-2 text-sm text-muted">Método de pago</p>
          <Segmented label="Método de pago" value={method} onChange={setMethod} options={METHODS} />
        </div>

        <Card className="grid grid-cols-3 gap-2 !rounded-2xl !p-4">
          <div><p className="text-xs text-muted">Inicio</p><p className="text-sm font-bold">{formatDate(g.today, g.settings.locale)}</p></div>
          <div><p className="text-xs text-muted">Próximo pago</p><p className="text-sm font-bold text-amber">{formatDate(next, g.settings.locale)}</p></div>
          <div><p className="text-xs text-muted">Total</p><p className="text-sm font-bold">{money(g.settings.planPrices[plan])}</p></div>
        </Card>

        <Button type="submit" block disabled={!g.shiftOpen}>Inscribir y cobrar</Button>
        {!g.shiftOpen && <p className="text-center text-sm text-muted">Abre un turno en “Cierre” para registrar cobros.</p>}
      </form>

      <Sheet open={!!done} onClose={reset} title="¡Cliente inscrito!">
        {done && (
          <>
            <p className="text-muted"><b className="text-white">{done.name}</b> quedó inscrito con vigencia hasta el {formatDate(done.nextDue, g.settings.locale)}.</p>
            <a
              href={whatsappLink(done.phone, g.settings.countryCode, `¡Bienvenido/a a ${g.settings.gymName}, ${done.name.split(' ')[0]}! Tu membresía está activa hasta el ${formatDate(done.nextDue, g.settings.locale)}. 💪`)}
              target="_blank" rel="noreferrer"
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full border border-amber font-bold text-amber"
            >
              Enviar bienvenida por WhatsApp
            </a>
            <Button block className="mt-3" onClick={reset}>Inscribir otro cliente</Button>
          </>
        )}
      </Sheet>
    </Screen>
  )
}
