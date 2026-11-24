import { useState } from 'react'
import { Pencil, Receipt, Snowflake } from 'lucide-react'
import { useGym } from '../data/store'
import { PLANS, dueInfo, frozenDays, isFrozen, unfreezeDue } from '../lib/domain'
import { formatDate } from '../lib/dates'
import { formatTime, makeMoney } from '../lib/format'
import { receiptConcept } from '../lib/receipt'
import type { Client, Movement, PaymentPart, PlanId } from '../lib/types'
import { Avatar, Button, Card, Field, inputCls, Segmented, Sheet, useLatest, useToast } from './ui'
import { StatusPill } from './ClientStatus'
import { useReceipt } from './Receipt'

/**
 * Ficha del cliente: datos, acciones (cobrar, editar, congelar/reactivar) e historial de pagos con recibo.
 * `onPay` solo lo pasa quien puede cobrar (el trabajador con turno): el administrador no cobra.
 */
export function ClientDetail({ client, onPay }: { client: Client; onPay?: (c: Client) => void }) {
  const g = useGym()
  const money = makeMoney(g.settings)
  const toast = useToast()
  const showReceipt = useReceipt()
  const [editing, setEditing] = useState(false)
  const [freezing, setFreezing] = useState(false)
  const frozen = isFrozen(client)
  const price = g.settings.planPrices[client.plan]
  const history = g.movements.filter((m) => m.clientId === client.id).sort((a, b) => b.at.localeCompare(a.at))
  const planLabel = (id: PlanId) => PLANS.find((p) => p.id === id)?.label
  const how = (m: Movement) =>
    m.parts.map((p: PaymentPart) => (p.method === 'usd' ? money.usd(p.paid) : p.method === 'mn' ? money.mn(p.paid) : `${money.mn(p.paid)} tarjeta`)).join(' + ')

  const info = dueInfo(client.nextDue, g.today)
  const stat = (label: string, value: string) => (
    <div className="min-w-0 rounded-2xl border border-line px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">{label}</p>
      <p className="truncate text-sm font-bold">{value}</p>
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar name={client.name} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-extrabold leading-tight">{client.name}</p>
          <p className="truncate text-sm text-muted">{client.carnet} · {client.phone}</p>
          <div className="mt-1.5"><StatusPill client={client} today={g.today} /></div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {stat('Plan', `${planLabel(client.plan)} · ${money.usd(price)}`)}
        {stat(frozen ? 'Congelada desde' : 'Vence', formatDate(frozen ? client.frozenAt! : client.nextDue, g.settings.locale))}
        {stat('Inscrito', formatDate(client.startDate, g.settings.locale))}
        {stat(frozen ? 'Días congelada' : 'Estado', frozen ? String(frozenDays(client.frozenAt!, g.today)) : info.text)}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onPay && !frozen && <Button size="sm" disabled={!g.shiftOpen} onClick={() => onPay(client)}>Cobrar</Button>}
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden /> Editar</Button>
        {frozen ? (
          <Button
            size="sm" variant="outline"
            onClick={() => { const next = unfreezeDue(client, g.today); g.unfreezeClient(client.id); toast(`Reactivada · vence ${formatDate(next, g.settings.locale)}`) }}
          >
            <Snowflake size={15} aria-hidden /> Reactivar
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setFreezing(true)}><Snowflake size={15} aria-hidden /> Congelar</Button>
        )}
      </div>
      {frozen && <p className="mt-2 text-xs text-muted">Congelada: no se cobra ni se avisa. Para cobrar, reactívala primero.</p>}

      <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-[0.14em] text-amber">Historial de pagos</h3>
      <ul className="space-y-2">
        {history.map((m) => (
          <li key={m.id}>
            <Card className="flex items-center gap-3 !rounded-2xl !p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-tight">{receiptConcept(m)} · {money.usd(m.amount)}</p>
                <p className="text-xs text-muted">{formatDate(m.at.slice(0, 10), g.settings.locale)} · {formatTime(m.at, g.settings.locale)} · {how(m)}{m.change ? ' · con vuelto' : ''}</p>
              </div>
              <Button size="xs" variant="outline" onClick={() => showReceipt(m)}><Receipt size={13} aria-hidden /> Recibo</Button>
            </Card>
          </li>
        ))}
        {history.length === 0 && <li className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-muted">Aún no hay pagos registrados.</li>}
      </ul>

      <EditClient client={client} open={editing} onClose={() => setEditing(false)} />
      <Sheet open={freezing} onClose={() => setFreezing(false)} title="¿Congelar membresía?">
        <p className="text-muted">
          Mientras esté congelada no se cobra ni se envían avisos. Al reactivarla, el vencimiento se corre los mismos días que estuvo congelada, así no pierde lo que ya pagó.
        </p>
        <Button block className="mt-5" onClick={() => { g.freezeClient(client.id); setFreezing(false); toast(`${client.name.split(' ')[0]}: membresía congelada`) }}>Congelar</Button>
        <Button block variant="outline" className="mt-3" onClick={() => setFreezing(false)}>Cancelar</Button>
      </Sheet>
    </div>
  )
}

function EditClient({ client, open, onClose }: { client: Client; open: boolean; onClose: () => void }) {
  const g = useGym()
  const toast = useToast()
  const [name, setName] = useState(client.name)
  const [phone, setPhone] = useState(client.phone)
  const [plan, setPlan] = useState<PlanId>(client.plan)
  const [touched, setTouched] = useState(false)
  const nameOk = name.trim().length >= 3
  const phoneOk = phone.replace(/\D/g, '').length >= 7
  function save() {
    setTouched(true)
    if (!nameOk || !phoneOk) return
    if (g.updateClient(client.id, { name, phone, plan })) { toast('Datos actualizados'); onClose() }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Editar cliente">
      <div className="space-y-4">
        <Field label="Nombre completo" error={touched && !nameOk && 'Escribe el nombre completo.'}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Teléfono (WhatsApp)" error={touched && !phoneOk && 'Ingresa un teléfono válido.'}>
          <input className={inputCls} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />
        </Field>
        <div>
          <p className="mb-2 text-sm text-muted">Plan para los próximos cobros</p>
          <Segmented label="Plan" value={plan} onChange={setPlan} options={PLANS.map((p) => ({ id: p.id, label: p.label }))} />
        </div>
        <p className="text-xs text-muted">El carnet ({client.carnet}) no se cambia: es la identidad del cliente.</p>
      </div>
      <Button block className="mt-5" onClick={save}>Guardar cambios</Button>
    </Sheet>
  )
}

/** Ficha en una hoja inferior. Conserva el contenido mientras se anima el cierre. */
export function ClientSheet({ clientId, onClose, onPay }: { clientId: string | null; onClose: () => void; onPay?: (c: Client) => void }) {
  const g = useGym()
  const live = clientId ? g.clients.find((c) => c.id === clientId) ?? null : null
  const client = useLatest(live)
  if (!client) return null
  return (
    <Sheet open={!!live} onClose={onClose} title="Cliente">
      <ClientDetail key={client.id} client={client} onPay={onPay} />
    </Sheet>
  )
}
