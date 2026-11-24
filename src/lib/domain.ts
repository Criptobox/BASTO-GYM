import { addDays, addPlan, diffDays } from './dates'
import type { CashOut, Client, Method, Movement, PaymentPart, PlanId } from './types'

export const PLANS: { id: PlanId; label: string; days: string }[] = [
  { id: 'dia', label: 'Día', days: '1 día' },
  { id: 'semana', label: 'Semanal', days: '7 días' },
  { id: 'mes', label: 'Mensual', days: '1 mes' },
  { id: 'anio', label: 'Anual', days: '12 meses' },
]

export const METHODS: { id: Method; label: string }[] = [
  { id: 'usd', label: 'USD' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'mn', label: 'MN' },
]

export const roundUsd = (n: number) => Math.round(n * 100) / 100
/** USD → MN a la tasa dada, a pesos enteros. */
export const toMN = (usd: number, rate: number) => Math.round(usd * rate)

/** La tasa solo vale el día para el que se fijó. */
export const rateIsFresh = (s: { usdRate: number; usdRateDate: string }, today: string) =>
  Number.isFinite(s.usdRate) && s.usdRate > 0 && s.usdRateDate === today

/** Lo que se entrega en un método (en la moneda de ese método). */
export interface PartInput { method: Method; paid: number }

/** Valor en USD de una cantidad entregada: USD tal cual; MN y tarjeta se dividen entre la tasa. */
export const partUsd = (method: Method, paid: number, rate: number) => (method === 'usd' ? paid : paid / rate)

/** Un cobro queda cubierto si lo que falta o sobra es menos de medio peso (o un centavo) por redondeos. */
export const isCovered = (diffUsd: number, rate: number) => diffUsd <= 0.005 || (rate > 0 && diffUsd * rate <= 0.51)

/** Vuelto que se devuelve en efectivo: en USD o en MN (la tarjeta no da vuelto). */
export interface ChangeInput { method: 'usd' | 'mn'; paid: number }

/**
 * USD que faltan (positivo) o sobran (negativo) por cubrir. Sin tasa vigente, las partes en MN/tarjeta
 * no cuentan. El vuelto ya entregado se resta de lo recibido.
 */
export function remainingUsd(total: number, inputs: PartInput[], rate: number, change?: ChangeInput): number {
  const received = inputs.reduce((n, i) => n + (i.method === 'usd' ? i.paid : rate > 0 ? i.paid / rate : 0), 0)
  const given = change && change.paid > 0 ? (change.method === 'usd' ? change.paid : rate > 0 ? change.paid / rate : 0) : 0
  return total - (received - given)
}

export type Settlement =
  | { ok: true; parts: PaymentPart[]; change?: PaymentPart }
  | { ok: false; reason: 'empty' | 'rate' | 'short' | 'over'; remaining: number }

/**
 * Valida un pago (posiblemente combinado, con vuelto) y lo convierte en partes guardables.
 * Nunca acepta MN ni tarjeta con una tasa de otro día. Lo recibido menos el vuelto debe cubrir el precio
 * exacto (tolerancia de medio peso por redondeo): si se recibe de más, hay que registrar el vuelto.
 */
