import { addPlan, diffDays } from './dates'
import type { Client, Method, Movement, PlanId } from './types'

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

export interface Charge { paid: number; currency: 'USD' | 'MN'; rate?: number }

/**
 * Cuánto se cobra en cada método. USD: el precio tal cual. MN y tarjeta: precio × tasa del día.
 * Devuelve null si el método necesita la tasa y esta no está vigente (nunca se cobra con una tasa vieja).
 */
export function chargeFor(usd: number, method: Method, s: { usdRate: number; usdRateDate: string }, today: string): Charge | null {
  if (method === 'usd') return { paid: roundUsd(usd), currency: 'USD' }
  if (!rateIsFresh(s, today)) return null
  return { paid: toMN(usd, s.usdRate), currency: 'MN', rate: s.usdRate }
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

/** Clientes que requieren cobro (vencidos o que vencen hoy), los más atrasados primero. */
export function pendingClients(clients: Client[], today: string): Client[] {
  return clients
    .filter((c) => diffDays(c.nextDue, today) <= 0)
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
  total: number // valor total en USD
}

export function summarize(movements: Movement[]): ShiftSummary {
  const s: ShiftSummary = {
    memberships: { count: 0, total: 0 },
    sales: { count: 0, total: 0 },
    expected: { usd: 0, mn: 0, card: 0 },
    total: 0,
  }
  for (const m of movements) {
    const bucket = m.kind === 'mensualidad' ? s.memberships : s.sales
    bucket.count++
    bucket.total = roundUsd(bucket.total + m.amount)
    s.total = roundUsd(s.total + m.amount)
    if (m.method === 'usd') s.expected.usd = roundUsd(s.expected.usd + m.paid)
    else if (m.method === 'mn') s.expected.mn += m.paid
    else s.expected.card += m.paid
  }
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
