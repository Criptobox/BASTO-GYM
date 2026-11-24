import { BellRing, Check, MessageCircle } from 'lucide-react'
import { useGym } from '../data/store'
import { alertToday, dueInfo, isFrozen, reminderMessage, whatsappLink } from '../lib/domain'
import { formatTime } from '../lib/format'
import type { Client } from '../lib/types'
import { cx } from './ui'

/** Mensaje y enlace de WhatsApp de un cliente, según lo urgente que esté su cobro. */
export function useAlertLink() {
  const g = useGym()
  const href = (c: Client) =>
    whatsappLink(c.phone, g.settings.countryCode, reminderMessage(c.name, dueInfo(c.nextDue, g.today), g.settings.gymName))
  return { href, message: (c: Client) => reminderMessage(c.name, dueInfo(c.nextDue, g.today), g.settings.gymName) }
}

/**
 * Botón "Enviar alerta": abre WhatsApp con el mensaje ya escrito y deja constancia del aviso
 * (quién, cuándo y con qué urgencia). Si ya se avisó hoy, cambia a "Avisar de nuevo".
 */
export function AlertButton({ client, className }: { client: Client; className?: string }) {
  const g = useGym()
  const { href } = useAlertLink()
  if (isFrozen(client)) return null
  const already = alertToday(g.alerts, client.id, g.today)
  return (
    <a
      href={href(client)} target="_blank" rel="noreferrer" onClick={() => g.logAlert(client.id)}
      className={cx(
        'inline-flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-bold active:scale-[0.97]',
        already ? 'border-line text-muted' : 'border-amber/70 text-amber', className,
      )}
    >
      {already ? <BellRing size={16} aria-hidden /> : <MessageCircle size={16} aria-hidden />}
      {already ? 'Avisar de nuevo' : 'Enviar alerta'}
    </a>
  )
}

/** Versión compacta del botón de alerta: solo el icono, para filas apretadas. */
export function AlertIconButton({ client }: { client: Client }) {
  const g = useGym()
  const { href } = useAlertLink()
  if (isFrozen(client)) return null
  const already = alertToday(g.alerts, client.id, g.today)
  return (
    <a
      href={href(client)} target="_blank" rel="noreferrer" onClick={() => g.logAlert(client.id)}
      aria-label={already ? `Avisar de nuevo a ${client.name}` : `Enviar alerta a ${client.name}`}
      className={cx('grid size-11 shrink-0 place-items-center rounded-full border active:scale-95', already ? 'border-line text-muted' : 'border-amber/70 text-amber')}
    >
      {already ? <BellRing size={18} aria-hidden /> : <MessageCircle size={18} aria-hidden />}
    </a>
  )
}

/** "Avisado hoy 3:20 p. m. · Daniela": para no avisar dos veces por error. */
export function AlertedTag({ client, full = false }: { client: Client; full?: boolean }) {
  const g = useGym()
  const a = alertToday(g.alerts, client.id, g.today)
  if (!a) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ok/10 px-2 py-0.5 text-[11px] font-bold text-ok">
      <Check size={11} aria-hidden /> Avisado{full ? ` ${formatTime(a.at, g.settings.locale)}${a.worker ? ` · ${a.worker}` : ''}` : ''}
    </span>
  )
}