export function settle(
  total: number, inputs: PartInput[], s: { usdRate: number; usdRateDate: string }, today: string, change?: ChangeInput,
): Settlement {
  const used = inputs.filter((i) => Number.isFinite(i.paid) && i.paid > 0)
  if (used.length === 0) return { ok: false, reason: 'empty', remaining: total }
  const giving = change && Number.isFinite(change.paid) && change.paid > 0 ? change : undefined
  const fresh = rateIsFresh(s, today)
  if (!fresh && (used.some((i) => i.method !== 'usd') || giving?.method === 'mn')) return { ok: false, reason: 'rate', remaining: total }
  const rate = fresh ? s.usdRate : 0
  const normalized = used.map((i) => ({ ...i, paid: i.method === 'usd' ? roundUsd(i.paid) : Math.round(i.paid) }))
  const chg = giving ? { method: giving.method, paid: giving.method === 'usd' ? roundUsd(giving.paid) : Math.round(giving.paid) } : undefined
  const remaining = remainingUsd(total, normalized, rate, chg)
  if (remaining > 0 && !isCovered(remaining, rate)) return { ok: false, reason: 'short', remaining }
  if (remaining < 0 && !isCovered(-remaining, rate)) return { ok: false, reason: 'over', remaining }
  const parts: PaymentPart[] = normalized.map((i) => ({
    method: i.method,
    paid: i.paid,
    ...(i.method === 'usd' ? {} : { rate: s.usdRate }),
    usd: i.method === 'usd' ? i.paid : i.paid / s.usdRate,
  }))
  const changePart: PaymentPart | undefined = chg
    ? { method: chg.method, paid: chg.paid, ...(chg.method === 'usd' ? {} : { rate: s.usdRate }), usd: chg.method === 'usd' ? chg.paid : chg.paid / s.usdRate }
    : undefined
  return changePart ? { ok: true, parts, change: changePart } : { ok: true, parts }
}

export type DueState = 'vencido' | 'hoy' | 'pronto' | 'aldia'

export interface DueInfo {
  state: DueState
  days: number // negativo = vencido
  text: string
}

export function dueInfo(nextDue: string, today: string): DueInfo {
  const days = diffDays(nextDue, today)
  if (days < 0) {
    const n = -days
    return { state: 'vencido', days, text: `Venció hace ${n} ${n === 1 ? 'día' : 'días'}` }
  }
  if (days === 0) return { state: 'hoy', days, text: 'Vence hoy' }
  if (days <= 3) return { state: 'pronto', days, text: `Vence en ${days} ${days === 1 ? 'día' : 'días'}` }
  return { state: 'aldia', days, text: `Al día · vence en ${days} días` }
}

export const isFrozen = (c: Pick<Client, 'frozenAt'>) => Boolean(c.frozenAt)

/** Días que lleva congelada una membresía. */
export const frozenDays = (frozenAt: string, today: string) => Math.max(0, diffDays(today, frozenAt))

/** Al reactivar, el vencimiento se corre tantos días como estuvo congelada: no se pierde lo ya pagado. */
export const unfreezeDue = (c: Pick<Client, 'nextDue' | 'frozenAt'>, today: string) =>
  c.frozenAt ? addDays(c.nextDue, frozenDays(c.frozenAt, today)) : c.nextDue

/** Clientes que requieren cobro (vencidos o que vencen hoy), los más atrasados primero. Los congelados no cuentan. */
export function pendingClients(clients: Client[], today: string): Client[] {
  return clients
    .filter((c) => !c.frozenAt && diffDays(c.nextDue, today) <= 0)
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue))
}

/**
 * Nueva fecha de vencimiento al pagar: si ya venció se cuenta desde hoy
 * (no se regalan días); si paga por adelantado se suma al vencimiento actual.
 */
export function renewalDate(nextDue: string, plan: PlanId, today: string): string {
  const base = diffDays(nextDue, today) < 0 ? today : nextDue
  return addPlan(base, plan)
}

