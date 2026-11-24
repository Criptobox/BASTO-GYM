import { useState } from 'react'
import { Check, MessageCircle } from 'lucide-react'
import { useGym } from '../data/store'
import { alertToday, dueInfo, isFrozen, pendingClients, upcomingClients, type DueInfo } from '../lib/domain'
import { formatTime, makeMoney } from '../lib/format'
import { formatShortDate } from '../lib/dates'
import { Avatar, Button, Card, Pill, Screen, Sheet, Split, SwipeRow, cx } from '../components/ui'
import { PaySheet } from '../components/PaySheet'
import { useClientPanel } from '../components/ClientDetail'
import { StatusPill } from '../components/ClientStatus'
import { AlertIconButton, AlertedTag, useAlertLink } from '../components/Alert'
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
    <h2 className="mb-2 mt-7 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-amber after:ml-1 after:h-px after:flex-1 after:bg-gradient-to-r after:from-amber/40 after:to-transparent">
      {children} <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{count}</span>
    </h2>
  )
}

type Tab = 'vencidos' | 'hoy' | 'pronto' | 'otros'

/** Los vencidos se agrupan por cuánto llevan de atraso, del más atrasado al menos. */
const AGE_BUCKETS = [
  { id: 'mes', label: 'Hace más de un mes', test: (d: number) => d > 30 },
  { id: 'semana', label: 'Hace más de una semana', test: (d: number) => d > 7 && d <= 30 },
  { id: 'medio', label: 'Hace 4 a 7 días', test: (d: number) => d > 3 && d <= 7 },
  { id: 'poco', label: 'Hace 1 a 3 días', test: (d: number) => d >= 1 && d <= 3 },
]

