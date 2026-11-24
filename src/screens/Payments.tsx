import { useState } from 'react'
import { BellRing, Check, MessageCircle } from 'lucide-react'
import { useGym } from '../data/store'
import { alertToday, dueInfo, isFrozen, pendingClients, upcomingClients, type DueInfo } from '../lib/domain'
import { formatTime, makeMoney } from '../lib/format'
import { formatShortDate } from '../lib/dates'
import { Avatar, Button, Card, Pill, Screen, Sheet, Split, SwipeRow, cx } from '../components/ui'
import { PaySheet } from '../components/PaySheet'
import { useClientPanel } from '../components/ClientDetail'
import { StatusPill } from '../components/ClientStatus'
import { AlertButton, AlertedTag, useAlertLink } from '../components/Alert'
import type { Client } from '../lib/types'

/** Estado de cobro en una pastilla: rojo si ya venció, dorado si vence hoy o pronto. */
export function DuePill({ info }: { info: DueInfo }) {
  if (info.state === 'vencido') return <Pill tone="danger">Vencido · {-info.days} {info.days === -1 ? 'día' : 'días'}</Pill>
  if (info.state === 'hoy') return <Pill tone="amber">Vence hoy</Pill>
  if (info.state === 'pronto') return <Pill tone="amber">{info.days === 1 ? 'Vence mañana' : `En ${info.days} días`}</Pill>
  return <Pill>Al día</Pill>
}
export const accentFor = (info: DueInfo) => (info.state === 'vencido' ? 'danger' : info.state === 'hoy' ? 'gold' : undefined)

function Heading({ children, count }: { children: string; count: number }) {
  return (
    <h2 className="mb-2 mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-amber">
      {children} <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{count}</span>
    </h2>
  )
}