/** Quita espacios, puntos y guiones y pasa a mayúsculas: "12.345-678 a" → "12345678A". */
export const normalizeCarnet = (s: string) => s.replace(/[\s.\-]/g, '').toUpperCase()
/** El formato del carnet varía por país: solo se exige que sea alfanumérico y de 5 a 15 caracteres. */
export const isValidCarnet = (s: string) => /^[A-Z0-9]{5,15}$/.test(normalizeCarnet(s))
export const findByCarnet = (clients: Client[], carnet: string) => {
  const n = normalizeCarnet(carnet)
  return clients.find((c) => c.carnet === n)
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export type CashStatus = 'cuadra' | 'faltante' | 'sobrante'

export interface ShiftSummary {
  memberships: { count: number; total: number } // total en USD (valor)
  sales: { count: number; total: number } // total en USD (valor)
  /** Lo que debe haber físicamente: efectivo USD, efectivo MN, y cobros con tarjeta (MN). */
  expected: { usd: number; mn: number; card: number }
  /** De dónde sale el esperado de cada cajón de efectivo. */
  cash: {
    mn: { opening: number; received: number; change: number; outs: number }
    usd: { opening: number; received: number; change: number; outs: number }
  }
  total: number // valor total en USD
}

export interface CashExtras {
  /** Fondo inicial con el que empezó el turno. */
  opening?: { mn: number; usd: number }
  /** Gastos y retiros del turno. */
  outs?: CashOut[]
}

/**
 * Resume un turno. El efectivo que debe haber = fondo inicial + lo recibido en efectivo − vuelto − salidas.
 * La tarjeta no entra al cajón: se reporta aparte.
 */
export function summarize(movements: Movement[], extras: CashExtras = {}): ShiftSummary {
  const o = extras.opening ?? { mn: 0, usd: 0 }
  const s: ShiftSummary = {
    memberships: { count: 0, total: 0 },
    sales: { count: 0, total: 0 },
    expected: { usd: 0, mn: 0, card: 0 },
    cash: {
      mn: { opening: o.mn, received: 0, change: 0, outs: 0 },
      usd: { opening: o.usd, received: 0, change: 0, outs: 0 },
    },
    total: 0,
  }
  for (const m of movements) {
    const bucket = m.kind === 'mensualidad' ? s.memberships : s.sales
    bucket.count++
    bucket.total = roundUsd(bucket.total + m.amount)
    s.total = roundUsd(s.total + m.amount)
    for (const p of m.parts) {
      if (p.method === 'usd') s.cash.usd.received = roundUsd(s.cash.usd.received + p.paid)
      else if (p.method === 'mn') s.cash.mn.received += p.paid
      else s.expected.card += p.paid
    }
    if (m.change) {
      if (m.change.method === 'usd') s.cash.usd.change = roundUsd(s.cash.usd.change + m.change.paid)
      else s.cash.mn.change += m.change.paid
    }
  }
  for (const out of extras.outs ?? []) {
    s.cash.mn.outs += out.mn
    s.cash.usd.outs = roundUsd(s.cash.usd.outs + out.usd)
  }
  const net = (c: { opening: number; received: number; change: number; outs: number }) => c.opening + c.received - c.change - c.outs
  s.expected.mn = net(s.cash.mn)
  s.expected.usd = roundUsd(net(s.cash.usd))
  return s
}

/** Diferencia en centavos enteros para evitar errores de coma flotante. */
export function cashDifference(counted: number, expected: number): { status: CashStatus; amount: number } {
  const diff = Math.round(counted * 100) - Math.round(expected * 100)
  if (diff === 0) return { status: 'cuadra', amount: 0 }
  return { status: diff < 0 ? 'faltante' : 'sobrante', amount: Math.abs(diff) / 100 }
}

export interface ShiftDiff {
  mn: { status: CashStatus; amount: number }
  usd: { status: CashStatus; amount: number }
  balanced: boolean
}

/** Cuadre de los dos cajones: efectivo MN y efectivo USD, cada uno por separado. */
export function shiftDifference(sh: { countedMN?: number; countedUSD?: number; expectedMN?: number; expectedUSD?: number }): ShiftDiff {
  const mn = cashDifference(sh.countedMN ?? 0, sh.expectedMN ?? 0)
  const usd = cashDifference(sh.countedUSD ?? 0, sh.expectedUSD ?? 0)
  return { mn, usd, balanced: mn.status === 'cuadra' && usd.status === 'cuadra' }
}

/** Enlace de WhatsApp con mensaje listo para enviar. */
export function whatsappLink(phone: string, countryCode: string, message: string): string {
  let digits = phone.replace(/\D/g, '')
  if (!digits.startsWith(countryCode) || digits.length <= 10) digits = countryCode + digits
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function reminderMessage(name: string, info: DueInfo, gymName: string): string {
  const first = name.split(' ')[0]
  const when =
    info.state === 'vencido' ? 'ya venció' : info.state === 'hoy' ? 'vence hoy' : `vence en ${info.days} días`
  return `Hola ${first}, te escribimos de ${gymName}. Tu membresía ${when}. ¡Te esperamos para renovarla y seguir entrenando! 💪`
}
