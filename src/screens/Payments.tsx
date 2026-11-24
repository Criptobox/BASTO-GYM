import { useState } from 'react'
import { BellRing, MessageCircle } from 'lucide-react'
import { useGym } from '../data/store'
import { PLANS, dueInfo, pendingClients, reminderMessage, whatsappLink, type DueInfo } from '../lib/domain'
import { formatTime, makeMoney } from '../lib/format'
import { Avatar, Button, Card, Pill, Screen, Sheet } from '../components/ui'
import { PaySheet } from '../components/PaySheet'
import type { Client } from '../lib/types'

/** Estado de cobro en una pastilla: rojo si ya venció, dorado si vence hoy. */
export function DuePill({ info }: { info: DueInfo }) {
  if (info.state === 'vencido') return <Pill tone="danger">Vencido · {-info.days} {info.days === -1 ? 'día' : 'días'}</Pill>
  if (info.state === 'hoy') return <Pill tone="amber">Vence hoy</Pill>
  return <Pill>Al día</Pill>
}
export const accentFor = (info: DueInfo) => (info.state === 'vencido' ? 'danger' : info.state === 'hoy' ? 'gold' : undefined)

export function Payments() {
  const g = useGym()
  const [paying, setPaying] = useState<Client | null>(null)
  const [bulk, setBulk] = useState(false)
  const pending = pendingClients(g.clients, g.today)
  const overdue = pending.filter((c) => dueInfo(c.nextDue, g.today).state === 'vencido').length
  const dueToday = pending.length - overdue
  const upToDate = g.clients.filter((c) => !pending.includes(c))

  const msg = (c: Client) => reminderMessage(c.name, dueInfo(c.nextDue, g.today), g.settings.gymName)
  const wa = (c: Client) => whatsappLink(c.phone, g.settings.countryCode, msg(c))
  const sample = pending[0]
  const money = makeMoney(g.settings)
  // La pastilla ya dice cuánto lleva vencido: la línea de abajo da el dato útil para cobrar.
  const detail = (c: Client) => `${money.usd(g.settings.planPrices[c.plan])} · ${PLANS.find((p) => p.id === c.plan)?.label}`

  return (
    <Screen eyebrow="Registro de pagos" title="Quién debe pagar">
      <div className="relative overflow-hidden rounded-3xl bg-gold p-5 text-amber-ink">
        <span aria-hidden className="absolute -right-6 -top-6 grid size-28 place-items-center rounded-full bg-black/10">
          <BellRing size={44} className="translate-x-[-6px] translate-y-[8px] opacity-40" />
        </span>
        <p className="text-sm font-semibold">Pagos pendientes</p>
        <p className="text-[44px] font-extrabold leading-tight tracking-tight">
          {pending.length} {pending.length === 1 ? 'cliente' : 'clientes'}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <span className="rounded-full bg-black/80 px-3 py-1 text-xs font-bold text-[#ff9a92]">{overdue} {overdue === 1 ? 'vencido' : 'vencidos'}</span>
          <span className="rounded-full bg-black/80 px-3 py-1 text-xs font-bold text-amber">{dueToday} {dueToday === 1 ? 'vence' : 'vencen'} hoy</span>
        </div>
        <Button variant="dark" size="sm" className="mt-4" disabled={pending.length === 0} onClick={() => setBulk(true)}>
          <MessageCircle size={16} aria-hidden /> Alertar a todos
        </Button>
      </div>

      <ul className="mt-4 space-y-3">
        {pending.map((c) => {
          const info = dueInfo(c.nextDue, g.today)
          return (
            <li key={c.id}>
              <Card accent={accentFor(info)} className="!p-3.5 !pl-5">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.name}</p>
                    <p className="truncate text-sm text-muted">{detail(c)}</p>
                  </div>
                  <DuePill info={info} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <a
                    href={wa(c)} target="_blank" rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-amber/70 text-sm font-bold text-amber active:scale-[0.97]"
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
              <Avatar name={c.name} />
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
        {sample && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Así lo recibe el cliente</p>
            <div className="mb-4 rounded-2xl rounded-tl-md bg-[#005c4b] px-4 py-3 text-[15px] leading-snug shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]">
              <p>{msg(sample)}</p>
              <p className="mt-1 text-right text-[11px] text-white/60">{formatTime(new Date().toISOString(), g.settings.locale)} ✓✓</p>
            </div>
          </>
        )}
        <p className="mb-3 text-sm text-muted">
          WhatsApp no permite enviar varios mensajes a la vez. Toca cada cliente para abrir su mensaje ya escrito.
        </p>
        <ul className="space-y-2.5">
          {pending.map((c) => {
            const info = dueInfo(c.nextDue, g.today)
            return (
              <li key={c.id}>
                <a href={wa(c)} target="_blank" rel="noreferrer" className="surface-card flex items-center gap-3 rounded-2xl border border-line p-3 active:scale-[0.98]">
                  <Avatar name={c.name} size={40} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{c.name}</span><span className="text-xs text-muted">{info.text}</span></span>
                  <MessageCircle size={20} className="text-amber" aria-hidden />
                </a>
              </li>
            )
          })}
        </ul>
      </Sheet>
    </Screen>
  )
}
