import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useGym } from '../data/store'
import { dueInfo, pendingClients, reminderMessage, whatsappLink } from '../lib/domain'
import { Avatar, Button, Card, Pill, Screen, Sheet } from '../components/ui'
import { PaySheet } from '../components/PaySheet'
import type { Client } from '../lib/types'

export function Payments() {
  const g = useGym()
  const [paying, setPaying] = useState<Client | null>(null)
  const [bulk, setBulk] = useState(false)
  const pending = pendingClients(g.clients, g.today)
  const overdue = pending.filter((c) => dueInfo(c.nextDue, g.today).state === 'vencido').length
  const dueToday = pending.length - overdue
  const upToDate = g.clients.filter((c) => !pending.includes(c))

  const wa = (c: Client) =>
    whatsappLink(c.phone, g.settings.countryCode, reminderMessage(c.name, dueInfo(c.nextDue, g.today), g.settings.gymName))

  return (
    <Screen eyebrow="Registro de pagos" title="Quién debe pagar">
      <div className="rounded-3xl bg-amber p-5 text-amber-ink">
        <p className="text-sm font-semibold">Pagos pendientes</p>
        <p className="text-[44px] font-extrabold leading-tight tracking-tight">
          {pending.length} {pending.length === 1 ? 'cliente' : 'clientes'}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{overdue} {overdue === 1 ? 'vencido' : 'vencidos'} · {dueToday} {dueToday === 1 ? 'vence' : 'vencen'} hoy</p>
          <Button variant="dark" size="sm" disabled={pending.length === 0} onClick={() => setBulk(true)}>Alertar a todos</Button>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {pending.map((c) => {
          const info = dueInfo(c.nextDue, g.today)
          return (
            <li key={c.id}>
              <Card className="!p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} photo={c.photo} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.name}</p>
                    <p className="text-sm text-muted">{info.text}</p>
                  </div>
                  <Pill tone={info.state === 'hoy' ? 'amber' : 'white'}>{info.state === 'hoy' ? 'Hoy' : 'Vencido'}</Pill>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <a
                    href={wa(c)} target="_blank" rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-amber text-sm font-bold text-amber active:scale-[0.97]"
                  >
                    <MessageCircle size={16} aria-hidden /> Enviar alerta
                  </a>
                  <Button size="sm" disabled={!g.shiftOpen} onClick={() => setPaying(c)}>Registrar pago</Button>
                </div>
              </Card>
            </li>
          )
        })}
        {upToDate.map((c) => (
          <li key={c.id}>
            <Card className="flex items-center gap-3 !p-3.5">
              <Avatar name={c.name} photo={c.photo} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{c.name}</p>
                <p className="text-sm text-muted">{dueInfo(c.nextDue, g.today).text}</p>
              </div>
              <Pill>Al día</Pill>
            </Card>
          </li>
        ))}
      </ul>

      <PaySheet client={paying} onClose={() => setPaying(null)} />
      <Sheet open={bulk} onClose={() => setBulk(false)} title="Alertar a todos">
        <p className="mb-4 text-sm text-muted">
          WhatsApp no permite enviar varios mensajes a la vez. Toca cada cliente para abrir su mensaje ya escrito.
        </p>
        <ul className="space-y-2.5">
          {pending.map((c) => (
            <li key={c.id}>
              <a href={wa(c)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 active:scale-[0.98]">
                <Avatar name={c.name} photo={c.photo} size={40} />
                <span className="flex-1 font-semibold">{c.name}</span>
                <MessageCircle size={20} className="text-amber" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </Sheet>
    </Screen>
  )
}
