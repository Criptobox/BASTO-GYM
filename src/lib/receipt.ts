import { formatDate } from './dates'
import { makeMoney } from './format'
import type { Movement, PaymentPart, Settings } from './types'

/** Número corto del recibo, estable para el mismo cobro. */
export const receiptNumber = (m: Pick<Movement, 'id'>) => m.id.replace(/-/g, '').slice(0, 6).toUpperCase()

/** Concepto legible: "Mensualidad", "Inscripción" o los productos de la venta. */
export function receiptConcept(m: Pick<Movement, 'label' | 'kind'>): string {
  const [head, ...rest] = m.label.split(' · ')
  return m.kind === 'venta' ? rest.join(' · ') || 'Venta' : head
}

/**
 * Texto del recibo para enviar por WhatsApp o copiar. `nextDue` solo aplica a mensualidades.
 * Muestra cómo se pagó (cada parte con su moneda), la tasa usada y el vuelto.
 */
export function receiptText(
  m: Movement,
  o: { settings: Pick<Settings, 'gymName' | 'locale'>; clientName?: string; nextDue?: string },
): string {
  const money = makeMoney(o.settings)
  const fmt = (p: PaymentPart) => (p.method === 'usd' ? money.usd(p.paid) : p.method === 'mn' ? money.mn(p.paid) : `${money.mn(p.paid)} (tarjeta)`)
  const rate = [...m.parts, ...(m.change ? [m.change] : [])].find((p) => p.rate)?.rate
  const when = new Date(m.at)
  const date = `${formatDate(when.toISOString().slice(0, 10), o.settings.locale)}, ${when.toLocaleTimeString(o.settings.locale, { hour: 'numeric', minute: '2-digit' })}`
  return [
    `🧾 *${o.settings.gymName}* · Recibo #${receiptNumber(m)}`,
    `Fecha: ${date}`,
    o.clientName ? `Cliente: ${o.clientName}` : null,
    `Concepto: ${receiptConcept(m)}`,
    `Total: ${money.usd(m.amount)}`,
    `Pago: ${m.parts.map(fmt).join(' + ')}${rate ? ` (tasa 1 USD = ${rate} MN)` : ''}`,
    m.change ? `Vuelto: ${fmt(m.change)}` : null,
    o.nextDue ? `Vence: ${formatDate(o.nextDue, o.settings.locale)}` : null,
    m.worker ? `Atendió: ${m.worker}` : null,
    '¡Gracias! 💪',
  ].filter(Boolean).join('\n')
}