export function Payments() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const { message } = useAlertLink()
  const [paying, setPaying] = useState<Client | null>(null)
  const cp = useClientPanel((c) => setPaying(c))
  const [bulk, setBulk] = useState(false)

  const pending = pendingClients(g.clients, g.today)
  const upcoming = upcomingClients(g.clients, g.today)
  const overdue = pending.filter((c) => dueInfo(c.nextDue, g.today).state === 'vencido')
  const dueToday = pending.filter((c) => dueInfo(c.nextDue, g.today).state === 'hoy')
  const frozen = g.clients.filter(isFrozen)
  const upToDate = g.clients.filter((c) => !isFrozen(c) && !pending.includes(c) && !upcoming.includes(c))
  const others = upToDate.length + frozen.length

  // Al abrir, la pestaña más urgente que tenga gente.
  const [tab, setTab] = useState<Tab>(() => (overdue.length ? 'vencidos' : dueToday.length ? 'hoy' : upcoming.length ? 'pronto' : 'otros'))
  const groups: Record<Exclude<Tab, 'otros'>, Client[]> = { vencidos: overdue, hoy: dueToday, pronto: upcoming }
  const list = tab === 'otros' ? [] : groups[tab]

  const alertable = [...pending, ...upcoming]
  const alertedAll = alertable.filter((c) => alertToday(g.alerts, c.id, g.today)).length
  const alerted = list.filter((c) => alertToday(g.alerts, c.id, g.today))
  const notAlerted = list.filter((c) => !alertToday(g.alerts, c.id, g.today))
  const TITLES: Record<Tab, string> = { vencidos: 'Vencidos', hoy: 'Vencen hoy', pronto: 'Por vencer', otros: 'Otros' }

  /** Fila compacta: quién, cuánto debe y hace cuánto; avisar y cobrar a un toque, o deslizar para cobrar. */
  const row = (c: Client) => {
    const info = dueInfo(c.nextDue, g.today)
    const when = info.state === 'vencido' ? `hace ${-info.days} ${info.days === -1 ? 'día' : 'días'}` : info.state === 'hoy' ? 'vence hoy' : info.days === 1 ? 'vence mañana' : `vence en ${info.days} días`
    return (
      <li key={c.id}>
        <SwipeRow label="Registrar pago" disabled={!g.shiftOpen} onTrigger={() => setPaying(c)}>
          <Card accent={accentFor(info)} className={cx('!p-3 !pl-5', cp.selected === c.id && 'card-selected')}>
            <div className="flex items-center gap-2">
              <button onClick={() => cp.open(c.id)} aria-label={`Ver ficha de ${c.name}`} aria-current={cp.selected === c.id || undefined} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                <Avatar name={c.name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{c.name}</span>
                  <span className="block truncate text-sm text-muted">
                    <span className={info.state === 'vencido' ? 'font-semibold text-danger-soft' : info.state === 'hoy' ? 'font-semibold text-amber' : ''}>{when}</span>
                    <span className="hidden sm:inline"><span aria-hidden> · </span>{money.usd(g.settings.planPrices[c.plan])}</span>
                  </span>
                  <AlertedTag client={c} />
                </span>
              </button>
              <AlertIconButton client={c} />
              <Button size="sm" className="!px-3.5" disabled={!g.shiftOpen} onClick={() => setPaying(c)} aria-label={`Registrar pago de ${c.name}`}>Cobrar</Button>
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

  const tile = (id: Exclude<Tab, 'otros'>, label: string, n: number, color: string) => (
    <button
      key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={cx('relative rounded-2xl border px-2 py-3 text-center transition active:scale-[0.97] surface-card', tab === id ? 'card-selected' : 'border-line')}
    >
      <span className={cx('block text-[40px] font-extrabold leading-none tracking-tight', color)}>{n}</span>
      <span className="mt-1.5 block text-xs font-bold text-muted">{label}</span>
    </button>
  )

  return (
    <Screen eyebrow="Registro de pagos" title="Quién debe pagar">
     <Split side={cp.panel} empty="Toca un cliente para ver su ficha, avisarle o registrar su pago.">
      <div role="tablist" aria-label="Estado de los pagos" className="grid grid-cols-3 gap-2.5">
        {tile('vencidos', 'Vencidos', overdue.length, 'text-danger-soft')}
        {tile('hoy', 'Vencen hoy', dueToday.length, 'text-gold')}
        {tile('pronto', 'Por vencer', upcoming.length, 'text-ink')}
      </div>
      <button
        role="tab" aria-selected={tab === 'otros'} onClick={() => setTab('otros')}
        className={cx('mt-2.5 flex w-full items-center justify-between rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-[0.98]', tab === 'otros' ? 'border-amber bg-amber/10 text-amber' : 'border-line text-muted')}
      >
        <span>Al día y congelados</span><span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">{others}</span>
      </button>

      <div role="tabpanel" aria-label={TITLES[tab]}>
        {tab !== 'otros' ? (
          <>
            <div className="mb-3 mt-5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted">Avisados hoy: <b className="text-ink">{alertedAll}</b> de {alertable.length}</p>
              {list.length > 0 && (
                <Button size="xs" disabled={notAlerted.length === 0} onClick={() => setBulk(true)}>
                  {notAlerted.length === 0 ? <><Check size={14} aria-hidden /> Todos avisados</> : <><MessageCircle size={14} aria-hidden /> Alertar a {notAlerted.length === list.length ? 'todos' : `los ${notAlerted.length} que faltan`}</>}
                </Button>
              )}
            </div>
            {list.length === 0 && (
              <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">
                {tab === 'vencidos' ? 'No hay pagos vencidos 🎉' : tab === 'hoy' ? 'Nadie vence hoy.' : 'Nadie vence en los próximos días.'}
              </p>
            )}
            {tab === 'vencidos' ? (
              AGE_BUCKETS.map((b) => {
                const items = overdue.filter((c) => b.test(-dueInfo(c.nextDue, g.today).days))
                return items.length === 0 ? null : (
                  <section key={b.id} className="mb-4">
                    <h2 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-danger-soft after:h-px after:flex-1 after:bg-gradient-to-r after:from-danger-soft/30 after:to-transparent">{b.label} <span className="text-muted">{items.length}</span></h2>
                    <ul className="space-y-2.5">{items.map(row)}</ul>
                  </section>
                )
              })
            ) : (
              <ul className="space-y-2.5">{list.map(row)}</ul>
            )}
          </>
        ) : (
          <>
            {upToDate.length > 0 && (<><Heading count={upToDate.length}>Al día</Heading><ul className="space-y-2">{upToDate.map(simple)}</ul></>)}
            {frozen.length > 0 && (<><Heading count={frozen.length}>Congelados</Heading><ul className="space-y-2">{frozen.map(simple)}</ul></>)}
            {others === 0 && <p className="mt-5 rounded-3xl border border-dashed border-line p-6 text-center text-muted">Todos los clientes tienen algo pendiente.</p>}
          </>
        )}
      </div>
     </Split>
      <PaySheet client={paying} onClose={() => setPaying(null)} />
      {cp.sheet}
      <Sheet open={bulk} onClose={() => setBulk(false)} title={`Alertar: ${TITLES[tab].toLowerCase()}`}>
        {list[0] && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Así lo recibe el cliente</p>
            <div className="mb-4 rounded-2xl rounded-tl-md bg-[#005c4b] px-4 py-3 text-[15px] leading-snug shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]">
              <p>{message(notAlerted[0] ?? list[0])}</p>
              <p className="mt-1 text-right text-[11px] text-white/60">{formatTime(new Date().toISOString(), g.settings.locale)} ✓✓</p>
            </div>
          </>
        )}
        <p className="mb-3 text-sm text-muted">
          WhatsApp no permite enviar varios mensajes a la vez. Toca cada cliente: se abre su mensaje ya escrito y queda anotado que se le avisó.
        </p>
        <BulkList clients={[...notAlerted, ...alerted]} />
      </Sheet>
    </Screen>
  )
}

function BulkList({ clients }: { clients: Client[] }) {
  const g = useGym()
  const { href } = useAlertLink()
  return (
    <ul className="space-y-2.5">
      {clients.map((c) => {
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
  )
}