export function Payments() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const { message, href } = useAlertLink()
  const [paying, setPaying] = useState<Client | null>(null)
  const cp = useClientPanel((c) => setPaying(c))
  const [bulk, setBulk] = useState(false)

  const pending = pendingClients(g.clients, g.today)
  const upcoming = upcomingClients(g.clients, g.today)
  const frozen = g.clients.filter(isFrozen)
  const upToDate = g.clients.filter((c) => !isFrozen(c) && !pending.includes(c) && !upcoming.includes(c))
  const overdue = pending.filter((c) => dueInfo(c.nextDue, g.today).state === 'vencido').length
  const dueToday = pending.length - overdue

  const alertable = [...pending, ...upcoming]
  const alerted = alertable.filter((c) => alertToday(g.alerts, c.id, g.today))
  const notAlerted = alertable.filter((c) => !alertToday(g.alerts, c.id, g.today))
  const detailOf = (c: Client) => money.usd(g.settings.planPrices[c.plan])

  const row = (c: Client) => {
    const info = dueInfo(c.nextDue, g.today)
    return (
      <li key={c.id}>
        <SwipeRow label="Registrar pago" disabled={!g.shiftOpen} onTrigger={() => setPaying(c)}>
        <Card accent={accentFor(info)} className={cx('!p-3.5 !pl-5', cp.selected === c.id && 'card-selected')}>
          <div className="flex items-center gap-3">
            <button onClick={() => cp.open(c.id)} aria-label={`Ver ficha de ${c.name}`} aria-current={cp.selected === c.id || undefined} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <Avatar name={c.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{c.name}</p>
                <p className="truncate text-sm text-muted">{detailOf(c)}</p>
              </div>
            </button>
            <DuePill info={info} />
          </div>
          <div className="mt-1.5 pl-[3.75rem]"><AlertedTag client={c} full /></div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <AlertButton client={c} />
            <Button size="sm" disabled={!g.shiftOpen} onClick={() => setPaying(c)}>{info.state === 'pronto' ? 'Cobrar ya' : 'Registrar pago'}</Button>
          </div>
        </Card>
        </SwipeRow>
      </li>
    )
  }
  const simple = (c: Client) => (
    <li key={c.id}>
      <Card className={cx('!p-3.5', cp.selected === c.id && 'card-selected')}>
        <button onClick={() => cp.open(c.id)} aria-current={cp.selected === c.id || undefined} aria-label={`Ver ficha de ${c.name}`} className="flex w-full items-center gap-3 text-left">
          <Avatar name={c.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{c.name}</p>
            <p className="text-sm text-muted">{isFrozen(c) ? `Congelada desde ${formatShortDate(c.frozenAt!, g.settings.locale)}` : dueInfo(c.nextDue, g.today).text}</p>
          </div>
          <StatusPill client={c} today={g.today} />
        </button>
      </Card>
    </li>
  )

  return (
    <Screen eyebrow="Registro de pagos" title="Quién debe pagar">
     <Split side={cp.panel} empty="Toca un cliente para ver su ficha, avisarle o registrar su pago.">
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
          <span className="rounded-full bg-black/80 px-3 py-1 text-xs font-bold text-[#ffc21f]">{dueToday} {dueToday === 1 ? 'vence' : 'vencen'} hoy</span>
          <span className="rounded-full bg-black/80 px-3 py-1 text-xs font-bold text-white/85">{upcoming.length} por vencer</span>
        </div>
        <p className="mt-3 text-sm font-semibold">
          Avisados hoy: {alerted.length} de {alertable.length}
        </p>
        <Button variant="dark" size="sm" className="mt-3" disabled={notAlerted.length === 0} onClick={() => setBulk(true)}>
          {notAlerted.length === 0 ? <><Check size={16} aria-hidden /> Todos avisados</> : <><MessageCircle size={16} aria-hidden /> Alertar a {notAlerted.length === alertable.length ? 'todos' : `los ${notAlerted.length} que faltan`}</>}
        </Button>
      </div>

      <Heading count={pending.length}>Por cobrar</Heading>
      <ul className="space-y-3">
        {pending.map(row)}
        {pending.length === 0 && <li className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">Nadie debe pagar hoy 🎉</li>}
      </ul>

      {upcoming.length > 0 && (
        <>
          <Heading count={upcoming.length}>Vencen pronto</Heading>
          <ul className="space-y-3">{upcoming.map(row)}</ul>
        </>
      )}
      {upToDate.length > 0 && (
        <>
          <Heading count={upToDate.length}>Al día</Heading>
          <ul className="space-y-2">{upToDate.map(simple)}</ul>
        </>
      )}
      {frozen.length > 0 && (
        <>
          <Heading count={frozen.length}>Congelados</Heading>
          <ul className="space-y-2">{frozen.map(simple)}</ul>
        </>
      )}

     </Split>
      <PaySheet client={paying} onClose={() => setPaying(null)} />
      {cp.sheet}
      <Sheet open={bulk} onClose={() => setBulk(false)} title="Alertar a todos">
        {alertable[0] && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Así lo recibe el cliente</p>
            <div className="mb-4 rounded-2xl rounded-tl-md bg-[#005c4b] px-4 py-3 text-[15px] leading-snug shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]">
              <p>{message(notAlerted[0] ?? alertable[0])}</p>
              <p className="mt-1 text-right text-[11px] text-white/60">{formatTime(new Date().toISOString(), g.settings.locale)} ✓✓</p>
            </div>
          </>
        )}
        <p className="mb-3 text-sm text-muted">
          WhatsApp no permite enviar varios mensajes a la vez. Toca cada cliente: se abre su mensaje ya escrito y queda anotado que se le avisó.
        </p>
        <ul className="space-y-2.5">
          {[...notAlerted, ...alerted].map((c) => {
            const done = Boolean(alertToday(g.alerts, c.id, g.today))
            const info = dueInfo(c.nextDue, g.today)
            return (
              <li key={c.id}>
                <a
                  href={href(c)}
                  target="_blank" rel="noreferrer" onClick={() => g.logAlert(c.id)}
                  className={`surface-card flex items-center gap-3 rounded-2xl border border-line p-3 active:scale-[0.98] ${done ? 'opacity-60' : ''}`}
                >
                  <Avatar name={c.name} size={40} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{c.name}</span><span className="text-xs text-muted">{info.text}</span></span>
                  {done ? <span className="inline-flex items-center gap-1 text-xs font-bold text-ok"><Check size={14} aria-hidden /> Avisado</span> : <MessageCircle size={20} className="text-amber" aria-hidden />}
                </a>
              </li>
            )
          })}
        </ul>
      </Sheet>
    </Screen>
  )
}
